// S&O+ Extension: Jogos
function renderJogos(area, ext) {
    area.innerHTML = `
        <div class="page-header"><h2>${ext.icon} ${ext.name}</h2><p>${ext.desc}</p></div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px;">
            <div class="card" style="cursor:pointer;text-align:center;padding:30px;" onclick="startQuiz()">
                <div style="font-size:40px;margin-bottom:8px;">❓</div><h3>Quiz Rápido</h3><p style="font-size:12px;color:var(--text-light);">Testa os teus conhecimentos</p>
            </div>
            <div class="card" style="cursor:pointer;text-align:center;padding:30px;" onclick="startMemory()">
                <div style="font-size:40px;margin-bottom:8px;">🧠</div><h3>Memória</h3><p style="font-size:12px;color:var(--text-light);">Encontra os pares</p>
            </div>
            <div class="card" style="cursor:pointer;text-align:center;padding:30px;" onclick="startWordScramble()">
                <div style="font-size:40px;margin-bottom:8px;">🔤</div><h3>Palavras</h3><p style="font-size:12px;color:var(--text-light);">Descobre a palavra</p>
            </div>
            <div class="card" style="cursor:pointer;text-align:center;padding:30px;" onclick="startMathRace()">
                <div style="font-size:40px;margin-bottom:8px;">🏃</div><h3>Corrida Matemática</h3><p style="font-size:12px;color:var(--text-light);">Quanto mais rápido melhor</p>
            </div>
        </div>
        <div id="game-area" style="margin-top:20px;"></div>
    `;
}
let _quizScore=0,_quizTotal=0;
function startQuiz() {
    const q=[{q:'Capital de Portugal?',o:['Lisboa','Porto','Faro','Coimbra'],a:0},{q:'2+2=?',o:['3','4','5','6'],a:1},{q:'Qual é o maior planeta?',o:['Terra','Marte','Júpiter','Saturno'],a:2},{q:'Quem pintou a Mona Lisa?',o:['Picasso','Da Vinci','Van Gogh','Rembrandt'],a:1},{q:'Quantos continentes existem?',o:['5','6','7','8'],a:2}];
    _quizScore=0;_quizTotal=q.length;let i=0;
    function showQ() {
        const ga=document.getElementById('game-area'); if(!ga||i>=q.length) { ga.innerHTML=`<div class="card" style="text-align:center;padding:30px;"><h2>🎉 Quiz Terminado!</h2><p style="font-size:24px;margin:16px 0;">${_quizScore}/${_quizTotal}</p><p>${_quizScore===_quizTotal?'Perfeito!':_quizScore>=3?'Muito bem!':'Tenta novamente!'}</p></div>`; return; }
        ga.innerHTML=`<div class="card"><p style="font-size:12px;color:var(--text-light);margin-bottom:8px;">Pergunta ${i+1}/${q.length}</p><h3 style="margin-bottom:16px;">${q[i].q}</h3><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">${q[i].o.map((o,j)=>`<button class="btn btn-outline" onclick="if(${j}===${q[i].a}){_quizScore++;}i++;showQ()" style="text-align:left;">${o}</button>`).join('')}</div></div>`;
    }
    showQ();window.showQ=showQ;
}
let _memPairs=[],_memSel=[],_memMatched=0;
function startMemory() {
    const emojis=['🍎','🍊','🍋','🍇','🍉','🍓'];const pairs=[...emojis,...emojis];
    for(let i=pairs.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pairs[i],pairs[j]]=[pairs[j],pairs[i]];}
    _memPairs=pairs;_memSel=[];_memMatched=0;
    const ga=document.getElementById('game-area');
    ga.innerHTML=`<div class="card"><p style="font-size:13px;margin-bottom:12px;">Pares encontrados: <span id="mem-count">0</span>/6</p><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;" id="mem-grid">${pairs.map((e,i)=>`<div class="mem-card" data-idx="${i}" onclick="flipMem(${i})" style="aspect-ratio:1;background:var(--card);border:1px solid var(--border);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:28px;cursor:pointer;transition:all 0.3s;">❓</div>`).join('')}</div></div>`;
}
function flipMem(idx) {
    const cards=document.querySelectorAll('.mem-card'); if(!cards[idx]||_memSel.includes(idx)) return;
    cards[idx].textContent=_memPairs[idx];cards[idx].style.background='var(--primary)';cards[idx].style.color='#fff';
    _memSel.push(idx);
    if(_memSel.length===2) {
        const [a,b]=_memSel;
        if(_memPairs[a]===_memPairs[b]) {_memMatched++;document.getElementById('mem-count').textContent=_memMatched;_memSel=[];if(_memMatched===6)document.getElementById('game-area').innerHTML=`<div class="card" style="text-align:center;"><h2>🧠 Parabéns! Todos os pares!</h2></div>`;}
        else {setTimeout(()=>{cards[a].textContent='❓';cards[a].style.background='var(--card)';cards[a].style.color='';cards[b].textContent='❓';cards[b].style.background='var(--card)';cards[b].style.color='';_memSel=[];},700);}
    }
}
function startWordScramble() {
    const words=['escola','professor','matematica','portugues','ciencia','historia','geografia','informatica'];
    const w=words[Math.floor(Math.random()*words.length)];const s=w.split('');for(let i=s.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[s[i],s[j]]=[s[j],s[i]];}
    const ga=document.getElementById('game-area');
    ga.innerHTML=`<div class="card" style="text-align:center;"><p style="font-size:12px;color:var(--text-light);">Descobre a palavra!</p><h2 style="letter-spacing:6px;margin:16px 0;font-size:32px;">${s.join('').toUpperCase()}</h2><div style="display:flex;gap:8px;justify-content:center;"><input class="form-input" id="word-guess" placeholder="Escreve a palavra..." style="max-width:250px;text-transform:lowercase;" onkeydown="if(event.key==='Enter')checkWord('${w}')"><button class="btn btn-primary" onclick="checkWord('${w}')">✓</button></div><p id="word-result" style="margin-top:12px;"></p></div>`;
}
function checkWord(correct) {
    const g=document.getElementById('word-guess').value.trim().toLowerCase();
    document.getElementById('word-result').innerHTML=g===correct?'<span style="color:var(--success)">✅ Correto!</span>':'<span style="color:var(--danger)">❌ Tenta outra vez!</span>';
}
function startMathRace() {
    let score=0,total=10,correct=0;
    function genQ(){const a=Math.floor(Math.random()*20)+1,b=Math.floor(Math.random()*20)+1,ops=['+','-','*'];const op=ops[Math.floor(Math.random()*3)];let ans;ans=op==='+'?a+b:op==='-'?a-b:a*b;return{t:`${a} ${op} ${b} = ?`,a:ans};}
    function show(){
        if(total<=0){document.getElementById('game-area').innerHTML=`<div class="card" style="text-align:center;"><h2>🏃 Corrida Terminada!</h2><p style="font-size:24px;margin:12px 0;">${correct}/10 corretas</p></div>`;return;}
        const q=genQ();
        document.getElementById('game-area').innerHTML=`<div class="card" style="text-align:center;"><p style="color:var(--text-light);">${11-total}/10</p><h2 style="font-size:28px;margin:16px 0;">${q.t}</h2><input class="form-input" id="math-ans" type="number" style="max-width:120px;margin:0 auto;display:block;text-align:center;" autofocus onkeydown="if(event.key==='Enter'){if(parseInt(this.value)===${q.a})correct++;total--;show();}"><p id="math-result" style="margin-top:8px;"></p></div>`;
        document.getElementById('math-ans').focus();
    }
    show();
}
