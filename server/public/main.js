const drop = document.getElementById('drop');
const fileInput = document.getElementById('fileInput');
const uploadForm = document.getElementById('uploadForm');
const bar = document.getElementById('bar');
const result = document.getElementById('result');

function preventDefaults(e){ e.preventDefault(); e.stopPropagation(); }
['dragenter','dragover','dragleave','drop'].forEach(ev => {
	drop.addEventListener(ev, preventDefaults, false);
});

drop.addEventListener('dragover', () => drop.classList.add('dragover'));
drop.addEventListener('dragleave', () => drop.classList.remove('dragover'));
drop.addEventListener('drop', (e) => {
	drop.classList.remove('dragover');
	const items = e.dataTransfer.items;
	if (items && items.length) {
		getFilesFromDataTransferItems(items).then(files => {
			attachFiles(files);
		});
	}
});

function attachFiles(files){
	const dataTransfer = new DataTransfer();
	files.forEach(f => dataTransfer.items.add(f));
	fileInput.files = dataTransfer.files;
}

async function getFilesFromDataTransferItems(dataTransferItems) {
	const files = [];
	const itemPromises = [];
	for (const item of dataTransferItems) {
		const entry = item.webkitGetAsEntry?.();
		if (entry) {
			itemPromises.push(traverseFileTree(entry, ''));
		} else if (item.getAsFile) {
			const f = item.getAsFile();
			if (f) files.push(f);
		}
	}
	const nested = await Promise.all(itemPromises);
	return files.concat(...nested);
}

function traverseFileTree(entry, pathPrefix) {
	return new Promise((resolve) => {
		if (entry.isFile) {
			entry.file(file => {
				Object.defineProperty(file, 'relativePath', { value: pathPrefix + file.name });
				resolve([file]);
			});
		} else if (entry.isDirectory) {
			const dirReader = entry.createReader();
			const entries = [];
			const readEntries = () => dirReader.readEntries(async (batch) => {
				if (!batch.length) {
					const results = await Promise.all(entries.map(en => traverseFileTree(en, pathPrefix + entry.name + '/')));
					resolve(results.flat());
					return;
				}
				entries.push(...batch);
				readEntries();
			});
			readEntries();
		} else {
			resolve([]);
		}
	});
}

uploadForm.addEventListener('submit', async (e) => {
	e.preventDefault();
	if (!fileInput.files.length) return;
	bar.style.width = '0%';
	result.textContent = '';
	const form = new FormData();
	const files = Array.from(fileInput.files);
	files.forEach(f => {
		form.append('files', f);
		const rel = f.relativePath || f.webkitRelativePath || f.name;
		form.append('relativePath', rel);
	});

	const xhr = new XMLHttpRequest();
	xhr.open('POST', '/api/upload');
	xhr.upload.onprogress = (e) => {
		if (e.lengthComputable) {
			const pct = Math.round((e.loaded / e.total) * 100);
			bar.style.width = pct + '%';
		}
	};
	xhr.onload = () => {
		try {
			const json = JSON.parse(xhr.responseText || '{}');
			result.textContent = JSON.stringify(json, null, 2);
			if (json.downloadUrl) {
				const a = document.createElement('a');
				a.href = json.downloadUrl;
				a.textContent = 'Download link';
				result.appendChild(document.createElement('div')).appendChild(a);
			}
		} catch {
			result.textContent = xhr.responseText;
		}
	};
	xhr.onerror = () => {
		result.textContent = 'Upload failed';
	};
	xhr.send(form);
});

