// ═══════════════════════════════════════════════════════════════
// S&O+ Ultra Workspace — Pacote de Exames v2.0
// Exames AI exportáveis, timer, pontuação, formato profissional
// ═══════════════════════════════════════════════════════════════

let examState = {
    generated: false,
    questions: [],
    meta: {},
    taking: false,
    currentQ: 0,
    answers: {},
    timeLeft: 0,
    timerInterval: null,
    finished: false,
    score: 0
};

function renderExames(area, ext) {
    if (examState.taking || examState.finished) {
        examRenderTaking(area, ext);
        return;
    }
    if (examState.generated) {
        examRenderPreview(area, ext);
        return;
    }

    area.innerHTML = `
    <div style="max-width:800px;margin:0 auto;padding:24px;">
      <div style="margin-bottom:24px;">
        <h2 style="font-size:20px;font-weight:700;">${ext.icon||'📝'} ${ext.name||'Pacote de Exames'}</h2>
        <p style="font-size:13px;color:var(--text-light);margin-top:4px;">Gera exames profissionais com IA — exporta, imprime ou faz online</p>
      </div>

      <div style="background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:24px;margin-bottom:20px;">
        <h3 style="font-size:15px;font-weight:700;margin-bottom:16px;">⚙️ Configurar Exame</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
          <div class="form-group">
            <label style="font-size:12px;font-weight:600;color:var(--text-light);text-transform:uppercase;">Disciplina</label>
            <input id="exam-subject" placeholder="Ex: Matemática" style="width:100%;padding:10px 14px;background:var(--card);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:14px;margin-top:6px;">
          </div>
          <div class="form-group">
            <label style="font-size:12px;font-weight:600;color:var(--text-light);text-transform:uppercase;">Tema</label>
            <input id="exam-topic" placeholder="Ex: Equações do 2º grau" style="width:100%;padding:10px 14px;background:var(--card);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:14px;margin-top:6px;">
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-top:12px;">
          <div class="form-group">
            <label style="font-size:12px;font-weight:600;color:var(--text-light);text-transform:uppercase;">Nº Questões</label>
            <select id="exam-num" style="width:100%;padding:10px 14px;background:var(--card);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:14px;margin-top:6px;">
              <option value="5">5</option><option value="10" selected>10</option><option value="15">15</option><option value="20">20</option><option value="30">30</option>
            </select>
          </div>
          <div class="form-group">
            <label style="font-size:12px;font-weight:600;color:var(--text-light);text-transform:uppercase;">Tipos de Questão</label>
            <select id="exam-types" style="width:100%;padding:10px 14px;background:var(--card);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:14px;margin-top:6px;">
              <option value="mixed">Misto</option>
              <option value="mc">Apenas múltipla escolha</option>
              <option value="open">Apenas abertas</option>
              <option value="truefalse">Apenas verdadeiro/falso</option>
            </select>
          </div>
          <div class="form-group">
            <label style="font-size:12px;font-weight:600;color:var(--text-light);text-transform:uppercase;">Duração</label>
            <select id="exam-duration" style="width:100%;padding:10px 14px;background:var(--card);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:14px;margin-top:6px;">
              <option value="15">15 min</option><option value="30">30 min</option><option value="45">45 min</option><option value="60" selected>60 min</option><option value="90">90 min</option><option value="120">120 min</option>
            </select>
          </div>
        </div>
        <div class="form-group" style="margin-top:12px;">
          <label style="font-size:12px;font-weight:600;color:var(--text-light);text-transform:uppercase;">Ou cola material de estudo (opcional)</label>
          <textarea id="exam-material" rows="4" placeholder="Cola apontamentos, resumos ou conteúdo para o exame ser baseado neste material..." style="width:100%;padding:10px 14px;background:var(--card);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:14px;margin-top:6px;resize:vertical;"></textarea>
        </div>
        <div style="display:flex;gap:10px;margin-top:16px;">
          <button class="btn btn-primary" onclick="examGenerate()" style="font-size:13px;">🤖 Gerar Exame com IA</button>
        </div>
      </div>

      <div id="exam-loading" style="display:none;text-align:center;padding:40px;">
        <div class="spinner" style="margin:0 auto 12px;"></div>
        <div style="color:var(--text-light);font-size:14px;">A gerar exame profissional...</div>
      </div>

      <div id="exam-past" style="margin-top:8px;"></div>
    </div>`;

    examLoadPast();
}

async function examGenerate() {
    const subject = document.getElementById('exam-subject').value.trim();
    const topic = document.getElementById('exam-topic').value.trim();
    const num = document.getElementById('exam-num').value;
    const types = document.getElementById('exam-types').value;
    const duration = document.getElementById('exam-duration').value;
    const material = document.getElementById('exam-material').value.trim();
    if (!subject) return showToast('Indica a disciplina', 'error');

    document.getElementById('exam-loading').style.display = 'block';

    const typeDesc = types === 'mc' ? 'Apenas questões de múltipla escolha (4 opções A,B,C,D)'
        : types === 'open' ? 'Apenas questões abertas'
        : types === 'truefalse' ? 'Apenas verdadeiro ou falso'
        : 'Misto: metade múltipla escolha (4 opções), metade abertas';

    let prompt = `Gera um exame profissional de ${subject} sobre ${topic||'temas gerais'} com EXATAMENTE ${num} questões. Tipo: ${typeDesc}. Duração sugerida: ${duration} minutos.

Para cada questão responde EXATAMENTE neste formato JSON:
[
  {
    "id": 1,
    "type": "mc" ou "open" ou "tf",
    "question": "Enunciado da questão",
    "options": ["A) ...", "B) ...", "C) ...", "D) ..."] (apenas para mc, senão []),
    "answer": "B" ou "Resposta correta..." ou "Verdadeiro",
    "points": 2,
    "explanation": "Breve explicação"
  }
]

Responde APENAS com o JSON válido, sem mais nada.`;

    if (material) {
        prompt += `\n\nMATERIAL DE ESTUDO:\n${material.substring(0, 3000)}`;
    }

    try {
        const raw = await callAI(prompt);
        const jsonMatch = raw.match(/\[[\s\S]*\]/);
        if (!jsonMatch) throw new Error('Resposta IA inválida');
        const questions = JSON.parse(jsonMatch[0]);

        examState.questions = questions.map((q, i) => ({
            ...q,
            id: i + 1,
            points: q.points || Math.round(20 / questions.length)
        }));
        examState.meta = { subject, topic, num: questions.length, duration: parseInt(duration), types, date: new Date().toLocaleDateString('pt-PT') };
        examState.generated = true;
        examState.finished = false;

        document.getElementById('exam-loading').style.display = 'none';
        examRenderPreview(document.getElementById('exam-loading').parentElement, { icon: '📝', name: 'Pacote de Exames' });
        showToast(`📝 Exame gerado com ${questions.length} questões!`, 'success');
    } catch(e) {
        document.getElementById('exam-loading').style.display = 'none';
        showToast('Erro: ' + e.message, 'error');
    }
}

function examRenderPreview(area, ext) {
    const m = examState.meta;
    const qs = examState.questions;
    const totalPoints = qs.reduce((s,q) => s + q.points, 0);

    area.innerHTML = `
    <div style="max-width:800px;margin:0 auto;padding:24px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;flex-wrap:wrap;gap:12px;">
        <div>
          <h2 style="font-size:18px;font-weight:700;">📝 ${m.subject} — ${m.topic||'Exame Geral'}</h2>
          <p style="font-size:12px;color:var(--text-light);">${m.date} • ${m.duration} min • ${qs.length} questões • ${totalPoints} valores</p>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn btn-primary" onclick="examStart()" style="font-size:12px;">▶️ Iniciar Exame</button>
          <button class="btn btn-outline" onclick="examExportPrint()" style="font-size:12px;">🖨️ Imprimir</button>
          <button class="btn btn-outline" onclick="examExportHTML()" style="font-size:12px;">📄 Exportar HTML</button>
          <button class="btn btn-outline" onclick="examReset()" style="font-size:12px;">🔄 Novo</button>
        </div>
      </div>

      <div id="exam-printable" style="background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:32px;">
        <div style="text-align:center;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid var(--border);">
          <h1 style="font-size:22px;font-weight:800;">EXAME — ${m.subject}</h1>
          ${m.topic ? `<p style="font-size:14px;color:var(--text-light);margin-top:4px;">Tema: ${m.topic}</p>` : ''}
          <div style="display:flex;justify-content:center;gap:24px;margin-top:12px;font-size:12px;color:var(--text-light);">
            <span>📅 ${m.date}</span><span>⏱️ ${m.duration} minutos</span><span>📊 ${totalPoints} valores</span>
          </div>
          <div style="margin-top:12px;font-size:12px;color:var(--text-light);">
            Nome: _________________________ &nbsp;&nbsp;&nbsp; Turma: _________ &nbsp;&nbsp;&nbsp; Data: ___/___/______
          </div>
        </div>

        ${qs.map((q, i) => `
        <div style="margin-bottom:20px;padding:16px;background:var(--bg);border-radius:12px;border:1px solid var(--border);">
          <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:8px;">
            <div style="font-size:14px;font-weight:700;">${i+1}. ${q.question}</div>
            <span style="font-size:11px;color:var(--primary);background:var(--primary-glow);padding:2px 8px;border-radius:6px;white-space:nowrap;margin-left:8px;">${q.points} val.</span>
          </div>
          ${q.type === 'mc' && q.options ? `
            <div style="margin-top:8px;padding-left:8px;">
              ${q.options.map(opt => `<div style="font-size:13px;color:var(--text-light);padding:4px 0;">${opt}</div>`).join('')}
            </div>
          ` : q.type === 'tf' ? `
            <div style="margin-top:8px;padding-left:8px;display:flex;gap:24px;">
              <span style="font-size:13px;color:var(--text-light);">☐ Verdadeiro</span>
              <span style="font-size:13px;color:var(--text-light);">☐ Falso</span>
            </div>
          ` : `
            <div style="margin-top:8px;border-bottom:1px dashed var(--border);min-height:40px;"></div>
            <div style="margin-top:4px;border-bottom:1px dashed var(--border);min-height:40px;"></div>
            <div style="margin-top:4px;border-bottom:1px dashed var(--border);min-height:40px;"></div>
          `}
        </div>
        `).join('')}

        <div style="text-align:center;margin-top:24px;padding-top:16px;border-top:2px solid var(--border);font-size:12px;color:var(--text-light);">
          FIM DO EXAME — Boa sorte! 🍀
        </div>
      </div>
    </div>`;
}

// ── Take Exam Mode ──
function examStart() {
    examState.taking = true;
    examState.currentQ = 0;
    examState.answers = {};
    examState.timeLeft = examState.meta.duration * 60;
    examState.finished = false;
    examState.score = 0;
    examRenderTaking(document.querySelector('#content-area'), { icon:'📝', name:'Exame' });
    examStartTimer();
}

function examRenderTaking(area, ext) {
    const m = examState.meta;
    const qs = examState.questions;
    const totalPoints = qs.reduce((s,q) => s + q.points, 0);

    if (examState.finished) {
        const correct = qs.filter((q,i) => examIsCorrect(q,i)).length;
        const pct = Math.round((examState.score / totalPoints) * 100) || 0;
        const grade = pct >= 90 ? '20' : pct >= 80 ? '18' : pct >= 70 ? '16' : pct >= 60 ? '14' : pct >= 50 ? '12' : pct >= 40 ? '10' : pct >= 30 ? '08' : pct >= 20 ? '06' : '04';
        area.innerHTML = `
        <div style="max-width:700px;margin:0 auto;padding:24px;text-align:center;">
          <div style="background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:40px;">
            <div style="font-size:48px;margin-bottom:16px;">${pct >= 50 ? '🎉' : '📖'}</div>
            <h2 style="font-size:22px;font-weight:700;margin-bottom:8px;">Exame Concluído!</h2>
            <div style="font-size:48px;font-weight:800;color:var(--primary);margin:16px 0;">${grade} valores</div>
            <p style="font-size:14px;color:var(--text-light);">${correct}/${qs.length} corretas • ${examState.score}/${totalPoints} pontos • ${pct}%</p>
            <div style="width:200px;height:8px;background:var(--card);border-radius:4px;margin:20px auto;overflow:hidden;">
              <div style="width:${pct}%;height:100%;background:${pct>=50?'#22c55e':'#ef4444'};border-radius:4px;"></div>
            </div>
            <div style="display:flex;gap:10px;justify-content:center;margin-top:20px;">
              <button class="btn btn-primary" onclick="examShowCorrection()" style="font-size:13px;">📝 Ver Correção</button>
              <button class="btn btn-outline" onclick="examExportPrint()" style="font-size:13px;">🖨️ Imprimir</button>
              <button class="btn btn-outline" onclick="examReset()" style="font-size:13px;">🔄 Novo Exame</button>
            </div>
          </div>
        </div>`;
        examStopTimer();
        return;
    }

    const q = qs[examState.currentQ];
    const min = Math.floor(examState.timeLeft / 60);
    const sec = examState.timeLeft % 60;
    const answered = Object.keys(examState.answers).length;
    const progress = ((examState.currentQ + 1) / qs.length * 100).toFixed(0);

    area.innerHTML = `
    <div style="max-width:700px;margin:0 auto;padding:24px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:8px;">
        <h2 style="font-size:16px;font-weight:700;">📝 ${m.subject}${m.topic ? ' — ' + m.topic : ''}</h2>
        <div style="display:flex;align-items:center;gap:12px;">
          <span style="font-size:13px;color:${examState.timeLeft < 300 ? '#ef4444' : 'var(--text-light)'};font-weight:600;">⏱️ ${min}:${sec.toString().padStart(2,'0')}</span>
          <span style="font-size:12px;color:var(--text-light);">${answered}/${qs.length}</span>
        </div>
      </div>
      <div style="width:100%;height:4px;background:var(--card);border-radius:2px;margin-bottom:20px;overflow:hidden;">
        <div style="width:${progress}%;height:100%;background:linear-gradient(90deg,var(--primary),var(--accent));transition:width 0.3s;"></div>
      </div>

      <div style="background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:24px;margin-bottom:16px;">
        <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:12px;">
          <span style="font-size:18px;font-weight:700;">${examState.currentQ+1}.</span>
          <span style="font-size:11px;color:var(--primary);background:var(--primary-glow);padding:2px 8px;border-radius:6px;">${q.points} val.</span>
        </div>
        <p style="font-size:15px;line-height:1.6;margin-bottom:16px;">${q.question}</p>

        ${q.type === 'mc' && q.options ? `
          <div style="display:flex;flex-direction:column;gap:8px;">
            ${q.options.map((opt, oi) => {
              const letter = opt.charAt(0);
              const selected = examState.answers[q.id] === letter;
              return `<div onclick="examAnswer('${q.id}','${letter}')" style="padding:12px 16px;background:${selected?'rgba(99,102,241,0.15)':'var(--card)'};border:1px solid ${selected?'var(--primary)':'var(--border)'};border-radius:10px;cursor:pointer;transition:all 0.2s;font-size:14px;">${opt}</div>`;
            }).join('')}
          </div>
        ` : q.type === 'tf' ? `
          <div style="display:flex;gap:12px;">
            <div onclick="examAnswer('${q.id}','Verdadeiro')" style="flex:1;padding:14px;text-align:center;background:${examState.answers[q.id]==='Verdadeiro'?'rgba(34,197,94,0.15)':'var(--card)'};border:1px solid ${examState.answers[q.id]==='Verdadeiro'?'#22c55e':'var(--border)'};border-radius:10px;cursor:pointer;font-size:14px;font-weight:600;">✅ Verdadeiro</div>
            <div onclick="examAnswer('${q.id}','Falso')" style="flex:1;padding:14px;text-align:center;background:${examState.answers[q.id]==='Falso'?'rgba(239,68,68,0.15)':'var(--card)'};border:1px solid ${examState.answers[q.id]==='Falso'?'#ef4444':'var(--border)'};border-radius:10px;cursor:pointer;font-size:14px;font-weight:600;">❌ Falso</div>
          </div>
        ` : `
          <textarea id="exam-open-${q.id}" rows="5" placeholder="Escreve a tua resposta..." oninput="examAnswer('${q.id}',this.value)" style="width:100%;padding:12px;background:var(--card);border:1px solid var(--border);border-radius:10px;color:var(--text);font-size:14px;resize:vertical;">${examState.answers[q.id]||''}</textarea>
        `}
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;">
        <button class="btn btn-outline" onclick="examNavQ(-1)" ${examState.currentQ===0?'disabled style="opacity:0.3;"':''}>← Anterior</button>
        <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:center;max-width:400px;">
          ${qs.map((_, i) => {
            const ans = examState.answers[qs[i].id];
            const bg = i === examState.currentQ ? 'var(--primary)' : ans ? 'rgba(34,197,94,0.3)' : 'var(--card)';
            return `<div onclick="examNavQTo(${i})" style="width:28px;height:28px;border-radius:6px;background:${bg};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;cursor:pointer;border:1px solid ${i===examState.currentQ?'var(--primary)':'var(--border)'};color:${i===examState.currentQ?'#fff':'var(--text-light)'};">${i+1}</div>`;
          }).join('')}
        </div>
        ${examState.currentQ >= qs.length-1
          ? `<button class="btn btn-primary" onclick="examSubmit()" style="font-size:13px;">✅ Entregar</button>`
          : `<button class="btn btn-outline" onclick="examNavQ(1)">Próximo →</button>`}
      </div>
    </div>`;
}

function examAnswer(qid, val) {
    examState.answers[qid] = val;
    examRenderTaking(document.querySelector('#content-area'), { icon:'📝', name:'Exame' });
}

function examNavQ(dir) {
    examState.currentQ = Math.max(0, Math.min(examState.questions.length-1, examState.currentQ + dir));
    examRenderTaking(document.querySelector('#content-area'), { icon:'📝', name:'Exame' });
}

function examNavQTo(i) {
    examState.currentQ = i;
    examRenderTaking(document.querySelector('#content-area'), { icon:'📝', name:'Exame' });
}

function examIsCorrect(q, idx) {
    const ans = examState.answers[q.id];
    if (!ans) return false;
    if (q.type === 'mc') return ans === q.answer?.charAt(0);
    if (q.type === 'tf') return ans === q.answer;
    return false;
}

function examSubmit() {
    const unanswered = examState.questions.length - Object.keys(examState.answers).length;
    if (unanswered > 0 && !confirm(`Faltam ${unanswered} questões. Entregar mesmo assim?`)) return;
    examStopTimer();
    examState.finished = true;
    examState.score = 0;
    examState.questions.forEach((q, i) => {
        if (examIsCorrect(q, i)) examState.score += q.points;
    });
    examRenderTaking(document.querySelector('#content-area'), { icon:'📝', name:'Exame' });
}

function examShowCorrection() {
    const qs = examState.questions;
    const totalPoints = qs.reduce((s,q) => s + q.points, 0);
    let html = `<div style="max-width:800px;margin:0 auto;padding:24px;">
      <h2 style="font-size:18px;font-weight:700;margin-bottom:20px;">📝 Correção do Exame</h2>`;

    qs.forEach((q, i) => {
        const userAns = examState.answers[q.id];
        const correct = examIsCorrect(q, i);
        html += `<div style="background:var(--surface);border:1px solid ${correct?'rgba(34,197,94,0.3)':'rgba(239,68,68,0.3)'};border-radius:12px;padding:16px;margin-bottom:12px;">
          <div style="display:flex;justify-content:space-between;align-items:start;">
            <div style="font-weight:700;font-size:14px;">${i+1}. ${q.question}</div>
            <span style="font-size:12px;padding:2px 8px;border-radius:6px;background:${correct?'rgba(34,197,94,0.15)':'rgba(239,68,68,0.15)'};color:${correct?'#22c55e':'#ef4444'};">${correct?'✅':'❌'} ${q.points} val.</span>
          </div>
          <div style="margin-top:8px;font-size:13px;">
            <div style="color:var(--text-light);">Tua resposta: <span style="color:${correct?'#22c55e':'#ef4444'};font-weight:600;">${userAns||'(sem resposta)'}</span></div>
            ${!correct ? `<div style="color:#22c55e;margin-top:2px;">Resposta correta: <strong>${q.answer}</strong></div>` : ''}
            ${q.explanation ? `<div style="margin-top:6px;padding:8px 12px;background:var(--bg);border-radius:8px;font-size:12px;color:var(--text-light);">💡 ${q.explanation}</div>` : ''}
          </div>
        </div>`;
    });

    html += `<div style="text-align:center;margin-top:16px;"><button class="btn btn-outline" onclick="examReset()">🔄 Novo Exame</button></div></div>`;
    document.querySelector('#content-area').innerHTML = html;
}

// ── Timer ──
function examStartTimer() {
    examStopTimer();
    examState.timerInterval = setInterval(() => {
        if (examState.timeLeft <= 0) {
            examSubmit();
            return;
        }
        examState.timeLeft--;
        const min = Math.floor(examState.timeLeft / 60);
        const sec = examState.timeLeft % 60;
        const timerEl = document.querySelector('[style*="font-weight:600"]');
        if (timerEl && timerEl.textContent.includes('⏱️')) {
            timerEl.textContent = `⏱️ ${min}:${sec.toString().padStart(2,'0')}`;
        }
    }, 1000);
}

function examStopTimer() {
    if (examState.timerInterval) { clearInterval(examState.timerInterval); examState.timerInterval = null; }
}

function examReset() {
    examStopTimer();
    examState.generated = false;
    examState.taking = false;
    examState.finished = false;
    examState.answers = {};
    examState.questions = [];
    const area = document.querySelector('#content-area');
    if (area) renderExames(area, { icon:'📝', name:'Pacote de Exames', desc:'Gera exames profissionais com IA' });
}

// ── Export ──
function examExportPrint() {
    const printContent = document.getElementById('exam-printable')?.innerHTML;
    if (!printContent) return showToast('Gera o exame primeiro', 'warning');
    const win = window.open('', '_blank');
    win.document.write(`<html><head><title>Exame — ${examState.meta.subject}</title>
      <style>body{font-family:Inter,-apple-system,sans-serif;padding:40px;color:#111;line-height:1.6;}
      h1{font-size:22px;text-align:center;}h2{font-size:16px;}
      @media print{body{padding:20px;}}</style></head>
      <body>${printContent}</body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 500);
}

function examExportHTML() {
    const qs = examState.questions;
    const m = examState.meta;
    const totalPoints = qs.reduce((s,q) => s + q.points, 0);

    let html = `<!DOCTYPE html><html lang="pt"><head><meta charset="UTF-8"><title>Exame — ${m.subject}</title>
    <style>body{font-family:Inter,-apple-system,sans-serif;max-width:800px;margin:0 auto;padding:40px;color:#111;line-height:1.7;}
    h1{text-align:center;border-bottom:2px solid #333;padding-bottom:12px;}h3{margin-top:24px;}
    .q{margin-bottom:20px;padding:12px;border:1px solid #ddd;border-radius:8px;}
    .pts{float:right;font-size:12px;color:#6366f1;font-weight:600;}.options{padding-left:20px;margin-top:8px;}
    .answer-line{border-bottom:1px solid #ccc;margin-top:8px;height:24px;}</style></head><body>
    <h1>EXAME — ${m.subject}</h1>
    <p style="text-align:center;color:#666;">${m.topic||''} | ${m.date} | ${m.duration} min | ${totalPoints} valores</p>
    <p style="text-align:center;margin-top:16px;">Nome: _______________ Turma: _______ Data: ___/___/______</p><hr style="margin:20px 0;">`;

    qs.forEach((q, i) => {
        html += `<div class="q"><h3>${i+1}. ${q.question} <span class="pts">[${q.points} val.]</span></h3>`;
        if (q.type === 'mc' && q.options) {
            html += `<div class="options">${q.options.map(o => `<p>☐ ${o}</p>`).join('')}</div>`;
        } else if (q.type === 'tf') {
            html += `<p>☐ Verdadeiro &nbsp;&nbsp;&nbsp; ☐ Falso</p>`;
        } else {
            html += `<div class="answer-line"></div><div class="answer-line"></div><div class="answer-line"></div>`;
        }
        html += `</div>`;
    });

    html += `<hr style="margin:30px 0;"><p style="text-align:center;color:#666;">FIM DO EXAME</p></body></html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `exame_${m.subject.replace(/\s/g,'_')}_${m.date.replace(/\//g,'-')}.html`;
    a.click();
    showToast('📄 Exame exportado como HTML!', 'success');
}

// ── Past Exams ──
async function examLoadPast() {
    const el = document.getElementById('exam-past');
    if (!el || typeof currentUser === 'undefined' || !currentUser?.uid) return;
    try {
        const snap = await db.ref(`exams/${currentUser.uid}`).orderByChild('savedAt').limitToLast(5).once('value');
        const entries = [];
        snap.forEach(child => entries.unshift({ id: child.key, ...child.val() }));
        if (entries.length === 0) return;
        el.innerHTML = `<h3 style="font-size:14px;font-weight:600;margin-bottom:12px;color:var(--text-light);">📚 Exames Anteriores</h3>
          <div style="display:flex;flex-direction:column;gap:8px;">
          ${entries.map(e => `
            <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:12px 16px;display:flex;justify-content:space-between;align-items:center;">
              <div><div style="font-weight:600;font-size:14px;">${e.subject||'Exame'}</div>
              <div style="font-size:12px;color:var(--text-light);">${e.topic||''} • ${e.num||'?'} questões • ${new Date(e.savedAt).toLocaleDateString('pt-PT')}</div></div>
              <button class="btn btn-outline" onclick="examRestore('${e.id}')" style="font-size:11px;padding:4px 10px;">Usar</button>
            </div>`).join('')}
          </div>`;
    } catch(e) {}
}
