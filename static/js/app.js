/* ════════════════════════════════════════════════════════════
   S&O+ ULTRA WORKSPACE — FIREBASE REALTIME SPA
   ════════════════════════════════════════════════════════════ */

let currentUser = null;
function escapeHTML(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
let userProfile = null;
let currentPage = null;
let jitsiApi = null;
let chartInstance = null;
let deviceInfo = { ip: '', mac: '' };

// ─── DEVICE DETECTION ─────────────────────────────────────
async function detectDeviceInfo() {
    try {
        const r = await fetch('/api/ai/detect-device', { method: 'POST' });
        const data = await r.json();
        deviceInfo.ip = data.ip || '';
        deviceInfo.mac = data.mac || '';
    } catch(e) {
        console.warn('Device detection failed:', e);
    }
}

function aiBody(q) {
    return JSON.stringify({
        q,
        email: userProfile?.email || currentUser?.email || '',
        ip: deviceInfo.ip,
        mac: deviceInfo.mac
    });
}

// ─── AUTH STATE ───────────────────────────────────────────
auth.onAuthStateChanged(async user => {
    if (user) {
        currentUser = user;
        userProfile = await getUserProfile(user.uid);
        if (!userProfile) {
            window.location.href = '/?needProfile=1';
            return;
        }
        document.getElementById('loading-screen').style.display = 'none';
        document.getElementById('app').style.display = 'flex';
        loadSavedLanguage();
        await loadUserExtensions();
        buildNav();
        navigateTo('dashboard');
        updateUI();
        detectDeviceInfo();
        setTimeout(() => checkGifts(), 2000);
    } else {
        window.location.href = '/';
    }
});

function updateUI() {
    document.getElementById('user-name').textContent = userProfile?.nome || 'Convidado';
    const role = userProfile?.role || 'aluno';
    const roleLabels = { aluno: t('student'), professor: t('professor'), admin: t('admin_role') };
    document.getElementById('user-role').textContent = roleLabels[role] || role;
    document.getElementById('user-avatar').textContent = (userProfile?.nome || '?')[0].toUpperCase();
}

// ─── NAVIGATION ───────────────────────────────────────────
const PAGES = [
    { id: 'dashboard', icon: '🏠', label: 'Dashboard' },
    { id: 'horarios', icon: '🗓️', label: 'Horários' },
    { id: 'notas', icon: '📊', label: 'Notas' },
    { id: 'provas', icon: '📝', label: 'Provas' },
    { id: 'ficheiros', icon: '📁', label: 'Repositório' },
    { id: 'chat', icon: '💬', label: 'Chat' },
    { id: 'video', icon: '📹', label: 'Sala Vídeo' },
    { id: 'estudar', icon: '🎵', label: 'Estudar' },
    { id: 'estudio-ia', icon: '🤖', label: 'Estúdio IA' },
    { id: 'recursos', icon: '🎓', label: 'Recursos', profOnly: true },
    { id: 'perfil', icon: '⚙️', label: 'Perfil' },
    { id: 'ide', icon: '💻', label: 'IDE Código' },
    { id: 'colaboracao', icon: '👥', label: 'Colab.' },
    { id: 'excel', icon: '📊', label: 'Excel' },
    { id: 'word', icon: '📝', label: 'Word' },
    { id: 'powerpoint', icon: '📽️', label: 'PowerPoint' },
    { id: 'desenho', icon: '🎨', label: 'Desenho' },
];

let userExtensions = [];

async function loadUserExtensions() {
    if (!currentUser) return;
    try {
        const [extSnap, settingsSnap] = await Promise.all([
            dbGet(`user_extensions/${currentUser.uid}`),
            dbGet('site_content/extensions_enabled')
        ]);
        extensionsEnabled = settingsSnap !== false;
        userExtensions = extSnap ? Object.keys(extSnap).filter(k => extSnap[k]) : [];
        const extDataSnap = await dbGet('extensions');
        if (extDataSnap && userExtensions.length > 0) {
            for (const extId of userExtensions) {
                const ext = extDataSnap[extId];
                if (ext && !PAGES.find(p => p.id === extId)) {
                    PAGES.splice(PAGES.length - 1, 0, { id: extId, icon: ext.icon, label: ext.label, extPage: true });
                }
            }
        }
    } catch(e) {
        console.warn('Erro ao carregar extensões:', e);
        extensionsEnabled = true;
    }
    if (extensionsEnabled && !PAGES.find(p => p.id === 'loja')) {
        PAGES.splice(PAGES.length - 1, 0, { id: 'loja', icon: '🛒', label: 'Loja' });
    }
    buildNav();
}

function isExtUnlocked(extId) {
    return userExtensions.includes(extId);
}

function buildNav() {
    const nav = document.getElementById('nav-container');
    nav.innerHTML = PAGES
        .filter(p => !p.profOnly || userProfile?.role === 'professor' || userProfile?.role === 'admin')
        .map(p => `<a class="nav-item" id="nav-${p.id}" onclick="navigateTo('${p.id}')">
            <span class="icon">${p.icon}</span><span class="label">${t('nav_' + p.id) || p.label}</span>
        </a>`).join('');
}

function navigateTo(page) {
    currentPage = page;
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const activeEl = document.getElementById('nav-' + page);
    if (activeEl) {
        activeEl.classList.add('active');
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    const pageInfo = PAGES.find(p => p.id === page);
    document.getElementById('page-title').textContent = pageInfo?.label || page;

    const area = document.getElementById('content-area');
    area.scrollTop = 0;
    area.style.opacity = '0';
    area.style.transform = 'translateY(8px)';
    requestAnimationFrame(() => {
        renderPage(page);
        requestAnimationFrame(() => {
            area.style.transition = 'all 0.35s cubic-bezier(0.16,1,0.3,1)';
            area.style.opacity = '1';
            area.style.transform = 'translateY(0)';
        });
    });
    closeSidebar();
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebarBackdrop');
    sidebar.classList.toggle('open');
    backdrop.classList.toggle('show');
}

function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebarBackdrop').classList.remove('show');
}

// ─── PAGE RENDERERS ───────────────────────────────────────

function renderPage(page) {
    const area = document.getElementById('content-area');
    switch(page) {
        case 'dashboard': renderDashboard(area); break;
        case 'horarios': renderHorarios(area); break;
        case 'notas': renderNotas(area); break;
        case 'provas': renderProvas(area); break;
        case 'ficheiros': renderFicheiros(area); break;
        case 'chat': renderChat(area); break;
        case 'video': renderVideo(area); break;
        case 'estudar': renderEstudar(area); break;
        case 'estudio-ia': renderEstudioIA(area); break;
        case 'recursos': renderRecursos(area); break;
        case 'perfil': renderPerfil(area); break;
        case 'ide': renderIDE(area); break;
        case 'colaboracao': renderColaboracao(area); break;
        case 'excel': renderExcel(area); break;
        case 'word': renderWord(area); break;
        case 'powerpoint': renderPowerPoint(area); break;
        case 'desenho': renderDesenho(area); break;
        case 'loja': renderLoja(area); break;
        default:
            if (PAGES.find(p => p.id === page && p.extPage)) {
                renderExtPage(area, page);
            } else {
                area.innerHTML = '<div class="empty-state"><div class="icon">🚧</div><h3>Em construção</h3></div>';
            }
            break;
    }
    // Animate children
    setTimeout(() => {
        area.querySelectorAll('.card, .stat-card, .exam-card, .file-item').forEach((el, i) => {
            el.style.opacity = '0';
            el.style.animation = `fadeInUp 0.5s cubic-bezier(0.16,1,0.3,1) ${i * 0.06}s forwards`;
        });
    }, 50);
}

// ── DASHBOARD ──
function renderDashboard(area) {
    const isProf = userProfile?.role === 'professor';
    const turmaDisplay = isProf ? (userProfile?.turmas || 'Sem turmas') : (userProfile?.turma || '—');
    area.innerHTML = `
        <div class="page-header"><h2>${t('dashboard_welcome')}, ${userProfile?.nome || 'Convidado'} 👋</h2><p>${t('dashboard_subtitle')}</p></div>
        <div class="stat-grid" id="dash-stats"></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
            <div class="card"><div class="card-title">📊 ${t('nav_notas')} Recentes</div><div id="dash-notas"><div class="empty-state" style="padding:20px;"><p>${t('no_data')}</p></div></div></div>
            <div class="card"><div class="card-title">📝 ${t('provas_title')}</div><div id="dash-provas"><div class="empty-state" style="padding:20px;"><p>${t('no_data')}</p></div></div></div>
        </div>
        <div class="card"><div class="card-title">📈 Gráfico Geral</div><canvas id="dashChart" style="max-height:280px;"></canvas></div>
    `;
    loadDashboardStats();
}

async function loadDashboardStats() {
    const isProf = userProfile?.role === 'professor';
    const profTurmas = (userProfile?.turmas || '').split(',').map(s => s.trim()).filter(Boolean);
    let notas = [], provas = [];

    if (isProf) {
        const [usersSnap, provasSnap] = await Promise.all([
            dbGet('users'),
            dbGet('provas')
        ]);
        const alunos = usersSnap ? Object.entries(usersSnap).filter(([k,v]) => profTurmas.includes(v.turma) && v.role === 'aluno') : [];
        for (const [uid] of alunos) {
            const notasSnap = await dbGet(`notas/${uid}`);
            if (notasSnap) notas.push(...Object.values(notasSnap));
        }
        provas = provasSnap ? Object.entries(provasSnap).filter(([k,v]) => profTurmas.includes(v.turma) && v.ativa !== false).map(([k,v]) => ({id:k,...v})) : [];
    } else {
        const turma = userProfile?.turma || 'default';
        const [notasSnap, provasSnap] = await Promise.all([
            dbGet(`notas/${currentUser.uid}`),
            dbGet(`provas`)
        ]);
        notas = notasSnap ? Object.values(notasSnap) : [];
        provas = provasSnap ? Object.entries(provasSnap).filter(([k,v]) => v.turma === turma && v.ativa !== false).map(([k,v]) => ({id:k,...v})) : [];
    }

    const media = notas.length > 0 ? (notas.reduce((a,n) => a + n.valor, 0) / notas.length).toFixed(1) : '—';
    const totalAlunos = isProf ? profTurmas.length : 0;

    document.getElementById('dash-stats').innerHTML = `
        <div class="stat-card"><div class="stat-icon">📚</div><div class="stat-value">${notas.length}</div><div class="stat-label">${isProf ? 'Notas dadas' : t('nav_notas')}</div></div>
        <div class="stat-card"><div class="stat-icon">📝</div><div class="stat-value">${provas.length}</div><div class="stat-label">${t('nav_provas')}</div></div>
        <div class="stat-card"><div class="stat-icon">📊</div><div class="stat-value">${media}</div><div class="stat-label">${t('notas_average')}${isProf ? ' geral' : ''}</div></div>
        <div class="stat-card"><div class="stat-icon">🎓</div><div class="stat-value">${isProf ? profTurmas.join(', ') || '—' : (userProfile?.turma || '—')}</div><div class="stat-label">${isProf ? 'Turmas' : t('perfil_turma')}</div></div>
    `;

    if (notas.length > 0) {
        document.getElementById('dash-notas').innerHTML = notas.slice(-5).reverse().map(n => `
            <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border);">
                <span>${n.disciplina} <small style="color:var(--text-light)">(${n.tipo})</small></span>
                <strong style="color:${n.valor >= 10 ? 'var(--success)' : 'var(--danger)'}">${n.valor}/20</strong>
            </div>
        `).join('');
    }

    if (provas.length > 0) {
        document.getElementById('dash-provas').innerHTML = provas.slice(0,5).map(p => `
            <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border);">
                <span>${p.titulo} <small style="color:var(--text-light)">(${p.disciplina})</small></span>
                <button class="btn btn-sm btn-primary" onclick="navigateTo('provas')">Ver</button>
            </div>
        `).join('');
    }

    // Chart
    if (notas.length > 0) {
        const labels = notas.map(n => n.disciplina);
        const data = notas.map(n => n.valor);
        if (chartInstance) chartInstance.destroy();
        chartInstance = new Chart(document.getElementById('dashChart'), {
            type: 'bar',
            data: { labels, datasets: [{ label: 'Notas', data, backgroundColor: data.map(v => v >= 10 ? 'rgba(16,185,129,0.7)' : 'rgba(239,68,68,0.7)'), borderRadius: 8 }] },
            options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: 20, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#64748B' } }, x: { grid: { display: false }, ticks: { color: '#64748B' } } } }
        });
    }
}

// ── HORÁRIOS ──
function renderHorarios(area) {
    const isProf = userProfile?.role === 'professor' || userProfile?.role === 'admin';
    const profTurmas = (userProfile?.turmas || '').split(',').map(s => s.trim()).filter(Boolean);
    const turmaOpts = profTurmas.map(t => `<option value="${t}">${t}</option>`).join('');
    area.innerHTML = `
        <div class="page-header"><h2>Horários</h2><p>Grade horária da turma</p></div>
        ${isProf ? `<div class="card"><div class="card-title">➕ Adicionar Aula</div>
            <form id="form-horario" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px;align-items:end;">
                <div class="form-group"><label>Dia</label><select class="form-input" name="dia"><option>Segunda</option><option>Terça</option><option>Quarta</option><option>Quinta</option><option>Sexta</option></select></div>
                <div class="form-group"><label>Início</label><input type="time" class="form-input" name="hora_inicio" value="08:30" required></div>
                <div class="form-group"><label>Fim</label><input type="time" class="form-input" name="hora_fim" value="09:30" required></div>
                <div class="form-group"><label>Disciplina</label><input class="form-input" name="disciplina" placeholder="Matemática" required></div>
                <div class="form-group"><label>Sala</label><input class="form-input" name="sala" placeholder="Sala 101"></div>
                <div class="form-group"><label>Turma</label><select class="form-input" name="turma" required>${turmaOpts}</select></div>
                <button type="submit" class="btn btn-primary">Adicionar</button>
            </form></div>` : ''}
        <div class="card"><div class="card-title">🗓️ Grade Horária</div><div id="horario-grid" style="overflow-x:auto;"></div></div>
    `;
    if (isProf) {
        document.getElementById('form-horario').onsubmit = async (e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            await dbPush('horarios', {
                dia: fd.get('dia'), hora_inicio: fd.get('hora_inicio'), hora_fim: fd.get('hora_fim'),
                disciplina: fd.get('disciplina'), sala: fd.get('sala'), turma: fd.get('turma'),
                professor: userProfile.nome, professorId: currentUser.uid, createdAt: Date.now()
            });
            showToast('Aula adicionada!', 'success');
        };
    }
    loadHorarios();
}

async function loadHorarios() {
    const snap = await dbGet('horarios');
    const horarios = snap ? Object.entries(snap).map(([k,v]) => ({id:k,...v})) : [];
    const dias = ['Segunda','Terça','Quarta','Quinta','Sexta'];
    const horas = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00'];
    const isProf = userProfile?.role === 'professor';

    let html = '<div class="timetable-grid"><div class="tt-header" style="background:transparent;color:var(--text-light)">Hora</div>';
    dias.forEach(d => html += `<div class="tt-header">${d}</div>`);
    horas.forEach(h => {
        html += `<div class="tt-time">${h}</div>`;
        dias.forEach(d => {
            const aulas = horarios.filter(a => a.dia === d && a.hora_inicio?.slice(0,2) === h.slice(0,2));
            html += `<div class="tt-cell">`;
            aulas.forEach(a => {
                html += `<div class="tt-event" title="${a.disciplina} - ${a.sala || ''}">
                    <strong>${a.disciplina}</strong><br><small>${a.hora_inicio}-${a.hora_fim}</small><br><small>📍${a.sala || '—'}</small>
                    ${isProf ? `<a onclick="deleteHorario('${a.id}')" style="color:var(--danger);font-size:10px;margin-left:4px;cursor:pointer;">✕</a>` : ''}
                </div>`;
            });
            html += `</div>`;
        });
    });
    html += '</div>';
    document.getElementById('horario-grid').innerHTML = html;
}

async function deleteHorario(id) {
    if (confirm('Eliminar esta aula?')) {
        await dbRemove('horarios/' + id);
        loadHorarios();
        showToast('Aula eliminada', 'success');
    }
}

// ── NOTAS ──
function renderNotas(area) {
    const isProf = userProfile?.role === 'professor';
    area.innerHTML = `
        <div class="page-header"><h2>📊 Notas</h2><p>${isProf ? 'Gere as notas das turmas' : 'As tuas notas'}</p></div>
        ${isProf ? `<div class="card"><div class="card-title">➕ Adicionar Nota</div>
            <form id="form-nota" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;align-items:end;">
                <div class="form-group"><label>Aluno</label><select class="form-input" name="aluno_uid" id="nota-aluno-select" required><option value="">A carregar...</option></select></div>
                <div class="form-group"><label>Disciplina</label><input class="form-input" name="disciplina" placeholder="Matemática" required></div>
                <div class="form-group"><label>Nota (0-20)</label><input type="number" class="form-input" name="valor" min="0" max="20" step="0.5" required></div>
                <div class="form-group"><label>Tipo</label><select class="form-input" name="tipo"><option>Teste</option><option>Mini-Teste</option><option>Projeto</option><option>Exame</option><option>Participação</option></select></div>
                <button type="submit" class="btn btn-primary">Registar</button>
            </form></div>` : ''}
        <div class="card"><div class="card-title">📋 Notas</div><div id="notas-list"></div></div>
    `;
    if (isProf) {
        loadNotasAlunosDropdown();
        document.getElementById('form-nota').onsubmit = async (e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            const uid = fd.get('aluno_uid');
            await dbPush(`notas/${uid}`, {
                disciplina: fd.get('disciplina'), valor: parseFloat(fd.get('valor')),
                tipo: fd.get('tipo'), professor: userProfile.nome, createdAt: Date.now()
            });
            showToast('Nota registada!', 'success');
            e.target.reset();
        };
    }
    loadNotas();
}

async function loadNotasAlunosDropdown() {
    const usersSnap = await dbGet('users');
    const profTurmas = (userProfile?.turmas || '').split(',').map(s => s.trim()).filter(Boolean);
    const alunos = usersSnap ? Object.entries(usersSnap).filter(([k,v]) => profTurmas.includes(v.turma) && v.role === 'aluno') : [];
    const sel = document.getElementById('nota-aluno-select');
    if (alunos.length === 0) {
        sel.innerHTML = '<option value="">Sem alunos nas turmas</option>';
    } else {
        sel.innerHTML = '<option value="">Selecionar aluno...</option>' + alunos.map(([uid, a]) => `<option value="${uid}">${a.nome} (${a.turma})</option>`).join('');
    }
}

async function loadNotas() {
    const isProf = userProfile?.role === 'professor';
    let html = '';
    if (isProf) {
        const usersSnap = await dbGet('users');
        const profTurmas = (userProfile?.turmas || '').split(',').map(s => s.trim()).filter(Boolean);
        const alunos = usersSnap ? Object.entries(usersSnap).filter(([k,v]) => profTurmas.includes(v.turma) && v.role === 'aluno') : [];
        if (alunos.length === 0) {
            html = '<div class="empty-state"><div class="icon">📊</div><h3>Sem alunos na turma</h3></div>';
        } else {
            html = '<div class="table-wrap"><table class="sheet-table"><tr><th>Aluno</th><th>Disciplina</th><th>Tipo</th><th>Nota</th></tr>';
            for (const [uid, aluno] of alunos) {
                const notasSnap = await dbGet(`notas/${uid}`);
                const notas = notasSnap ? Object.values(notasSnap) : [];
                notas.forEach(n => {
                    html += `<tr><td>${aluno.nome}</td><td>${n.disciplina}</td><td>${n.tipo}</td><td><strong>${n.valor}</strong>/20</td></tr>`;
                });
            }
            html += '</table></div>';
        }
    } else {
        const notasSnap = await dbGet(`notas/${currentUser.uid}`);
        const notas = notasSnap ? Object.values(notasSnap) : [];
        if (notas.length === 0) {
            html = '<div class="empty-state"><div class="icon">📊</div><h3>Sem notas ainda</h3></div>';
        } else {
            html = '<div class="table-wrap"><table class="sheet-table"><tr><th>Disciplina</th><th>Tipo</th><th>Nota</th><th>Estado</th></tr>';
            notas.forEach(n => {
                const estado = n.valor >= 16 ? '⭐ Excelente' : n.valor >= 14 ? '✅ Muito Bom' : n.valor >= 10 ? '👍 Bom' : n.valor >= 8 ? '⚠️ Suficiente' : '❌ Insuficiente';
                html += `<tr><td><strong>${n.disciplina}</strong></td><td>${n.tipo}</td><td><strong>${n.valor}</strong>/20</td><td>${estado}</td></tr>`;
            });
            html += '</table></div>';
        }
    }
    document.getElementById('notas-list').innerHTML = html;
}

// ── PROVAS ──
function renderProvas(area) {
    const isProf = userProfile?.role === 'professor';
    area.innerHTML = `
        <div class="page-header" style="display:flex;justify-content:space-between;align-items:center;">
            <div><h2>📝 Provas</h2><p>${isProf ? 'Cria e gere provas' : 'Responde às provas'}</p></div>
            ${isProf ? '<button class="btn btn-primary" onclick="showCriarProva()">➕ Criar Prova</button>' : ''}
        </div>
        <div id="provas-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(330px,1fr));gap:16px;"></div>
    `;
    loadProvas();
}

async function loadProvas() {
    const isProf = userProfile?.role === 'professor';
    const snap = await dbGet('provas');
    const provas = snap ? Object.entries(snap).filter(([k,v]) =>
        isProf ? v.professorId === currentUser.uid : (v.turma === userProfile?.turma && v.ativa !== false)
    ).map(([k,v]) => ({id:k,...v})) : [];

    if (provas.length === 0) {
        document.getElementById('provas-grid').innerHTML = '<div class="empty-state" style="grid-column:1/-1;"><div class="icon">📝</div><h3>Sem provas</h3></div>';
        return;
    }

    document.getElementById('provas-grid').innerHTML = provas.map(p => `
        <div class="exam-card">
            <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:12px;">
                <div><h3 style="font-size:17px;">${p.titulo}</h3><span style="color:var(--text-light);font-size:13px;">${p.disciplina} · ${p.turma}</span></div>
                <span class="exam-status ${p.ativa !== false ? 'pendente' : 'corrigida'}">${p.ativa !== false ? 'Ativa' : 'Inativa'}</span>
            </div>
            <div style="display:flex;gap:16px;font-size:12px;color:var(--text-light);margin-bottom:14px;">
                <span>⏱️ ${p.duracao || 60}min</span>
                <span>📋 ${p.perguntas ? Object.keys(p.perguntas).length : 0} questões</span>
            </div>
            <div style="display:flex;gap:8px;">
                ${isProf
                    ? `<button class="btn btn-sm btn-outline" onclick="corrigirProva('${p.id}')">📋 Corrigir</button>
                       <button class="btn btn-sm btn-danger" onclick="deleteProva('${p.id}')">✕</button>`
                    : `<button class="btn btn-sm btn-primary" onclick="responderProva('${p.id}')">Responder</button>`}
            </div>
        </div>
    `).join('');
}

function showCriarProva() {
    const profTurmas = (userProfile?.turmas || '').split(',').map(s => s.trim()).filter(Boolean);
    const turmaOpts = profTurmas.map(t => `<option value="${t}">${t}</option>`).join('');
    const area = document.getElementById('content-area');
    area.innerHTML = `
        <div class="page-header"><h2>📝 Criar Prova</h2></div>
        <div class="card">
            <form id="form-prova">
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px;margin-bottom:24px;">
                    <div class="form-group"><label>Título</label><input class="form-input" name="titulo" placeholder="Teste de Matemática" required></div>
                    <div class="form-group"><label>Disciplina</label><input class="form-input" name="disciplina" placeholder="Matemática" required></div>
                    <div class="form-group"><label>Duração (min)</label><input type="number" class="form-input" name="duracao" value="60"></div>
                    <div class="form-group"><label>Turma</label><select class="form-input" name="turma" required>${turmaOpts}</select></div>
                </div>
                <div class="card-title">📋 Questões</div>
                <div id="questions-list"></div>
                <button type="button" class="btn btn-outline" onclick="addQuestion()" style="margin:16px 0;">➕ Adicionar Questão</button>
                <button type="submit" class="btn btn-primary" style="width:100%;">📤 Criar e Enviar Prova</button>
            </form>
        </div>
    `;
    addQuestion();
    document.getElementById('form-prova').onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const perguntas = [];
        document.querySelectorAll('.q-block').forEach((block, i) => {
            perguntas.push({
                texto: block.querySelector('[name="q_texto"]').value,
                tipo: block.querySelector('[name="q_tipo"]').value,
                opcoes: (block.querySelector('[name="q_opcoes"]')?.value || '').split('\n').filter(x => x.trim()),
                correta: block.querySelector('[name="q_correta"]')?.value || ''
            });
        });
        await dbPush('provas', {
            titulo: fd.get('titulo'), disciplina: fd.get('disciplina'),
            duracao: parseInt(fd.get('duracao') || 60),
            turma: fd.get('turma'), professorId: currentUser.uid,
            professor: userProfile.nome, perguntas, ativa: true, createdAt: Date.now()
        });
        showToast('Prova criada!', 'success');
        confettiBurst(window.innerWidth / 2, window.innerHeight / 2);
        navigateTo('provas');
    };
}

let qCount = 0;
function addQuestion() {
    qCount++;
    const div = document.createElement('div');
    div.className = 'q-block question-block';
    div.innerHTML = `
        <h4><span>${qCount}</span> Questão ${qCount}</h4>
        <div class="form-group"><label>Enunciado</label><textarea class="form-input" name="q_texto" rows="2" placeholder="Escreve a pergunta..." required></textarea></div>
        <div class="form-group"><label>Tipo</label><select class="form-input" name="q_tipo" onchange="toggleQOpts(this)"><option value="multipla">Escolha Múltipla</option><option value="aberta">Resposta Aberta</option><option value="vf">Verdadeiro/Falso</option></select></div>
        <div class="q-opts"><div class="form-group"><label>Opções (uma por linha)</label><textarea class="form-input" name="q_opcoes" rows="3" placeholder="A) Opção 1&#10;B) Opção 2&#10;C) Opção 3"></textarea></div></div>
        <div class="form-group"><label>Resposta Correta</label><input class="form-input" name="q_correta" placeholder="A) Opção 1"></div>
    `;
    document.getElementById('questions-list').appendChild(div);
}

function toggleQOpts(sel) {
    sel.closest('.q-block').querySelector('.q-opts').style.display = sel.value === 'aberta' ? 'none' : 'block';
}

async function responderProva(id) {
    const prova = await dbGet('provas/' + id);
    if (!prova) return showToast('Prova não encontrada', 'error');
    const perguntas = prova.perguntas || [];
    const area = document.getElementById('content-area');

    area.innerHTML = `
        <div class="page-header"><h2>📝 ${prova.titulo}</h2><p>${prova.disciplina} · ${prova.duracao || 60}min</p></div>
        <div class="card" style="text-align:center;margin-bottom:20px;"><div style="font-size:12px;color:var(--text-light);">Tempo Restante</div><div id="countdown" style="font-size:42px;font-weight:900;background:var(--gradient);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">${prova.duracao || 60}:00</div></div>
        <form id="form-resposta">
            ${perguntas.map((q, i) => `
                <div class="question-block">
                    <h4><span>${i+1}</span> ${q.texto}</h4>
                    ${q.tipo === 'multipla' ? q.opcoes.map(o => `<label class="option-label" onclick="this.classList.add('selected');this.closest('.question-block').querySelectorAll('.option-label').forEach(l=>{if(l!==this)l.classList.remove('selected')})"><input type="radio" name="q_${i}" value="${o}"> ${o}</label>`).join('') :
                      q.tipo === 'vf' ? `<label class="option-label" onclick="this.classList.add('selected');this.closest('.question-block').querySelectorAll('.option-label').forEach(l=>{if(l!==this)l.classList.remove('selected')})"><input type="radio" name="q_${i}" value="Verdadeiro"> ✅ Verdadeiro</label><label class="option-label" onclick="this.classList.add('selected');this.closest('.question-block').querySelectorAll('.option-label').forEach(l=>{if(l!==this)l.classList.remove('selected')})"><input type="radio" name="q_${i}" value="Falso"> ❌ Falso</label>` :
                      `<textarea class="form-input" name="q_${i}" rows="3" placeholder="A tua resposta..."></textarea>`}
                </div>
            `).join('')}
            <button type="submit" class="btn btn-primary" style="width:100%;padding:16px;font-size:16px;">📤 Submeter Prova</button>
        </form>
    `;

    let totalSec = (prova.duracao || 60) * 60;
    const cd = document.getElementById('countdown');
    const timer = setInterval(() => {
        totalSec--;
        if (totalSec <= 0) { clearInterval(timer); document.getElementById('form-resposta').dispatchEvent(new Event('submit')); return; }
        const m = Math.floor(totalSec / 60), s = totalSec % 60;
        cd.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
        if (totalSec < 60) cd.style.color = '#EF4444';
    }, 1000);

    document.getElementById('form-resposta').onsubmit = async (e) => {
        e.preventDefault();
        clearInterval(timer);
        const fd = new FormData(e.target);
        const respostas = {};
        perguntas.forEach((q, i) => { respostas['q_' + i] = fd.get('q_' + i) || ''; });
        await dbPush(`respostas_prova/${id}`, {
            alunoId: currentUser.uid, alunoNome: userProfile.nome,
            respostas, turma: userProfile.turma, createdAt: Date.now()
        });
        showToast('Prova submetida!', 'success');
        confettiBurst(window.innerWidth / 2, window.innerHeight / 3);
        navigateTo('provas');
    };
}

async function corrigirProva(id) {
    const [prova, respostasSnap] = await Promise.all([dbGet('provas/' + id), dbGet(`respostas_prova/${id}`)]);
    if (!prova) return;
    const respostas = respostasSnap ? Object.entries(respostasSnap).map(([k,v]) => ({id:k,...v})) : [];
    const perguntas = prova.perguntas || [];
    const area = document.getElementById('content-area');

    area.innerHTML = `
        <div class="page-header"><h2>📋 Corrigir: ${prova.titulo}</h2><p>${respostas.length} submissões</p></div>
        ${respostas.length === 0 ? '<div class="empty-state"><div class="icon">📋</div><h3>Sem submissões</h3></div>' :
        respostas.map((r, ri) => `
            <div class="card" style="border-left:3px solid ${r.corrigida ? 'var(--success)' : 'var(--ai-banana)'};">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                    <div><h3 style="font-size:16px;">${r.alunoNome || r.alunoId?.slice(0,8)}</h3><small style="color:var(--text-light);">${r.nota != null ? 'Nota: ' + r.nota + '/20' : 'Por corrigir'}</small></div>
                </div>
                <div class="table-wrap" style="margin-bottom:16px;"><table class="sheet-table">
                    <tr><th>Questão</th><th>Resposta</th><th>Correta</th><th>Estado</th></tr>
                    ${perguntas.map((q, qi) => `<tr>
                        <td>${q.texto?.slice(0,60)}${q.texto?.length > 60 ? '...' : ''}</td>
                        <td>${r.respostas?.['q_'+qi] || '—'}</td>
                        <td style="color:var(--success);font-weight:600;">${q.correta || '—'}</td>
                        <td>${(r.respostas?.['q_'+qi] || '').toLowerCase() === (q.correta || '').toLowerCase() ? '<span style="color:var(--success)">✓</span>' : '<span style="color:var(--danger)">✕</span>'}</td>
                    </tr>`).join('')}
                </table></div>
                <div style="display:flex;gap:10px;align-items:end;">
                    <div class="form-group" style="flex:1;"><label>Nota (0-20)</label><input type="number" class="form-input" id="nota-${r.id}" min="0" max="20" step="0.5" value="${r.nota ?? ''}"></div>
                    <button class="btn btn-success" onclick="darNota('${id}','${r.id}')">💾 Guardar</button>
                    <button class="btn btn-ai" onclick="corrigirIA('${id}','${r.id}', ${JSON.stringify(perguntas).replace(/"/g, '&quot;')})">🤖 IA</button>
                </div>
            </div>
        `).join('')}`;
}

async function darNota(provaId, respostaId) {
    const nota = parseFloat(document.getElementById('nota-' + respostaId).value);
    if (isNaN(nota)) return showToast('Nota inválida', 'error');
    await dbUpdate(`respostas_prova/${provaId}/${respostaId}`, { nota, corrigida: true });
    showToast('Nota guardada!', 'success');
}

async function corrigirIA(provaId, respostaId, perguntas) {
    const respostaSnap = await dbGet(`respostas_prova/${provaId}/${respostaId}`);
    if (!respostaSnap) return;
    showToast('A corrigir com IA...', 'success');
    let totalNotas = 0;
    let count = 0;
    for (const [key, resp] of Object.entries(respostaSnap.respostas || {})) {
        const idx = parseInt(key.replace('q_', ''));
        if (perguntas[idx]) {
            try {
                const r = await fetch('/api/ai/corrigir', {
                    method: 'POST', headers: {'Content-Type':'application/json'},
                    body: JSON.stringify({ pergunta: perguntas[idx].texto, resposta: resp, correta: perguntas[idx].correta })
                });
                const data = await r.json();
                const resultado = JSON.parse(data.resultado || '{}');
                if (resultado.nota != null) { totalNotas += resultado.nota; count++; }
            } catch(e) {}
        }
    }
    const media = count > 0 ? (totalNotas / count).toFixed(1) : 10;
    await dbUpdate(`respostas_prova/${provaId}/${respostaId}`, { nota: parseFloat(media), corrigida: true });
    document.getElementById('nota-' + respostaId).value = media;
    showToast(`Nota IA: ${media}/20`, 'success');
    confettiBurst(window.innerWidth / 2, window.innerHeight / 3);
}

async function deleteProva(id) {
    if (!confirm('Eliminar esta prova?')) return;
    await dbRemove('provas/' + id);
    await dbRemove('respostas_prova/' + id);
    loadProvas();
    showToast('Prova eliminada', 'success');
}

// ── FICHEIROS ──
function renderFicheiros(area) {
    area.innerHTML = `
        <div class="page-header"><h2>📁 Repositório Cloud</h2><p>Upload e download de ficheiros via Firebase Storage</p></div>
        <div class="card"><div class="card-title">☁️ Upload</div>
            <div style="display:flex;gap:12px;align-items:end;">
                <div class="form-group" style="flex:1;"><label>Ficheiro</label><input type="file" id="file-upload" class="form-input" style="padding:8px;"></div>
                <button class="btn btn-primary" onclick="uploadFileFirebase()">📤 Enviar</button>
            </div>
            <div id="upload-progress" style="margin-top:12px;display:none;"><div style="background:var(--border);height:4px;border-radius:2px;"><div id="progress-bar" style="background:var(--primary);height:100%;border-radius:2px;width:0%;transition:width 0.3s;"></div></div></div>
        </div>
        <div class="card"><div class="card-title">📋 Ficheiros</div><div id="files-list"></div></div>
    `;
    loadFicheiros();
}

async function uploadFileFirebase() {
    const fileInput = document.getElementById('file-upload');
    const file = fileInput.files[0];
    if (!file) return showToast('Seleciona um ficheiro', 'error');

    document.getElementById('upload-progress').style.display = 'block';
    const path = `files/${currentUser.uid}/${Date.now()}_${file.name}`;
    try {
        const url = await uploadFile(file, path);
        await dbPush('ficheiros', {
            nome: file.name, url, path, tamanho: file.size,
            tipo: file.type, autorId: currentUser.uid, autorNome: userProfile.nome,
            createdAt: Date.now()
        });
        showToast('Ficheiro enviado!', 'success');
        fileInput.value = '';
        document.getElementById('upload-progress').style.display = 'none';
        loadFicheiros();
    } catch(e) {
        showToast('Erro no upload: ' + e.message, 'error');
        document.getElementById('upload-progress').style.display = 'none';
    }
}

async function loadFicheiros() {
    const snap = await dbGet('ficheiros');
    const files = snap ? Object.entries(snap).map(([k,v]) => ({id:k,...v})).sort((a,b) => b.createdAt - a.createdAt) : [];
    if (files.length === 0) {
        document.getElementById('files-list').innerHTML = '<div class="empty-state"><div class="icon">📁</div><h3>Repositório vazio</h3></div>';
        return;
    }
    const iconMap = { pdf: '📄', jpg: '🖼️', png: '🖼️', py: '💻', js: '💻', html: '💻', zip: '📦', doc: '📝', xls: '📊' };
    document.getElementById('files-list').innerHTML = files.map(f => {
        const ext = f.nome?.split('.').pop()?.toLowerCase() || '';
        const icon = iconMap[ext] || '📁';
        return `<div class="file-item">
            <div class="file-icon">${icon}</div>
            <div class="file-info"><div class="file-name">${f.nome}</div><div class="file-meta">${f.autorNome || ''} · ${new Date(f.createdAt).toLocaleDateString('pt-PT')}</div></div>
            <a href="${f.url}" target="_blank" class="btn btn-sm btn-primary">⬇ Baixar</a>
            ${f.autorId === currentUser.uid ? `<button class="btn btn-sm btn-danger" onclick="deleteFicheiro('${f.id}','${f.path}')">✕</button>` : ''}
        </div>`;
    }).join('');
}

async function deleteFicheiro(id, path) {
    if (!confirm('Eliminar?')) return;
    try { await storage.ref(path).delete(); } catch(e) {}
    await dbRemove('ficheiros/' + id);
    loadFicheiros();
    showToast('Eliminado', 'success');
}

// ── CHAT REAL-TIME ──
function renderChat(area) {
    area.innerHTML = `
        <div class="page-header"><h2>💬 Chat da Turma</h2><p>Real-time via Firebase RTDB</p></div>
        <div class="card" style="padding:0;overflow:hidden;">
            <div class="chat-container">
                <div class="chat-messages" id="chat-box"></div>
                <div class="chat-input-wrap">
                    <input type="text" class="form-input" id="chat-input" placeholder="Escreve uma mensagem..." onkeypress="if(event.key==='Enter')sendChatMsg()" style="flex:1;">
                    <button class="btn btn-primary" onclick="sendChatMsg()">Enviar</button>
                </div>
            </div>
        </div>
    `;
    loadChatMessages();
}

function loadChatMessages() {
    dbStopListen('chat');
    dbListenChild('chat', 'child_added', snap => {
        const m = snap.val();
        if (!m) return;
        const box = document.getElementById('chat-box');
        if (!box) return;
        const mine = m.autorId === currentUser.uid;
        const div = document.createElement('div');
        div.className = `chat-bubble ${mine ? 'mine' : 'theirs'}`;
        div.innerHTML = `${!mine ? `<div class="author">${escapeHTML(m.autorNome || '')}</div>` : ''}<div>${escapeHTML(m.texto || '')}</div><div class="time">${new Date(m.timestamp).toLocaleTimeString('pt-PT', {hour:'2-digit', minute:'2-digit'})}</div>`;
        box.appendChild(div);
        box.scrollTop = box.scrollHeight;
    });
}

async function sendChatMsg() {
    const input = document.getElementById('chat-input');
    const txt = input.value.trim();
    if (!txt) return;
    input.value = '';
    await dbPush('chat', {
        autorId: currentUser.uid, autorNome: userProfile?.nome || 'Anónimo',
        texto: txt, timestamp: Date.now()
    });
}

// ── VIDEO MEETINGS ──
function renderVideo(area) {
    area.innerHTML = `
        <div class="page-header"><h2>📹 Sala de Vídeo</h2><p>Videoconferência via Jitsi Meet</p></div>
        <div class="card">
            <div style="display:flex;gap:12px;align-items:end;margin-bottom:20px;">
                <div class="form-group" style="flex:1;"><label>Sala</label><input class="form-input" id="room-name" value="${userProfile?.turma || 'SOPlus'}_Aula" placeholder="Nome da sala"></div>
                <button class="btn btn-primary" onclick="startVideo()">📹 Entrar na Sala</button>
                <button class="btn btn-danger" onclick="endVideo()">⏹ Sair</button>
            </div>
            <div id="jitsi-container" style="height:500px;border-radius:12px;overflow:hidden;background:#000;"></div>
        </div>
        <div class="card"><div class="card-title">📋 Salas Recentes</div><div id="rooms-list"></div></div>
    `;
    loadRecentRooms();
}

async function startVideo() {
    const roomName = document.getElementById('room-name').value.trim().replace(/\s+/g, '_');
    if (!roomName) return showToast('Escreve o nome da sala', 'error');

    document.getElementById('jitsi-container').innerHTML = '';
    jitsiApi = new JitsiMeetExternalAPI('meet.jit.si', {
        roomName: 'SOPlus_' + roomName,
        parentNode: document.getElementById('jitsi-container'),
        userInfo: { displayName: userProfile?.nome || 'Convidado', email: userProfile?.email || '' },
        configOverwrite: {
            startWithAudioMuted: false, startWithVideoMuted: false,
            prejoinPageEnabled: true, disableDeepLinking: true,
            defaultLanguage: 'pt',
        },
        interfaceConfigOverload: {
            SHOW_JITSI_WATERMARK: false, SHOW_WATERMARK_FOR_GUESTS: false,
            TOOLBAR_ALWAYS_VISIBLE: true, FILM_STRIP_MAX_HEIGHT: 120,
            DEFAULT_BACKGROUND: '#0A0A1A', TOOLBAR_COLOR: '#1E293B',
            SIDE_TOOLBAR_COLOR: '#1E293B', MAIN_TOOLBAR_BG_COLOR: '#1E293B',
        }
    });

    await dbPush('video_salas', {
        nome: roomName, turma: userProfile?.turma, professor: userProfile?.nome,
        professorId: currentUser.uid, createdAt: Date.now(), ativa: true
    });

    showToast(`Entraste na sala: ${roomName}`, 'success');
}

function endVideo() {
    if (jitsiApi) { jitsiApi.dispose(); jitsiApi = null; }
    document.getElementById('jitsi-container').innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-light);">Sala encerrada</div>';
}

async function loadRecentRooms() {
    const snap = await dbGet('video_salas');
    const salas = snap ? Object.entries(snap).map(([k,v]) => ({id:k,...v})).sort((a,b) => b.createdAt - a.createdAt).slice(0,10) : [];
    document.getElementById('rooms-list').innerHTML = salas.length === 0
        ? '<p style="color:var(--text-light);">Nenhuma sala ainda</p>'
        : salas.map(s => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid var(--border);">
                <div><strong>${s.nome}</strong><br><small style="color:var(--text-light);">${s.professor || ''} · ${new Date(s.createdAt).toLocaleDateString('pt-PT')}</small></div>
                <button class="btn btn-sm btn-primary" onclick="document.getElementById('room-name').value='${s.nome}';startVideo();">Entrar</button>
            </div>
        `).join('');
}

// ── ESTÚDIO IA ──
// ── ESTUDAR COM MÚSICA ──
function renderEstudar(area) {
    area.innerHTML = `
        <div class="page-header"><h2>🎵 Estudar ao Som da Música</h2><p>Músicas calmas e foco com recomendações da IA</p></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
            <div class="card">
                <div class="card-title">🎧 Player Spotify</div>
                <iframe style="border-radius:12px;margin-top:10px;" src="https://open.spotify.com/embed/playlist/37i9dQZF1DWZeKCadgRdKQ?utm_source=generator&theme=0" width="100%" height="450" frameBorder="0" allowfullscreen allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>
            </div>
            <div>
                <div class="card">
                    <div class="card-title">🤖 Recomendações IA</div>
                    <p style="color:var(--text-light);font-size:13px;margin-bottom:12px;">Diz o que precisas e a IA recomenda playlists e músicas perfeitas para estudar</p>
                    <div class="form-group"><label>O que estás a estudar?</label><input class="form-input" id="study-subject" placeholder="Ex: Matemática, História, Programação..."></div>
                    <div class="form-group"><label>Como te sentes?</label>
                        <div style="display:flex;gap:8px;flex-wrap:wrap;" id="study-mood">
                            <button class="btn btn-sm" onclick="setStudyMood(this,'focado')" style="background:rgba(37,99,235,.15);border:1px solid rgba(37,99,235,.3);">🧠 Focado</button>
                            <button class="btn btn-sm" onclick="setStudyMood(this,'cansado')" style="background:rgba(251,191,36,.15);border:1px solid rgba(251,191,36,.3);">😴 Cansado</button>
                            <button class="btn btn-sm" onclick="setStudyMood(this,'ansioso')" style="background:rgba(239,68,68,.15);border:1px solid rgba(239,68,68,.3);">😰 Ansioso</button>
                            <button class="btn btn-sm" onclick="setStudyMood(this,'motivado')" style="background:rgba(16,185,129,.15);border:1px solid rgba(16,185,129,.3);">🔥 Motivado</button>
                        </div>
                    </div>
                    <button class="btn btn-ai" onclick="getStudyRecommendation()" style="width:100%;">🎵 Pedir Recomendação</button>
                    <div id="study-result" style="margin-top:12px;min-height:60px;"></div>
                </div>
                <div class="card" style="margin-top:16px;">
                    <div class="card-title">📋 Playlists Rápidas</div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px;">
                        <iframe style="border-radius:10px;" src="https://open.spotify.com/embed/playlist/37i9dQZF1DWZeKCadgRdKQ?utm_source=generator&theme=0" width="100%" height="152" frameBorder="0" allow="autoplay" loading="lazy"></iframe>
                        <iframe style="border-radius:10px;" src="https://open.spotify.com/embed/playlist/37i9dQZF1DWXVtCvnNXXlK?utm_source=generator&theme=0" width="100%" height="152" frameBorder="0" allow="autoplay" loading="lazy"></iframe>
                    </div>
                </div>
            </div>
        </div>
    `;
}

let studyMood = 'focado';
function setStudyMood(btn, mood) {
    studyMood = mood;
    document.querySelectorAll('#study-mood .btn').forEach(b => b.style.outline = 'none');
    btn.style.outline = '2px solid var(--ai)';
}

async function getStudyRecommendation() {
    const subject = document.getElementById('study-subject').value.trim();
    const result = document.getElementById('study-result');
    if (!subject) return showToast('Diz o que estás a estudar', 'error');
    result.innerHTML = '<div style="color:var(--ai);animation:pulse 1.5s infinite;">🎵 A pensar na melhor música para ti...</div>';
    try {
        const r = await fetch('/api/ai/chat', {
            method: 'POST', headers: {'Content-Type':'application/json'},
            body: aiBody(`Estou a estudar ${subject} e estou ${studyMood}. Recomenda-me 5 músicas ou playlists do Spotify perfeitas para este momento. Dá nomes das músicas, artistas e porquê são boas para estudar. Formato: 1. 🎵 Nome - Artista (razão)`)
        });
        const data = await r.json();
        result.textContent = data.resposta || data.erro || 'Erro';
    } catch(e) { result.textContent = e.message; }
}

// ── ESTÚDIO IA (EXPANDIDO) ──
function renderEstudioIA(area) {
    area.innerHTML = `
        <div class="page-header"><h2>🤖 Estúdio IA</h2><p>Todas as ferramentas de IA num só sítio</p></div>
        <div style="display:grid;grid-template-columns:220px 1fr;gap:20px;min-height:80vh;">
            <div class="card" style="padding:8px;">
                <div style="display:flex;flex-direction:column;gap:4px;" id="ia-tools">
                    <button class="btn ia-tool active" onclick="switchIATool('chat')" data-tool="chat">💬 Chat IA</button>
                    <button class="btn ia-tool" onclick="switchIATool('imagem')" data-tool="imagem">🎨 Gerar Imagem</button>
                    <button class="btn ia-tool" onclick="switchIATool('escrita')" data-tool="escrita">✍️ Escrita</button>
                    <button class="btn ia-tool" onclick="switchIATool('analise-foto')" data-tool="analise-foto">📷 Análise Foto</button>
                    <button class="btn ia-tool" onclick="switchIATool('analise-ficheiro')" data-tool="analise-ficheiro">📄 Análise Ficheiro</button>
                    <button class="btn ia-tool" onclick="switchIATool('ppt-ajuda')" data-tool="ppt-ajuda">📊 Ajuda PowerPoint</button>
                    <button class="btn ia-tool" onclick="switchIATool('codigo')" data-tool="codigo">💻 Código IA</button>
                    <button class="btn ia-tool" onclick="switchIATool('resumo')" data-tool="resumo">📋 Resumo</button>
                    <button class="btn ia-tool" onclick="switchIATool('tradutor')" data-tool="tradutor">🌐 Tradutor</button>
                </div>
            </div>
            <div id="ia-tool-content" class="card" style="padding:24px;">
                <div id="ia-chat-panel">
                    <div class="card-title">💬 Chat IA</div>
                    <div id="ia-chat-messages" style="height:350px;overflow-y:auto;padding:12px;background:var(--bg);border-radius:12px;margin-bottom:12px;border:1px solid var(--border);"></div>
                    <div style="display:flex;gap:8px;">
                        <input class="form-input" id="ia-chat-input" placeholder="Pergunta qualquer coisa..." onkeydown="if(event.key==='Enter')sendIAChat()" style="flex:1;">
                        <button class="btn btn-ai" onclick="sendIAChat()">Enviar</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    initIAChat();
}

function switchIATool(tool) {
    document.querySelectorAll('.ia-tool').forEach(b => { b.classList.remove('active'); b.style.background=''; b.style.borderColor=''; });
    document.querySelector(`[data-tool="${tool}"]`).classList.add('active');
    document.querySelector(`[data-tool="${tool}"]`).style.background = 'rgba(139,92,246,.15)';
    document.querySelector(`[data-tool="${tool}"]`).style.borderColor = 'var(--ai)';
    const panel = document.getElementById('ia-tool-content');

    const tools = {
        'chat': () => {
            panel.innerHTML = `
                <div class="card-title">💬 Chat IA</div>
                <div id="ia-chat-messages" style="height:400px;overflow-y:auto;padding:12px;background:var(--bg);border-radius:12px;margin-bottom:12px;border:1px solid var(--border);"></div>
                <div style="display:flex;gap:8px;">
                    <input class="form-input" id="ia-chat-input" placeholder="Pergunta qualquer coisa..." onkeydown="if(event.key==='Enter')sendIAChat()" style="flex:1;">
                    <button class="btn btn-ai" onclick="sendIAChat()">Enviar</button>
                </div>`;
            initIAChat();
        },
        'imagem': () => {
            panel.innerHTML = `
                <div class="card-title">🎨 Gerar Imagem</div>
                <div class="form-group"><label>Descreve a imagem</label><input class="form-input" id="img-prompt" placeholder="Ex: Um astronauta a beber café em Marte..."></div>
                <button id="btn-gerar" class="btn btn-banana" onclick="gerarImagem()" style="width:100%;">✨ Gerar Imagem</button>
                <div id="img-result" style="margin-top:20px;text-align:center;min-height:300px;border:2px dashed var(--border);border-radius:12px;display:flex;align-items:center;justify-content:center;background:var(--bg);">
                    <span style="color:var(--text-light)">A tua imagem aparecerá aqui...</span>
                </div>`;
        },
        'escrita': () => {
            panel.innerHTML = `
                <div class="card-title">✍️ Assistente de Escrita</div>
                <div class="form-group"><label>Tipo de texto</label>
                    <select class="form-input" id="escrita-tipo">
                        <option value="essay">Redação</option><option value="letter">Carta</option><option value="report">Relatório</option>
                        <option value="summary">Resumo</option><option value="creative">Texto Criativo</option><option value="formal">Texto Formal</option>
                    </select></div>
                <div class="form-group"><label>O que escrever?</label><textarea class="form-input" id="escrita-prompt" rows="4" placeholder="Ex: Escreve uma redação sobre alterações climáticas..."></textarea></div>
                <button class="btn btn-ai" onclick="gerarEscrita()" style="width:100%;">✍️ Gerar Texto</button>
                <div id="escrita-result" style="margin-top:16px;padding:16px;background:var(--bg);border-radius:12px;border:1px solid var(--border);min-height:100px;white-space:pre-wrap;font-size:13px;line-height:1.7;"></div>`;
        },
        'analise-foto': () => {
            panel.innerHTML = `
                <div class="card-title">📷 Análise de Foto</div>
                <p style="color:var(--text-light);font-size:13px;margin-bottom:12px;">Tira uma foto ou faz upload e a IA descreve, analisa ou responde perguntas</p>
                <div class="form-group"><label>Carrega uma imagem</label><input type="file" class="form-input" id="analise-foto-input" accept="image/*"></div>
                <div class="form-group"><label>O que queres saber?</label><input class="form-input" id="analise-foto-pergunta" placeholder="Ex: O que está nesta imagem? Descreve detalhadamente..."></div>
                <button class="btn btn-ai" onclick="analisarFoto()" style="width:100%;">📷 Analisar</button>
                <div id="analise-foto-result" style="margin-top:16px;padding:16px;background:var(--bg);border-radius:12px;border:1px solid var(--border);min-height:80px;white-space:pre-wrap;font-size:13px;line-height:1.7;"></div>`;
        },
        'analise-ficheiro': () => {
            panel.innerHTML = `
                <div class="card-title">📄 Análise de Ficheiro</div>
                <p style="color:var(--text-light);font-size:13px;margin-bottom:12px;">Carrega um ficheiro de texto e a IA analisa, resume ou responde perguntas</p>
                <div class="form-group"><label>Carrega um ficheiro (.txt, .md, .csv)</label><input type="file" class="form-input" id="analise-file-input" accept=".txt,.md,.csv,.json,.py,.js,.html,.css"></div>
                <div class="form-group"><label>O que fazer?</label><input class="form-input" id="analise-file-pergunta" placeholder="Ex: Resume este documento, ou explica o código..."></div>
                <button class="btn btn-ai" onclick="analisarFicheiro()" style="width:100%;">📄 Analisar</button>
                <div id="analise-file-result" style="margin-top:16px;padding:16px;background:var(--bg);border-radius:12px;border:1px solid var(--border);min-height:80px;white-space:pre-wrap;font-size:13px;line-height:1.7;"></div>`;
        },
        'ppt-ajuda': () => {
            panel.innerHTML = `
                <div class="card-title">📊 Ajuda PowerPoint</div>
                <div class="form-group"><label>O que precisas?</label>
                    <select class="form-input" id="ppt-tipo">
                        <option value="estrutura">Criar Estrutura de Slides</option><option value="conteudo">Escrever Conteúdo</option>
                        <option value="dicas">Dicas de Apresentação</option><option value="design">Sugestões de Design</option>
                    </select></div>
                <div class="form-group"><label>Tema / Assunto</label><input class="form-input" id="ppt-tema" placeholder="Ex: Apresentação sobre a Revolução Francesa..."></div>
                <button class="btn btn-ai" onclick="ajudarPPT()" style="width:100%;">📊 Gerar Ajuda</button>
                <div id="ppt-ajuda-result" style="margin-top:16px;padding:16px;background:var(--bg);border-radius:12px;border:1px solid var(--border);min-height:100px;white-space:pre-wrap;font-size:13px;line-height:1.7;"></div>`;
        },
        'codigo': () => {
            panel.innerHTML = `
                <div class="card-title">💻 Código IA</div>
                <div class="form-group"><label>Linguagem</label>
                    <select class="form-input" id="codigo-lang">
                        <option value="python">Python</option><option value="javascript">JavaScript</option><option value="html">HTML/CSS</option>
                        <option value="java">Java</option><option value="c">C/C++</option><option value="sql">SQL</option><option value="auto">Auto-detectar</option>
                    </select></div>
                <div class="form-group"><label>O que fazer?</label>
                    <select class="form-input" id="codigo-action">
                        <option value="escrever">Escrever código</option><option value="explicar">Explicar código</option>
                        <option value="corrigir">Corrigir erros</option><option value="otimizar">Otimizar</option>
                    </select></div>
                <div class="form-group"><label>Descrição ou código</label><textarea class="form-input" id="codigo-prompt" rows="5" placeholder="Ex: Cria um jogo da velha em Python, ou cola aqui código para corrigir..."></textarea></div>
                <button class="btn btn-ai" onclick="ajudarCodigo()" style="width:100%;">💻 Gerar</button>
                <div id="codigo-result" style="margin-top:16px;padding:16px;background:var(--bg);border-radius:12px;border:1px solid var(--border);min-height:100px;white-space:pre-wrap;font-size:13px;line-height:1.7;font-family:monospace;"></div>`;
        },
        'resumo': () => {
            panel.innerHTML = `
                <div class="card-title">📋 Resumir Texto</div>
                <div class="form-group"><label>Cola o texto</label><textarea class="form-input" id="resumo-texto" rows="8" placeholder="Cola aqui o texto que queres resumir..."></textarea></div>
                <div class="form-group"><label>Tipo de resumo</label>
                    <select class="form-input" id="resumo-tipo">
                        <option value="breve">Breve (3-5 pontos)</option><option value="detalhado">Detalhado</option>
                        <option value="bullet">Bullet points</option><option value="flashcards">Flashcards</option>
                    </select></div>
                <button class="btn btn-ai" onclick="gerarResumo()" style="width:100%;">📋 Resumir</button>
                <div id="resumo-result" style="margin-top:16px;padding:16px;background:var(--bg);border-radius:12px;border:1px solid var(--border);min-height:80px;white-space:pre-wrap;font-size:13px;line-height:1.7;"></div>`;
        },
        'tradutor': () => {
            panel.innerHTML = `
                <div class="card-title">🌐 Tradutor IA</div>
                <div style="display:grid;grid-template-columns:1fr auto 1fr;gap:12px;align-items:end;">
                    <div class="form-group"><label>De</label>
                        <select class="form-input" id="trad-de"><option value="Português">Português</option><option value="Inglês">Inglês</option><option value="Espanhol">Espanhol</option><option value="Francês">Francês</option><option value="Alemão">Alemão</option><option value="Italiano">Italiano</option></select></div>
                    <div style="padding-bottom:8px;font-size:24px;">→</div>
                    <div class="form-group"><label>Para</label>
                        <select class="form-input" id="trad-para"><option value="Inglês">Inglês</option><option value="Português">Português</option><option value="Espanhol">Espanhol</option><option value="Francês">Francês</option><option value="Alemão">Alemão</option><option value="Italiano">Italiano</option></select></div>
                </div>
                <div class="form-group"><label>Texto</label><textarea class="form-input" id="trad-texto" rows="4" placeholder="Escreve ou cola o texto para traduzir..."></textarea></div>
                <button class="btn btn-ai" onclick="traduzir()" style="width:100%;">🌐 Traduzir</button>
                <div id="trad-result" style="margin-top:16px;padding:16px;background:var(--bg);border-radius:12px;border:1px solid var(--border);min-height:60px;white-space:pre-wrap;font-size:14px;line-height:1.7;"></div>`;
        }
    };
    (tools[tool] || tools['chat'])();
}

let iaChatHistory = [];
function initIAChat() { iaChatHistory = []; }

async function sendIAChat() {
    const input = document.getElementById('ia-chat-input');
    const msgs = document.getElementById('ia-chat-messages');
    const q = input.value.trim();
    if (!q) return;
    input.value = '';
    msgs.innerHTML += `<div style="text-align:right;margin-bottom:8px;"><span style="background:rgba(37,99,235,.15);padding:8px 14px;border-radius:12px 12px 2px 12px;font-size:13px;display:inline-block;max-width:80%;">${q}</span></div>`;
    msgs.innerHTML += `<div style="margin-bottom:8px;"><span style="background:rgba(139,92,246,.1);padding:8px 14px;border-radius:12px 12px 12px 2px;font-size:13px;display:inline-block;animation:pulse 1.5s infinite;color:var(--ai);">A pensar...</span></div>`;
    msgs.scrollTop = msgs.scrollHeight;
    try {
        const r = await fetch('/api/ai/chat', { method:'POST', headers:{'Content-Type':'application/json'}, body: aiBody(q) });
        const data = await r.json();
        const lastTyping = msgs.lastElementChild;
        lastTyping.textContent = data.resposta || data.erro || 'Erro';
    } catch(e) { msgs.lastElementChild.textContent = 'Erro: ' + e.message; }
    msgs.scrollTop = msgs.scrollHeight;
}

async function gerarEscrita() {
    const tipo = document.getElementById('escrita-tipo').value;
    const prompt = document.getElementById('escrita-prompt').value.trim();
    const result = document.getElementById('escrita-result');
    if (!prompt) return showToast('Escreve o que queres', 'error');
    result.innerHTML = '<span style="color:var(--ai);animation:pulse 1.5s infinite;">✍️ A escrever...</span>';
    const r = await fetch('/api/ai/chat', { method:'POST', headers:{'Content-Type':'application/json'}, body: aiBody(`Escreve um(a) ${tipo} sobre: ${prompt}. Usa português correcto e bem estruturado.`) });
    const data = await r.json();
    result.textContent = data.resposta || data.erro;
}

async function analisarFoto() {
    const fileInput = document.getElementById('analise-foto-input');
    const pergunta = document.getElementById('analise-foto-pergunta').value.trim() || 'Descreve detalhadamente esta imagem';
    const result = document.getElementById('analise-foto-result');
    if (!fileInput.files[0]) return showToast('Carrega uma imagem', 'error');
    result.innerHTML = '<span style="color:var(--ai);animation:pulse 1.5s infinite;">📷 A analisar...</span>';
    const reader = new FileReader();
    reader.onload = async () => {
        const base64 = reader.result.split(',')[1];
        try {
            const r = await fetch('/api/ai/chat', { method:'POST', headers:{'Content-Type':'application/json'}, body: aiBody(`[Análise de imagem] ${pergunta}. Nota: o utilizador enviou uma imagem mas esta funcionalidade requer suporte multimodal que será implementado em breve. Por agora descreve o que pediste: ${pergunta}`) });
            const data = await r.json();
            result.textContent = data.resposta || data.erro;
        } catch(e) { result.textContent = e.message; }
    };
    reader.readAsDataURL(fileInput.files[0]);
}

async function analisarFicheiro() {
    const fileInput = document.getElementById('analise-file-input');
    const pergunta = document.getElementById('analise-file-pergunta').value.trim() || 'Resume este documento';
    const result = document.getElementById('analise-file-result');
    if (!fileInput.files[0]) return showToast('Carrega um ficheiro', 'error');
    result.innerHTML = '<span style="color:var(--ai);animation:pulse 1.5s infinite;">📄 A ler ficheiro...</span>';
    const reader = new FileReader();
    reader.onload = async () => {
        const conteudo = reader.result.substring(0, 8000);
        try {
            const r = await fetch('/api/ai/chat', { method:'POST', headers:{'Content-Type':'application/json'}, body: aiBody(`Analisa este ficheiro. Pergunta/Tarefa: ${pergunta}\n\nConteúdo do ficheiro:\n${conteudo}`) });
            const data = await r.json();
            result.textContent = data.resposta || data.erro;
        } catch(e) { result.textContent = e.message; }
    };
    reader.readAsText(fileInput.files[0]);
}

async function ajudarPPT() {
    const tipo = document.getElementById('ppt-tipo').value;
    const tema = document.getElementById('ppt-tema').value.trim();
    const result = document.getElementById('ppt-ajuda-result');
    if (!tema) return showToast('Escreve o tema', 'error');
    result.innerHTML = '<span style="color:var(--ai);animation:pulse 1.5s infinite;">📊 A gerar...</span>';
    const prompts = {
        estrutura: `Cria uma estrutura completa de slides para uma apresentação sobre: ${tema}. Inclui título, 8-10 slides com bullets, e slide de conclusão.`,
        conteudo: `Escreve o conteúdo detalhado para cada slide de uma apresentação sobre: ${tema}.`,
        dicas: `Dá-me 10 dicas profissionais para uma apresentação sobre: ${tema}.`,
        design: `Sugere cores, fontes e layout ideal para uma apresentação sobre: ${tema}.`
    };
    const r = await fetch('/api/ai/chat', { method:'POST', headers:{'Content-Type':'application/json'}, body: aiBody(prompts[tipo]) });
    const data = await r.json();
    result.textContent = data.resposta || data.erro;
}

async function ajudarCodigo() {
    const lang = document.getElementById('codigo-lang').value;
    const action = document.getElementById('codigo-action').value;
    const prompt = document.getElementById('codigo-prompt').value.trim();
    const result = document.getElementById('codigo-result');
    if (!prompt) return showToast('Escreve a descrição ou cola o código', 'error');
    result.innerHTML = '<span style="color:var(--ai);animation:pulse 1.5s infinite;">💻 A processar código...</span>';
    const actions = { escrever: 'Escreve', explicar: 'Explica detalhadamente', corrigir: 'Corrige os erros e explica', otimizar: 'Otimiza e explica as melhorias' };
    const r = await fetch('/api/ai/chat', { method:'POST', headers:{'Content-Type':'application/json'}, body: aiBody(`${actions[action]} código em ${lang}. ${prompt}. Mostra sempre o código formatado.`) });
    const data = await r.json();
    result.textContent = data.resposta || data.erro;
}

async function gerarResumo() {
    const texto = document.getElementById('resumo-texto').value.trim();
    const tipo = document.getElementById('resumo-tipo').value;
    const result = document.getElementById('resumo-result');
    if (!texto) return showToast('Cola o texto', 'error');
    result.innerHTML = '<span style="color:var(--ai);animation:pulse 1.5s infinite;">📋 A resumir...</span>';
    const r = await fetch('/api/ai/chat', { method:'POST', headers:{'Content-Type':'application/json'}, body: aiBody(`Faz um resumo ${tipo} deste texto:\n\n${texto.substring(0,6000)}`) });
    const data = await r.json();
    result.textContent = data.resposta || data.erro;
}

async function traduzir() {
    const de = document.getElementById('trad-de').value;
    const para = document.getElementById('trad-para').value;
    const texto = document.getElementById('trad-texto').value.trim();
    const result = document.getElementById('trad-result');
    if (!texto) return showToast('Escreve o texto', 'error');
    result.innerHTML = '<span style="color:var(--ai);animation:pulse 1.5s infinite;">🌐 A traduzir...</span>';
    const r = await fetch('/api/ai/chat', { method:'POST', headers:{'Content-Type':'application/json'}, body: aiBody(`Traduz de ${de} para ${para}: ${texto}`) });
    const data = await r.json();
    result.textContent = data.resposta || data.erro;
}

async function gerarImagem() {
    const prompt = document.getElementById('img-prompt').value.trim();
    if (!prompt) return showToast('Escreve uma descrição', 'error');
    const btn = document.getElementById('btn-gerar');
    const result = document.getElementById('img-result');
    btn.disabled = true; btn.innerText = '🍌 A desenhar...';
    result.innerHTML = '<div style="font-weight:700;color:var(--ai-banana);animation:pulse 1.5s infinite;">A invocar o Nano Banana...</div>';

    try {
        const r = await fetch('/api/ai/image', {
            method: 'POST', headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ prompt })
        });
        const data = await r.json();
        if (data.imagem) {
            result.innerHTML = `<img src="data:${data.mime};base64,${data.imagem}" style="max-width:100%;max-height:450px;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,0.3);">`;
        } else {
            const isQuota = data.erro && (data.erro.includes('quota') || data.erro.includes('Quota'));
            result.innerHTML = `<span style="color:var(--danger)">${isQuota ? '⚠️ Geração de imagens indisponível no plano gratuito. Ativa o billing no Google Cloud para usar esta funcionalidade.' : (data.erro || 'Erro na geração')}</span>`;
        }
    } catch(e) {
        result.innerHTML = `<span style="color:var(--danger)">Erro: ${e.message}</span>`;
    }
    btn.disabled = false; btn.innerText = '✨ Gerar Imagem';
}

// ── RECURSOS (PROF) ──
function renderRecursos(area) {
    area.innerHTML = `
        <div class="page-header"><h2>🎓 Painel do Professor</h2></div>
        <div class="stat-grid">
            <div class="stat-card"><div class="stat-icon">👨‍🎓</div><div class="stat-value" id="count-alunos">0</div><div class="stat-label">Alunos</div></div>
            <div class="stat-card"><div class="stat-icon">📝</div><div class="stat-value" id="count-provas">0</div><div class="stat-label">Provas</div></div>
            <div class="stat-card"><div class="stat-icon">💬</div><div class="stat-value" id="count-msgs">0</div><div class="stat-label">Mensagens</div></div>
            <div class="stat-card"><div class="stat-icon">📁</div><div class="stat-value" id="count-files">0</div><div class="stat-label">Ficheiros</div></div>
        </div>
        <div class="card"><div class="card-title">📋 Alunos da Turma</div><div id="alunos-list"></div></div>
    `;
    loadRecursosStats();
}

async function loadRecursosStats() {
    const [usersSnap, provasSnap, chatSnap, filesSnap] = await Promise.all([dbGet('users'), dbGet('provas'), dbGet('chat'), dbGet('ficheiros')]);
    const users = usersSnap ? Object.entries(usersSnap) : [];
    const alunos = users.filter(([k,v]) => v.turma === userProfile?.turma && v.role === 'aluno');

    document.getElementById('count-alunos').textContent = alunos.length;
    document.getElementById('count-provas').textContent = provasSnap ? Object.values(provasSnap).filter(p => p.professorId === currentUser.uid).length : 0;
    document.getElementById('count-msgs').textContent = chatSnap ? Object.keys(chatSnap).length : 0;
    document.getElementById('count-files').textContent = filesSnap ? Object.keys(filesSnap).length : 0;

    document.getElementById('alunos-list').innerHTML = alunos.length === 0
        ? '<p style="color:var(--text-light);">Sem alunos na turma</p>'
        : '<div class="table-wrap"><table class="sheet-table"><tr><th>Nome</th><th>Email</th><th>UID</th></tr>' +
          alunos.map(([uid, a]) => `<tr><td><strong>${a.nome}</strong></td><td>${a.email}</td><td><code style="font-size:11px;">${uid.slice(0,12)}...</code></td></tr>`).join('') +
          '</table></div>';
}

// ── PERFIL ──
function renderPerfil(area) {
    const isProf = userProfile?.role === 'professor';
    const langList = getLanguageList();
    area.innerHTML = `
        <div class="page-header"><h2>⚙️ ${t('perfil_title')}</h2></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
            <div class="card">
                <div class="card-title">👤 ${t('perfil_subtitle')}</div>
                <form id="form-perfil">
                    <div class="form-group"><label>${t('perfil_name')}</label><input class="form-input" name="nome" value="${userProfile?.nome || ''}" required></div>
                    <div class="form-group"><label>${t('perfil_email')}</label><input class="form-input" value="${currentUser?.email || 'Anónimo'}" disabled style="opacity:0.5;"></div>
                    <div class="form-group"><label>${t('perfil_role')}</label><input class="form-input" value="${isProf ? '👨‍🏫 ' + t('professor') : '🎓 ' + t('student')}" disabled style="opacity:0.5;"></div>
                    ${isProf ? `
                    <div class="form-group">
                        <label>As Minhas Turmas</label>
                        <p style="font-size:11px;color:var(--text-light);margin-bottom:6px;">Separa as turmas por vírgula (ex: 10A, 10B, 11A)</p>
                        <input class="form-input" name="turmas" value="${userProfile?.turmas || ''}" placeholder="Ex: 10A, 10B, 11A">
                    </div>` : `
                    <div class="form-group"><label>${t('perfil_turma')}</label><input class="form-input" name="turma" value="${userProfile?.turma || ''}"></div>`}
                    ${!isProf ? `
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                        <div class="form-group"><label>Ano</label><input type="number" class="form-input" name="ano" value="${userProfile?.ano || ''}" min="1" max="12"></div>
                        <div class="form-group"><label>Idade</label><input type="number" class="form-input" name="idade" value="${userProfile?.idade || ''}" min="8" max="25"></div>
                    </div>` : ''}
                    <button type="submit" class="btn btn-primary" style="width:100%;">💾 ${t('perfil_save')}</button>
                </form>
            </div>
            <div class="card">
                <div class="card-title">🌐 ${t('perfil_lang')}</div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:20px;">
                    ${langList.map(l => `
                        <button class="btn ${currentLang === l.code ? 'btn-primary' : 'btn-outline'}" 
                            onclick="changeProfileLang('${l.code}')" 
                            style="display:flex;align-items:center;gap:8px;padding:10px 14px;font-size:13px;">
                            <span style="font-size:18px;">${l.flag}</span> ${l.name}
                        </button>
                    `).join('')}
                </div>

                <div style="border-top:1px solid var(--border);padding-top:16px;margin-top:8px;">
                    <div class="card-title" style="margin-bottom:12px;">ℹ️ Conta</div>
                    <div style="font-size:13px;color:var(--text-light);line-height:2;">
                        <div><strong>UID:</strong> <code style="font-size:11px;">${currentUser?.uid || ''}</code></div>
                        <div><strong>Email:</strong> ${currentUser?.email || 'Anónimo'}</div>
                        <div><strong>Tipo:</strong> ${currentUser?.isAnonymous ? t('guest') : t('register')}</div>
                        ${isProf ? `<div><strong>Turmas:</strong> ${userProfile?.turmas || 'Não definidas'}</div>` : `<div><strong>${t('perfil_turma')}:</strong> ${userProfile?.turma || 'Não definida'}</div>`}
                        <div><strong>Membro desde:</strong> ${new Date(userProfile?.createdAt || Date.now()).toLocaleDateString('pt-PT')}</div>
                    </div>
                </div>
                <div style="margin-top:20px;border-top:1px solid var(--border);padding-top:16px;">
                    <button class="btn btn-danger" style="width:100%;" onclick="doLogout()">🚪 ${t('perfil_logout')}</button>
                </div>
            </div>
        </div>
    `;
    document.getElementById('form-perfil').onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const update = { nome: fd.get('nome') };
        if (isProf) {
            update.turmas = fd.get('turmas') || '';
        } else {
            update.turma = fd.get('turma');
            update.ano = fd.get('ano');
            update.idade = fd.get('idade');
        }
        await updateUserProfile(currentUser.uid, update);
        userProfile = await getUserProfile(currentUser.uid);
        updateUI();
        showToast(t('success') + '!', 'success');
    };
}

function changeProfileLang(lang) {
    setLanguage(lang);
    buildNav();
    navigateTo('perfil');
    showToast(t('perfil_lang') + ': ' + (LANGUAGES[lang]?._name || lang), 'success');
}

async function doLogout() {
    if (!confirm('Terminar sessão?')) return;
    dbStopListen('chat');
    if (jitsiApi) { jitsiApi.dispose(); jitsiApi = null; }
    currentUser = null;
    userProfile = null;
    currentPage = null;
    await logout();
    window.location.href = '/';
}

// ─── AI CHAT ──────────────────────────────────────────────
function toggleAI() {
    const p = document.getElementById('ai-panel');
    p.style.display = p.style.display === 'flex' ? 'none' : 'flex';
}

async function askAI() {
    const input = document.getElementById('ai-in');
    const box = document.getElementById('ai-chat');
    const q = input.value.trim();
    if (!q) return;
    input.value = '';

    box.innerHTML += `<div class="ai-msg-user">${q}</div>`;
    box.innerHTML += `<div class="ai-typing" id="ai-typing"><span></span><span></span><span></span></div>`;
    box.scrollTop = box.scrollHeight;

    try {
        const r = await fetch('/api/ai/chat', {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: aiBody(q)
        });
        const data = await r.json();
        document.getElementById('ai-typing')?.remove();
        const div = document.createElement('div'); div.className = 'ai-msg'; div.textContent = data.resposta || data.erro || 'Erro'; box.appendChild(div);
    } catch(e) {
        document.getElementById('ai-typing')?.remove();
        box.innerHTML += `<div class="ai-msg" style="border-color:var(--danger);">Erro de ligação.</div>`;
    }
    box.scrollTop = box.scrollHeight;
}

// ── IDE DE CÓDIGO ──
let monacoEditor = null;
function renderIDE(area) {
    area.innerHTML = `
        <div class="page-header" style="display:flex;justify-content:space-between;align-items:center;">
            <div><h2>💻 IDE de Código</h2><p>Escreve e executa código diretamente no browser</p></div>
            <div style="display:flex;gap:10px;">
                <select class="form-input" id="ide-lang" onchange="changeLang()" style="width:150px;">
                    <option value="python">Python</option>
                    <option value="javascript">JavaScript</option>
                    <option value="html">HTML</option>
                    <option value="css">CSS</option>
                    <option value="java">Java</option>
                    <option value="cpp">C++</option>
                    <option value="sql">SQL</option>
                </select>
                <button class="btn btn-primary" onclick="runCode()">▶ Executar</button>
                <button class="btn btn-success" onclick="saveIDECode()">💾 Guardar</button>
                <button class="btn btn-outline" onclick="loadSavedCode()">📂 Carregar</button>
            </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;height:calc(100vh - 220px);">
            <div class="card" style="padding:0;overflow:hidden;">
                <div id="monaco-editor" style="width:100%;height:100%;min-height:500px;"></div>
            </div>
            <div class="card" style="overflow:auto;">
                <div class="card-title">📋 Output</div>
                <pre id="ide-output" style="background:var(--bg);padding:16px;border-radius:8px;min-height:200px;font-family:monospace;font-size:13px;color:var(--text);white-space:pre-wrap;word-break:break-all;">Clica em Executar para ver o resultado...</pre>
                <div style="margin-top:12px;" id="ide-ai-help">
                    <div class="card-title">🤖 IA Assistente</div>
                    <div style="display:flex;gap:8px;">
                        <input class="form-input" id="ide-ai-input" placeholder="Pede ajuda sobre o código..." onkeypress="if(event.key==='Enter')askCodeHelp()" style="flex:1;">
                        <button class="btn btn-ai" onclick="askCodeHelp()">Pedir</button>
                    </div>
                    <div id="ide-ai-response" style="margin-top:10px;font-size:13px;color:var(--text-light);"></div>
                </div>
            </div>
        </div>
    `;
    loadMonaco();
}

function loadMonaco() {
    if (typeof require !== 'undefined' && require.config) {
        require.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.50.0/min/vs' } });
        require(['vs/editor/editor.main'], () => {
            if (monacoEditor) monacoEditor.dispose();
            monacoEditor = monaco.editor.create(document.getElementById('monaco-editor'), {
                value: '// Escreve o teu código aqui...\n',
                language: document.getElementById('ide-lang')?.value || 'python',
                theme: 'vs-dark',
                fontSize: 14,
                minimap: { enabled: false },
                automaticLayout: true,
                padding: { top: 16 },
                scrollBeyondLastLine: false,
            });
        });
    } else {
        setTimeout(loadMonaco, 200);
    }
}

function changeLang() {
    if (!monacoEditor) return;
    const lang = document.getElementById('ide-lang').value;
    const model = monacoEditor.getModel();
    if (model) monaco.editor.setModelLanguage(model, lang);
}

async function runCode() {
    const code = monacoEditor?.getValue() || '';
    const lang = document.getElementById('ide-lang').value;
    const output = document.getElementById('ide-output');
    output.textContent = '⏳ A executar...';

    try {
        const r = await fetch('/api/ai/chat', {
            method: 'POST', headers: {'Content-Type':'application/json'},
            body: aiBody(`Executa este código ${lang} e mostra o output. Se houver erros, explica. Código:\n\`\`\`${lang}\n${code}\n\`\`\``)
        });
        const data = await r.json();
        output.textContent = data.resposta || data.erro || 'Sem output';
    } catch(e) {
        output.textContent = 'Erro: ' + e.message;
    }
}

async function askCodeHelp() {
    const input = document.getElementById('ide-ai-input');
    const code = monacoEditor?.getValue() || '';
    const q = input.value.trim();
    if (!q) return;
    input.value = '';
    const resp = document.getElementById('ide-ai-response');
    resp.innerHTML = '<span style="color:var(--ai-banana);">A pensar...</span>';

    try {
        const r = await fetch('/api/ai/chat', {
            method: 'POST', headers: {'Content-Type':'application/json'},
            body: aiBody(`No contexto deste código:\n\`\`\`\n${code}\n\`\`\`\n\nPergunta: ${q}`)
        });
        const data = await r.json();
        resp.textContent = data.resposta || data.erro || 'Sem resposta';
    } catch(e) {
        resp.innerHTML = '<span style="color:var(--danger);">Erro de ligação</span>';
    }
}

async function saveIDECode() {
    if (!monacoEditor) return;
    const code = monacoEditor.getValue();
    const lang = document.getElementById('ide-lang').value;
    const nome = prompt('Nome do ficheiro:', 'codigo');
    if (!nome) return;
    await dbPush('ide_codes', {
        nome, lang, code, autorId: currentUser.uid, autorNome: userProfile?.nome,
        createdAt: Date.now()
    });
    showToast('Código guardado!', 'success');
}

async function loadSavedCode() {
    const snap = await dbGet('ide_codes');
    const codes = snap ? Object.entries(snap).filter(([k,v]) => v.autorId === currentUser.uid).map(([k,v]) => ({id:k,...v})) : [];
    if (codes.length === 0) return showToast('Sem código guardado', 'error');
    const area = document.getElementById('content-area');
    const choice = prompt('Código guardado:\n' + codes.map((c,i) => `${i+1}. ${c.nome} (${c.lang})`).join('\n') + '\n\nEscolhe o número:');
    const idx = parseInt(choice) - 1;
    if (idx >= 0 && idx < codes.length && monacoEditor) {
        monacoEditor.setValue(codes[idx].code);
        document.getElementById('ide-lang').value = codes[idx].lang;
        changeLang();
        showToast('Código carregado!', 'success');
    }
}

// ── COLABORAÇÃO ──
function renderColaboracao(area) {
    area.innerHTML = `
        <div class="page-header"><h2>👥 Colaboração</h2><p>Convida colegas para trabalharem juntos</p></div>
        <div class="card">
            <div class="card-title">📧 Convidar Colega</div>
            <form id="form-convite" style="display:flex;gap:12px;align-items:end;">
                <div class="form-group" style="flex:1;"><label>Email ou Nome do colega</label><input class="form-input" name="convidado" placeholder="ex: ana@so.com" required></div>
                <div class="form-group" style="flex:1;"><label>Mensagem</label><input class="form-input" name="mensagem" placeholder="Vamos fazer o projeto juntos!"></div>
                <button type="submit" class="btn btn-primary">📧 Enviar Convite</button>
            </form>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
            <div class="card"><div class="card-title">📥 Convites Recebidos</div><div id="convites-recebidos"></div></div>
            <div class="card"><div class="card-title">📤 Convites Enviados</div><div id="convites-enviados"></div></div>
        </div>
        <div class="card"><div class="card-title">👥 Projetos Colaborativos</div>
            <button class="btn btn-primary" onclick="criarProjeto()" style="margin-bottom:16px;">➕ Criar Projeto</button>
            <div id="projetos-list"></div>
        </div>
    `;
    document.getElementById('form-convite').onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        await dbPush('convites', {
            de: currentUser.uid, deNome: userProfile?.nome, deEmail: currentUser?.email,
            para: fd.get('convidado'), mensagem: fd.get('mensagem') || 'Vamos colaborar!',
            lido: false, aceite: false, createdAt: Date.now()
        });
        showToast('Convite enviado!', 'success');
        e.target.reset();
        loadConvites();
    };
    loadConvites();
    loadProjetosColab();
}

async function loadConvites() {
    const snap = await dbGet('convites');
    const convites = snap ? Object.entries(snap).map(([k,v]) => ({id:k,...v})) : [];
    const myEmail = currentUser?.email || '';
    const myName = userProfile?.nome || '';

    const recebidos = convites.filter(c => c.para === myEmail || c.para === myName || c.para === currentUser.uid);
    const enviados = convites.filter(c => c.de === currentUser.uid);

    document.getElementById('convites-recebidos').innerHTML = recebidos.length === 0
        ? '<p style="color:var(--text-light);padding:10px 0;">Sem convites</p>'
        : recebidos.map(c => `
            <div style="padding:12px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;">
                <div><strong>${c.deNome}</strong> <small style="color:var(--text-light);">${c.deEmail || ''}</small><br><span style="font-size:13px;">${c.mensagem}</span></div>
                <div style="display:flex;gap:6px;">
                    ${c.aceite ? '<span class="btn btn-sm btn-success">✓ Aceite</span>' :
                    `<button class="btn btn-sm btn-success" onclick="responderConvite('${c.id}',true)">✓ Aceitar</button>
                     <button class="btn btn-sm btn-danger" onclick="responderConvite('${c.id}',false)">✕</button>`}
                </div>
            </div>
        `).join('');

    document.getElementById('convites-enviados').innerHTML = enviados.length === 0
        ? '<p style="color:var(--text-light);padding:10px 0;">Sem convites enviados</p>'
        : enviados.map(c => `
            <div style="padding:12px;border-bottom:1px solid var(--border);">
                <div><strong>Para:</strong> ${c.para} <span style="color:${c.aceite ? 'var(--success)' : 'var(--text-light)'}; font-size:12px;">${c.aceite ? '✓ Aceite' : '⏳ Pendente'}</span></div>
                <div style="font-size:13px;color:var(--text-light);">${c.mensagem}</div>
            </div>
        `).join('');
}

async function responderConvite(id, aceite) {
    await dbUpdate('convites/' + id, { aceite, lido: true });
    if (aceite) showToast('Convite aceite!', 'success');
    loadConvites();
}

async function criarProjeto() {
    const nome = prompt('Nome do projeto:');
    if (!nome) return;
    await dbPush('projetos_colab', {
        nome, criadorId: currentUser.uid, criadorNome: userProfile?.nome,
        membros: { [currentUser.uid]: userProfile?.nome },
        createdAt: Date.now()
    });
    showToast('Projeto criado!', 'success');
    loadProjetosColab();
}

async function loadProjetosColab() {
    const snap = await dbGet('projetos_colab');
    const projetos = snap ? Object.entries(snap).filter(([k,v]) => {
        const membros = v.membros || {};
        return membros[currentUser.uid] || v.criadorId === currentUser.uid;
    }).map(([k,v]) => ({id:k,...v})) : [];

    document.getElementById('projetos-list').innerHTML = projetos.length === 0
        ? '<p style="color:var(--text-light);">Sem projetos colaborativos</p>'
        : projetos.map(p => `
            <div style="padding:14px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;">
                <div>
                    <strong>${p.nome}</strong><br>
                    <small style="color:var(--text-light);">Criado por ${p.criadorNome} · ${Object.keys(p.membros || {}).length} membros</small>
                </div>
                <div style="display:flex;gap:6px;">
                    <button class="btn btn-sm btn-outline" onclick="convidarParaProjeto('${p.id}')">➕ Convidar</button>
                    <button class="btn btn-sm btn-primary" onclick="abrirProjeto('${p.id}')">📂 Abrir</button>
                </div>
            </div>
        `).join('');
}

async function convidarParaProjeto(projetoId) {
    const email = prompt('Email ou nome do colega a convidar:');
    if (!email) return;
    await dbPush('convites', {
        de: currentUser.uid, deNome: userProfile?.nome, deEmail: currentUser?.email,
        para: email, mensagem: `Convite para o projeto!`, projetoId,
        lido: false, aceite: false, createdAt: Date.now()
    });
    showToast('Convite enviado!', 'success');
}

function abrirProjeto(id) {
    navigateTo('ide');
    showToast('Projeto colaborativo aberto no IDE', 'success');
}

// ── EXCEL ──
let excelData = [];
let excelCols = 26;
let excelRows = 50;

function renderExcel(area) {
    area.innerHTML = `
        <div class="page-header" style="display:flex;justify-content:space-between;align-items:center;">
            <div><h2>📊 Excel</h2><p>Editor de folhas de cálculo</p></div>
            <div style="display:flex;gap:10px;">
                <button class="btn btn-primary" onclick="saveExcel()">💾 Guardar</button>
                <button class="btn btn-outline" onclick="loadExcel()">📂 Carregar</button>
            </div>
        </div>
        <div class="card" style="padding:0;overflow:auto;">
            <div class="excel-toolbar" style="padding:8px 12px;display:flex;gap:8px;border-bottom:1px solid var(--border);flex-wrap:wrap;">
                <button class="btn btn-sm btn-outline" onclick="excelAction('bold')"><b>B</b></button>
                <button class="btn btn-sm btn-outline" onclick="excelAction('italic')"><i>I</i></button>
                <button class="btn btn-sm btn-outline" onclick="excelAction('sum')">Σ Soma</button>
                <button class="btn btn-sm btn-outline" onclick="excelAction('avg')">μ Média</button>
                <input type="color" value="#ffffff" id="excel-color" style="width:30px;height:28px;border:none;cursor:pointer;" onchange="excelAction('color')">
            </div>
            <div id="excel-grid" style="overflow:auto;max-height:calc(100vh - 260px);"></div>
        </div>
    `;
    initExcel();
}

function initExcel() {
    excelData = [];
    for (let r = 0; r < excelRows; r++) {
        excelData[r] = [];
        for (let c = 0; c < excelCols; c++) excelData[r][c] = '';
    }
    renderExcelGrid();
}

function renderExcelGrid() {
    const grid = document.getElementById('excel-grid');
    let html = '<table class="excel-table"><thead><tr><th class="excel-header-corner"></th>';
    for (let c = 0; c < excelCols; c++) {
        html += `<th class="excel-header">${String.fromCharCode(65 + c)}</th>`;
    }
    html += '</tr></thead><tbody>';
    for (let r = 0; r < excelRows; r++) {
        html += `<tr><th class="excel-row-header">${r + 1}</th>`;
        for (let c = 0; c < excelCols; c++) {
            html += `<td class="excel-cell"><input class="excel-input" data-r="${r}" data-c="${c}" value="${(excelData[r] && excelData[r][c]) || ''}" onchange="updateExcelCell(${r},${c},this.value)" onfocus="selectExcelCell(this)" /></td>`;
        }
        html += '</tr>';
    }
    html += '</tbody></table>';
    grid.innerHTML = html;
}

function updateExcelCell(r, c, val) {
    if (!excelData[r]) excelData[r] = [];
    excelData[r][c] = val;
}

let selectedExcelCell = null;
function selectExcelCell(el) {
    document.querySelectorAll('.excel-cell').forEach(c => c.classList.remove('selected'));
    el.closest('.excel-cell').classList.add('selected');
    selectedExcelCell = el;
}

function excelAction(action) {
    if (!selectedExcelCell) return;
    const r = parseInt(selectedExcelCell.dataset.r);
    const c = parseInt(selectedExcelCell.dataset.c);
    if (action === 'bold') selectedExcelCell.style.fontWeight = selectedExcelCell.style.fontWeight === 'bold' ? 'normal' : 'bold';
    else if (action === 'italic') selectedExcelCell.style.fontStyle = selectedExcelCell.style.fontStyle === 'italic' ? 'normal' : 'italic';
    else if (action === 'color') selectedExcelCell.style.color = document.getElementById('excel-color').value;
    else if (action === 'sum') {
        let sum = 0;
        for (let i = 0; i < r; i++) { const v = parseFloat(excelData[i]?.[c]); if (!isNaN(v)) sum += v; }
        excelData[r][c] = sum;
        selectedExcelCell.value = sum;
    } else if (action === 'avg') {
        let sum = 0, count = 0;
        for (let i = 0; i < r; i++) { const v = parseFloat(excelData[i]?.[c]); if (!isNaN(v)) { sum += v; count++; } }
        excelData[r][c] = count > 0 ? (sum / count).toFixed(2) : 0;
        selectedExcelCell.value = excelData[r][c];
    }
}

async function saveExcel() {
    const nome = prompt('Nome da folha:', 'Folha 1');
    if (!nome) return;
    await dbPush('excel_sheets', { nome, data: excelData, autorId: currentUser.uid, autorNome: userProfile?.nome, createdAt: Date.now() });
    showToast('Guardado!', 'success');
}

async function loadExcel() {
    const snap = await dbGet('excel_sheets');
    const sheets = snap ? Object.entries(snap).filter(([k,v]) => v.autorId === currentUser.uid).map(([k,v]) => ({id:k,...v})) : [];
    if (sheets.length === 0) return showToast('Sem folhas guardadas', 'error');
    const choice = prompt('Folhas:\n' + sheets.map((s,i) => `${i+1}. ${s.nome}`).join('\n') + '\n\nNúmero:');
    const s = sheets[parseInt(choice) - 1];
    if (s && s.data) { excelData = s.data; renderExcelGrid(); showToast('Carregado!', 'success'); }
}

// ── WORD ──
function renderWord(area) {
    area.innerHTML = `
        <div class="page-header" style="display:flex;justify-content:space-between;align-items:center;">
            <div><h2>📝 Word</h2><p>Editor de texto rico</p></div>
            <div style="display:flex;gap:10px;">
                <button class="btn btn-sm btn-outline" onclick="wordAction('bold')"><b>B</b></button>
                <button class="btn btn-sm btn-outline" onclick="wordAction('italic')"><i>I</i></button>
                <button class="btn btn-sm btn-outline" onclick="wordAction('underline')"><u>U</u></button>
                <button class="btn btn-sm btn-outline" onclick="wordAction('strikeThrough')"><s>S</s></button>
                <select class="form-input" style="width:100px;" onchange="wordAction('fontSize',this.value)">
                    <option value="3">Normal</option><option value="1">Pequeno</option><option value="5">Grande</option><option value="7">Enorme</option>
                </select>
                <input type="color" value="#ffffff" id="word-color" style="width:30px;height:28px;border:none;cursor:pointer;" onchange="wordAction('foreColor',this.value)">
                <button class="btn btn-sm btn-outline" onclick="wordAction('insertUnorderedList')">• Lista</button>
                <button class="btn btn-sm btn-outline" onclick="wordAction('insertOrderedList')">1. Lista</button>
                <button class="btn btn-sm btn-outline" onclick="wordAction('justifyCenter')">-centro</button>
                <button class="btn btn-sm btn-primary" onclick="saveWord()">💾 Guardar</button>
            </div>
        </div>
        <div class="card" style="max-width:900px;margin:0 auto;">
            <div id="word-editor" contenteditable="true" style="min-height:500px;padding:30px;font-size:15px;line-height:1.8;color:var(--text);outline:none;background:var(--bg);border-radius:8px;font-family:Georgia,serif;">
                <h1 style="text-align:center;">Documento</h1>
                <p>Escreve aqui o teu documento...</p>
            </div>
        </div>
    `;
}

function wordAction(cmd, val) {
    document.execCommand(cmd, false, val || null);
    document.getElementById('word-editor').focus();
}

async function saveWord() {
    const content = document.getElementById('word-editor').innerHTML;
    const nome = prompt('Nome do documento:', 'Documento');
    if (!nome) return;
    await dbPush('word_docs', { nome, content, autorId: currentUser.uid, autorNome: userProfile?.nome, createdAt: Date.now() });
    showToast('Documento guardado!', 'success');
}

// ── POWERPOINT ──
let slides = [];
let currentSlideIdx = 0;

function renderPowerPoint(area) {
    slides = [{ title: 'Slide 1', content: 'Clica para editar...', bg: '#0F172A' }];
    currentSlideIdx = 0;
    area.innerHTML = `
        <div class="page-header" style="display:flex;justify-content:space-between;align-items:center;">
            <div><h2>📽️ PowerPoint</h2><p>Cria apresentações</p></div>
            <div style="display:flex;gap:10px;">
                <button class="btn btn-primary" onclick="addSlide()">➕ Slide</button>
                <button class="btn btn-success" onclick="savePPT()">💾 Guardar</button>
                <button class="btn btn-outline" onclick="loadPPT()">📂 Carregar</button>
            </div>
        </div>
        <div style="display:grid;grid-template-columns:180px 1fr;gap:16px;height:calc(100vh - 220px);">
            <div class="card" style="padding:10px;overflow-y:auto;" id="ppt-sidebar"></div>
            <div class="card" style="padding:0;overflow:hidden;" id="ppt-main"></div>
        </div>
    `;
    renderPTTSidebar();
    renderPPTSlide();
}

function renderPTTSidebar() {
    document.getElementById('ppt-sidebar').innerHTML = slides.map((s, i) => `
        <div onclick="selectSlide(${i})" style="padding:10px;margin-bottom:8px;border-radius:8px;cursor:pointer;background:${i === currentSlideIdx ? 'var(--primary)' : 'var(--bg)'};border:2px solid ${i === currentSlideIdx ? 'var(--primary)' : 'var(--border)'};text-align:center;">
            <div style="font-size:11px;color:${i === currentSlideIdx ? '#fff' : 'var(--text-light)'};">Slide ${i + 1}</div>
            <div style="font-size:12px;font-weight:600;color:${i === currentSlideIdx ? '#fff' : 'var(--text)'};margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${s.title}</div>
        </div>
    `).join('');
}

function renderPPTSlide() {
    const s = slides[currentSlideIdx];
    if (!s) return;
    document.getElementById('ppt-main').innerHTML = `
        <div id="ppt-slide-view" contenteditable="true" style="height:100%;padding:60px;background:${s.bg || '#0F172A'};display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;border-radius:8px;">
            <h1 style="font-size:42px;font-weight:900;margin-bottom:20px;outline:none;" oninput="slides[${currentSlideIdx}].title=this.textContent">${s.title}</h1>
            <p style="font-size:20px;color:var(--text-light);outline:none;max-width:700px;" oninput="slides[${currentSlideIdx}].content=this.textContent">${s.content}</p>
        </div>
        <div style="padding:10px;display:flex;gap:8px;justify-content:center;border-top:1px solid var(--border);">
            <input type="color" value="${s.bg || '#0F172A'}" style="width:30px;height:28px;border:none;" onchange="slides[${currentSlideIdx}].bg=this.value;renderPPTSlide()">
            <button class="btn btn-sm btn-danger" onclick="removeSlide(${currentSlideIdx})">✕ Remover</button>
            <button class="btn btn-sm btn-outline" onclick="duplicateSlide(${currentSlideIdx})">📋 Duplicar</button>
        </div>
    `;
}

function selectSlide(i) { currentSlideIdx = i; renderPTTSidebar(); renderPPTSlide(); }
function addSlide() { slides.push({ title: `Slide ${slides.length + 1}`, content: 'Novo slide...', bg: '#0F172A' }); currentSlideIdx = slides.length - 1; renderPTTSidebar(); renderPPTSlide(); }
function removeSlide(i) { if (slides.length <= 1) return showToast('Precisas de pelo menos 1 slide', 'error'); slides.splice(i, 1); currentSlideIdx = Math.min(currentSlideIdx, slides.length - 1); renderPTTSidebar(); renderPPTSlide(); }
function duplicateSlide(i) { slides.splice(i + 1, 0, { ...slides[i] }); currentSlideIdx = i + 1; renderPTTSidebar(); renderPPTSlide(); }

async function savePPT() {
    const nome = prompt('Nome da apresentação:', 'Apresentação');
    if (!nome) return;
    await dbPush('ppt_presentations', { nome, slides, autorId: currentUser.uid, autorNome: userProfile?.nome, createdAt: Date.now() });
    showToast('Guardado!', 'success');
}

async function loadPPT() {
    const snap = await dbGet('ppt_presentations');
    const ppts = snap ? Object.entries(snap).filter(([k,v]) => v.autorId === currentUser.uid).map(([k,v]) => ({id:k,...v})) : [];
    if (ppts.length === 0) return showToast('Sem apresentações', 'error');
    const choice = prompt('Apresentações:\n' + ppts.map((p,i) => `${i+1}. ${p.nome} (${p.slides?.length || 0} slides)`).join('\n') + '\n\nNúmero:');
    const p = ppts[parseInt(choice) - 1];
    if (p && p.slides) { slides = p.slides; currentSlideIdx = 0; renderPTTSidebar(); renderPPTSlide(); showToast('Carregado!', 'success'); }
}

// ── ÁREA DE DESENHO ──
let drawCtx = null;
let isDrawing = false;
let drawTool = 'pen';
let drawColor = '#2563EB';
let drawSize = 3;
let drawHistory = [];

function renderDesenho(area) {
    area.innerHTML = `
        <div class="page-header"><h2>🎨 Área de Desenho</h2><p>Desenha livremente ou pede ajuda à IA</p></div>
        <div class="card" style="padding:0;overflow:hidden;">
            <div style="padding:10px 16px;display:flex;gap:10px;align-items:center;border-bottom:1px solid var(--border);flex-wrap:wrap;">
                <button class="btn btn-sm ${drawTool==='pen'?'btn-primary':'btn-outline'}" onclick="setDrawTool('pen')">✏️ Caneta</button>
                <button class="btn btn-sm ${drawTool==='eraser'?'btn-primary':'btn-outline'}" onclick="setDrawTool('eraser')">🧹 Borracha</button>
                <button class="btn btn-sm btn-outline" onclick="drawAction('undo')">↩ Desfazer</button>
                <button class="btn btn-sm btn-danger" onclick="clearCanvas()">🗑 Limpar</button>
                <input type="color" value="${drawColor}" id="draw-color-pick" style="width:30px;height:28px;border:none;cursor:pointer;" onchange="drawColor=this.value">
                <input type="range" min="1" max="30" value="${drawSize}" id="draw-size" oninput="drawSize=parseInt(this.value)" style="width:100px;">
                <button class="btn btn-sm btn-success" onclick="saveDrawing()">💾 Guardar</button>
                <button class="btn btn-sm btn-outline" onclick="loadDrawing()">📂 Carregar</button>
                <button class="btn btn-sm btn-ai" onclick="aiDrawingHelp()">🤖 Pedir à IA</button>
            </div>
            <canvas id="draw-canvas" style="display:block;cursor:crosshair;background:#fff;width:100%;height:calc(100vh - 240px);"></canvas>
        </div>
    `;
    initCanvas();
}

function initCanvas() {
    const canvas = document.getElementById('draw-canvas');
    if (!canvas) return;
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = window.innerHeight - 240;
    drawCtx = canvas.getContext('2d');
    drawCtx.fillStyle = '#ffffff';
    drawCtx.fillRect(0, 0, canvas.width, canvas.height);
    drawCtx.lineCap = 'round';
    drawCtx.lineJoin = 'round';
    drawHistory = [];

    canvas.onmousedown = (e) => {
        isDrawing = true;
        drawCtx.beginPath();
        drawCtx.moveTo(e.offsetX, e.offsetY);
        drawHistory.push(canvas.toDataURL());
    };
    canvas.onmousemove = (e) => {
        if (!isDrawing) return;
        drawCtx.strokeStyle = drawTool === 'eraser' ? '#ffffff' : drawColor;
        drawCtx.lineWidth = drawTool === 'eraser' ? drawSize * 5 : drawSize;
        drawCtx.lineTo(e.offsetX, e.offsetY);
        drawCtx.stroke();
    };
    canvas.onmouseup = () => isDrawing = false;
    canvas.onmouseleave = () => isDrawing = false;

    canvas.ontouchstart = (e) => {
        e.preventDefault();
        const t = e.touches[0];
        const r = canvas.getBoundingClientRect();
        isDrawing = true;
        drawCtx.beginPath();
        drawCtx.moveTo(t.clientX - r.left, t.clientY - r.top);
        drawHistory.push(canvas.toDataURL());
    };
    canvas.ontouchmove = (e) => {
        e.preventDefault();
        if (!isDrawing) return;
        const t = e.touches[0];
        const r = canvas.getBoundingClientRect();
        drawCtx.strokeStyle = drawTool === 'eraser' ? '#ffffff' : drawColor;
        drawCtx.lineWidth = drawTool === 'eraser' ? drawSize * 5 : drawSize;
        drawCtx.lineTo(t.clientX - r.left, t.clientY - r.top);
        drawCtx.stroke();
    };
    canvas.ontouchend = () => isDrawing = false;
}

function setDrawTool(tool) { drawTool = tool; renderDesenho(document.getElementById('content-area')); }

function clearCanvas() {
    const canvas = document.getElementById('draw-canvas');
    if (!canvas || !drawCtx) return;
    drawHistory.push(canvas.toDataURL());
    drawCtx.fillStyle = '#ffffff';
    drawCtx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawAction(action) {
    if (action === 'undo' && drawHistory.length > 0) {
        const canvas = document.getElementById('draw-canvas');
        const img = new Image();
        img.src = drawHistory.pop();
        img.onload = () => { drawCtx.clearRect(0, 0, canvas.width, canvas.height); drawCtx.drawImage(img, 0, 0); };
    }
}

async function saveDrawing() {
    const canvas = document.getElementById('draw-canvas');
    if (!canvas) return;
    const nome = prompt('Nome do desenho:', 'Desenho');
    if (!nome) return;
    const dataUrl = canvas.toDataURL('image/png');
    await dbPush('drawings', { nome, data: dataUrl, autorId: currentUser.uid, autorNome: userProfile?.nome, createdAt: Date.now() });
    showToast('Desenho guardado!', 'success');
}

async function loadDrawing() {
    const snap = await dbGet('drawings');
    const drawings = snap ? Object.entries(snap).filter(([k,v]) => v.autorId === currentUser.uid).map(([k,v]) => ({id:k,...v})) : [];
    if (drawings.length === 0) return showToast('Sem desenhos guardados', 'error');
    const choice = prompt('Desenhos:\n' + drawings.map((d,i) => `${i+1}. ${d.nome}`).join('\n') + '\n\nNúmero:');
    const d = drawings[parseInt(choice) - 1];
    if (d && d.data && drawCtx) {
        const canvas = document.getElementById('draw-canvas');
        const img = new Image();
        img.src = d.data;
        img.onload = () => { drawCtx.clearRect(0, 0, canvas.width, canvas.height); drawCtx.drawImage(img, 0, 0); };
        showToast('Carregado!', 'success');
    }
}

async function aiDrawingHelp() {
    const prompt_text = prompt('O que queres desenhar? Descreve e a IA ajuda-te com sugestões.');
    if (!prompt_text) return;
    try {
        const r = await fetch('/api/ai/chat', {
            method: 'POST', headers: {'Content-Type':'application/json'},
            body: aiBody(`Sou um aluno a desenhar. ${prompt_text}. Dá-me dicas práticas de como desenhar isto, passo a passo, em português.`)
        });
        const data = await r.json();
        alert(data.resposta || data.erro || 'Sem sugestão');
    } catch(e) {
        showToast('Erro: ' + e.message, 'error');
    }
}

// ─── UTILITIES ────────────────────────────────────────────
function showToast(msg, type = 'success') {
    const t = document.createElement('div');
    t.className = 'toast ' + type;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => {
        t.style.transition = 'all 0.5s cubic-bezier(0.16,1,0.3,1)';
        t.style.transform = 'translateX(120%)'; t.style.opacity = '0';
        setTimeout(() => t.remove(), 500);
    }, 3500);
}

function confettiBurst(x, y) {
    const container = document.getElementById('confettiContainer');
    const colors = ['#2563EB','#8B5CF6','#EC4899','#F59E0B','#10B981','#EF4444'];
    for (let i = 0; i < 30; i++) {
        const p = document.createElement('div');
        p.className = 'confetti-piece';
        p.style.left = x + 'px'; p.style.top = y + 'px';
        p.style.background = colors[Math.floor(Math.random() * colors.length)];
        p.style.width = (5 + Math.random() * 8) + 'px'; p.style.height = p.style.width;
        p.style.animation = `confettiBurst ${1 + Math.random() * 0.5}s cubic-bezier(0.16,1,0.3,1) forwards`;
        container.appendChild(p);
        setTimeout(() => p.remove(), 2000);
    }
}

// ─── CURSOR + PARTICLES ──────────────────────────────────
(function() {
    const dot = document.getElementById('cursorDot');
    const ring = document.getElementById('cursorRing');
    const glowTrail = document.getElementById('cursorGlow');
    let mx = 0, my = 0, rx = 0, ry = 0;

    document.addEventListener('mousemove', e => {
        mx = e.clientX; my = e.clientY;
        dot.style.left = mx + 'px'; dot.style.top = my + 'px';
        glowTrail.style.left = mx + 'px'; glowTrail.style.top = my + 'px';
    });

    function animCursor() {
        rx += (mx - rx) * 0.12; ry += (my - ry) * 0.12;
        ring.style.left = rx + 'px'; ring.style.top = ry + 'px';
        requestAnimationFrame(animCursor);
    }
    animCursor();

    document.addEventListener('mouseover', e => {
        if (e.target.closest('a,button,.nav-item,.option-label,#ai-fab')) ring.classList.add('hovering');
    });
    document.addEventListener('mouseout', e => {
        if (e.target.closest('a,button,.nav-item,.option-label,#ai-fab')) ring.classList.remove('hovering');
    });

    // Canvas particles
    const canvas = document.getElementById('particleCanvas');
    const ctx = canvas.getContext('2d');
    let particles = [];

    function resizeCanvas() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
    resizeCanvas(); window.addEventListener('resize', resizeCanvas);

    class Particle {
        constructor() { this.reset(); }
        reset() {
            this.x = Math.random() * canvas.width; this.y = Math.random() * canvas.height;
            this.size = Math.random() * 2 + 0.5; this.speedX = (Math.random() - 0.5) * 0.4;
            this.speedY = (Math.random() - 0.5) * 0.4; this.opacity = Math.random() * 0.2 + 0.05;
            this.hue = Math.random() * 60 + 210;
        }
        update() {
            const dx = this.x - mx, dy = this.y - my, dist = Math.sqrt(dx*dx+dy*dy);
            if (dist < 120) { const f = (120-dist)/120; this.x += (dx/dist)*f*2; this.y += (dy/dist)*f*2; }
            this.x += this.speedX; this.y += this.speedY;
            if (this.x < 0 || this.x > canvas.width) this.speedX *= -1;
            if (this.y < 0 || this.y > canvas.height) this.speedY *= -1;
        }
        draw() {
            ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI*2);
            ctx.fillStyle = `hsla(${this.hue},70%,60%,${this.opacity})`; ctx.fill();
        }
    }

    for (let i = 0; i < 50; i++) particles.push(new Particle());

    function animParticles() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => { p.update(); p.draw(); });
        for (let i = 0; i < particles.length; i++) {
            for (let j = i+1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x, dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx*dx+dy*dy);
                if (dist < 140) {
                    ctx.beginPath(); ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = `rgba(37,99,235,${0.05*(1-dist/140)})`;
                    ctx.lineWidth = 0.5; ctx.stroke();
                }
            }
        }
        requestAnimationFrame(animParticles);
    }
    animParticles();

    // 3D tilt
    function addTilt(el) {
        el.addEventListener('mousemove', e => {
            const rect = el.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width;
            const y = (e.clientY - rect.top) / rect.height;
            el.style.transform = `perspective(800px) rotateX(${(y-0.5)*6}deg) rotateY(${(x-0.5)*-6}deg) translateY(-3px)`;
            el.style.setProperty('--mouse-x', (x*100)+'%'); el.style.setProperty('--mouse-y', (y*100)+'%');
        });
        el.addEventListener('mouseleave', () => { el.style.transform = ''; });
    }
    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('.card,.stat-card,.exam-card').forEach(addTilt);
    });

    // Touch device
    if ('ontouchstart' in window) {
        dot.style.display = 'none'; ring.style.display = 'none'; glowTrail.style.display = 'none';
        document.body.style.cursor = 'auto';
    }
})();

// ─── LOJA / EXTENSÕES ──────────────────────────────────────
let allExtensions = {};
let extensionsEnabled = true;

async function callAI(q) {
    const r = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: aiBody(q)
    });
    const data = await r.json();
    if (data.erro) throw new Error(data.erro);
    return data.resposta;
}

async function renderLoja(area) {
    const snap = await dbGet('extensions');
    allExtensions = snap || {};
    const extEntries = Object.entries(allExtensions);

    const purchasesSnap = await dbGet('extension_purchases');
    const myPurchases = purchasesSnap ? Object.values(purchasesSnap).filter(p => p.userId === currentUser?.uid) : [];

    const categories = { recursos:'📚 Recursos', ia:'🤖 IA', produtividade:'⚡ Produtividade', criatividade:'🎨 Criatividade', comunicacao:'💬 Comunicação' };
    const statusBadge = { coming:'🔜 Em breve', available:'✅ Disponível', beta:'🧪 Beta' };
    const statusColor = { coming:'rgba(234,179,8,0.8)', available:'rgba(34,197,94,0.8)', beta:'rgba(99,102,241,0.8)' };

    area.innerHTML = `
        <div class="page-header"><h2>🛒 Loja de Extensões</h2><p>Adiciona novas funcionalidades ao teu workspace</p></div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px;" id="loja-grid">
            ${extEntries.map(([id, ext]) => {
                const unlocked = isExtUnlocked(id);
                const pending = myPurchases.find(p => p.extId === id && p.status === 'pending');
                const rejected = myPurchases.find(p => p.extId === id && p.status === 'rejected');
                const isAvailable = ext.status === 'available' || ext.status === 'beta';
                return `
                <div class="card" style="position:relative;${unlocked ? 'border-color:rgba(34,197,94,0.4);' : pending ? 'border-color:rgba(234,179,8,0.4);' : ''}">
                    ${unlocked ? '<div style="position:absolute;top:12px;right:12px;padding:4px 10px;border-radius:6px;font-size:11px;font-weight:600;background:rgba(34,197,94,0.15);color:#22c55e;">✅ Ativo</div>' : pending ? '<div style="position:absolute;top:12px;right:12px;padding:4px 10px;border-radius:6px;font-size:11px;font-weight:600;background:rgba(234,179,8,0.15);color:#eab308;">⏳ A aguardar</div>' : `<div style="position:absolute;top:12px;right:12px;padding:4px 10px;border-radius:6px;font-size:11px;font-weight:600;background:${statusColor[ext.status] || statusColor.coming};color:#fff;">${statusBadge[ext.status] || '🔜 Em breve'}</div>`}
                    <div style="font-size:36px;margin-bottom:12px;">${ext.icon}</div>
                    <h3 style="font-size:18px;font-weight:700;margin-bottom:6px;">${ext.name}</h3>
                    <p style="font-size:13px;color:var(--text-light);line-height:1.5;margin-bottom:16px;">${ext.desc}</p>
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <span style="font-size:12px;color:var(--text-light);">${categories[ext.category] || '📦'}</span>
                        <span style="font-size:20px;font-weight:700;color:#a78bfa;">${ext.price}</span>
                    </div>
                    ${unlocked ? `
                        <button class="btn btn-primary" style="width:100%;margin-top:16px;" onclick="navigateTo('${id}')">Abrir</button>
                    ` : pending ? `
                        <button class="btn" style="width:100%;margin-top:16px;background:rgba(234,179,8,0.15);color:#eab308;cursor:default;" disabled>⏳ Pedido pendente</button>
                    ` : rejected ? `
                        <div style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.2);border-radius:8px;padding:10px;margin-top:16px;margin-bottom:8px;font-size:12px;color:#ef4444;text-align:center;">Pagamento não efetuado. Tenta novamente.</div>
                        <button class="btn btn-primary" style="width:100%;margin-top:8px;" onclick="buyExtension('${id}')">Tentar Novamente</button>
                    ` : isAvailable ? `
                        <button class="btn btn-primary" style="width:100%;margin-top:16px;" onclick="buyExtension('${id}')">Desbloquear</button>
                    ` : `
                        <button class="btn btn-outline" style="width:100%;margin-top:16px;" disabled>Em breve</button>
                    `}
                </div>
                `;
            }).join('')}
            ${extEntries.length === 0 ? '<div class="empty-state" style="grid-column:1/-1;"><div class="icon">🛒</div><h3>Loja a preparar</h3><p>Em breve novas extensões disponíveis!</p></div>' : ''}
        </div>
    `;
}

async function buyExtension(extId) {
    if (!currentUser) return;
    const ext = allExtensions[extId];
    if (!ext) return;

    const existingSnap = await dbGet(`extension_purchases`);
    const existing = existingSnap ? Object.values(existingSnap).find(p => p.userId === currentUser.uid && p.extId === extId && p.status === 'pending') : null;
    if (existing) {
        showToast('Já tens um pedido pendente para esta extensão!', 'info');
        return;
    }

    await dbPush('extension_purchases', {
        userId: currentUser.uid,
        userName: userProfile?.nome || 'Sem nome',
        userEmail: userProfile?.email || currentUser.email || '',
        extId: extId,
        extName: ext.name,
        extIcon: ext.icon,
        extPrice: ext.price,
        status: 'pending',
        createdAt: Date.now()
    });
    showToast('Pedido enviado! Aguarda aprovação do admin.', 'info');
    navigateTo('loja');
}

function renderExtPage(area, extId) {
    if (!isExtUnlocked(extId)) {
        area.innerHTML = `<div class="empty-state"><div class="icon">🔒</div><h3>Extensão bloqueada</h3><p>Visita a Loja para desbloquear.</p><button class="btn btn-primary" onclick="navigateTo('loja')" style="margin-top:16px;">🛒 Ir à Loja</button></div>`;
        return;
    }
    const ext = allExtensions[extId] || {};
    const pageType = ext.pageType || 'generic';
    const renderFn = 'render' + pageType.split('_').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');

    if (typeof window[renderFn] === 'function') {
        window[renderFn](area, ext);
        return;
    }

    const script = document.createElement('script');
    script.src = `/static/js/extensions/${pageType}.js?v=3.0`;
    script.onload = () => {
        if (typeof window[renderFn] === 'function') {
            window[renderFn](area, ext);
        } else {
            renderGenericExt(area, ext);
        }
    };
    script.onerror = () => renderGenericExt(area, ext);
    document.head.appendChild(script);
}

function renderGenericExt(area, ext) {
    area.innerHTML = `
        <div class="page-header"><h2>${ext.icon} ${ext.name}</h2><p>${ext.desc}</p></div>
        <div class="card"><div class="empty-state" style="padding:40px;"><div class="icon">🚧</div><h3>Em construção</h3><p>Esta extensão está a ser desenvolvida.</p></div></div>
    `;
}

// ════════════════════════════════════════════════════════════
//   PRESENTES — Verificar e mostrar presentes pendentes
// ════════════════════════════════════════════════════════════

async function checkGifts() {
    if (!currentUser) return;
    try {
        const r = await fetch('/api/gifts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUser.uid })
        });
        const data = await r.json();
        if (data.gifts && data.gifts.length > 0) {
            showGiftModal(data.gifts[0]);
        }
    } catch(e) {
        console.warn('Erro ao verificar presentes:', e);
    }
}

function showGiftModal(gift) {
    const extInfo = allExtensions[gift.extId] || {};
    const extIcon = extInfo.icon || '🧩';
    const extName = extInfo.name || gift.extId;

    const modal = document.createElement('div');
    modal.id = 'gift-modal';
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:10000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.8);animation:fadeIn 0.3s;';
    modal.innerHTML = `
        <div style="background:linear-gradient(135deg,#1e1b4b,#312e81);border:2px solid #a78bfa;border-radius:20px;padding:40px;max-width:480px;width:90%;text-align:center;animation:scaleIn 0.4s;position:relative;">
            <button onclick="claimGift('${gift.id}')" style="position:absolute;top:16px;right:16px;background:none;border:none;color:var(--text-dim);font-size:20px;cursor:pointer;">✕</button>
            
            <div style="font-size:64px;margin-bottom:16px;">🎁</div>
            <h2 style="color:#fff;font-size:24px;margin-bottom:8px;">Tens um presente!</h2>
            
            <div style="background:rgba(255,255,255,0.1);border-radius:12px;padding:20px;margin:20px 0;">
                <div style="font-size:40px;margin-bottom:8px;">${extIcon}</div>
                <div style="font-size:18px;font-weight:700;color:#e0e7ff;">${extName}</div>
            </div>

            ${gift.message ? `
                <div style="background:rgba(255,255,255,0.05);border-radius:12px;padding:16px;margin:16px 0;text-align:left;">
                    <div style="font-size:12px;color:var(--text-dim);margin-bottom:6px;">📝 Mensagem do admin:</div>
                    <div style="font-size:14px;color:var(--text);line-height:1.5;font-style:italic;">"${escapeHTML(gift.message)}"</div>
                </div>
            ` : ''}

            ${gift.image ? `
                <div style="margin:16px 0;">
                    <img src="${escapeHTML(gift.image)}" style="max-width:100%;max-height:250px;border-radius:12px;border:2px solid rgba(255,255,255,0.1);">
                </div>
            ` : ''}

            <button onclick="claimGift('${gift.id}')" style="margin-top:20px;padding:14px 40px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border:none;border-radius:12px;color:#fff;font-size:16px;font-weight:700;cursor:pointer;transition:transform 0.2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                🎉 Aceitar Presente
            </button>
        </div>
    `;
    document.body.appendChild(modal);
}

async function claimGift(giftId) {
    try {
        await fetch('/api/gifts/claim', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ giftId })
        });
        const modal = document.getElementById('gift-modal');
        if (modal) modal.remove();
        await loadUserExtensions();
        buildNav();
        showToast('🎁 Presente recebido! Extensão ativada.', 'success');
    } catch(e) {
        console.warn('Erro ao reclamar presente:', e);
    }
}
