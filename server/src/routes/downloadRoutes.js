const path = require('path');
const fs = require('fs');
const express = require('express');
const archiver = require('archiver');
const dayjs = require('dayjs');

const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const META_FILE = path.join(DATA_DIR, 'files.json');

const readMeta = () => JSON.parse(fs.readFileSync(META_FILE, 'utf8'));
const writeMeta = (data) => fs.writeFileSync(META_FILE, JSON.stringify(data, null, 2));

const isExpired = (iso) => dayjs().isAfter(dayjs(iso));

router.get('/:id', (req, res) => {
  const id = req.params.id;
  const providedToken = req.query.token;
  const meta = readMeta();
  const file = meta.find(f => f.id === id);
  if (!file) return res.status(404).json({ error: 'File not found' });
  if (isExpired(file.expiresAt)) return res.status(410).json({ error: 'Link expired' });
  if (file.token && providedToken && file.token !== providedToken) {
    return res.status(403).json({ error: 'Invalid token' });
  }
  if (file.remainingDownloads && file.remainingDownloads > 0) {
    // decrement remaining on successful stream end
    res.on('finish', () => {
      try {
        const all = readMeta();
        const idx = all.findIndex(f => f.id === id);
        if (idx >= 0 && all[idx].remainingDownloads > 0) {
          all[idx].remainingDownloads -= 1;
          writeMeta(all);
        }
      } catch {}
    });
  }

  const filePath = path.join(UPLOAD_DIR, file.storedName);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File missing' });

  res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.originalName)}"`);
  fs.createReadStream(filePath).pipe(res);
});

router.get('/batch/:batchId', (req, res) => {
  const { batchId } = req.params;
  const providedToken = req.query.token;
  const meta = readMeta();
  const files = meta.filter(f => f.batchId === batchId);
  if (!files.length) return res.status(404).json({ error: 'Batch not found' });
  if (files.every(f => isExpired(f.expiresAt))) return res.status(410).json({ error: 'Link expired' });
  if (providedToken) {
    const anyTokenMismatch = files.some(f => f.token && f.token !== providedToken);
    if (anyTokenMismatch) return res.status(403).json({ error: 'Invalid token' });
  }

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="batch-${batchId}.zip"`);

  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.on('error', (err) => res.status(500).end(err.message));
  archive.pipe(res);

  files.forEach(file => {
    const filePath = path.join(UPLOAD_DIR, file.storedName);
    if (fs.existsSync(filePath) && !isExpired(file.expiresAt)) {
      archive.file(filePath, { name: file.originalName });
    }
  });

  archive.finalize();
});

module.exports = router;

