File Transfer Web App (Backend)

Minimal Express server supporting multi-file uploads, expiring/tokenized downloads, and batch ZIP streaming.

Run

```bash
# from /workspace/server
npm install
npm run dev
```

Visit:
- http://localhost:4000/ for the minimal drag-and-drop UI
- GET http://localhost:4000/health for health check

API

- POST /api/upload
  - multipart/form-data with field "files" (multiple), optional `ttlMinutes`, `maxDownloads`
  - response contains `files[]` with per-file `id` and `token`, and `shareUrl` for batch
- GET /api/download/:id?token=...
- GET /api/download/batch/:batchId?token=...

Configuration (.env)

- PORT=4000
- CLIENT_ORIGIN=*
- MAX_FILE_SIZE=104857600
- MAX_FILES=50
- LINK_TTL_MINUTES=10080
- LINK_MAX_DOWNLOADS=0
- ALLOWED_EXTS=.js,.ts,.jsx,.tsx,.json,.html,.css,.py,.rb,.java,.go,.rs,.cpp,.c,.h,.sh,.md,.txt,.zip
- ALLOWED_MIME=
- SERVE_UPLOADS=true

Uploads stored under `uploads/` and metadata in `data/files.json`.
