File Transfer Web App (Express + Static Frontend)

Quickstart

1) Server env (optional): copy `server/.env.example` to `server/.env` and adjust.
2) Start server:

   - Dev: `cd server && npm run dev`
   - Prod: `cd server && npm start`

3) Open UI: visit `http://localhost:4000/` for drag-and-drop uploads.

API

- `GET /api/health` → `{ ok: true }`
- `POST /api/upload` (multipart form)
  - fields: `files` (one or many); optional `relativePath` (parallel array)
  - response: `{ id, expiresAt, numFiles, downloadUrl, bundleUrl }`
- `GET /api/bundle/:id` → bundle metadata
- `GET /api/download/:id?token=...` → download (single file or zip)

Config (server/.env)

- `PORT` (default 4000)
- `UPLOAD_DIR` (default ./uploads)
- `DOWNLOAD_TOKEN_TTL_SECONDS` (default 86400)
- `RATE_LIMIT_WINDOW_MS` (default 60000)
- `RATE_LIMIT_MAX` (default 100)
- `CORS_ORIGIN` (default *)
- `ALLOWED_EXTENSIONS` (e.g. `js,py,html`) optional
- `MAX_FILE_SIZE_BYTES` (default 104857600)
- `MAX_FILES_PER_UPLOAD` (default 200)

Notes

- The included UI supports files and folders via drag-and-drop (`webkitdirectory`).
- For cloud storage (S3/GCS/Azure), replace local disk writes in `server/src/index.js` with provider SDK calls and store object keys in metadata.
