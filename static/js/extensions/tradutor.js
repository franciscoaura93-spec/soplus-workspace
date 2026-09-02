// S&O+ Extension: Tradutor (Quick Translator)
function renderTradutor(area) {
    area.innerHTML = `
        <div class="page-header"><h2>🌐 Tradutor</h2><p>Tradução rápida</p></div>
        <div class="card" style="max-width:900px;">
            <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin-bottom:16px;">
                <div style="flex:1;min-width:140px;">
                    <label style="font-size:12px;font-weight:600;color:var(--text-light);display:block;margin-bottom:4px;">De</label>
                    <select id="trad-source-lang" class="form-input">
                        <option value="auto">🌐 Detetar idioma</option>
                        <option value="pt">🇵🇹 Português</option>
                        <option value="en">🇬🇧 Inglês</option>
                        <option value="es">🇪🇸 Espanhol</option>
                        <option value="fr">🇫🇷 Francês</option>
                        <option value="de">🇩🇪 Alemão</option>
                        <option value="it">🇮🇹 Italiano</option>
                        <option value="nl">🇳🇱 Holandês</option>
                        <option value="pl">🇵🇱 Polaco</option>
                        <option value="ru">🇷🇺 Russo</option>
                        <option value="ja">🇯🇵 Japonês</option>
                        <option value="zh">🇨🇳 Chinês</option>
                    </select>
                </div>
                <button class="btn btn-outline" id="trad-swap-btn" onclick="tradSwap()" style="margin-top:18px;padding:10px 14px;font-size:18px;" title="Trocar idiomas">⇄</button>
                <div style="flex:1;min-width:140px;">
                    <label style="font-size:12px;font-weight:600;color:var(--text-light);display:block;margin-bottom:4px;">Para</label>
                    <select id="trad-target-lang" class="form-input">
                        <option value="pt">🇵🇹 Português</option>
                        <option value="en" selected>🇬🇧 Inglês</option>
                        <option value="es">🇪🇸 Espanhol</option>
                        <option value="fr">🇫🇷 Francês</option>
                        <option value="de">🇩🇪 Alemão</option>
                        <option value="it">🇮🇹 Italiano</option>
                        <option value="nl">🇳🇱 Holandês</option>
                        <option value="pl">🇵🇱 Polaco</option>
                        <option value="ru">🇷🇺 Russo</option>
                        <option value="ja">🇯🇵 Japonês</option>
                        <option value="zh">🇨🇳 Chinês</option>
                    </select>
                </div>
            </div>
            <div id="trad-editors" style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                <div>
                    <textarea id="trad-input" class="form-input" placeholder="Texto para traduzir..." style="min-height:200px;resize:vertical;" oninput="tradUpdateCount()"></textarea>
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;">
                        <span id="trad-input-count" style="font-size:12px;color:var(--text-light);">0 caracteres</span>
                        <button class="btn btn-sm btn-outline" onclick="tradClear()" title="Limpar">✕ Limpar</button>
                    </div>
                </div>
                <div>
                    <textarea id="trad-output" class="form-input" placeholder="Tradução..." style="min-height:200px;resize:vertical;" readonly></textarea>
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;">
                        <span id="trad-output-count" style="font-size:12px;color:var(--text-light);">0 caracteres</span>
                        <button class="btn btn-sm btn-outline" onclick="tradCopy()" title="Copiar">📋 Copiar</button>
                    </div>
                </div>
            </div>
            <div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap;">
                <button class="btn btn-primary" id="trad-translate-btn" onclick="tradTranslate()">🌍 Traduzir</button>
                <span id="trad-status" style="font-size:13px;color:var(--text-light);align-self:center;"></span>
            </div>
        </div>
    `;
    tradLoadCache();
}

function tradSwap() {
    const src = document.getElementById('trad-source-lang');
    const tgt = document.getElementById('trad-target-lang');
    if (src.value === 'auto') return;
    const tmp = src.value;
    const possibleTargets = {'pt':0,'en':1,'es':2,'fr':3,'de':4,'it':5,'nl':6,'pl':7,'ru':8,'ja':9,'zh':10};
    src.value = tgt.value;
    tgt.value = tmp;
    const inp = document.getElementById('trad-input');
    const out = document.getElementById('trad-output');
    const tmpText = inp.value;
    inp.value = out.value;
    out.value = tmpText;
    tradUpdateCount();
}

function tradClear() {
    document.getElementById('trad-input').value = '';
    document.getElementById('trad-output').value = '';
    document.getElementById('trad-status').textContent = '';
    tradUpdateCount();
}

function tradUpdateCount() {
    const inp = document.getElementById('trad-input');
    const out = document.getElementById('trad-output');
    const c1 = document.getElementById('trad-input-count');
    const c2 = document.getElementById('trad-output-count');
    if (inp) c1.textContent = inp.value.length + ' caracteres';
    if (out) c2.textContent = out.value.length + ' caracteres';
}

function tradCopy() {
    const out = document.getElementById('trad-output');
    if (!out.value) return;
    navigator.clipboard.writeText(out.value).then(() => {
        showToast('📋 Tradução copiada!');
    }).catch(() => {
        out.select();
        document.execCommand('copy');
        showToast('📋 Tradução copiada!');
    });
}

function tradLoadCache() {
    try {
        const cached = JSON.parse(localStorage.getItem('tradutor_cache') || '{}');
        if (cached.source) document.getElementById('trad-source-lang').value = cached.source;
        if (cached.target) document.getElementById('trad-target-lang').value = cached.target;
    } catch(e) {}
}

function tradCacheResult(source, target, input, output) {
    try {
        const cache = JSON.parse(localStorage.getItem('tradutor_cache') || '{}');
        if (!cache.history) cache.history = [];
        cache.history.unshift({source, target, input, output, ts: Date.now()});
        if (cache.history.length > 50) cache.history.pop();
        cache.source = source;
        cache.target = target;
        localStorage.setItem('tradutor_cache', JSON.stringify(cache));
    } catch(e) {}
}

function tradLookupCache(source, target, input) {
    try {
        const cache = JSON.parse(localStorage.getItem('tradutor_cache') || '{}');
        if (!cache.history) return null;
        for (const entry of cache.history) {
            if (entry.source === source && entry.target === target && entry.input === input) {
                return entry.output;
            }
        }
    } catch(e) {}
    return null;
}

const TRAD_API_URLS = [
    'https://libretranslate.de/translate',
    'https://translate.argosopentech.com/translate'
];
let _tradApiIndex = 0;

async function tradTranslate() {
    const btn = document.getElementById('trad-translate-btn');
    const status = document.getElementById('trad-status');
    const inp = document.getElementById('trad-input');
    const out = document.getElementById('trad-output');
    const src = document.getElementById('trad-source-lang');
    const tgt = document.getElementById('trad-target-lang');

    const text = inp.value.trim();
    if (!text) {
        status.textContent = '⚠️ Insere texto para traduzir.';
        return;
    }

    const source = src.value;
    const target = tgt.value;

    const cached = tradLookupCache(source, target, text);
    if (cached) {
        out.value = cached;
        tradUpdateCount();
        status.textContent = '✅ Traduzido (cache)';
        return;
    }

    btn.disabled = true;
    btn.textContent = '⏳ A traduzir...';
    status.textContent = '';

    const body = { q: text, source, target, format: 'text' };

    let lastError = '';
    for (let i = 0; i < TRAD_API_URLS.length; i++) {
        const idx = (_tradApiIndex + i) % TRAD_API_URLS.length;
        const url = TRAD_API_URLS[idx];
        try {
            const resp = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            if (!resp.ok) {
                const errText = await resp.text().catch(() => '');
                throw new Error(`HTTP ${resp.status}: ${errText}`);
            }
            const data = await resp.json();
            const translated = data.translatedText || '';
            out.value = translated;
            tradUpdateCount();
            tradCacheResult(source, target, text, translated);
            _tradApiIndex = idx;
            status.textContent = '✅ Traduzido';
            btn.disabled = false;
            btn.textContent = '🌍 Traduzir';
            return;
        } catch (err) {
            lastError = err.message;
            console.warn(`Tradutor API ${url} falhou:`, err);
        }
    }

    status.textContent = '❌ Erro: ' + lastError;
    btn.disabled = false;
    btn.textContent = '🌍 Traduzir';
}
