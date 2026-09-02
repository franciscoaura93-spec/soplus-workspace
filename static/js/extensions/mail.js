// S&O+ Extension: Mail System
let mailUsers = null;
let mailTimer = null;
let mailCurrentView = 'inbox';
let mailInboxCache = [];
let mailSentCache = [];

function renderMail(area) {
    area.innerHTML = `
        <div class="page-header"><h2>✉️ Mail</h2><p>Sistema de mensagens</p></div>
        <div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap;">
            <button class="btn btn-primary" onclick="mailShowView('inbox')" id="mail-btn-inbox">📥 Recebidas <span id="mail-unread-badge" style="display:none;background:#ef4444;color:#fff;border-radius:10px;padding:1px 8px;font-size:11px;margin-left:4px;">0</span></button>
            <button class="btn btn-outline" onclick="mailShowView('sent')" id="mail-btn-sent">📤 Enviadas</button>
            <button class="btn btn-success" onclick="mailShowView('compose')" id="mail-btn-compose">✉️ Nova Mensagem</button>
        </div>
        <div id="mail-content"><div style="text-align:center;padding:40px;color:var(--text-light);"><div class="spinner" style="margin:0 auto 12px;"></div>A carregar mensagens...</div></div>
    `;
    mailInit();
}

function mailInit() {
    mailCurrentView = 'inbox';
    if (mailTimer) clearInterval(mailTimer);
    mailLoadUsers().then(() => {
        mailLoadInbox();
        mailLoadSent();
        mailTimer = setInterval(mailRefreshInbox, 10000);
    });
}

async function mailLoadUsers() {
    if (mailUsers) return;
    const snap = await dbGet('users');
    if (snap) {
        mailUsers = Object.entries(snap).map(([uid, u]) => ({ uid, ...u }));
    }
}

function mailGetRecipients() {
    if (!mailUsers) return [];
    const profile = userProfile;
    const role = profile?.role || 'aluno';
    if (role === 'aluno') {
        return mailUsers.filter(u => u.role === 'professor' || u.role === 'admin');
    }
    const turmas = (profile?.turmas || '').split(',').map(s => s.trim()).filter(Boolean);
    if (turmas.length > 0) {
        return mailUsers.filter(u => turmas.includes(u.turma) && u.role === 'aluno');
    }
    return mailUsers.filter(u => u.uid !== currentUser.uid);
}

async function mailLoadInbox() {
    const snap = await dbGet(`mail/${currentUser.uid}/inbox`);
    const msgs = snap ? Object.entries(snap).map(([id, m]) => ({ id, ...m })).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)) : [];
    mailInboxCache = msgs;
    if (mailCurrentView === 'inbox') mailRenderInbox(msgs);
    mailUpdateBadge();
}

async function mailLoadSent() {
    const snap = await dbGet(`mail/${currentUser.uid}/sent`);
    const msgs = snap ? Object.entries(snap).map(([id, m]) => ({ id, ...m })).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)) : [];
    mailSentCache = msgs;
    if (mailCurrentView === 'sent') mailRenderSent(msgs);
}

function mailRefreshInbox() {
    mailLoadInbox();
    mailLoadSent();
}

function mailUpdateBadge() {
    const badge = document.getElementById('mail-unread-badge');
    if (!badge) return;
    const unread = mailInboxCache.filter(m => !m.read).length;
    if (unread > 0) {
        badge.style.display = 'inline';
        badge.textContent = unread;
    } else {
        badge.style.display = 'none';
    }
}

function mailShowView(view) {
    mailCurrentView = view;
    document.querySelectorAll('[id^="mail-btn-"]').forEach(b => b.className = 'btn btn-outline');
    const btn = document.getElementById('mail-btn-' + view);
    if (btn) btn.className = 'btn btn-primary';
    const content = document.getElementById('mail-content');
    if (!content) return;
    if (view === 'inbox') mailRenderInbox(mailInboxCache);
    else if (view === 'sent') mailRenderSent(mailSentCache);
    else if (view === 'compose') mailRenderCompose(content);
}

function mailRenderInbox(msgs) {
    const content = document.getElementById('mail-content');
    if (!content) return;
    if (msgs.length === 0) {
        content.innerHTML = '<div class="empty-state"><div class="icon">📥</div><h3>Caixa de entrada vazia</h3><p>Não tens mensagens recebidas.</p></div>';
        return;
    }
    content.innerHTML = `<div class="card" style="padding:0;overflow:hidden;"><div style="display:flex;flex-direction:column;">${msgs.map(m => `
        <div onclick="mailOpenMessage('${m.id}','inbox')" style="display:flex;align-items:center;gap:14px;padding:16px 20px;border-bottom:1px solid var(--border);cursor:pointer;transition:background 0.2s;${!m.read ? 'background:rgba(37,99,235,0.04);' : ''}" onmouseover="this.style.background='var(--surface)'" onmouseout="this.style.background='${!m.read ? 'rgba(37,99,235,0.04)' : 'transparent'}'">
            <div style="width:36px;height:36px;border-radius:50%;background:var(--gradient);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;color:#fff;flex-shrink:0;">${escapeHTML((m.fromNome || m.from || '?')[0].toUpperCase())}</div>
            <div style="flex:1;min-width:0;">
                <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
                    <strong style="font-size:14px;${!m.read ? '' : 'font-weight:500;color:var(--text-light)'}">${escapeHTML(m.fromNome || m.from || 'Desconhecido')}</strong>
                    <span style="font-size:11px;color:var(--text-light);white-space:nowrap;">${new Date(m.timestamp).toLocaleDateString('pt-PT', {day:'2-digit',month:'2-digit'})}</span>
                </div>
                <div style="font-size:13px;${!m.read ? 'font-weight:600;' : 'color:var(--text-light);'}margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHTML(m.subject || '(sem assunto)')}</div>
            </div>
            ${!m.read ? '<div style="width:8px;height:8px;border-radius:50%;background:var(--primary);flex-shrink:0;"></div>' : ''}
        </div>
    `).join('')}</div></div>`;
}

function mailRenderSent(msgs) {
    const content = document.getElementById('mail-content');
    if (!content) return;
    if (msgs.length === 0) {
        content.innerHTML = '<div class="empty-state"><div class="icon">📤</div><h3>Sem mensagens enviadas</h3><p>Ainda não enviaste nenhuma mensagem.</p></div>';
        return;
    }
    content.innerHTML = `<div class="card" style="padding:0;overflow:hidden;"><div style="display:flex;flex-direction:column;">${msgs.map(m => `
        <div onclick="mailOpenMessage('${m.id}','sent')" style="display:flex;align-items:center;gap:14px;padding:16px 20px;border-bottom:1px solid var(--border);cursor:pointer;transition:background 0.2s;" onmouseover="this.style.background='var(--surface)'" onmouseout="this.style.background='transparent'">
            <div style="width:36px;height:36px;border-radius:50%;background:rgba(139,92,246,0.2);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;color:var(--ai);flex-shrink:0;">${escapeHTML((m.toNome || m.to || '?')[0].toUpperCase())}</div>
            <div style="flex:1;min-width:0;">
                <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
                    <strong style="font-size:14px;">Para: ${escapeHTML(m.toNome || m.to || 'Desconhecido')}</strong>
                    <span style="font-size:11px;color:var(--text-light);white-space:nowrap;">${new Date(m.timestamp).toLocaleDateString('pt-PT', {day:'2-digit',month:'2-digit'})}</span>
                </div>
                <div style="font-size:13px;color:var(--text-light);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHTML(m.subject || '(sem assunto)')}</div>
            </div>
        </div>
    `).join('')}</div></div>`;
}

function mailRenderCompose(content, replyTo) {
    if (!content) content = document.getElementById('mail-content');
    if (!content) return;
    const recipients = mailGetRecipients();
    const replyMsg = replyTo ? mailInboxCache.find(m => m.id === replyTo) : null;
    content.innerHTML = `
        <div class="card">
            <div class="card-title">${replyMsg ? '📩 Responder a ' + escapeHTML(replyMsg.fromNome || replyMsg.from) : '✉️ Nova Mensagem'}</div>
            <form id="mail-compose-form">
                <div class="form-group"><label>Para</label>
                    <select class="form-input" id="mail-to" required>
                        <option value="">Selecionar destinatário...</option>
                        ${recipients.map(u => `<option value="${u.uid}" ${replyMsg && (u.uid === replyMsg.from || u.email === replyMsg.fromEmail) ? 'selected' : ''}>${escapeHTML(u.nome || 'Sem nome')} (${u.role || '—'}${u.turma ? ' · ' + u.turma : ''})</option>`).join('')}
                    </select>
                </div>
                <div class="form-group"><label>Assunto</label>
                    <input class="form-input" id="mail-subject" placeholder="Assunto da mensagem" value="${replyMsg ? 'Re: ' + escapeHTML(replyMsg.subject || '') : ''}" required>
                </div>
                <div class="form-group"><label>Mensagem</label>
                    <textarea class="form-input" id="mail-body" rows="8" placeholder="Escreve a tua mensagem..." required>${replyMsg ? '\n\n---\n' + escapeHTML(replyMsg.body || '') : ''}</textarea>
                </div>
                <div style="display:flex;gap:12px;">
                    <button type="submit" class="btn btn-primary" style="flex:1;">📤 Enviar Mensagem</button>
                    <button type="button" class="btn btn-outline" onclick="mailShowView('inbox')">Cancelar</button>
                </div>
            </form>
        </div>
    `;
    document.getElementById('mail-compose-form').onsubmit = mailSend;
}

function mailOpenMessage(id, box) {
    const msgs = box === 'inbox' ? mailInboxCache : mailSentCache;
    const m = msgs.find(msg => msg.id === id);
    if (!m) return;
    if (box === 'inbox' && !m.read) {
        dbUpdate(`mail/${currentUser.uid}/inbox/${id}`, { read: true });
        m.read = true;
        mailUpdateBadge();
    }
    const isInbox = box === 'inbox';
    const content = document.getElementById('mail-content');
    if (!content) return;
    content.innerHTML = `
        <div class="card">
            <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:20px;">
                <div>
                    <h3 style="font-size:18px;font-weight:700;margin-bottom:6px;">${escapeHTML(m.subject || '(sem assunto)')}</h3>
                    <div style="font-size:13px;color:var(--text-light);line-height:1.8;">
                        <div><strong>${isInbox ? 'De' : 'Para'}:</strong> ${escapeHTML(isInbox ? (m.fromNome || m.from || '—') : (m.toNome || m.to || '—'))}</div>
                        <div><strong>Data:</strong> ${new Date(m.timestamp).toLocaleString('pt-PT')}</div>
                    </div>
                </div>
            </div>
            <div style="padding:20px;background:var(--bg);border-radius:12px;border:1px solid var(--border);font-size:14px;line-height:1.7;white-space:pre-wrap;margin-bottom:20px;">${escapeHTML(m.body || '')}</div>
            <div style="display:flex;gap:10px;flex-wrap:wrap;">
                ${isInbox ? `<button class="btn btn-primary" onclick="mailRenderCompose(null,'${id}')">📩 Responder</button>` : ''}
                <button class="btn btn-ai" onclick="mailSendEmailNotification('${m.id}','${box}')">📧 Enviar Notificação Email</button>
                <button class="btn btn-outline" onclick="mailShowView('${isInbox ? 'inbox' : 'sent'}')">⬅ Voltar</button>
                <button class="btn btn-danger" onclick="mailDeleteMsg('${id}','${box}')">🗑 Eliminar</button>
            </div>
        </div>
    `;
}

async function mailSend(e) {
    e.preventDefault();
    const to = document.getElementById('mail-to').value;
    const subject = document.getElementById('mail-subject').value.trim();
    const body = document.getElementById('mail-body').value.trim();
    if (!to || !subject || !body) return showToast('Preenche todos os campos', 'error');
    const recipient = mailUsers?.find(u => u.uid === to);
    if (!recipient) return showToast('Destinatário não encontrado', 'error');
    const sentRef = db.ref(`mail/${currentUser.uid}/sent`).push();
    const msgId = sentRef.key;
    const msg = {
        from: currentUser.uid,
        fromNome: userProfile?.nome || 'Desconhecido',
        fromEmail: currentUser?.email || '',
        to: recipient.uid,
        toNome: recipient.nome || 'Desconhecido',
        toEmail: recipient.email || '',
        subject,
        body,
        timestamp: Date.now(),
        read: true
    };
    await sentRef.set(msg);
    await db.ref(`mail/${recipient.uid}/inbox/${msgId}`).set({ ...msg, read: false });
    showToast('Mensagem enviada!', 'success');
    mailLoadSent();
    mailShowView('sent');
}

async function mailDeleteMsg(id, box) {
    if (!confirm('Eliminar esta mensagem?')) return;
    await dbRemove(`mail/${currentUser.uid}/${box}/${id}`);
    showToast('Mensagem eliminada', 'success');
    if (box === 'inbox') {
        mailInboxCache = mailInboxCache.filter(m => m.id !== id);
        mailRenderInbox(mailInboxCache);
    } else {
        mailSentCache = mailSentCache.filter(m => m.id !== id);
        mailRenderSent(mailSentCache);
    }
}

async function mailSendEmailNotification(msgId, box) {
    const msgs = box === 'inbox' ? mailInboxCache : mailSentCache;
    const m = msgs.find(msg => msg.id === msgId);
    if (!m) return showToast('Mensagem não encontrada', 'error');
    const toEmail = box === 'inbox' ? m.fromEmail : m.toEmail;
    if (!toEmail) return showToast('Sem email do destinatário', 'error');
    try {
        showToast('A enviar notificação email...', 'success');
        const r = await fetch('/api/mail/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                to: toEmail,
                subject: `[S&O Mail] ${m.subject || 'Mensagem'}`,
                body: `Tens uma nova mensagem de ${m.fromNome || m.from || 'Alguém'} no S&O+:\n\n${m.body || ''}\n\n---\nEsta é uma notificação automática do sistema S&O+ Mail.`
            })
        });
        const data = await r.json();
        if (data.erro) throw new Error(data.erro);
        showToast('✅ Notificação email enviada!', 'success');
    } catch (e) {
        showToast('Erro ao enviar email: ' + e.message, 'error');
    }
}
