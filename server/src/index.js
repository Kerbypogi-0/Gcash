import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import archiver from 'archiver';
import rateLimit from 'express-rate-limit';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const PORT = Number(process.env.PORT || 4000);
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', 'uploads'));
const DATA_DIR = path.resolve(path.join(__dirname, '..', '..', 'data'));
const DB_FILE = path.join(DATA_DIR, 'bundles.json');
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
const TOKEN_TTL_SECONDS = Number(process.env.DOWNLOAD_TOKEN_TTL_SECONDS || 60 * 60 * 24);
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000);
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX || 100);

function ensureDirectoryExists(targetPath) {
	if (!fs.existsSync(targetPath)) {
		fs.mkdirSync(targetPath, { recursive: true });
	}
}

ensureDirectoryExists(UPLOAD_DIR);
ensureDirectoryExists(DATA_DIR);

function readDatabase() {
	if (!fs.existsSync(DB_FILE)) {
		return { bundles: {} };
	}
	try {
		const raw = fs.readFileSync(DB_FILE, 'utf8');
		return JSON.parse(raw);
	} catch {
		return { bundles: {} };
	}
}

function writeDatabase(db) {
	fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
}

function createBundleRecord({ bundleId, tokenValue, expiresAt, files }) {
	const db = readDatabase();
	db.bundles[bundleId] = {
		id: bundleId,
		token: tokenValue,
		expiresAt,
		createdAt: Date.now(),
		files,
	};
	writeDatabase(db);
	return db.bundles[bundleId];
}

function getBundle(bundleId) {
	const db = readDatabase();
	return db.bundles[bundleId] || null;
}

function isExpired(bundle) {
	return typeof bundle?.expiresAt === 'number' && Date.now() > bundle.expiresAt;
}

const app = express();

app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(morgan('dev'));
app.use(express.json({ limit: '1mb' }));

const limiter = rateLimit({ windowMs: RATE_LIMIT_WINDOW_MS, max: RATE_LIMIT_MAX, standardHeaders: true, legacyHeaders: false });
app.use(limiter);

app.get('/api/health', (_req, res) => {
	res.json({ ok: true });
});

app.use('/public', express.static(path.join(__dirname, '..', 'public'), { maxAge: '1h' }));
app.get('/', (_req, res) => {
	res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '1h', fallthrough: true }));

app.use('/api/upload', (req, _res, next) => {
	if (!req.bundleId) {
		req.bundleId = uuidv4();
		req.bundleToken = uuidv4();
		req.bundleDir = path.join(UPLOAD_DIR, req.bundleId);
		ensureDirectoryExists(req.bundleDir);
	}
	next();
});

const storage = multer.diskStorage({
	destination: (req, _file, cb) => {
		cb(null, req.bundleDir);
	},
	filename: (_req, file, cb) => {
		const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
		cb(null, uniqueName);
	},
});

const allowedExtensions = new Set((process.env.ALLOWED_EXTENSIONS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean));

const upload = multer({
	storage,
	limits: {
		fileSize: Number(process.env.MAX_FILE_SIZE_BYTES || 1024 * 1024 * 100),
		files: Number(process.env.MAX_FILES_PER_UPLOAD || 200),
	},
	fileFilter: (_req, file, cb) => {
		if (allowedExtensions.size === 0) {
			cb(null, true);
			return;
		}
		const ext = path.extname(file.originalname).slice(1).toLowerCase();
		cb(null, allowedExtensions.has(ext));
	},
});

app.post('/api/upload', upload.array('files'), (req, res) => {
	const relativePaths = Array.isArray(req.body.relativePath) ? req.body.relativePath : (req.body.relativePath ? [req.body.relativePath] : []);
	const files = (req.files || []).map((f, idx) => {
		const relPathFromForm = relativePaths[idx] || f.originalname;
		return {
			id: uuidv4(),
			storedName: f.filename,
			originalName: f.originalname,
			relativePath: relPathFromForm,
			mimeType: f.mimetype,
			size: f.size,
			absolutePath: path.join(req.bundleDir, f.filename),
		};
	});

	const expiresAt = Date.now() + TOKEN_TTL_SECONDS * 1000;
	const bundle = createBundleRecord({
		bundleId: req.bundleId,
		tokenValue: req.bundleToken,
		expiresAt,
		files,
	});

	const downloadUrl = `/api/download/${bundle.id}?token=${bundle.token}`;
	const bundleUrl = `/api/bundle/${bundle.id}`;
	res.status(201).json({
		id: bundle.id,
		expiresAt: bundle.expiresAt,
		numFiles: bundle.files.length,
		downloadUrl,
		bundleUrl,
	});
});

app.get('/api/bundle/:id', (req, res) => {
	const bundle = getBundle(req.params.id);
	if (!bundle) {
		res.status(404).json({ error: 'Not found' });
		return;
	}
	if (isExpired(bundle)) {
		res.status(410).json({ error: 'Link expired' });
		return;
	}
	const publicFiles = bundle.files.map(f => ({ id: f.id, originalName: f.originalName, relativePath: f.relativePath, size: f.size, mimeType: f.mimeType }));
	res.json({ id: bundle.id, expiresAt: bundle.expiresAt, createdAt: bundle.createdAt, files: publicFiles });
});

app.get('/api/download/:id', (req, res) => {
	const bundle = getBundle(req.params.id);
	if (!bundle) {
		res.status(404).json({ error: 'Not found' });
		return;
	}
	if (isExpired(bundle)) {
		res.status(410).json({ error: 'Link expired' });
		return;
	}
	if (!req.query.token || req.query.token !== bundle.token) {
		res.status(401).json({ error: 'Invalid token' });
		return;
	}
	if (bundle.files.length === 0) {
		res.status(404).json({ error: 'No files' });
		return;
	}
	if (bundle.files.length === 1) {
		const f = bundle.files[0];
		res.setHeader('Content-Type', f.mimeType || 'application/octet-stream');
		res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(f.originalName)}"`);
		fs.createReadStream(f.absolutePath).pipe(res);
		return;
	}
	const archive = archiver('zip', { zlib: { level: 9 } });
	archive.on('error', () => {
		res.status(500).end();
	});
	res.setHeader('Content-Type', 'application/zip');
	res.setHeader('Content-Disposition', `attachment; filename="bundle-${bundle.id}.zip"`);
	archive.pipe(res);
	bundle.files.forEach(f => {
		const nameInArchive = f.relativePath || f.originalName;
		archive.file(f.absolutePath, { name: nameInArchive });
	});
	archive.finalize();
});

app.use((err, _req, res, _next) => {
	res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
	console.log(`server listening on http://localhost:${PORT}`);
});

