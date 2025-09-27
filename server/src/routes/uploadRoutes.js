const path = require('path');
const fs = require('fs');
const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const mime = require('mime-types');
const dayjs = require('dayjs');

const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const META_FILE = path.join(DATA_DIR, 'files.json');

if (!fs.existsSync(META_FILE)) {
  fs.writeFileSync(META_FILE, JSON.stringify([]));
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    const ext = mime.extension(file.mimetype) || path.extname(file.originalname);
    cb(null, `${uuidv4()}-${Date.now()}.${ext || 'bin'}`);
  }
});

// Build allow lists from env
const defaultAllowedExts = ['.js','.ts','.jsx','.tsx','.json','.html','.css','.py','.rb','.java','.go','.rs','.cpp','.c','.h','.sh','.md','.txt','.zip'];
const allowedExts = (process.env.ALLOWED_EXTS || defaultAllowedExts.join(',')).split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
const allowedMimes = (process.env.ALLOWED_MIME || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

const fileFilter = (req, file, cb) => {
  try {
    const ext = (path.extname(file.originalname) || '').toLowerCase();
    const mimeType = (file.mimetype || '').toLowerCase();
    const extAllowed = allowedExts.length === 0 ? true : allowedExts.includes(ext);
    const mimeAllowed = allowedMimes.length === 0 ? true : allowedMimes.includes(mimeType);
    if (extAllowed || mimeAllowed) {
      cb(null, true);
    } else {
      cb(new Error(`Disallowed file type: ${ext || mimeType}`));
    }
  } catch (e) {
    cb(new Error('File validation failed'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || `${50 * 1024 * 1024}`, 10),
    files: parseInt(process.env.MAX_FILES || '25', 10)
  }
});

const readMeta = () => JSON.parse(fs.readFileSync(META_FILE, 'utf8'));
const writeMeta = (data) => fs.writeFileSync(META_FILE, JSON.stringify(data, null, 2));

router.post('/', upload.array('files'), (req, res) => {
  const expiresInMinutes = parseInt(req.body.ttlMinutes || process.env.LINK_TTL_MINUTES || '1440', 10);
  const maxDownloads = parseInt(req.body.maxDownloads || process.env.LINK_MAX_DOWNLOADS || '0', 10); // 0 = unlimited
  const nowIso = new Date().toISOString();
  const expiresAt = dayjs(nowIso).add(expiresInMinutes, 'minute').toISOString();

  const meta = readMeta();
  const batchId = uuidv4();

  const files = (req.files || []).map(f => {
    const id = uuidv4();
    const record = {
      id,
      batchId,
      originalName: f.originalname,
      storedName: path.basename(f.path),
      mimeType: f.mimetype,
      size: f.size,
      createdAt: nowIso,
      expiresAt,
      token: uuidv4(),
      remainingDownloads: maxDownloads
    };
    meta.push(record);
    return record;
  });

  writeMeta(meta);

  res.json({
    batchId,
    files,
    shareUrl: `${req.protocol}://${req.get('host')}/api/download/batch/${batchId}`
  });
});

module.exports = router;

