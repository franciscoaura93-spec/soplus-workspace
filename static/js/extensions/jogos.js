// S&O+ Extension: Jogos Educativos

function renderJogos(area, ext) {
    area.innerHTML = `
        <div class="page-header"><h2>${ext.icon} ${ext.name}</h2><p>${ext.desc}</p></div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px;">
            <div class="card" style="cursor:pointer;text-align:center;padding:30px;transition:transform 0.2s;" onmouseover="this.style.transform='scale(1.03)'" onmouseout="this.style.transform='scale(1)'">
                <div style="font-size:40px;margin-bottom:8px;">❓</div><h3>Quiz Rápido</h3><p style="font-size:12px;color:var(--text-light);">5 perguntas de conhecimento geral</p>
                <button class="btn btn-primary" style="margin-top:12px;" onclick="jogoQuiz()">Jogar</button>
            </div>
            <div class="card" style="cursor:pointer;text-align:center;padding:30px;transition:transform 0.2s;" onmouseover="this.style.transform='scale(1.03)'" onmouseout="this.style.transform='scale(1)'">
                <div style="font-size:40px;margin-bottom:8px;">🧠</div><h3>Memória</h3><p style="font-size:12px;color:var(--text-light);">Encontra os 6 pares de emojis</p>
                <button class="btn btn-primary" style="margin-top:12px;" onclick="jogoMemory()">Jogar</button>
            </div>
            <div class="card" style="cursor:pointer;text-align:center;padding:30px;transition:transform 0.2s;" onmouseover="this.style.transform='scale(1.03)'" onmouseout="this.style.transform='scale(1)'">
                <div style="font-size:40px;margin-bottom:8px;">🔤</div><h3>Palavras Misturadas</h3><p style="font-size:12px;color:var(--text-light);">Descobre a palavra original</p>
                <button class="btn btn-primary" style="margin-top:12px;" onclick="jogoPalavras()">Jogar</button>
            </div>
            <div class="card" style="cursor:pointer;text-align:center;padding:30px;transition:transform 0.2s;" onmouseover="this.style.transform='scale(1.03)'" onmouseout="this.style.transform='scale(1)'">
                <div style="font-size:40px;margin-bottom:8px;">🏃</div><h3>Corrida Matemática</h3><p style="font-size:12px;color:var(--text-light);">Resolve o máximo em 30s</p>
                <button class="btn btn-primary" style="margin-top:12px;" onclick="jogoMatematica()">Jogar</button>
            </div>
        </div>
        <div id="game-area" style="margin-top:24px;"></div>
    `;
}

// ─── QUIZ ─────────────────────────────────────────────────
function jogoQuiz() {
    const perguntas = [
        { q: 'Capital de Portugal?', o: ['Lisboa','Porto','Faro','Coimbra'], a: 0 },
        { q: '2 + 2 = ?', o: ['3','4','5','6'], a: 1 },
        { q: 'Qual é o maior planeta do sistema solar?', o: ['Terra','Marte','Júpiter','Saturno'], a: 2 },
        { q: 'Em que ano chegou o homem à Lua?', o: ['1965','1969','1972','1980'], a: 1 },
        { q: 'Qual é o símbolo químico da água?', o: ['H2O','CO2','O2','NaCl'], a: 0 },
        { q: 'Quantos lados tem um hexágono?', o: ['5','6','7','8'], a: 1 },
        { q: 'Quem descobriu o Brasil?', o: ['Cristóvão Colombo','Vasco da Gama','Pedro Álvares Cabral','Fernão de Magalhães'], a: 2 },
        { q: 'Qual é a raiz quadrada de 144?', o: ['10','11','12','13'], a: 2 },
        { q: 'De que país é o samba?', o: ['Argentina','Brasil','Colômbia','México'], a: 1 },
        { q: 'Qual é o oceano maior?', o: ['Atlântico','Índico','Pacífico','Ártico'], a: 2 }
    ].sort(() => Math.random() - 0.5).slice(0, 5);

    let score = 0, idx = 0;
    const ga = document.getElementById('game-area');

    function show() {
        if (idx >= perguntas.length) {
            const pct = Math.round(score / perguntas.length * 100);
            const emoji = pct === 100 ? '🏆' : pct >= 60 ? '🎉' : '💪';
            ga.innerHTML = `
                <div class="card" style="text-align:center;padding:30px;">
                    <div style="font-size:48px;margin-bottom:12px;">${emoji}</div>
                    <h2>Quiz Terminado!</h2>
                    <div style="font-size:32px;font-weight:700;margin:16px 0;color:${pct>=60?'var(--success)':'var(--danger)'};">${score}/${perguntas.length}</div>
                    <p style="color:var(--text-light);">${pct}% de acerto</p>
                    <button class="btn btn-primary" style="margin-top:16px;" onclick="jogoQuiz()">🔄 Jogar Novamente</button>
                </div>`;
            return;
        }
        const p = perguntas[idx];
        ga.innerHTML = `
            <div class="card">
                <div style="display:flex;justify-content:space-between;margin-bottom:12px;">
                    <span style="font-size:12px;color:var(--text-light);">Pergunta ${idx+1}/${perguntas.length}</span>
                    <span style="font-size:12px;color:var(--success);">✅ ${score}</span>
                </div>
                <div style="background:var(--bg);padding:20px;border-radius:10px;margin-bottom:16px;">
                    <h3 style="font-size:18px;">${p.q}</h3>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;" id="quiz-opts">
                    ${p.o.map((o, i) => `<button class="btn btn-outline" style="padding:14px;text-align:left;font-size:14px;" data-idx="${i}">${o}</button>`).join('')}
                </div>
            </div>`;
        document.querySelectorAll('#quiz-opts button').forEach(btn => {
            btn.addEventListener('click', () => {
                const chosen = parseInt(btn.dataset.idx);
                if (chosen === p.a) { score++; btn.style.background = 'rgba(34,197,94,0.2)'; btn.style.borderColor = '#22c55e'; }
                else { btn.style.background = 'rgba(239,68,68,0.2)'; btn.style.borderColor = '#ef4444'; }
                document.querySelectorAll('#quiz-opts button').forEach(b => b.disabled = true);
                document.querySelector(`#quiz-opts button[data-idx="${p.a}"]`).style.background = 'rgba(34,197,94,0.2)';
                document.querySelector(`#quiz-opts button[data-idx="${p.a}"]`).style.borderColor = '#22c55e';
                setTimeout(() => { idx++; show(); }, 1000);
            });
        });
    }
    show();
}

// ─── MEMÓRIA ──────────────────────────────────────────────
function jogoMemory() {
    const emojis = ['🍎','🍊','🍋','🍇','🍉','🍓','🌸','🌻'];
    const pairs = [...emojis.slice(0, 6), ...emojis.slice(0, 6)];
    for (let i = pairs.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pairs[i], pairs[j]] = [pairs[j], pairs[i]]; }

    let selected = [], matched = 0, locked = false;
    const ga = document.getElementById('game-area');

    ga.innerHTML = `
        <div class="card">
            <div style="display:flex;justify-content:space-between;margin-bottom:16px;">
                <span style="font-size:14px;">Pares: <strong id="mem-count">0</strong>/6</span>
                <button class="btn btn-outline" style="font-size:11px;padding:4px 12px;" onclick="jogoMemory()">🔄 Reiniciar</button>
            </div>
            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;" id="mem-grid"></div>
            <div id="mem-result" style="margin-top:16px;text-align:center;"></div>
        </div>`;

    const grid = document.getElementById('mem-grid');
    const cards = pairs.map((emoji, i) => {
        const div = document.createElement('div');
        div.style.cssText = 'aspect-ratio:1;background:var(--bg);border:2px solid var(--border);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:28px;cursor:pointer;transition:all 0.3s;user-select:none;';
        div.textContent = '❓';
        div.dataset.idx = i;
        div.dataset.emoji = emoji;
        div.addEventListener('click', () => flip(div));
        grid.appendChild(div);
        return div;
    });

    function flip(card) {
        if (locked || card.dataset.revealed || selected.length >= 2) return;
        card.textContent = card.dataset.emoji;
        card.style.background = 'var(--primary)';
        card.style.color = '#fff';
        card.style.transform = 'scale(1.05)';
        card.dataset.revealed = '1';
        selected.push(card);

        if (selected.length === 2) {
            locked = true;
            const [a, b] = selected;
            if (a.dataset.emoji === b.dataset.emoji) {
                matched++;
                document.getElementById('mem-count').textContent = matched;
                a.style.background = 'rgba(34,197,94,0.2)';
                a.style.borderColor = '#22c55e';
                b.style.background = 'rgba(34,197,94,0.2)';
                b.style.borderColor = '#22c55e';
                selected = [];
                locked = false;
                if (matched === 6) {
                    document.getElementById('mem-result').innerHTML = '<div style="padding:16px;background:rgba(34,197,94,0.1);border-radius:10px;"><h3>🧠 Parabéns! Todos os pares!</h3></div>';
                }
            } else {
                setTimeout(() => {
                    a.textContent = '❓'; a.style.background = 'var(--bg)'; a.style.color = ''; a.style.transform = ''; delete a.dataset.revealed;
                    b.textContent = '❓'; b.style.background = 'var(--bg)'; b.style.color = ''; b.style.transform = ''; delete b.dataset.revealed;
                    selected = [];
                    locked = false;
                }, 800);
            }
        }
    }
}

// ─── PALAVRAS ─────────────────────────────────────────────
function jogoPalavras() {
    const palavras = [
        { word: 'escola', hint: 'Onde se vai para aprender' },
        { word: 'professor', hint: 'Quem ensina' },
        { word: 'matematica', hint: 'Disciplina dos números' },
        { word: 'portugues', hint: 'Língua de Portugal' },
        { word: 'ciencia', hint: 'Estudo do mundo natural' },
        { word: 'historia', hint: 'O que aconteceu no passado' },
        { word: 'geografia', hint: 'Estudo dos países e mapas' },
        { word: 'biblioteca', hint: 'Lugar dos livros' },
        { word: 'caderno', hint: 'Onde escreves as aulas' },
        { word: 'exame', hint: 'Teste final' }
    ];
    const pick = palavras[Math.floor(Math.random() * palavras.length)];
    const letters = pick.word.split('');
    for (let i = letters.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [letters[i], letters[j]] = [letters[j], letters[i]]; }
    const scrambled = letters.join('');
    if (scrambled === pick.word) return jogoPalavras();

    let tries = 3;
    const ga = document.getElementById('game-area');
    ga.innerHTML = `
        <div class="card" style="text-align:center;">
            <p style="font-size:12px;color:var(--text-light);margin-bottom:4px;">Dica: ${pick.hint}</p>
            <div style="display:flex;gap:8px;justify-content:center;margin:20px 0;">
                ${scrambled.split('').map(l => `<div style="width:48px;height:52px;background:var(--bg);border:2px solid var(--primary);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:700;color:var(--accent);text-transform:uppercase;">${l}</div>`).join('')}
            </div>
            <p style="font-size:13px;color:var(--text-light);margin-bottom:12px;">Tentativas: <strong id="word-tries">${tries}</strong></p>
            <div style="display:flex;gap:8px;justify-content:center;">
                <input class="form-input" id="word-guess" placeholder="Escreve a palavra..." style="max-width:250px;text-transform:lowercase;">
                <button class="btn btn-primary" id="word-btn">✓</button>
            </div>
            <p id="word-result" style="margin-top:12px;font-size:14px;min-height:20px;"></p>
            <button class="btn btn-outline" style="margin-top:8px;" onclick="jogoPalavras()">🔄 Outra Palavra</button>
        </div>`;

    function check() {
        const guess = document.getElementById('word-guess').value.trim().toLowerCase();
        const res = document.getElementById('word-result');
        if (guess === pick.word) {
            res.innerHTML = `<span style="color:var(--success);">✅ Correto! A palavra era <strong>${pick.word}</strong></span>`;
            document.getElementById('word-btn').disabled = true;
            document.getElementById('word-guess').disabled = true;
        } else {
            tries--;
            document.getElementById('word-tries').textContent = tries;
            if (tries <= 0) {
                res.innerHTML = `<span style="color:var(--danger);">❌ Sem tentativas! A resposta era <strong>${pick.word}</strong></span>`;
                document.getElementById('word-btn').disabled = true;
                document.getElementById('word-guess').disabled = true;
            } else {
                res.innerHTML = `<span style="color:var(--danger);">❌ Tenta outra vez! (${tries} restantes)</span>`;
                document.getElementById('word-guess').value = '';
                document.getElementById('word-guess').focus();
            }
        }
    }
    document.getElementById('word-btn').addEventListener('click', check);
    document.getElementById('word-guess').addEventListener('keydown', e => { if (e.key === 'Enter') check(); });
    document.getElementById('word-guess').focus();
}

// ─── CORRIDA MATEMÁTICA ───────────────────────────────────
function jogoMatematica() {
    let correct = 0, total = 0, timeLeft = 30;
    let timer = null;
    const ga = document.getElementById('game-area');

    function genQ() {
        const a = Math.floor(Math.random() * 30) + 1;
        const b = Math.floor(Math.random() * 30) + 1;
        const ops = [
            { sym: '+', ans: a + b },
            { sym: '-', ans: a - b },
            { sym: '×', ans: a * b }
        ];
        const op = ops[Math.floor(Math.random() * 3)];
        return { text: `${a} ${op.sym} ${b}`, answer: op.ans };
    }

    function show() {
        if (timeLeft <= 0) {
            clearInterval(timer);
            ga.innerHTML = `
                <div class="card" style="text-align:center;padding:30px;">
                    <div style="font-size:48px;margin-bottom:12px;">${correct >= 8 ? '🏆' : correct >= 4 ? '🎉' : '💪'}</div>
                    <h2>Corrida Terminada!</h2>
                    <div style="display:flex;gap:24px;justify-content:center;margin:20px 0;">
                        <div><div style="font-size:28px;font-weight:700;color:var(--success);">${correct}</div><div style="font-size:11px;color:var(--text-light);">Corretas</div></div>
                        <div><div style="font-size:28px;font-weight:700;color:var(--text-dim);">${total}</div><div style="font-size:11px;color:var(--text-light);">Total</div></div>
                        <div><div style="font-size:28px;font-weight:700;color:var(--accent);">${total > 0 ? Math.round(correct / total * 100) : 0}%</div><div style="font-size:11px;color:var(--text-light);">Precisão</div></div>
                    </div>
                    <button class="btn btn-primary" onclick="jogoMatematica()">🔄 Jogar Novamente</button>
                </div>`;
            return;
        }
        const q = genQ();
        ga.innerHTML = `
            <div class="card">
                <div style="display:flex;justify-content:space-between;margin-bottom:12px;">
                    <span style="font-size:13px;color:var(--success);">✅ ${correct}</span>
                    <span style="font-size:20px;font-weight:700;color:${timeLeft <= 10 ? 'var(--danger)' : 'var(--accent)'};">⏱️ ${timeLeft}s</span>
                    <span style="font-size:13px;color:var(--text-light);">📝 ${total}</span>
                </div>
                <div style="text-align:center;padding:20px;background:var(--bg);border-radius:12px;margin-bottom:16px;">
                    <div style="font-size:36px;font-weight:700;letter-spacing:2px;">${q.text} = ?</div>
                </div>
                <div style="display:flex;gap:10px;justify-content:center;">
                    <input class="form-input" id="math-ans" type="number" style="max-width:140px;text-align:center;font-size:20px;font-weight:700;">
                    <button class="btn btn-primary" id="math-btn" style="font-size:16px;padding:10px 24px;">→</button>
                </div>
                <p id="math-feedback" style="text-align:center;margin-top:12px;min-height:20px;font-size:14px;"></p>
            </div>`;

        const input = document.getElementById('math-ans');
        const btn = document.getElementById('math-btn');
        input.focus();

        function answer() {
            const val = parseInt(input.value);
            if (isNaN(val)) return;
            total++;
            const fb = document.getElementById('math-feedback');
            if (val === q.answer) {
                correct++;
                fb.innerHTML = '<span style="color:var(--success);">✅ Certo!</span>';
                input.style.borderColor = '#22c55e';
            } else {
                fb.innerHTML = `<span style="color:var(--danger);">❌ Era ${q.answer}</span>`;
                input.style.borderColor = '#ef4444';
            }
            setTimeout(show, 500);
        }
        btn.addEventListener('click', answer);
        input.addEventListener('keydown', e => { if (e.key === 'Enter') answer(); });
    }

    ga.innerHTML = `
        <div class="card" style="text-align:center;padding:30px;">
            <div style="font-size:48px;margin-bottom:12px;">🏃</div>
            <h2>Corrida Matemática</h2>
            <p style="color:var(--text-light);margin:8px 0 20px;">Resolve o máximo de contas em <strong>30 segundos</strong>!</p>
            <button class="btn btn-primary" style="font-size:16px;padding:14px 32px;" id="math-start-btn">🚀 Começar!</button>
        </div>`;

    document.getElementById('math-start-btn').addEventListener('click', () => {
        correct = 0; total = 0; timeLeft = 30;
        timer = setInterval(() => { timeLeft--; show(); }, 1000);
        show();
    });
}
