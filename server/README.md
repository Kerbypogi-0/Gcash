Server (Express)

Environment variables:

- PORT: default 4000
- UPLOAD_DIR: default ./uploads
- DOWNLOAD_TOKEN_TTL_SECONDS: default 86400
- RATE_LIMIT_WINDOW_MS: default 60000
- RATE_LIMIT_MAX: default 100
- CORS_ORIGIN: default *
- ALLOWED_EXTENSIONS: comma-separated list like "js,py,html" (optional)
- MAX_FILE_SIZE_BYTES: per-file size limit (default 104857600)
- MAX_FILES_PER_UPLOAD: max files per upload (default 200)

Endpoints:

- POST /api/upload (multipart form with files[] and optional relativePath[])
- GET /api/bundle/:id (metadata)
- GET /api/download/:id?token=... (download single file or zip)

Static demo UI is served at `/` for drag-and-drop and folder uploads.
