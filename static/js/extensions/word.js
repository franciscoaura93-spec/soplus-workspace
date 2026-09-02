window.renderWord = function(area) {
    const docId = localStorage.getItem('soplus_word_current') || null;
    let wordContent = '';
    area.innerHTML = `
        <div class="page-header" style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;">
            <div><h2>📝 Word</h2><p id="word-stats">Editor de texto rico</p></div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <button class="btn btn-sm ${window._wordDictating ? 'btn-danger' : 'btn-outline'}" id="word-dictate-btn" onclick="wordToggleDictation()">🎤 ${window._wordDictating ? 'Parar' : 'Dictar'}</button>
                <button class="btn btn-sm btn-primary" onclick="wordSave()">💾 Guardar</button>
                <button class="btn btn-sm btn-outline" onclick="wordLoad()">📂 Carregar</button>
                <button class="btn btn-sm btn-outline" onclick="wordExport()">📥 Exportar TXT</button>
            </div>
        </div>
        <div class="card" style="max-width:960px;margin:0 auto;padding:0;overflow:hidden;">
            <div id="word-toolbar" style="padding:8px 12px;display:flex;gap:4px;flex-wrap:wrap;border-bottom:1px solid var(--border);background:var(--surface);align-items:center;position:sticky;top:0;z-index:10;">
                <button class="btn btn-sm btn-ghost" onclick="wordCmd('bold')" title="Negrito"><b>B</b></button>
                <button class="btn btn-sm btn-ghost" onclick="wordCmd('italic')" title="Itálico"><i>I</i></button>
                <button class="btn btn-sm btn-ghost" onclick="wordCmd('underline')" title="Sublinhado"><u>U</u></button>
                <button class="btn btn-sm btn-ghost" onclick="wordCmd('strikeThrough')" title="Rasurado"><s>S</s></button>
                <span style="width:1px;height:20px;background:var(--border);margin:0 4px;"></span>
                <select class="form-input" style="width:110px;padding:4px 8px;font-size:12px;" onchange="wordCmd('fontSize',this.value)">
                    <option value="1">Muito Peq.</option><option value="2">Pequeno</option>
                    <option value="3" selected>Normal</option><option value="4">Médio</option>
                    <option value="5">Grande</option><option value="6">Muito Grande</option><option value="7">Enorme</option>
                </select>
                <select class="form-input" style="width:130px;padding:4px 8px;font-size:12px;" onchange="wordCmd('fontName',this.value)">
                    <option value="Arial">Arial</option><option value="Georgia">Georgia</option>
                    <option value="Times New Roman">Times New Roman</option><option value="Courier New">Courier New</option>
                    <option value="Verdana">Verdana</option><option value="Comic Sans MS">Comic Sans</option>
                </select>
                <span style="width:1px;height:20px;background:var(--border);margin:0 4px;"></span>
                <input type="color" value="#000000" style="width:28px;height:26px;border:none;cursor:pointer;padding:0;" onchange="wordCmd('foreColor',this.value)" title="Cor do texto">
                <input type="color" value="#ffff00" style="width:28px;height:26px;border:none;cursor:pointer;padding:0;" onchange="wordCmd('hiliteColor',this.value)" title="Cor de realce">
                <span style="width:1px;height:20px;background:var(--border);margin:0 4px;"></span>
                <button class="btn btn-sm btn-ghost" onclick="wordCmd('justifyLeft')" title="Alinhar à esquerda">≡</button>
                <button class="btn btn-sm btn-ghost" onclick="wordCmd('justifyCenter')" title="Centrar">≡</button>
                <button class="btn btn-sm btn-ghost" onclick="wordCmd('justifyRight')" title="Alinhar à direita">≡</button>
                <span style="width:1px;height:20px;background:var(--border);margin:0 4px;"></span>
                <button class="btn btn-sm btn-ghost" onclick="wordCmd('insertUnorderedList')" title="Lista não ordenada">•</button>
                <button class="btn btn-sm btn-ghost" onclick="wordCmd('insertOrderedList')" title="Lista ordenada">1.</button>
                <button class="btn btn-sm btn-ghost" onclick="wordCmd('outdent')" title="Recuar menos">⇤</button>
                <button class="btn btn-sm btn-ghost" onclick="wordCmd('indent')" title="Recuar mais">⇥</button>
                <span style="width:1px;height:20px;background:var(--border);margin:0 4px;"></span>
                <button class="btn btn-sm btn-ghost" onclick="wordInsertLink()" title="Inserir link">🔗</button>
                <button class="btn btn-sm btn-ghost" onclick="wordInsertImage()" title="Inserir imagem">🖼️</button>
                <span style="width:1px;height:20px;background:var(--border);margin:0 4px;"></span>
                <button class="btn btn-sm btn-ghost" onclick="wordCmd('undo')" title="Desfazer">↩</button>
                <button class="btn btn-sm btn-ghost" onclick="wordCmd('redo')" title="Refazer">↪</button>
            </div>
            <div id="word-editor" contenteditable="true" style="min-height:520px;padding:40px;font-size:15px;line-height:1.8;color:var(--text);outline:none;background:var(--bg);font-family:Georgia,serif;" oninput="wordUpdateStats()">
                <h1 style="text-align:center;margin-bottom:20px;">Documento</h1>
                <p>Escreve aqui o teu documento...</p>
            </div>
            <div style="padding:10px 16px;border-top:1px solid var(--border);display:flex;gap:20px;font-size:12px;color:var(--text-light);background:var(--surface);">
                <span id="word-count">Palavras: 0</span>
                <span id="char-count">Caracteres: 0</span>
                <span id="word-autosave" style="margin-left:auto;"></span>
            </div>
        </div>
    `;
    wordUpdateStats();
    if (docId) wordLoadById(docId);
    window._wordAutoSave = setInterval(wordAutoSave, 60000);
};

function wordUpdateStats() {
    const el = document.getElementById('word-editor');
    if (!el) return;
    const text = el.innerText || '';
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;
    const wc = document.getElementById('word-count');
    const cc = document.getElementById('char-count');
    if (wc) wc.textContent = 'Palavras: ' + words;
    if (cc) cc.textContent = 'Caracteres: ' + chars;
}

function wordCmd(cmd, val) {
    document.execCommand(cmd, false, val || null);
    document.getElementById('word-editor').focus();
    wordUpdateStats();
}

function wordInsertLink() {
    const url = prompt('URL do link:', 'https://');
    if (url) wordCmd('createLink', url);
}

function wordInsertImage() {
    const url = prompt('URL da imagem:', 'https://');
    if (url) wordCmd('insertImage', url);
}

function wordSave() {
    const content = document.getElementById('word-editor').innerHTML;
    const nome = prompt('Nome do documento:', window._wordDocName || 'Documento');
    if (!nome) return;
    window._wordDocName = nome;
    const ref = window._wordDocKey ? db.ref('word_docs/' + window._wordDocKey) : db.ref('word_docs').push();
    window._wordDocKey = ref.key || window._wordDocKey;
    ref.set({ nome, content, autorId: currentUser.uid, autorNome: userProfile?.nome, updatedAt: Date.now(), createdAt: window._wordDocCreatedAt || Date.now() });
    localStorage.setItem('soplus_word_current', window._wordDocKey || '');
    showToast('Documento guardado!', 'success');
    document.getElementById('word-autosave').textContent = '💾 Guardado às ' + new Date().toLocaleTimeString('pt-PT');
}

function wordAutoSave() {
    const el = document.getElementById('word-editor');
    if (!el || !window._wordDocKey) return;
    const content = el.innerHTML;
    db.ref('word_docs/' + window._wordDocKey).update({ content, updatedAt: Date.now() });
    document.getElementById('word-autosave').textContent = '💾 Auto-salvo às ' + new Date().toLocaleTimeString('pt-PT');
}

async function wordLoad() {
    const snap = await dbGet('word_docs');
    const docs = snap ? Object.entries(snap).filter(([k,v]) => v.autorId === currentUser.uid).map(([k,v]) => ({id:k,...v})) : [];
    if (docs.length === 0) return showToast('Sem documentos guardados', 'error');
    const choice = prompt('Documentos:\n' + docs.map((d,i) => `${i+1}. ${d.nome} (${d.updatedAt ? new Date(d.updatedAt).toLocaleDateString('pt-PT') : ''})`).join('\n') + '\n\nNúmero:');
    const d = docs[parseInt(choice) - 1];
    if (d) wordLoadDoc(d);
}

function wordLoadDoc(d) {
    const el = document.getElementById('word-editor');
    if (!el) return;
    el.innerHTML = d.content || '';
    window._wordDocKey = d.id;
    window._wordDocName = d.nome;
    window._wordDocCreatedAt = d.createdAt;
    localStorage.setItem('soplus_word_current', d.id);
    wordUpdateStats();
    showToast('Carregado: ' + d.nome, 'success');
}

function wordLoadById(id) {
    db.ref('word_docs/' + id).once('value', snap => {
        const d = snap.val();
        if (d) wordLoadDoc({ id, ...d });
    });
}

function wordExport() {
    const el = document.getElementById('word-editor');
    if (!el) return;
    const text = el.innerText || '';
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (window._wordDocName || 'documento') + '.txt';
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('Exportado como TXT!', 'success');
}

function wordToggleDictation() {
    if (window._wordDictating) {
        if (window._wordRecognition) { window._wordRecognition.stop(); window._wordRecognition = null; }
        window._wordDictating = false;
        const btn = document.getElementById('word-dictate-btn');
        if (btn) { btn.textContent = '🎤 Dictar'; btn.className = 'btn btn-sm btn-outline'; }
        showToast('Dictação parada', 'info');
        return;
    }
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        return showToast('Reconhecimento de voz não suportado neste browser', 'error');
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SR();
    recognition.lang = 'pt-PT';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = function(e) {
        const el = document.getElementById('word-editor');
        if (!el) return;
        for (let i = e.resultIndex; i < e.results.length; i++) {
            if (e.results[i].isFinal) {
                const text = e.results[i][0].transcript;
                el.focus();
                document.execCommand('insertText', false, text + ' ');
            }
        }
        wordUpdateStats();
    };
    recognition.onerror = function(e) {
        showToast('Erro: ' + e.error, 'error');
        wordToggleDictation();
    };
    recognition.start();
    window._wordRecognition = recognition;
    window._wordDictating = true;
    const btn = document.getElementById('word-dictate-btn');
    if (btn) { btn.textContent = '🎤 Parar'; btn.className = 'btn btn-sm btn-danger'; }
    showToast('🎤 A ditar... Fala em Português', 'success');
}

// Cleanup when leaving page
const _origRenderWord = window.renderWord;
window.renderWord = function(area) {
    if (window._wordAutoSave) clearInterval(window._wordAutoSave);
    if (window._wordRecognition) { window._wordRecognition.stop(); window._wordRecognition = null; }
    window._wordDictating = false;
    _origRenderWord(area);
};
