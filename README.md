# File Transfer Web App

A secure, modern file transfer web application for sharing code files and documents with unique download links.

## 🚀 Features

- **Drag & Drop Interface**: Intuitive file upload with drag-and-drop support
- **Multiple File Support**: Upload multiple files at once or entire folders
- **Secure File Sharing**: Generate unique, time-limited download links
- **Progress Tracking**: Real-time upload progress with visual feedback
- **File Validation**: Only allows safe file types (code files, documents, etc.)
- **Auto-Cleanup**: Files automatically expire and are deleted after 24 hours
- **Mobile Responsive**: Works seamlessly on desktop, tablet, and mobile
- **Security First**: Rate limiting, file type validation, and secure headers

## 🛠️ Tech Stack

### Backend
- **Node.js** with Express.js
- **Multer** for file upload handling
- **MongoDB** for metadata storage (optional)
- **Archiver** for folder compression
- **Helmet** for security headers
- **Rate limiting** for abuse prevention

### Frontend
- **Pure HTML/CSS/JavaScript** (no framework dependencies)
- **Modern CSS Grid & Flexbox** for responsive layout
- **Drag & Drop API** for file uploads
- **Progress tracking** with XMLHttpRequest
- **Beautiful gradients** and animations

## 📋 Supported File Types

- **JavaScript**: `.js`, `.jsx`, `.ts`, `.tsx`
- **Python**: `.py`
- **Web**: `.html`, `.css`, `.json`, `.xml`
- **Documentation**: `.md`, `.txt`
- **Config**: `.yml`, `.yaml`, `.ini`, `.conf`
- **Languages**: `.java`, `.cpp`, `.c`, `.php`, `.rb`, `.go`, `.rs`
- **Data**: `.sql`, `.csv`, `.log`
- **Scripts**: `.sh`, `.bat`

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (optional - app works without it)

### Installation

1. **Clone and navigate to the project**:
   ```bash
   cd /workspace
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment** (optional):
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

4. **Start the server**:
   ```bash
   npm start
   ```

5. **Access the application**:
   Open your browser and go to `http://localhost:3000`

### Development Mode

For development with auto-restart:
```bash
npm run dev
```

## 🔧 Configuration

Edit the `.env` file to customize settings:

```env
PORT=3000                          # Server port
NODE_ENV=development               # Environment
JWT_SECRET=your-secret-key         # JWT secret for authentication
MONGODB_URI=mongodb://localhost:27017/filetransfer  # MongoDB connection
MAX_FILE_SIZE=50000000            # Max file size (50MB)
UPLOAD_DIR=uploads                # Upload directory
LINK_EXPIRY_HOURS=24              # Link expiry time
```

## 📱 Usage

### Uploading Files

1. **Drag & Drop**: Drag files directly onto the upload area
2. **Click to Browse**: Click the upload area to select files
3. **Multiple Files**: Select multiple files at once
4. **Progress Tracking**: Watch real-time upload progress
5. **Get Share Link**: Copy the generated download link

### Sharing Files

1. **Copy Link**: Use the copy button to copy the download link
2. **Share Securely**: Share the link with anyone who needs the files
3. **Auto-Expiry**: Links automatically expire after 24 hours
4. **Download Tracking**: Monitor download counts and limits

### Downloading Files

1. **Single Files**: Download individual files directly
2. **Multiple Files**: Automatically zipped and downloaded
3. **File Info**: View file details before downloading

## 🔒 Security Features

- **File Type Validation**: Only allows safe file types
- **Size Limits**: Configurable file size limits (default 50MB)
- **Rate Limiting**: Prevents abuse with upload rate limits
- **Secure Headers**: Helmet.js for security headers
- **Auto-Cleanup**: Files automatically deleted after expiry
- **Unique IDs**: UUID-based download links
- **CORS Protection**: Configurable CORS settings

## 🗂️ Project Structure

```
/workspace/
├── server.js              # Main server file
├── package.json           # Dependencies and scripts
├── .env                   # Environment configuration
├── README.md              # This file
├── public/
│   └── transfer.html      # Frontend interface
└── uploads/               # File storage directory (auto-created)
```

## 🌐 API Endpoints

### Upload Files
```
POST /upload
- Multipart form data with 'files' field
- Returns: { success, downloadLink, fileCount, totalSize, expiryDate }
```

### Download Files
```
GET /download/:id
- Download files by unique ID
- Single files: direct download
- Multiple files: ZIP archive
```

### File Information
```
GET /info/:id
- Get file metadata and download info
- Returns: { originalName, size, uploadDate, expiryDate, downloadCount }
```

## 🚦 Rate Limits

- **Upload Rate**: 5 uploads per 15 minutes per IP
- **File Limits**: Maximum 20 files per upload
- **Size Limits**: 50MB per file (configurable)
- **Download Limits**: 10 downloads per file (configurable)

## 🔄 Auto-Cleanup

The application automatically:
- Deletes expired files every hour
- Removes database records for expired files
- Cleans up orphaned files on disk

## 🐛 Troubleshooting

### Common Issues

1. **Upload fails**: Check file type and size limits
2. **Download not working**: Verify file hasn't expired
3. **Server won't start**: Check if port 3000 is available
4. **MongoDB errors**: Ensure MongoDB is running (optional)

### Logs

Check the console output for detailed error messages and server status.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the package.json for details.

## 🎯 Future Enhancements

- User authentication and file management
- Cloud storage integration (AWS S3, Google Cloud)
- File encryption at rest
- Password-protected downloads
- Custom expiry times
- File preview functionality
- Download analytics dashboard

---

**Made with ❤️ for secure file sharing**