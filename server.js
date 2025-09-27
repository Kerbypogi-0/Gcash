const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const { v4: uuidv4 } = require('uuid');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
    },
  },
}));

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 uploads per windowMs
  message: 'Too many uploads, please try again later.'
});

// Ensure uploads directory exists
const uploadDir = process.env.UPLOAD_DIR || 'uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// MongoDB Schema
const fileSchema = new mongoose.Schema({
  originalName: String,
  filename: String,
  mimetype: String,
  size: Number,
  uploadDate: { type: Date, default: Date.now },
  expiryDate: Date,
  downloadCount: { type: Number, default: 0 },
  maxDownloads: { type: Number, default: 10 },
  uniqueId: { type: String, unique: true },
  isFolder: { type: Boolean, default: false },
  files: [String], // For folder uploads
  uploader: String, // IP address or user ID
});

const File = mongoose.model('File', fileSchema);

// Connect to MongoDB (optional - app works without it)
if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.log('MongoDB connection error:', err));
}

// Multer configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024, // 50MB default
    files: 20 // Maximum 20 files at once
  },
  fileFilter: function (req, file, cb) {
    // Allow common file types (you can customize this)
    const allowedTypes = /\.(txt|js|py|html|css|json|xml|md|java|cpp|c|php|rb|go|rs|ts|jsx|tsx|vue|sql|sh|bat|yml|yaml|ini|conf|log|csv)$/i;
    const allowedMimeTypes = [
      'text/plain',
      'text/javascript',
      'text/html',
      'text/css',
      'application/json',
      'application/xml',
      'text/markdown',
      'application/zip',
      'application/x-zip-compressed'
    ];
    
    if (allowedTypes.test(file.originalname) || allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed. Please upload code files only.'), false);
    }
  }
});

// Serve static files
app.use(express.static('public'));

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'transfer.html'));
});

// Upload endpoint
app.post('/upload', uploadLimiter, upload.array('files', 20), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const uniqueId = uuidv4();
    const expiryHours = parseInt(process.env.LINK_EXPIRY_HOURS) || 24;
    const expiryDate = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

    // Create file record
    const fileRecord = new File({
      originalName: req.files.length > 1 ? 'Multiple Files' : req.files[0].originalname,
      filename: req.files.length > 1 ? null : req.files[0].filename,
      mimetype: req.files.length > 1 ? 'application/zip' : req.files[0].mimetype,
      size: req.files.reduce((total, file) => total + file.size, 0),
      expiryDate: expiryDate,
      uniqueId: uniqueId,
      isFolder: req.files.length > 1,
      files: req.files.map(f => f.filename),
      uploader: req.ip
    });

    if (mongoose.connection.readyState === 1) {
      await fileRecord.save();
    }

    const downloadLink = `${req.protocol}://${req.get('host')}/download/${uniqueId}`;
    
    res.json({
      success: true,
      downloadLink: downloadLink,
      fileCount: req.files.length,
      totalSize: fileRecord.size,
      expiryDate: expiryDate
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed: ' + error.message });
  }
});

// Download endpoint
app.get('/download/:id', async (req, res) => {
  try {
    const fileId = req.params.id;
    
    let fileRecord;
    if (mongoose.connection.readyState === 1) {
      fileRecord = await File.findOne({ uniqueId: fileId });
      
      if (!fileRecord) {
        return res.status(404).send('File not found or expired');
      }

      // Check if file is expired
      if (fileRecord.expiryDate < new Date()) {
        return res.status(410).send('File has expired');
      }

      // Check download count
      if (fileRecord.downloadCount >= fileRecord.maxDownloads) {
        return res.status(410).send('Download limit exceeded');
      }

      // Increment download count
      fileRecord.downloadCount += 1;
      await fileRecord.save();
    } else {
      // Fallback when no database
      return res.status(404).send('File not found');
    }

    if (fileRecord.isFolder) {
      // Create zip file for multiple files
      const archive = archiver('zip', {
        zlib: { level: 9 }
      });

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="files-${fileId}.zip"`);

      archive.pipe(res);

      for (const filename of fileRecord.files) {
        const filePath = path.join(uploadDir, filename);
        if (fs.existsSync(filePath)) {
          archive.file(filePath, { name: filename.split('-').slice(2).join('-') });
        }
      }

      archive.finalize();
    } else {
      // Single file download
      const filePath = path.join(uploadDir, fileRecord.filename);
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).send('File not found on disk');
      }

      res.setHeader('Content-Disposition', `attachment; filename="${fileRecord.originalName}"`);
      res.sendFile(path.resolve(filePath));
    }

  } catch (error) {
    console.error('Download error:', error);
    res.status(500).send('Download failed');
  }
});

// File info endpoint
app.get('/info/:id', async (req, res) => {
  try {
    const fileId = req.params.id;
    
    if (mongoose.connection.readyState === 1) {
      const fileRecord = await File.findOne({ uniqueId: fileId });
      
      if (!fileRecord) {
        return res.status(404).json({ error: 'File not found' });
      }

      res.json({
        originalName: fileRecord.originalName,
        size: fileRecord.size,
        uploadDate: fileRecord.uploadDate,
        expiryDate: fileRecord.expiryDate,
        downloadCount: fileRecord.downloadCount,
        maxDownloads: fileRecord.maxDownloads,
        isFolder: fileRecord.isFolder,
        fileCount: fileRecord.files ? fileRecord.files.length : 1
      });
    } else {
      res.status(503).json({ error: 'Database not available' });
    }

  } catch (error) {
    console.error('Info error:', error);
    res.status(500).json({ error: 'Failed to get file info' });
  }
});

// Cleanup expired files (run every hour)
setInterval(async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      const expiredFiles = await File.find({ expiryDate: { $lt: new Date() } });
      
      for (const file of expiredFiles) {
        if (file.files) {
          // Delete multiple files
          for (const filename of file.files) {
            const filePath = path.join(uploadDir, filename);
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
            }
          }
        } else if (file.filename) {
          // Delete single file
          const filePath = path.join(uploadDir, file.filename);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        }
      }

      // Remove expired records
      await File.deleteMany({ expiryDate: { $lt: new Date() } });
      console.log(`Cleaned up ${expiredFiles.length} expired files`);
    }
  } catch (error) {
    console.error('Cleanup error:', error);
  }
}, 60 * 60 * 1000); // Run every hour

app.listen(PORT, () => {
  console.log(`File Transfer Server running on port ${PORT}`);
  console.log(`Access the app at: http://localhost:${PORT}`);
});

module.exports = app;