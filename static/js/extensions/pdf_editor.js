// S&O+ Extension: PDF Editor

(function ensurePdfJs() {
    if (typeof pdfjsLib === 'undefined') {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        s.onload = () => { pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.js'; };
        document.head.appendChild(s);
    } else {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.js';
    }
})();

const pdfState = {
    file: null,
    pdfDoc: null,
    pageNum: 1,
    pageCount: 0,
    zoom: 1.5,
    annotations: {},
    tool: 'pen',
    color: '#FF0000',
    size: 3,
    drawing: false,
    stroke: null,
    fileName: '',
    docId: null,
    loadedUrl: null
};

function pdfResetState() {
    if (pdfState.loadedUrl) {
        URL.revokeObjectURL(pdfState.loadedUrl);
    }
    pdfState.file = null;
    if (pdfState.pdfDoc) {
        try { pdfState.pdfDoc.destroy(); } catch(e) {}
    }
    pdfState.pdfDoc = null;
    pdfState.pageNum = 1;
    pdfState.pageCount = 0;
    pdfState.annotations = {};
    pdfState.drawing = false;
    pdfState.stroke = null;
    pdfState.fileName = '';
    pdfState.docId = null;
    pdfState.loadedUrl = null;
}

function pdfUpdateUI() {
    const pageInfo = document.getElementById('pdf-page-info');
    const pageInput = document.getElementById('pdf-page-input');
    const zoomLevel = document.getElementById('pdf-zoom-level');
    const prevBtn = document.getElementById('pdf-prev-btn');
    const nextBtn = document.getElementById('pdf-next-btn');
    if (pageInfo) pageInfo.textContent = `Page ${pdfState.pageNum}/${pdfState.pageCount}`;
    if (pageInput) pageInput.value = pdfState.pageNum;
    if (pageInput) pageInput.max = pdfState.pageCount || 1;
    if (zoomLevel) zoomLevel.textContent = `${Math.round(pdfState.zoom * 100)}%`;
    if (prevBtn) prevBtn.disabled = pdfState.pageNum <= 1;
    if (nextBtn) nextBtn.disabled = pdfState.pageNum >= pdfState.pageCount;
}

function pdfGetCanvasPos(e) {
    const canvas = document.getElementById('pdf-annot-canvas');
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
}

function pdfDrawAnnotations() {
    const canvas = document.getElementById('pdf-annot-canvas');
    const ctx = canvas && canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const pageAnnots = pdfState.annotations[pdfState.pageNum] || [];
    for (const stroke of pageAnnots) {
        pdfDrawStroke(ctx, stroke, 1);
    }
    if (pdfState.stroke) {
        pdfDrawStroke(ctx, pdfState.stroke, 1);
    }
}

function pdfDrawStroke(ctx, stroke, alpha) {
    if (!stroke || stroke.points.length < 2) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = stroke.color || '#FF0000';
    ctx.lineWidth = (stroke.size || 3) * pdfState.zoom;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let i = 0; i < stroke.points.length; i++) {
        const x = stroke.points[i].x * pdfState.zoom;
        const y = stroke.points[i].y * pdfState.zoom;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
}

function pdfSetupCanvas() {
    const canvas = document.getElementById('pdf-canvas');
    const annotCanvas = document.getElementById('pdf-annot-canvas');
    if (!canvas || !annotCanvas) return;

    function onEventStart(e) {
        e.preventDefault();
        if (pdfState.tool === 'eraser') {
            const pos = pdfGetCanvasPos(e);
            const pageAnnots = pdfState.annotations[pdfState.pageNum] || [];
            const threshold = 15 / pdfState.zoom;
            let removed = false;
            for (let i = pageAnnots.length - 1; i >= 0; i--) {
                const stroke = pageAnnots[i];
                for (const p of stroke.points) {
                    const dx = p.x - pos.x / pdfState.zoom;
                    const dy = p.y - pos.y / pdfState.zoom;
                    if (Math.sqrt(dx * dx + dy * dy) < threshold) {
                        pageAnnots.splice(i, 1);
                        removed = true;
                        break;
                    }
                }
            }
            if (removed) {
                pdfDrawAnnotations();
            }
            return;
        }
        pdfState.drawing = true;
        const pos = pdfGetCanvasPos(e);
        pdfState.stroke = {
            color: pdfState.color,
            size: pdfState.size,
            points: [{ x: pos.x / pdfState.zoom, y: pos.y / pdfState.zoom }]
        };
    }

    function onEventMove(e) {
        e.preventDefault();
        if (pdfState.tool === 'eraser') return;
        if (!pdfState.drawing || !pdfState.stroke) return;
        const pos = pdfGetCanvasPos(e);
        pdfState.stroke.points.push({ x: pos.x / pdfState.zoom, y: pos.y / pdfState.zoom });
        pdfDrawAnnotations();
    }

    function onEventEnd(e) {
        e.preventDefault();
        if (pdfState.tool === 'eraser') return;
        if (pdfState.drawing && pdfState.stroke) {
            if (pdfState.stroke.points.length > 1) {
                if (!pdfState.annotations[pdfState.pageNum]) {
                    pdfState.annotations[pdfState.pageNum] = [];
                }
                pdfState.annotations[pdfState.pageNum].push(pdfState.stroke);
            }
            pdfState.stroke = null;
            pdfState.drawing = false;
            pdfDrawAnnotations();
        }
    }

    annotCanvas.addEventListener('mousedown', onEventStart);
    annotCanvas.addEventListener('mousemove', onEventMove);
    annotCanvas.addEventListener('mouseup', onEventEnd);
    annotCanvas.addEventListener('mouseleave', onEventEnd);

    annotCanvas.addEventListener('touchstart', onEventStart, { passive: false });
    annotCanvas.addEventListener('touchmove', onEventMove, { passive: false });
    annotCanvas.addEventListener('touchend', onEventEnd, { passive: false });
}

window.renderPdf = function(area) {
    area.innerHTML = `
        <div class="page-header"><h2>📄 PDF</h2><p>Editor de PDF</p></div>
        <div class="card" style="padding:0;">
            <div class="pdf-toolbar" style="display:flex;align-items:center;gap:8px;padding:10px 14px;border-bottom:1px solid var(--border);flex-wrap:wrap;">
                <button class="btn btn-sm btn-outline" onclick="pdfUpload()">📤 Upload</button>
                <button class="btn btn-sm btn-outline" onclick="pdfSave()">💾 Save</button>
                <button class="btn btn-sm btn-outline" onclick="pdfLoadDialog()">📂 Load</button>
                <span style="width:1px;height:24px;background:var(--border);margin:0 4px;"></span>
                <button class="btn btn-sm btn-outline" id="pdf-prev-btn" onclick="pdfPrevPage()">◀</button>
                <span id="pdf-page-info" style="font-size:13px;font-weight:600;min-width:80px;text-align:center;color:var(--text-light);">—</span>
                <button class="btn btn-sm btn-outline" id="pdf-next-btn" onclick="pdfNextPage()">▶</button>
                <input type="number" id="pdf-page-input" class="form-input" style="width:50px;text-align:center;padding:5px;" value="1" min="1" onchange="pdfGoToPage(parseInt(this.value)||1)">
                <span style="width:1px;height:24px;background:var(--border);margin:0 4px;"></span>
                <button class="btn btn-sm btn-outline" onclick="pdfZoomOut()">🔍−</button>
                <span id="pdf-zoom-level" style="font-size:13px;font-weight:600;min-width:40px;text-align:center;color:var(--text-light);">150%</span>
                <button class="btn btn-sm btn-outline" onclick="pdfZoomIn()">🔍+</button>
                <span style="width:1px;height:24px;background:var(--border);margin:0 4px;"></span>
                <button class="btn btn-sm ${pdfState.tool === 'pen' ? 'btn-primary' : 'btn-outline'}" id="pdf-tool-pen" onclick="pdfSetTool('pen')">✏️</button>
                <button class="btn btn-sm btn-outline" id="pdf-tool-eraser" onclick="pdfSetTool('eraser')">🧹</button>
                <input type="color" id="pdf-color" value="${pdfState.color}" style="width:30px;height:30px;border-radius:6px;border:1px solid var(--border);background:none;cursor:pointer;padding:2px;" onchange="pdfSetColor(this.value)">
                <input type="range" id="pdf-size" min="1" max="20" value="${pdfState.size}" style="width:70px;accent-color:var(--primary);" oninput="pdfSetSize(parseInt(this.value))">
                <span id="pdf-size-label" style="font-size:11px;color:var(--text-light);min-width:18px;">${pdfState.size}</span>
            </div>
            <div id="pdf-viewer" style="position:relative;min-height:500px;display:flex;justify-content:center;align-items:flex-start;background:rgba(0,0,0,0.15);padding:20px;">
                <div id="pdf-container" style="position:relative;display:none;box-shadow:0 4px 30px rgba(0,0,0,0.5);border-radius:4px;overflow:hidden;">
                    <canvas id="pdf-canvas"></canvas>
                    <canvas id="pdf-annot-canvas" style="position:absolute;top:0;left:0;cursor:crosshair;"></canvas>
                </div>
                <div id="pdf-empty" class="empty-state">
                    <div class="icon">📄</div>
                    <h3>No PDF loaded</h3>
                    <p style="color:var(--text-light);font-size:13px;">Upload a PDF file to start annotating</p>
                    <button class="btn btn-primary" onclick="pdfUpload()" style="margin-top:16px;">📤 Upload PDF</button>
                </div>
            </div>
            <input type="file" id="pdf-file-input" accept="application/pdf" style="display:none;" onchange="pdfLoadFile(this.files[0])">
        </div>
    `;
    pdfResetState();
    pdfUpdateUI();
    pdfSetupCanvas();
};

window.pdfUpload = function() {
    const input = document.getElementById('pdf-file-input');
    if (input) input.click();
};

window.pdfLoadFile = async function(file) {
    if (!file) return;
    pdfResetState();
    pdfState.file = file;
    pdfState.fileName = file.name;
    try {
        const arrayBuffer = await file.arrayBuffer();
        pdfState.loadedUrl = URL.createObjectURL(file);
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdfDoc = await loadingTask.promise;
        pdfState.pdfDoc = pdfDoc;
        pdfState.pageCount = pdfDoc.numPages;
        pdfState.pageNum = 1;
        pdfState.annotations = {};
        document.getElementById('pdf-empty').style.display = 'none';
        document.getElementById('pdf-container').style.display = 'block';
        pdfUpdateUI();
        await pdfRenderPage();
        showToast('PDF loaded: ' + file.name, 'success');
    } catch (e) {
        showToast('Error loading PDF: ' + e.message, 'error');
        console.error(e);
    }
};

window.pdfRenderPage = async function() {
    if (!pdfState.pdfDoc) return;
    const canvas = document.getElementById('pdf-canvas');
    const annotCanvas = document.getElementById('pdf-annot-canvas');
    if (!canvas || !annotCanvas) return;
    const ctx = canvas.getContext('2d');
    try {
        const page = await pdfState.pdfDoc.getPage(pdfState.pageNum);
        const viewport = page.getViewport({ scale: pdfState.zoom });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        annotCanvas.width = viewport.width;
        annotCanvas.height = viewport.height;
        await page.render({ canvasContext: ctx, viewport: viewport }).promise;
        pdfDrawAnnotations();
    } catch (e) {
        console.error('Render error:', e);
    }
};

window.pdfPrevPage = async function() {
    if (pdfState.pageNum > 1) {
        pdfState.pageNum--;
        pdfUpdateUI();
        await pdfRenderPage();
    }
};

window.pdfNextPage = async function() {
    if (pdfState.pageNum < pdfState.pageCount) {
        pdfState.pageNum++;
        pdfUpdateUI();
        await pdfRenderPage();
    }
};

window.pdfGoToPage = async function(n) {
    n = parseInt(n) || 1;
    if (n < 1) n = 1;
    if (n > pdfState.pageCount) n = pdfState.pageCount;
    if (n !== pdfState.pageNum) {
        pdfState.pageNum = n;
        pdfUpdateUI();
        await pdfRenderPage();
    }
};

window.pdfZoomIn = async function() {
    pdfState.zoom = Math.min(pdfState.zoom * 1.25, 5);
    pdfUpdateUI();
    if (pdfState.pdfDoc) await pdfRenderPage();
};

window.pdfZoomOut = async function() {
    pdfState.zoom = Math.max(pdfState.zoom / 1.25, 0.25);
    pdfUpdateUI();
    if (pdfState.pdfDoc) await pdfRenderPage();
};

window.pdfSetTool = function(tool) {
    pdfState.tool = tool;
    const penBtn = document.getElementById('pdf-tool-pen');
    const eraserBtn = document.getElementById('pdf-tool-eraser');
    const annotCanvas = document.getElementById('pdf-annot-canvas');
    if (penBtn) {
        penBtn.className = `btn btn-sm ${tool === 'pen' ? 'btn-primary' : 'btn-outline'}`;
    }
    if (eraserBtn) {
        eraserBtn.className = `btn btn-sm ${tool === 'eraser' ? 'btn-primary' : 'btn-outline'}`;
    }
    if (annotCanvas) {
        annotCanvas.style.cursor = tool === 'eraser' ? 'pointer' : 'crosshair';
    }
};

window.pdfSetColor = function(color) {
    pdfState.color = color;
};

window.pdfSetSize = function(size) {
    pdfState.size = size;
    const label = document.getElementById('pdf-size-label');
    if (label) label.textContent = size;
};

window.pdfSave = async function() {
    if (!pdfState.pdfDoc) {
        showToast('No PDF loaded', 'error');
        return;
    }
    if (!currentUser) {
        showToast('You must be logged in', 'error');
        return;
    }
    showToast('Saving...', 'info');
    try {
        const uid = currentUser.uid;
        let downloadURL = pdfState.loadedUrl;
        let storagePath = '';
        if (pdfState.file) {
            const path = `pdf_documents/${uid}/${Date.now()}_${pdfState.fileName}`;
            downloadURL = await uploadFile(pdfState.file, path);
            storagePath = path;
        }
        const data = {
            fileName: pdfState.fileName,
            storagePath: storagePath,
            downloadURL: downloadURL,
            pageCount: pdfState.pageCount,
            annotations: pdfState.annotations,
            zoom: pdfState.zoom,
            createdAt: Date.now()
        };
        if (pdfState.docId) {
            await dbUpdate(`pdf_documents/${uid}/${pdfState.docId}`, data);
        } else {
            const ref = await dbPush(`pdf_documents/${uid}`, data);
            pdfState.docId = ref.key;
        }
        showToast('PDF saved to Firebase!', 'success');
    } catch (e) {
        showToast('Error saving: ' + e.message, 'error');
        console.error(e);
    }
};

window.pdfLoadDialog = async function() {
    if (!currentUser) {
        showToast('You must be logged in', 'error');
        return;
    }
    try {
        const snap = await dbGet(`pdf_documents/${currentUser.uid}`);
        if (!snap) {
            showToast('No saved PDFs found', 'info');
            return;
        }
        const docs = Object.entries(snap).map(([k, v]) => ({ id: k, ...v }))
            .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        if (docs.length === 0) {
            showToast('No saved PDFs found', 'info');
            return;
        }
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;animation:fadeIn 0.2s;';
        overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
        overlay.innerHTML = `
            <div class="card" style="width:500px;max-width:90vw;max-height:80vh;overflow-y:auto;margin:0;animation:springIn 0.4s;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                    <div class="card-title" style="margin:0;">📂 Load PDF</div>
                    <button class="btn btn-sm btn-ghost" onclick="this.closest('.card').parentElement.remove()">✕</button>
                </div>
                ${docs.map(d => `
                    <div class="file-item" style="cursor:pointer;margin-bottom:6px;" onclick="pdfLoadDocument('${d.id}')">
                        <div class="file-icon">📄</div>
                        <div class="file-info">
                            <div class="file-name">${d.fileName || 'Unnamed'}</div>
                            <div class="file-meta">${d.pageCount || '?'} pages · ${d.createdAt ? new Date(d.createdAt).toLocaleDateString('pt-PT') : '—'}</div>
                        </div>
                        <button class="btn btn-sm btn-danger" onclick="event.stopPropagation();pdfDeleteDocument('${d.id}')">✕</button>
                    </div>
                `).join('')}
            </div>
        `;
        document.body.appendChild(overlay);
    } catch (e) {
        showToast('Error loading list: ' + e.message, 'error');
        console.error(e);
    }
};

window.pdfLoadDocument = async function(docId) {
    if (!currentUser) return;
    try {
        const data = await dbGet(`pdf_documents/${currentUser.uid}/${docId}`);
        if (!data) {
            showToast('Document not found', 'error');
            return;
        }
        pdfResetState();
        pdfState.docId = docId;
        pdfState.fileName = data.fileName || 'document.pdf';
        pdfState.pageCount = data.pageCount || 1;
        pdfState.pageNum = 1;
        pdfState.annotations = data.annotations || {};
        if (data.zoom) pdfState.zoom = data.zoom;
        if (data.downloadURL) {
            pdfState.loadedUrl = data.downloadURL;
            try {
                const response = await fetch(data.downloadURL);
                const blob = await response.blob();
                pdfState.file = new File([blob], pdfState.fileName, { type: 'application/pdf' });
                const arrayBuffer = await blob.arrayBuffer();
                const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
                const pdfDoc = await loadingTask.promise;
                pdfState.pdfDoc = pdfDoc;
                if (pdfDoc.numPages !== pdfState.pageCount) {
                    pdfState.pageCount = pdfDoc.numPages;
                }
                document.getElementById('pdf-empty').style.display = 'none';
                document.getElementById('pdf-container').style.display = 'block';
                pdfUpdateUI();
                await pdfRenderPage();
                showToast('Loaded: ' + pdfState.fileName, 'success');
            } catch (e) {
                showToast('Error downloading PDF: ' + e.message, 'error');
                console.error(e);
                pdfResetState();
            }
        }
        const overlay = document.querySelector('.card[style*="500px"]')?.parentElement;
        if (overlay) overlay.remove();
    } catch (e) {
        showToast('Error loading document: ' + e.message, 'error');
        console.error(e);
    }
};

window.pdfDeleteDocument = async function(docId) {
    if (!currentUser || !confirm('Delete this PDF document?')) return;
    try {
        const data = await dbGet(`pdf_documents/${currentUser.uid}/${docId}`);
        if (data && data.storagePath && storage) {
            try {
                await storage.ref(data.storagePath).delete();
            } catch (e) {}
        }
        await dbRemove(`pdf_documents/${currentUser.uid}/${docId}`);
        showToast('Document deleted', 'success');
        pdfLoadDialog();
    } catch (e) {
        showToast('Error deleting: ' + e.message, 'error');
    }
};
