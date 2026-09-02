let chatCurrentTurma = null;
let chatUnreadCount = 0;
let chatTypingTimeout = null;
let chatReplyTo = null;
let chatOnlineUsers = {};
let chatLastReadTimestamps = {};
let chatPresenceTimestamps = {};

window.renderChat = function(area) {
    const turma = getTurma();
    const isProf = userProfile?.role === 'professor';
    const turmas = isProf ? (userProfile?.turmas || '').split(',').map(s => s.trim()).filter(Boolean) : [];

    area.innerHTML = `
        <div class="page-header" style="display:flex;justify-content:space-between;align-items:center;">
            <div><h2>💬 Chat Avançado</h2><p id="chat-turma-label">${isProf ? 'Seleciona a turma' : 'Turma: ' + turma}</p></div>
            <div style="display:flex;gap:8px;align-items:center;">
                <span id="chat-online-list" style="font-size:11px;color:var(--text-light);max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:right;"></span>
            </div>
        </div>
        ${isProf && turmas.length > 1 ? `
        <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;">
            ${turmas.map((t, i) => `<button class="btn ${i === 0 ? 'btn-primary' : 'btn-outline'}" onclick="chatSwitchTurma('${t}', this)">${t}</button>`).join('')}
        </div>` : ''}
        <div class="card" style="padding:0;overflow:hidden;">
            <div class="chat-container" style="height:calc(100vh - 260px);">
                <div class="chat-messages" id="chat-box" style="position:relative;"></div>
                <div id="chat-reply-indicator" style="display:none;padding:8px 16px;background:var(--surface);border-top:1px solid var(--border);font-size:12px;color:var(--text-light);align-items:center;gap:8px;">
                    <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">↩ A responder a: <span id="chat-reply-text"></span></span>
                    <button class="btn btn-sm btn-ghost" onclick="chatCancelReply()" style="padding:2px 8px;">✕</button>
                </div>
                <div id="chat-typing-indicator" style="display:none;padding:4px 16px;font-size:11px;color:var(--text-light);font-style:italic;">✎ <span id="chat-typing-text"></span></div>
                <div class="chat-input-wrap" style="flex-wrap:wrap;">
                    <button class="btn btn-sm btn-ghost" onclick="chatToggleEmojiPicker()" style="padding:6px 10px;font-size:16px;" title="Emojis">😊</button>
                    <button class="btn btn-sm btn-ghost" onclick="chatToggleTemplates()" style="padding:6px 10px;font-size:12px;" title="Respostas rápidas">📋</button>
                    <input type="text" class="form-input" id="chat-input" placeholder="Escreve uma mensagem..." onkeypress="if(event.key==='Enter')chatSendMsg()" style="flex:1;min-width:100px;" oninput="chatTyping()">
                    <button class="btn btn-primary" onclick="chatSendMsg()">Enviar</button>
                </div>
                <div id="chat-emoji-picker" style="display:none;padding:10px;border-top:1px solid var(--border);background:var(--surface);max-height:200px;overflow-y:auto;"></div>
                <div id="chat-templates" style="display:none;padding:10px;border-top:1px solid var(--border);background:var(--surface);flex-wrap:wrap;gap:6px;"></div>
            </div>
        </div>
    `;
    chatCurrentTurma = turma;
    chatLoadUnreadCount(turma);
    chatLoadMessages(turma);
    chatInitPresence(turma);
    chatRenderEmojis();
    chatRenderTemplates();
};

function chatSwitchTurma(turma, btn) {
    chatCurrentTurma = turma;
    document.querySelectorAll('.page-header + div .btn, .page-header + div + div .btn').forEach(b => { b.className = 'btn btn-outline'; });
    if (btn) btn.className = 'btn btn-primary';
    document.getElementById('chat-turma-label').textContent = 'Turma: ' + turma;
    const box = document.getElementById('chat-box');
    if (box) box.innerHTML = '';
    chatUnreadCount = 0;
    chatUpdateBadge();
    chatLoadUnreadCount(turma);
    chatLoadMessages(turma);
    chatInitPresence(turma);
}

function chatLoadUnreadCount(turma) {
    if (!currentUser) return;
    turma = turma || chatCurrentTurma || getTurma();
    dbGet('user_settings/' + currentUser.uid + '/last_read/' + turma).then(ts => {
        chatLastReadTimestamps[turma] = ts || 0;
    });
}

function chatSaveLastRead(turma) {
    if (!currentUser) return;
    turma = turma || chatCurrentTurma || getTurma();
    const now = Date.now();
    chatLastReadTimestamps[turma] = now;
    db.ref('user_settings/' + currentUser.uid + '/last_read/' + turma).set(now);
}

function chatInitPresence(turma) {
    turma = turma || chatCurrentTurma || getTurma();

    if (window._chatConnectedRef) {
        window._chatConnectedRef.off();
    }
    window._chatConnectedRef = db.ref('.info/connected');
    window._chatConnectedRef.on('value', snap => {
        if (snap.val() === true && currentUser) {
            const myRef = db.ref('presence/' + currentUser.uid);
            myRef.onDisconnect().update({ online: false, lastSeen: Date.now() });
            myRef.set({ nome: userProfile?.nome || 'Online', online: true, lastSeen: Date.now() });
        }
    });

    if (window._chatPresenceRef) db.ref('presence').off();
    window._chatPresenceRef = db.ref('presence');
    window._chatPresenceRef.on('value', snap => {
        const presences = snap.val() || {};
        chatOnlineUsers = {};
        chatPresenceTimestamps = {};
        const onlineNames = [];
        for (const [uid, p] of Object.entries(presences)) {
            if (p && p.online) {
                chatOnlineUsers[uid] = true;
                chatPresenceTimestamps[uid] = p.lastSeen || 0;
                if (p.nome) onlineNames.push(p.nome);
            } else if (p && p.lastSeen) {
                chatPresenceTimestamps[uid] = p.lastSeen;
            }
        }
        const el = document.getElementById('chat-online-list');
        if (el) {
            if (onlineNames.length > 0) {
                el.innerHTML = onlineNames.map(n => `<span style="display:inline-flex;align-items:center;gap:3px;margin:0 2px;"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--success, #22c55e);flex-shrink:0;"></span>${escapeHTML(n)}</span>`).join('') +
                    ' <span style="opacity:0.7;">' + (onlineNames.length === 1 ? 'online' : 'online') + '</span>';
            } else {
                el.textContent = '';
            }
        }
        document.querySelectorAll('.chat-bubble .author span:first-child').forEach(dot => {
            const bubble = dot.closest('.chat-bubble');
            if (bubble) {
                const autorId = bubble.dataset.autorId;
                dot.style.background = chatOnlineUsers[autorId] ? 'var(--success, #22c55e)' : 'var(--border, #555)';
                const parent = dot.parentElement;
                if (parent) {
                    const nomeEl = parent.querySelector('.author-name');
                    if (nomeEl && !chatOnlineUsers[autorId]) {
                        const lastSeen = chatPresenceTimestamps[autorId];
                        if (lastSeen) {
                            const diffMs = Date.now() - lastSeen;
                            const diffMin = Math.floor(diffMs / 60000);
                            let ago = diffMin < 1 ? 'agora' : diffMin < 60 ? diffMin + 'min' : Math.floor(diffMin / 60) + 'h';
                            nomeEl.title = 'Visto há ' + ago;
                        }
                    }
                }
            }
        });
    });

    if (window._chatTypingRef) db.ref('typing').off();
    window._chatTypingRef = db.ref('typing/' + turma);
    window._chatTypingRef.on('value', snap => {
        const typists = snap.val() || {};
        const indicator = document.getElementById('chat-typing-indicator');
        const textEl = document.getElementById('chat-typing-text');
        if (!indicator || !textEl) return;
        const now = Date.now();
        const names = Object.entries(typists)
            .filter(([uid, v]) => uid !== currentUser.uid && v && v.nome && (now - (v.timestamp || 0)) < 3000)
            .map(([uid, v]) => v.nome);
        if (names.length === 0) {
            indicator.style.display = 'none';
        } else {
            indicator.style.display = 'block';
            textEl.textContent = names.join(', ') + (names.length === 1 ? ' está a escrever...' : ' estão a escrever...');
        }
    });
}

function chatLoadMessages(turma) {
    turma = turma || chatCurrentTurma || getTurma();
    chatCurrentTurma = turma;
    db.ref('chat/' + turma).off();
    db.ref('chat/' + turma).on('child_added', snap => {
        const m = snap.val();
        if (!m) return;
        const box = document.getElementById('chat-box');
        if (!box) return;
        if (document.querySelector(`.chat-bubble[data-key="${snap.key}"]`)) return;
        chatRenderMessage(snap.key, m);
    });
    db.ref('chat/' + turma).on('child_changed', snap => {
        const m = snap.val();
        if (!m) return;
        chatUpdateMessage(snap.key, m);
    });
    db.ref('chat/' + turma).on('child_removed', snap => {
        const el = document.querySelector(`.chat-bubble[data-key="${snap.key}"]`);
        if (el) el.remove();
    });
}

function chatRenderMessage(key, m) {
    const box = document.getElementById('chat-box');
    if (!box) return;
    const mine = m.autorId === currentUser.uid;
    const div = document.createElement('div');
    div.className = 'chat-bubble ' + (mine ? 'mine' : 'theirs');
    div.dataset.key = key;
    div.dataset.autorId = m.autorId;

    let reactionsHtml = '';
    if (m.reactions) {
        const hasAny = Object.values(m.reactions).some(u => u && Object.keys(u).length > 0);
        if (hasAny) {
            reactionsHtml = '<div class="chat-reactions" style="display:flex;gap:4px;margin-top:6px;flex-wrap:wrap;">';
            for (const [emoji, users] of Object.entries(m.reactions)) {
                if (!users) continue;
                const count = Object.keys(users).length;
                if (count === 0) continue;
                const hasReacted = users[currentUser.uid];
                reactionsHtml += `<span onclick="chatToggleReaction('${key}','${emoji}')" style="cursor:pointer;padding:2px 7px;border-radius:12px;font-size:13px;background:${hasReacted ? 'rgba(37,99,235,0.2)' : 'rgba(255,255,255,0.05)'};border:1px solid ${hasReacted ? 'var(--primary)' : 'var(--border)'};">${emoji} <span style="font-size:11px;font-weight:600;">${count}</span></span>`;
            }
            reactionsHtml += '</div>';
        }
    }

    let replyHtml = '';
    if (m.replyTo) {
        const rt = m.replyTo;
        const replyText = typeof rt === 'object' ? rt.text : rt;
        const replyAutor = typeof rt === 'object' && rt.author ? rt.author : '';
        const autorLabel = replyAutor ? replyAutor + ': ' : '';
        replyHtml = `<div style="font-size:11px;padding:5px 10px;background:rgba(255,255,255,0.04);border-radius:8px;margin-bottom:6px;border-left:3px solid var(--primary);opacity:0.8;"><span style="opacity:0.6;">↩</span> ${escapeHTML(autorLabel + replyText)}</div>`;
    }

    const isOnline = chatOnlineUsers[m.autorId];
    const onlineDot = !mine ? `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${isOnline ? 'var(--success, #22c55e)' : 'var(--border, #555)'};margin-right:5px;flex-shrink:0;transition:background 0.3s;"></span>` : '';

    const time = new Date(m.timestamp).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
    const autorDisplay = !mine ? `<div class="author" style="display:flex;align-items:center;gap:4px;margin-bottom:4px;">${onlineDot}<span class="author-name" style="font-weight:700;font-size:12px;opacity:0.7;">${escapeHTML(m.autorNome || '')}</span></div>` : '';

    div.innerHTML = `
        ${autorDisplay}
        ${replyHtml}
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
            <div style="flex:1;word-break:break-word;">${escapeHTML(m.texto || '')}</div>
            <div style="display:flex;gap:6px;align-items:center;flex-shrink:0;">
                <span style="font-size:10px;opacity:0.5;white-space:nowrap;">${time}</span>
                <span onclick="chatReplyMsg('${key}','${escapeHTML((m.texto || '').substring(0, 60))}')" class="chat-action-btn" title="Responder" style="cursor:pointer;font-size:12px;opacity:0.35;transition:opacity 0.15s;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.35'">↩️</span>
                ${mine ? `<span onclick="chatDeleteMsg('${key}')" class="chat-action-btn" title="Eliminar" style="cursor:pointer;font-size:12px;opacity:0.35;transition:opacity 0.15s;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.35'">🗑️</span>` : ''}
            </div>
        </div>
        ${reactionsHtml}
        <div class="chat-reaction-bar" style="display:flex;gap:4px;margin-top:4px;opacity:0;transition:opacity 0.2s;">
            ${['👍','❤️','😂','😮','😢','🙏'].map(e => `<span onclick="chatToggleReaction('${key}','${e}')" style="cursor:pointer;font-size:14px;padding:2px 5px;border-radius:6px;transition:background 0.15s;" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background=''">${e}</span>`).join('')}
        </div>
    `;

    div.addEventListener('mouseenter', () => {
        const bar = div.querySelector('.chat-reaction-bar');
        if (bar) bar.style.opacity = '1';
    });
    div.addEventListener('mouseleave', () => {
        const bar = div.querySelector('.chat-reaction-bar');
        if (bar) bar.style.opacity = '0';
    });

    box.appendChild(div);
    box.scrollTop = box.scrollHeight;

    if (!mine && m.timestamp > (chatLastReadTimestamps[chatCurrentTurma] || 0)) {
        chatUnreadCount++;
        chatUpdateBadge();
    }
}

function chatUpdateMessage(key, m) {
    const el = document.querySelector(`.chat-bubble[data-key="${key}"]`);
    if (!el) return;

    let reactionsHtml = '';
    if (m.reactions) {
        const hasAny = Object.values(m.reactions).some(u => u && Object.keys(u).length > 0);
        if (hasAny) {
            reactionsHtml = '<div class="chat-reactions" style="display:flex;gap:4px;margin-top:6px;flex-wrap:wrap;">';
            for (const [emoji, users] of Object.entries(m.reactions)) {
                if (!users) continue;
                const count = Object.keys(users).length;
                if (count === 0) continue;
                const hasReacted = users[currentUser.uid];
                reactionsHtml += `<span onclick="chatToggleReaction('${key}','${emoji}')" style="cursor:pointer;padding:2px 7px;border-radius:12px;font-size:13px;background:${hasReacted ? 'rgba(37,99,235,0.2)' : 'rgba(255,255,255,0.05)'};border:1px solid ${hasReacted ? 'var(--primary)' : 'var(--border)'};">${emoji} <span style="font-size:11px;font-weight:600;">${count}</span></span>`;
            }
            reactionsHtml += '</div>';
        }
    }

    const existingContainer = el.querySelector('.chat-reactions');
    if (existingContainer) {
        if (reactionsHtml) {
            existingContainer.outerHTML = reactionsHtml;
        } else {
            existingContainer.remove();
        }
    } else if (reactionsHtml) {
        const bar = el.querySelector('.chat-reaction-bar');
        if (bar) {
            bar.insertAdjacentHTML('beforebegin', reactionsHtml);
        } else {
            el.insertAdjacentHTML('beforeend', reactionsHtml);
        }
    }

    const isOnline = chatOnlineUsers[m.autorId];
    const dots = el.querySelectorAll('.author > span:first-child');
    dots.forEach(dot => {
        dot.style.background = isOnline ? 'var(--success, #22c55e)' : 'var(--border, #555)';
    });
}

function chatSendMsg() {
    const input = document.getElementById('chat-input');
    const texto = input.value.trim();
    if (!texto) return;
    const turma = chatCurrentTurma || getTurma();
    const msg = {
        texto,
        autorId: currentUser.uid,
        autorNome: userProfile?.nome || 'Anónimo',
        timestamp: Date.now(),
        reactions: {}
    };
    if (chatReplyTo) {
        msg.replyTo = {
            id: chatReplyTo.key,
            text: chatReplyTo.text,
            author: chatReplyTo.autor
        };
    }
    dbPush('chat/' + turma, msg);
    input.value = '';
    chatCancelReply();
    if (chatTypingTimeout) clearTimeout(chatTypingTimeout);
    db.ref('typing/' + turma + '/' + currentUser.uid).remove();
    chatSaveLastRead(turma);
}

function chatReplyMsg(key, text) {
    const bubble = document.querySelector(`.chat-bubble[data-key="${key}"]`);
    const autor = bubble ? bubble.dataset.autorId : '';
    let autorNome = '';
    if (autor && autor !== currentUser.uid) {
        const nomeEl = bubble.querySelector('.author-name');
        autorNome = nomeEl ? nomeEl.textContent : '';
    } else if (autor === currentUser.uid) {
        autorNome = userProfile?.nome || 'Eu';
    }
    chatReplyTo = { key, text, autor: autorNome };
    const indicator = document.getElementById('chat-reply-indicator');
    const textEl = document.getElementById('chat-reply-text');
    if (indicator && textEl) {
        indicator.style.display = 'flex';
        textEl.textContent = autorNome ? autorNome + ': ' + text : text;
    }
    document.getElementById('chat-input').focus();
}

function chatCancelReply() {
    chatReplyTo = null;
    const indicator = document.getElementById('chat-reply-indicator');
    if (indicator) indicator.style.display = 'none';
}

function chatDeleteMsg(key) {
    if (!confirm('Eliminar esta mensagem?')) return;
    const turma = chatCurrentTurma || getTurma();
    db.ref('chat/' + turma + '/' + key).remove();
    showToast('Mensagem eliminada', 'success');
}

function chatToggleReaction(key, emoji) {
    const turma = chatCurrentTurma || getTurma();
    const ref = db.ref('chat/' + turma + '/' + key + '/reactions/' + emoji + '/' + currentUser.uid);
    ref.once('value', snap => {
        if (snap.val()) ref.remove();
        else ref.set(true);
    });
}

function chatTyping() {
    const turma = chatCurrentTurma || getTurma();
    if (chatTypingTimeout) clearTimeout(chatTypingTimeout);
    db.ref('typing/' + turma + '/' + currentUser.uid).set({ nome: userProfile?.nome || 'Alguém', timestamp: Date.now() });
    chatTypingTimeout = setTimeout(() => {
        db.ref('typing/' + turma + '/' + currentUser.uid).remove();
    }, 2000);
}

function chatToggleEmojiPicker() {
    const picker = document.getElementById('chat-emoji-picker');
    const templates = document.getElementById('chat-templates');
    if (templates) templates.style.display = 'none';
    if (picker) picker.style.display = picker.style.display === 'none' || !picker.style.display ? 'block' : 'none';
}

function chatToggleTemplates() {
    const templates = document.getElementById('chat-templates');
    const picker = document.getElementById('chat-emoji-picker');
    if (picker) picker.style.display = 'none';
    if (templates) templates.style.display = templates.style.display === 'none' || !templates.style.display ? 'flex' : 'none';
}

function chatRenderEmojis() {
    const picker = document.getElementById('chat-emoji-picker');
    if (!picker) return;
    const categories = {
        '😀 Smileys': ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','😊','😇','🥰','😍','🤩','😘','😋','😛','😜','🤪','😎'],
        '🫶 People': ['👋','🤚','✋','✌️','🤞','🫶','🤟','👈','👉','👍','👎','✊','👊','🤝','👏','🙌','👐','💪','🙏','🧠'],
        '🐾 Animals': ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🐔','🐧','🐦','🐴','🦄'],
        '🍎 Food': ['🍏','🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🍈','🍒','🍑','🍍','🥝','🥑','🍕','🍔','🍟','🌮','🍩'],
        '🌍 Travel': ['🚗','🚕','🚙','🚌','🚎','🚓','🚲','🛵','🏍️','🚆','🚇','✈️','🚁','🚀','🏠','🏫','🏖️','🗺️','🌍','🎢'],
        '🎮 Objects': ['⌚','📱','💻','⌨️','🖥️','📷','📹','🎥','📞','📺','🔋','💡','🔦','🗑️','💰','🎮','🎧','📚','✏️','🔧'],
        '💡 Symbols': ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','💔','💕','💞','💓','💗','💖','💝','⭐','🌟','💯','🔥','✅']
    };
    let html = '';
    for (const [cat, emojis] of Object.entries(categories)) {
        html += '<div style="font-size:11px;font-weight:700;color:var(--text-light);margin:8px 0 3px;">' + cat + '</div>';
        html += '<div style="display:flex;flex-wrap:wrap;gap:2px;">';
        emojis.forEach(e => {
            html += '<span onclick="chatInsertEmoji(\'' + e + '\')" style="cursor:pointer;font-size:22px;padding:3px 6px;border-radius:5px;transition:background 0.1s;" onmouseover="this.style.background=\'rgba(255,255,255,0.12)\'" onmouseout="this.style.background=\'\'">' + e + '</span>';
        });
        html += '</div>';
    }
    picker.innerHTML = html;
}

function chatRenderTemplates() {
    const el = document.getElementById('chat-templates');
    if (!el) return;
    const templates = [
        'Bom dia! ☀️',
        'Boa tarde!',
        'Vou entregar amanhã 📄',
        'Não percebi a matéria 😅',
        'Podes ajudar-me? 🙏',
        'Obrigado! 🙌',
        'Estou a caminho 🚶',
        'Já terminei ✅',
        'Preciso de ajuda com o TPC 📚',
        'OK, combinado 👍'
    ];
    el.innerHTML = templates.map(t =>
        '<button class="btn btn-sm btn-outline" onclick="chatInsertTemplate(\'' + t.replace(/'/g, "\\'") + '\')" style="font-size:11px;padding:4px 10px;">' + t + '</button>'
    ).join('');
}

function chatInsertEmoji(emoji) {
    const input = document.getElementById('chat-input');
    if (input) {
        const start = input.selectionStart;
        const end = input.selectionEnd;
        input.value = input.value.substring(0, start) + emoji + input.value.substring(end);
        input.selectionStart = input.selectionEnd = start + emoji.length;
        input.focus();
        input.dispatchEvent(new Event('input', { bubbles: true }));
    }
}

function chatInsertTemplate(text) {
    const input = document.getElementById('chat-input');
    if (input) {
        input.value = text;
        input.focus();
    }
    const templates = document.getElementById('chat-templates');
    if (templates) templates.style.display = 'none';
}

function chatIsVisible() {
    const box = document.querySelector('#chat-box');
    if (!box) return false;
    if (box.offsetParent === null) return false;
    const scrollArea = box.closest('.scroll-area');
    return !scrollArea || scrollArea.style.display !== 'none';
}

function chatUpdateBadge() {
    const chatNav = document.getElementById('nav-chat');
    if (!chatNav) return;
    let badge = chatNav.querySelector('.nav-badge');
    if (chatUnreadCount > 0) {
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'nav-badge';
            chatNav.appendChild(badge);
        }
        badge.textContent = chatUnreadCount > 99 ? '99+' : chatUnreadCount;
    } else if (badge) {
        badge.remove();
    }
}

function chatMarkAsRead() {
    if (chatCurrentTurma) {
        chatUnreadCount = 0;
        chatUpdateBadge();
        chatSaveLastRead(chatCurrentTurma);
    }
}

document.addEventListener('visibilitychange', function() {
    if (!document.hidden && chatCurrentTurma && currentUser) {
        const myRef = db.ref('presence/' + currentUser.uid);
        myRef.set({ nome: userProfile?.nome || 'Online', online: true, lastSeen: Date.now() });
        chatMarkAsRead();
    }
});
