// S&O+ Extension: Configurações / Perfil — Feature Toggles & Personalização
const FEATURES = [
  { id:'dashboard',     icon:'🏠', name:'Dashboard',     desc:'Página inicial com estatísticas' },
  { id:'horarios',      icon:'🗓️', name:'Horários',      desc:'Grade horária da turma' },
  { id:'notas',         icon:'📊', name:'Notas',          desc:'Visualização de notas' },
  { id:'provas',        icon:'📝', name:'Provas',         desc:'Testes e exames' },
  { id:'ficheiros',     icon:'📁', name:'Ficheiros',      desc:'Upload e download de ficheiros' },
  { id:'chat',          icon:'💬', name:'Chat',           desc:'Mensagens da turma' },
  { id:'video',         icon:'📹', name:'Sala Vídeo',     desc:'Videoconferência Jitsi' },
  { id:'estudar',       icon:'🎵', name:'Estudar',        desc:'Música e foco' },
  { id:'estudio_ia',    icon:'🤖', name:'Estúdio IA',     desc:'Ferramentas de IA' },
  { id:'recursos',      icon:'🎓', name:'Recursos',       desc:'Painel do professor' },
  { id:'faltas',        icon:'📋', name:'Faltas',         desc:'Registo de faltas' },
  { id:'sumarios',      icon:'📖', name:'Sumários',       desc:'Resumos das aulas' },
  { id:'ide',           icon:'💻', name:'IDE',            desc:'Editor de código' },
  { id:'colaboracao',   icon:'👥', name:'Colaboração',    desc:'Projetos em grupo' },
  { id:'excel',         icon:'📊', name:'Excel',          desc:'Folha de cálculo' },
  { id:'word',          icon:'📝', name:'Word',           desc:'Processador de texto' },
  { id:'powerpoint',    icon:'📽️', name:'PowerPoint',     desc:'Apresentações' },
  { id:'desenho',       icon:'🎨', name:'Desenho',        desc:'Área de desenho' },
  { id:'mail',          icon:'✉️', name:'Mail',           desc:'Sistema de mensagens' },
  { id:'tradutor',      icon:'🌐', name:'Tradutor',       desc:'Tradução rápida' },
  { id:'pdf',           icon:'📄', name:'PDF',            desc:'Editor de PDF' },
  { id:'estudo_ia',     icon:'🧠', name:'Estudo IA',      desc:'Assistente de estudo inteligente' },
  { id:'livros',        icon:'📚', name:'Livros',         desc:'Recomendações de livros' },
  { id:'cadernos',      icon:'📓', name:'Cadernos',       desc:'Cadernos de escrita com flip de páginas' },
  { id:'cursor_efeitos',icon:'🖱️', name:'Efeitos Cursor', desc:'Partículas e cursor personalizado' },
  { id:'particulas',    icon:'✨', name:'Partículas Fundo',desc:'Partículas animadas' }
];

let _cfgFeatures = {};
let _cfgLoading = true;

function _cfgPath() {
  return `user_settings/${currentUser ? currentUser.uid : 'anonymous'}/features`;
}

async function _cfgLoad() {
  if (!currentUser) {
    _cfgLoading = false;
    return;
  }
  try {
    const snap = await dbGet(_cfgPath());
    _cfgFeatures = snap || {};
  } catch(e) {
    console.warn('Config: erro ao carregar definições:', e);
    _cfgFeatures = {};
  }
  _cfgLoading = false;
}

async function _cfgSave(featureId, value) {
  if (!currentUser) return;
  _cfgFeatures[featureId] = value;
  try {
    await dbUpdate(_cfgPath(), { [featureId]: !!value });
  } catch(e) {
    showToast('Erro ao guardar: ' + e.message, 'error');
  }
}

// Override buildNav to respect disabled features
(function() {
  const _origBuildNav = window.buildNav;
  window.buildNav = function() {
    if (typeof _origBuildNav === 'function') _origBuildNav();
    if (_cfgLoading) return;
    document.querySelectorAll('.nav-item').forEach(el => {
      const id = el.id.replace('nav-', '');
      if (_cfgFeatures[id] === false && id !== 'perfil' && id !== 'configuracoes') {
        el.style.display = 'none';
      } else {
        el.style.display = '';
      }
    });
  };
})();

function _cfgToggle(featureId, enabled) {
  _cfgSave(featureId, enabled);
  setTimeout(() => { if (typeof buildNav === 'function') buildNav(); }, 50);
}

function renderConfiguracoes(area) {
  _cfgLoad().then(() => {
    _renderCfg(area);
  });
}

window.renderConfiguracoes = renderConfiguracoes;

function _renderCfg(area) {
  const cursorSettings = JSON.parse(localStorage.getItem('soplus_cursor_settings') || '{"glow":true,"trailSize":1,"color":"#2563EB"}');
  const particleSettings = JSON.parse(localStorage.getItem('soplus_particle_settings') || '{"density":50,"color":"#2563EB"}');
  const currentTheme = localStorage.getItem('soplus_theme') || 'dark';
  const searchPlaceholder = '🔍 Procurar funcionalidade...';

  let featuresHtml = FEATURES.map(f => {
    const enabled = _cfgFeatures[f.id] !== false;
    return `
      <div class="cfg-card" data-feature="${f.id}" style="display:none;">
        <div class="cfg-card-left">
          <span class="cfg-card-icon">${f.icon}</span>
          <div>
            <div class="cfg-card-name">${f.name}</div>
            <div class="cfg-card-desc">${f.desc}</div>
          </div>
        </div>
        <label class="cfg-toggle">
          <input type="checkbox" ${enabled ? 'checked' : ''} onchange="_cfgToggle('${f.id}', this.checked)">
          <span class="cfg-toggle-slider"></span>
        </label>
      </div>`;
  }).join('');

  area.innerHTML = `
    <style>
      .cfg-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; }
      .cfg-card { background:var(--surface); border:1px solid var(--border); border-radius:var(--radius-lg); padding:18px 20px; display:flex; align-items:center; justify-content:space-between; gap:14px; transition:all .4s cubic-bezier(.16,1,.3,1); position:relative; overflow:hidden; }
      .cfg-card:hover { border-color:var(--border-hover); transform:translateY(-2px); box-shadow:var(--shadow-md); }
      .cfg-card::before { content:''; position:absolute; inset:0; border-radius:inherit; background:radial-gradient(circle at var(--mouse-x,50%) var(--mouse-y,50%),rgba(37,99,235,0.05) 0%,transparent 60%); opacity:0; transition:opacity .4s; pointer-events:none; }
      .cfg-card:hover::before { opacity:1; }
      .cfg-card-left { display:flex; align-items:center; gap:14px; flex:1; min-width:0; }
      .cfg-card-icon { font-size:26px; flex-shrink:0; }
      .cfg-card-name { font-weight:600; font-size:14px; }
      .cfg-card-desc { font-size:12px; color:var(--text-light); margin-top:2px; }

      .cfg-toggle { position:relative; display:inline-block; width:46px; height:26px; flex-shrink:0; cursor:pointer; }
      .cfg-toggle input { opacity:0; width:0; height:0; }
      .cfg-toggle-slider { position:absolute; inset:0; background:rgba(255,255,255,0.1); border-radius:26px; transition:all .35s cubic-bezier(.16,1,.3,1); }
      .cfg-toggle-slider::before { content:''; position:absolute; left:3px; top:3px; width:20px; height:20px; background:white; border-radius:50%; transition:all .35s cubic-bezier(.16,1,.3,1); box-shadow:0 2px 8px rgba(0,0,0,0.3); }
      .cfg-toggle input:checked + .cfg-toggle-slider { background:var(--primary); box-shadow:0 0 20px rgba(37,99,235,0.3); }
      .cfg-toggle input:checked + .cfg-toggle-slider::before { transform:translateX(20px); background:white; }
      .cfg-toggle input:focus-visible + .cfg-toggle-slider { outline:2px solid var(--primary); outline-offset:2px; }

      .cfg-section { margin-bottom:30px; }
      .cfg-section-title { font-size:18px; font-weight:700; margin-bottom:16px; display:flex; align-items:center; gap:10px; }
      .cfg-section-title small { font-weight:400; font-size:13px; color:var(--text-light); }
      .cfg-theme-btn { padding:12px 18px; border-radius:12px; border:1.5px solid var(--border); background:var(--surface); color:var(--text); font-size:14px; font-weight:600; cursor:pointer; transition:all .3s; font-family:inherit; display:flex; align-items:center; gap:8px; }
      .cfg-theme-btn:hover { border-color:var(--border-hover); transform:translateY(-1px); }
      .cfg-theme-btn.active { border-color:var(--primary); background:rgba(37,99,235,0.1); color:var(--primary); box-shadow:0 0 20px rgba(37,99,235,0.15); }
      .cfg-import-area { border:2px dashed var(--border); border-radius:var(--radius-lg); padding:40px; text-align:center; transition:all .3s; cursor:pointer; }
      .cfg-import-area:hover { border-color:var(--primary); background:rgba(37,99,235,0.03); }
      .cfg-import-area.dragover { border-color:var(--primary); background:rgba(37,99,235,0.08); }
      .cfg-slider-group { display:flex; align-items:center; gap:14px; flex-wrap:wrap; }
      .cfg-slider-group label { font-size:13px; font-weight:500; color:var(--text-light); }
      .cfg-slider-group input[type="range"] { flex:1; min-width:120px; accent-color:var(--primary); }
      .cfg-slider-group input[type="color"] { width:36px; height:36px; border:none; border-radius:8px; cursor:pointer; background:none; padding:0; }

      @media (max-width:1024px) { .cfg-grid { grid-template-columns:repeat(2,1fr); } }
      @media (max-width:640px) { .cfg-grid { grid-template-columns:1fr; } }
    </style>

    <div class="page-header">
      <h2>⚙️ Configurações</h2>
      <p>Personaliza o teu workspace: ativa/desativa funcionalidades, efeitos visuais e tema</p>
    </div>

    <div class="cfg-section">
      <div class="cfg-section-title">🔧 Funcionalidades <small>— ativa ou desativa cada módulo</small></div>
      <input type="text" class="form-input" id="cfg-search" placeholder="${searchPlaceholder}" style="margin-bottom:16px;" oninput="_cfgFilter(this.value)">
      <div class="cfg-grid" id="cfg-features-grid">
        ${featuresHtml}
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
      <div class="card">
        <div class="card-title">🖱️ Efeitos Cursor</div>
        <div class="cfg-slider-group" style="margin-bottom:14px;">
          <label>Brilho</label>
          <select class="form-input" id="cfg-cursor-glow" style="flex:1;" onchange="_cfgSaveCursor()">
            <option value="true" ${cursorSettings.glow ? 'selected' : ''}>Ligado</option>
            <option value="false" ${!cursorSettings.glow ? 'selected' : ''}>Desligado</option>
          </select>
        </div>
        <div class="cfg-slider-group" style="margin-bottom:14px;">
          <label>Tamanho rasto</label>
          <input type="range" min="0.5" max="3" step="0.1" value="${cursorSettings.trailSize}" id="cfg-cursor-trail" oninput="_cfgSaveCursor()">
          <span style="font-size:12px;color:var(--text-light);min-width:24px;" id="cfg-cursor-trail-val">${cursorSettings.trailSize}</span>
        </div>
        <div class="cfg-slider-group">
          <label>Cor</label>
          <input type="color" value="${cursorSettings.color}" id="cfg-cursor-color" onchange="_cfgSaveCursor()">
        </div>
      </div>

      <div class="card">
        <div class="card-title">✨ Partículas Fundo</div>
        <div class="cfg-slider-group" style="margin-bottom:14px;">
          <label>Densidade</label>
          <input type="range" min="10" max="150" step="1" value="${particleSettings.density}" id="cfg-particle-density" oninput="_cfgSaveParticles()">
          <span style="font-size:12px;color:var(--text-light);min-width:32px;" id="cfg-particle-density-val">${particleSettings.density}</span>
        </div>
        <div class="cfg-slider-group">
          <label>Cor</label>
          <input type="color" value="${particleSettings.color}" id="cfg-particle-color" onchange="_cfgSaveParticles()">
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">🎨 Tema</div>
      <div style="display:flex;gap:12px;flex-wrap:wrap;">
        <button class="cfg-theme-btn ${currentTheme === 'dark' ? 'active' : ''}" onclick="_cfgSetTheme('dark',this)">🌙 Escuro</button>
        <button class="cfg-theme-btn ${currentTheme === 'light' ? 'active' : ''}" onclick="_cfgSetTheme('light',this)">☀️ Claro</button>
        <button class="cfg-theme-btn ${currentTheme === 'system' ? 'active' : ''}" onclick="_cfgSetTheme('system',this)">💻 Sistema</button>
      </div>
    </div>

    <div class="card">
      <div class="card-title">📦 Importar / Exportar</div>
      <p style="font-size:13px;color:var(--text-light);margin-bottom:16px;">Transfere as tuas definições entre dispositivos</p>
      <div style="display:flex;gap:12px;flex-wrap:wrap;">
        <button class="btn btn-primary" onclick="_cfgExport()">📤 Exportar Definições</button>
        <div style="position:relative;display:inline-block;">
          <button class="btn btn-outline" onclick="document.getElementById('cfg-import-input').click()">📥 Importar Definições</button>
          <input type="file" id="cfg-import-input" accept=".json" style="display:none;" onchange="_cfgImport(this)">
        </div>
      </div>
      <div class="cfg-import-area" id="cfg-import-drop" style="margin-top:16px;" ondragover="this.classList.add('dragover');event.preventDefault()" ondragleave="this.classList.remove('dragover')" ondrop="_cfgDropImport(event)">
        <div style="font-size:40px;margin-bottom:10px;">📂</div>
        <div style="font-weight:600;">Larga aqui o ficheiro JSON</div>
        <div style="font-size:12px;color:var(--text-light);margin-top:4px;">ou clica em "Importar Definições"</div>
      </div>
    </div>
  `;

  _cfgFilter('');
}

function _cfgFilter(query) {
  const q = query.toLowerCase().trim();
  document.querySelectorAll('.cfg-card').forEach(el => {
    const featureId = el.dataset.feature;
    const feat = FEATURES.find(f => f.id === featureId);
    if (!feat) return;
    const match = !q || feat.name.toLowerCase().includes(q) || feat.desc.toLowerCase().includes(q) || feat.id.toLowerCase().includes(q);
    el.style.display = match ? '' : 'none';
  });
}

function _cfgSetTheme(theme, btn) {
  localStorage.setItem('soplus_theme', theme);
  document.querySelectorAll('.cfg-theme-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  let applied = theme;
  if (theme === 'system') {
    applied = window.matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light';
  }
  document.documentElement.setAttribute('data-theme', applied);
  showToast(`Tema: ${theme === 'dark' ? '🌙 Escuro' : theme === 'light' ? '☀️ Claro' : '💻 Sistema'}`, 'success');
}

function _cfgSaveCursor() {
  const glow = document.getElementById('cfg-cursor-glow').value === 'true';
  const trailSize = parseFloat(document.getElementById('cfg-cursor-trail').value);
  const color = document.getElementById('cfg-cursor-color').value;
  document.getElementById('cfg-cursor-trail-val').textContent = trailSize;
  const settings = { glow, trailSize, color };
  localStorage.setItem('soplus_cursor_settings', JSON.stringify(settings));
  const ring = document.getElementById('cursorRing');
  const glowTrail = document.getElementById('cursorGlow');
  const dot = document.getElementById('cursorDot');
  if (ring && ring.style) {
    ring.style.display = glow ? '' : 'none';
    ring.style.borderColor = color;
    ring.style.setProperty('--glow-color', color);
  }
  if (glowTrail && glowTrail.style) {
    glowTrail.style.display = glow ? '' : 'none';
    glowTrail.style.background = `radial-gradient(circle,${color}15 0%,transparent 70%)`;
  }
  if (dot && dot.style) {
    dot.style.width = (trailSize * 4) + 'px';
    dot.style.height = (trailSize * 4) + 'px';
  }
  showToast('Definições do cursor guardadas', 'success');
}

function _cfgSaveParticles() {
  const density = parseInt(document.getElementById('cfg-particle-density').value);
  const color = document.getElementById('cfg-particle-color').value;
  document.getElementById('cfg-particle-density-val').textContent = density;
  const settings = { density, color };
  localStorage.setItem('soplus_particle_settings', JSON.stringify(settings));
  showToast('Definições de partículas guardadas', 'success');
}

async function _cfgExport() {
  const data = {
    exportedAt: new Date().toISOString(),
    user: currentUser?.uid || 'anonymous',
    features: _cfgFeatures,
    cursor: JSON.parse(localStorage.getItem('soplus_cursor_settings') || '{}'),
    particles: JSON.parse(localStorage.getItem('soplus_particle_settings') || '{}'),
    theme: localStorage.getItem('soplus_theme') || 'dark'
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `soplus_settings_${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('📤 Definições exportadas!', 'success');
}

async function _cfgImport(input) {
  const file = input.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    await _cfgApplyImport(data);
  } catch(e) {
    showToast('Erro ao importar: ' + e.message, 'error');
  }
  input.value = '';
}

async function _cfgDropImport(e) {
  e.preventDefault();
  document.getElementById('cfg-import-drop').classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    await _cfgApplyImport(data);
  } catch(e) {
    showToast('Erro ao importar: ' + e.message, 'error');
  }
}

async function _cfgApplyImport(data) {
  if (!data.features) {
    showToast('Ficheiro inválido — sem definições de funcionalidades', 'error');
    return;
  }
  const path = _cfgPath();
  try {
    await dbSet(path, data.features);
    _cfgFeatures = data.features;
    if (data.cursor && data.cursor.glow != null) {
      localStorage.setItem('soplus_cursor_settings', JSON.stringify(data.cursor));
    }
    if (data.particles && data.particles.density != null) {
      localStorage.setItem('soplus_particle_settings', JSON.stringify(data.particles));
    }
    if (data.theme) {
      _cfgSetTheme(data.theme);
    }
    _renderCfg(document.getElementById('content-area'));
    if (typeof buildNav === 'function') buildNav();
    showToast('📥 Definições importadas com sucesso!', 'success');
  } catch(e) {
    showToast('Erro ao guardar: ' + e.message, 'error');
  }
}
