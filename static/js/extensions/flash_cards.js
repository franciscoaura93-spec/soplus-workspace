// ═══════════════════════════════════════════════════════════════
// S&O+ Ultra Workspace — Flash Cards Interativos v1.0
// Flip 3D, desenhos predefinidos, IA, save/load, deck management
// ═══════════════════════════════════════════════════════════════

const FC_THEMES = [
    { id:'ocean', name:'🌊 Oceano', bg:'linear-gradient(135deg, #0c3547, #1a6b8a)', front:'#fff', back:'#fff', accent:'#67e8f9' },
    { id:'sunset', name:'🌅 Pôr do Sol', bg:'linear-gradient(135deg, #7c2d12, #c2410c)', front:'#fff', back:'#fff', accent:'#fdba74' },
    { id:'forest', name:'🌲 Floresta', bg:'linear-gradient(135deg, #14532d, #166534)', front:'#fff', back:'#fff', accent:'#86efac' },
    { id:'galaxy', name:'🌌 Galáxia', bg:'linear-gradient(135deg, #1e1b4b, #4338ca)', front:'#fff', back:'#fff', accent:'#a5b4fc' },
    { id:'rose', name:'🌹 Rosa', bg:'linear-gradient(135deg, #831843, #be185d)', front:'#fff', back:'#fff', accent:'#f9a8d4' },
    { id:'gold', name:'✨ Dourado', bg:'linear-gradient(135deg, #78350f, #b45309)', front:'#fff', back:'#fff', accent:'#fcd34d' },
    { id:'midnight', name:'🌙 Meia-noite', bg:'linear-gradient(135deg, #0f172a, #1e293b)', front:'#e2e8f0', back:'#e2e8f0', accent:'#818cf8' },
    { id:'aurora', name:'💫 Aurora', bg:'linear-gradient(135deg, #064e3b, #0e7490, #6d28d9)', front:'#fff', back:'#fff', accent:'#a7f3d0' },
    { id:'candy', name:'🍬 Doce', bg:'linear-gradient(135deg, #be185d, #7c3aed, #2563eb)', front:'#fff', back:'#fff', accent:'#f0abfc' },
    { id:'fire', name:'🔥 Fogo', bg:'linear-gradient(135deg, #991b1b, #dc2626, #ea580c)', front:'#fff', back:'#fff', accent:'#fca5a5' }
];

const FC_ICONS = ['📚','🧠','💡','🎯','✅','❓','🔢','🧪','🌍','📖','✏️','🎨','🔬','📐','🎵'];

let fcState = {
    deck: [],
    currentIdx: 0,
    flipped: false,
    theme: FC_THEMES[0],
    deckName: 'Novo Deck',
    editing: false,
    studyMode: false,
    correctCount: 0,
    wrongCount: 0,
    shuffled: false
};

function renderFlashCards(area, ext) {
    area.innerHTML = `
    <div style="max-width:900px;margin:0 auto;padding:24px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;flex-wrap:wrap;gap:12px;">
        <div>
          <h2 style="font-size:20px;font-weight:700;">${ext.icon||'🃏'} ${ext.name||'Flash Cards'}</h2>
          <p style="font-size:13px;color:var(--text-light);margin-top:4px;">Cria flashcards interativos com IA e estuda com flip 3D</p>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-outline" onclick="fcNewDeck()" style="font-size:12px;">+ Novo Deck</button>
          <button class="btn btn-outline" onclick="fcLoadDeck()" style="font-size:12px;">📂 Carregar</button>
        </div>
      </div>

      <div id="fc-creator" style="background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:24px;margin-bottom:24px;">
        <h3 style="font-size:15px;font-weight:700;margin-bottom:16px;">✨ Criar Flash Cards</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
          <div class="form-group">
            <label style="font-size:12px;font-weight:600;color:var(--text-light);text-transform:uppercase;letter-spacing:0.5px;">Tema / Matéria</label>
            <input id="fc-topic" placeholder="Ex: Equações do 2º grau" style="width:100%;padding:10px 14px;background:var(--card);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:14px;margin-top:6px;">
          </div>
          <div class="form-group">
            <label style="font-size:12px;font-weight:600;color:var(--text-light);text-transform:uppercase;letter-spacing:0.5px;">Número de Cards</label>
            <select id="fc-count" style="width:100%;padding:10px 14px;background:var(--card);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:14px;margin-top:6px;">
              <option value="5">5 cards</option><option value="10" selected>10 cards</option><option value="15">15 cards</option><option value="20">20 cards</option>
            </select>
          </div>
        </div>
        <div class="form-group" style="margin-top:12px;">
          <label style="font-size:12px;font-weight:600;color:var(--text-light);text-transform:uppercase;letter-spacing:0.5px;">Ou cola texto para gerar cards</label>
          <textarea id="fc-text" rows="4" placeholder="Cola aqui o texto que queres transformar em flash cards..." style="width:100%;padding:10px 14px;background:var(--card);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:14px;margin-top:6px;resize:vertical;"></textarea>
        </div>
        <div style="display:flex;gap:10px;margin-top:16px;align-items:center;">
          <button class="btn btn-primary" onclick="fcGenerateAI()" style="font-size:13px;">🤖 Gerar com IA</button>
          <button class="btn btn-outline" onclick="fcAddManual()" style="font-size:13px;">✏️ Adicionar Manual</button>
          <div style="flex:1;"></div>
          <label style="font-size:12px;color:var(--text-light);">Tema:</label>
          <select id="fc-theme-select" onchange="fcChangeTheme(this.value)" style="padding:6px 10px;background:var(--card);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:12px;">
            ${FC_THEMES.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
          </select>
        </div>
      </div>

      <div id="fc-deck-info" style="display:none;margin-bottom:16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <div style="display:flex;align-items:center;gap:12px;">
            <h3 id="fc-deck-title" style="font-size:16px;font-weight:700;"></h3>
            <span id="fc-deck-count" style="font-size:12px;color:var(--text-light);background:var(--card);padding:4px 10px;border-radius:8px;"></span>
          </div>
          <div style="display:flex;gap:8px;">
            <button class="btn btn-outline" onclick="fcStudyMode()" style="font-size:12px;">🎓 Estudar</button>
            <button class="btn btn-outline" onclick="fcSaveDeck()" style="font-size:12px;">💾 Guardar</button>
            <button class="btn btn-outline" onclick="fcExportDeck()" style="font-size:12px;">📤 Exportar</button>
          </div>
        </div>
        <div id="fc-cards-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px;"></div>
      </div>

      <div id="fc-study" style="display:none;"></div>
    </div>`;

    fcRenderDeck();
}

function fcNewDeck() {
    fcState.deck = [];
    fcState.currentIdx = 0;
    fcState.deckName = 'Novo Deck';
    fcState.studyMode = false;
    fcState.correctCount = 0;
    fcState.wrongCount = 0;
    document.getElementById('fc-deck-info').style.display = 'none';
    document.getElementById('fc-study').style.display = 'none';
    document.getElementById('fc-creator').style.display = 'block';
}

async function fcGenerateAI() {
    const topic = document.getElementById('fc-topic').value.trim();
    const text = document.getElementById('fc-text').value.trim();
    const count = document.getElementById('fc-count').value;
    if (!topic && !text) { showToast('Indica um tema ou cola texto', 'error'); return; }

    const prompt = text
        ? `Gera EXATAMENTE ${count} flashcards a partir do seguinte texto. Para cada card, dá o "front" (pergunta breve) e o "back" (resposta concisa). Responde em JSON válido: [{"front":"...","back":"..."}]\n\nTEXTO:\n${text}`
        : `Gera EXATAMENTE ${count} flashcards sobre: ${topic}. Para cada card, dá o "front" (pergunta breve) e o "back" (resposta concisa). Responde em JSON válido: [{"front":"...","back":"..."}]`;

    const el = document.getElementById('fc-deck-info');
    el.style.display = 'block';
    document.getElementById('fc-cards-grid').innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-light);"><div class="spinner" style="margin:0 auto 12px;"></div>A gerar flash cards com IA...</div>';

    try {
        const raw = await callAI(prompt);
        const jsonMatch = raw.match(/\[[\s\S]*\]/);
        if (!jsonMatch) throw new Error('Resposta IA inválida');
        const cards = JSON.parse(jsonMatch[0]);
        fcState.deck = cards.map((c, i) => ({
            id: Date.now() + i,
            front: c.front || c.question || c.pergunta || '?',
            back: c.back || c.answer || c.resposta || '?',
            icon: FC_ICONS[i % FC_ICONS.length]
        }));
        fcState.deckName = topic || 'Flash Cards IA';
        fcState.currentIdx = 0;
        fcRenderDeck();
        showToast(`🃏 ${fcState.deck.length} flash cards criados!`, 'success');
    } catch(e) {
        document.getElementById('fc-cards-grid').innerHTML = `<div style="grid-column:1/-1;color:var(--danger);padding:20px;">❌ ${e.message}. Tenta gerar novamente.</div>`;
    }
}

function fcAddManual() {
    const front = prompt('Frente do card (pergunta):');
    if (!front) return;
    const back = prompt('Verso do card (resposta):');
    if (!back) return;
    fcState.deck.push({
        id: Date.now(),
        front, back,
        icon: FC_ICONS[fcState.deck.length % FC_ICONS.length]
    });
    fcRenderDeck();
}

function fcRenderDeck() {
    const info = document.getElementById('fc-deck-info');
    const grid = document.getElementById('fc-cards-grid');
    if (!info || !grid) return;
    if (fcState.deck.length === 0) { info.style.display = 'none'; return; }
    info.style.display = 'block';
    document.getElementById('fc-deck-title').textContent = fcState.deckName;
    document.getElementById('fc-deck-count').textContent = `${fcState.deck.length} cards`;
    grid.innerHTML = fcState.deck.map((card, i) => `
      <div class="fc-mini-card" onclick="fcStudyAt(${i})" style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:16px;cursor:pointer;transition:all 0.2s;position:relative;min-height:120px;display:flex;flex-direction:column;justify-content:center;text-align:center;"
        onmouseover="this.style.borderColor='rgba(99,102,241,0.4)';this.style.transform='translateY(-2px)'"
        onmouseout="this.style.borderColor='var(--border)';this.style.transform='none'">
        <div style="position:absolute;top:8px;right:8px;font-size:16px;">${card.icon}</div>
        <div style="position:absolute;top:8px;left:8px;font-size:10px;color:var(--text-light);">#${i+1}</div>
        <div style="font-size:14px;font-weight:600;margin-bottom:8px;line-height:1.4;">${card.front}</div>
        <div style="font-size:12px;color:var(--text-light);line-height:1.3;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;">${card.back}</div>
        <div style="margin-top:8px;">
          <button onclick="event.stopPropagation();fcEditCard(${i})" style="font-size:10px;padding:2px 8px;background:var(--bg);border:1px solid var(--border);border-radius:4px;color:var(--text-light);cursor:pointer;">✏️</button>
          <button onclick="event.stopPropagation();fcDeleteCard(${i})" style="font-size:10px;padding:2px 8px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.2);border-radius:4px;color:#ef4444;cursor:pointer;margin-left:4px;">🗑️</button>
        </div>
      </div>
    `).join('');
}

function fcEditCard(i) {
    const card = fcState.deck[i];
    const newFront = prompt('Frente do card:', card.front);
    if (newFront === null) return;
    const newBack = prompt('Verso do card:', card.back);
    if (newBack === null) return;
    card.front = newFront;
    card.back = newBack;
    fcRenderDeck();
}

function fcDeleteCard(i) {
    if (!confirm('Eliminar este card?')) return;
    fcState.deck.splice(i, 1);
    fcRenderDeck();
}

// ── Study Mode with 3D Flip ──
function fcStudyMode() {
    if (fcState.deck.length === 0) return showToast('Adiciona cards primeiro', 'warning');
    fcState.studyMode = true;
    fcState.currentIdx = 0;
    fcState.flipped = false;
    fcState.correctCount = 0;
    fcState.wrongCount = 0;
    fcState.shuffled = false;
    document.getElementById('fc-creator').style.display = 'none';
    document.getElementById('fc-deck-info').style.display = 'none';
    fcRenderStudy();
}

function fcStudyAt(i) {
    fcStudyMode();
    fcState.currentIdx = i;
    fcRenderStudy();
}

function fcRenderStudy() {
    const el = document.getElementById('fc-study');
    el.style.display = 'block';
    const t = fcState.theme;
    const card = fcState.deck[fcState.currentIdx];
    const total = fcState.deck.length;
    const progress = ((fcState.currentIdx + 1) / total * 100).toFixed(0);
    const flipped = fcState.flipped;

    el.innerHTML = `
      <div style="text-align:center;margin-bottom:20px;">
        <div style="display:flex;justify-content:center;align-items:center;gap:16px;margin-bottom:12px;">
          <button class="btn btn-outline" onclick="fcExitStudy()" style="font-size:12px;">✕ Sair</button>
          <span style="font-size:14px;font-weight:600;">${fcState.currentIdx+1} / ${total}</span>
          <span style="font-size:12px;color:var(--text-light);">✅ ${fcState.correctCount} | ❌ ${fcState.wrongCount}</span>
        </div>
        <div style="width:100%;max-width:500px;height:6px;background:var(--card);border-radius:3px;margin:0 auto;overflow:hidden;">
          <div style="width:${progress}%;height:100%;background:linear-gradient(90deg,var(--primary),var(--accent));border-radius:3px;transition:width 0.3s;"></div>
        </div>
      </div>

      <div style="perspective:1000px;width:100%;max-width:560px;margin:0 auto;cursor:pointer;" onclick="fcFlip()">
        <div id="fc-flip-inner" style="position:relative;width:100%;min-height:320px;transition:transform 0.6s cubic-bezier(0.4,0,0.2,1);transform-style:preserve-3d;transform:${flipped ? 'rotateY(180deg)' : 'rotateY(0)'};">
          <div id="fc-front" style="position:absolute;width:100%;min-height:320px;backface-visibility:hidden;background:${t.bg};border-radius:20px;padding:40px 32px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,0.3);">
            <div style="font-size:40px;margin-bottom:20px;">${card.icon}</div>
            <div style="font-size:22px;font-weight:700;color:${t.front};line-height:1.4;max-width:400px;">${card.front}</div>
            <div style="margin-top:24px;font-size:12px;color:rgba(255,255,255,0.4);">Clica para ver a resposta</div>
          </div>
          <div id="fc-back" style="position:absolute;width:100%;min-height:320px;backface-visibility:hidden;transform:rotateY(180deg);background:${t.bg};border-radius:20px;padding:40px 32px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,0.3);">
            <div style="font-size:40px;margin-bottom:20px;">💡</div>
            <div style="font-size:20px;font-weight:600;color:${t.back};line-height:1.5;max-width:400px;">${card.back}</div>
          </div>
        </div>
      </div>

      <div style="display:flex;justify-content:center;gap:16px;margin-top:32px;">
        <button class="btn btn-outline" onclick="fcPrev()" ${fcState.currentIdx===0?'disabled style="opacity:0.3;"':''} style="font-size:13px;">← Anterior</button>
        <button class="btn btn-outline" onclick="fcShuffle()" style="font-size:13px;">🔀 Embaralhar</button>
        <button class="btn btn-primary" onclick="fcNext()" ${fcState.currentIdx>=total-1?'disabled style="opacity:0.3;"':''} style="font-size:13px;">Próximo →</button>
      </div>

      ${flipped ? `
      <div style="display:flex;justify-content:center;gap:12px;margin-top:20px;">
        <button onclick="fcMarkWrong()" style="padding:10px 24px;border-radius:10px;background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.3);color:#ef4444;font-weight:600;cursor:pointer;font-size:13px;">❌ Não sei</button>
        <button onclick="fcMarkCorrect()" style="padding:10px 24px;border-radius:10px;background:rgba(34,197,94,0.15);border:1px solid rgba(34,197,94,0.3);color:#22c55e;font-weight:600;cursor:pointer;font-size:13px;">✅ Sei!</button>
      </div>` : ''}

      ${fcState.currentIdx >= total-1 && fcState.flipped ? `
      <div style="text-align:center;margin-top:32px;padding:24px;background:var(--surface);border-radius:16px;border:1px solid var(--border);max-width:500px;margin-left:auto;margin-right:auto;">
        <div style="font-size:36px;margin-bottom:12px;">🎉</div>
        <h3 style="font-size:18px;font-weight:700;margin-bottom:8px;">Deck Concluído!</h3>
        <p style="font-size:14px;color:var(--text-light);margin-bottom:16px;">✅ ${fcState.correctCount} corretas | ❌ ${fcState.wrongCount} erradas</p>
        <div style="display:flex;gap:10px;justify-content:center;">
          <button class="btn btn-primary" onclick="fcStudyMode()" style="font-size:13px;">🔄 Estudar Novamente</button>
          <button class="btn btn-outline" onclick="fcExitStudy()" style="font-size:13px;">✕ Sair</button>
        </div>
      </div>` : ''}
    `;
}

function fcFlip() {
    fcState.flipped = !fcState.flipped;
    fcRenderStudy();
}

function fcNext() {
    if (fcState.currentIdx < fcState.deck.length - 1) {
        fcState.currentIdx++;
        fcState.flipped = false;
        fcRenderStudy();
    }
}

function fcPrev() {
    if (fcState.currentIdx > 0) {
        fcState.currentIdx--;
        fcState.flipped = false;
        fcRenderStudy();
    }
}

function fcMarkCorrect() {
    fcState.correctCount++;
    fcNext();
}

function fcMarkWrong() {
    fcState.wrongCount++;
    fcNext();
}

function fcShuffle() {
    const deck = [...fcState.deck];
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    fcState.deck = deck;
    fcState.currentIdx = 0;
    fcState.flipped = false;
    fcRenderStudy();
    showToast('🔀 Cards embaralhados!', 'success');
}

function fcExitStudy() {
    fcState.studyMode = false;
    document.getElementById('fc-study').style.display = 'none';
    document.getElementById('fc-creator').style.display = 'block';
    fcRenderDeck();
}

// ── Theme ──
function fcChangeTheme(id) {
    fcState.theme = FC_THEMES.find(t => t.id === id) || FC_THEMES[0];
    if (fcState.studyMode) fcRenderStudy();
}

// ── Save / Load ──
async function fcSaveDeck() {
    if (fcState.deck.length === 0) return showToast('Deck vazio', 'warning');
    const name = prompt('Nome do deck:', fcState.deckName) || fcState.deckName;
    fcState.deckName = name;
    const data = { name, theme: fcState.theme.id, cards: fcState.deck, savedAt: Date.now() };
    try {
        if (typeof currentUser !== 'undefined' && currentUser?.uid) {
            await db.ref(`flashcards/${currentUser.uid}`).push(data);
            showToast('💾 Deck guardado!', 'success');
        } else {
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `${name.replace(/[^a-z0-9]/gi,'_')}.json`;
            a.click();
            showToast('📁 Ficheiro descarregado!', 'success');
        }
    } catch(e) { showToast('Erro: ' + e.message, 'error'); }
}

async function fcLoadDeck() {
    try {
        if (typeof currentUser !== 'undefined' && currentUser?.uid) {
            const snap = await db.ref(`flashcards/${currentUser.uid}`).once('value');
            const decks = snap.val();
            if (!decks) return showToast('Nenhum deck guardado', 'warning');
            const entries = Object.entries(decks);
            if (entries.length === 1) {
                const d = entries[0][1];
                fcApplyDeck(d);
            } else {
                const list = entries.map(([k,v],i) => `${i+1}. ${v.name} (${v.cards?.length||0} cards)`).join('\n');
                const choice = prompt(`Escolhe um deck (1-${entries.length}):\n\n${list}`);
                if (!choice) return;
                const idx = parseInt(choice) - 1;
                if (idx >= 0 && idx < entries.length) fcApplyDeck(entries[idx][1]);
            }
        } else {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = e => {
                const reader = new FileReader();
                reader.onload = ev => {
                    try { fcApplyDeck(JSON.parse(ev.target.result)); }
                    catch(err) { showToast('Ficheiro inválido', 'error'); }
                };
                reader.readAsText(e.target.files[0]);
            };
            input.click();
        }
    } catch(e) { showToast('Erro: ' + e.message, 'error'); }
}

function fcApplyDeck(d) {
    fcState.deckName = d.name || 'Deck Carregado';
    fcState.deck = d.cards || [];
    if (d.theme) fcState.theme = FC_THEMES.find(t => t.id === d.theme) || FC_THEMES[0];
    fcState.currentIdx = 0;
    fcState.flipped = false;
    fcRenderDeck();
    showToast(`🃏 "${fcState.deckName}" carregado!`, 'success');
}

function fcExportDeck() {
    if (fcState.deck.length === 0) return showToast('Deck vazio', 'warning');
    let md = `# ${fcState.deckName}\n\n`;
    fcState.deck.forEach((c, i) => {
        md += `### Card ${i+1}\n**Pergunta:** ${c.front}\n\n**Resposta:** ${c.back}\n\n---\n\n`;
    });
    const blob = new Blob([md], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${fcState.deckName.replace(/[^a-z0-9]/gi,'_')}.md`;
    a.click();
    showToast('📤 Deck exportado como Markdown!', 'success');
}
