// S&O+ Extension: Livros — Book Recommendations
const LIVROS_DATA = [
  {id:'m1',title:'Matemática Discreta e Lógica',author:'Kenneth Rosen',description:'Fundamentos de matemática discreta com aplicações em ciência da computação.',category:'Mathematics',rating:4.5,tags:['Lógica','Conjuntos','Grafos'],coverEmoji:'🔢'},
  {id:'m2',title:'Cálculo',author:'James Stewart',description:'Cálculo diferencial e integral para ciências exatas.',category:'Mathematics',rating:4.8,tags:['Cálculo','Derivadas','Integrais'],coverEmoji:'📐'},
  {id:'m3',title:'Álgebra Linear',author:'Gilbert Strang',description:'Álgebra linear moderna com foco em aplicações práticas.',category:'Mathematics',rating:4.6,tags:['Matrizes','Vetores','Espaços'],coverEmoji:'🧮'},
  {id:'s1',title:'Uma Breve História do Tempo',author:'Stephen Hawking',description:'Exploração sobre buracos negros, o Big Bang e a natureza do universo.',category:'Science',rating:4.7,tags:['Cosmologia','Física','Universo'],coverEmoji:'🌌'},
  {id:'s2',title:'O Gene Egoísta',author:'Richard Dawkins',description:'Uma abordagem evolutiva centrada nos genes como unidade de seleção.',category:'Science',rating:4.4,tags:['Evolução','Biologia','Genética'],coverEmoji:'🧬'},
  {id:'s3',title:'Breves Respostas para Grandes Questões',author:'Stephen Hawking',description:'Reflexões sobre os maiores mistérios da ciência.',category:'Science',rating:4.5,tags:['Ciência','Filosofia','Questões'],coverEmoji:'🤔'},
  {id:'h1',title:'Sapiens: História Breve da Humanidade',author:'Yuval Noah Harari',description:'A história da humanidade desde a Idade da Pedra até à era moderna.',category:'History',rating:4.9,tags:['Humanidade','Evolução','Sociedade'],coverEmoji:'📜'},
  {id:'h2',title:'O Diário de Anne Frank',author:'Anne Frank',description:'O comovente diário de uma jovem judia durante a Segunda Guerra Mundial.',category:'History',rating:4.6,tags:['Guerra','Memórias','Juventude'],coverEmoji:'📖'},
  {id:'h3',title:'A Origem das Espécies',author:'Charles Darwin',description:'A obra fundadora da biologia evolutiva moderna.',category:'History',rating:4.3,tags:['Evolução','História Natural','Ciência'],coverEmoji:'🌿'},
  {id:'l1',title:'Dom Casmurro',author:'Machado de Assis',description:'Um dos maiores clássicos da literatura brasileira sobre ciúme e dúvida.',category:'Literature',rating:4.7,tags:['Clássico','Romance','Brasileiro'],coverEmoji:'📕'},
  {id:'l2',title:'Os Maias',author:'Eça de Queirós',description:'A obra-prima do realismo português sobre a família Maia.',category:'Literature',rating:4.8,tags:['Clássico','Realismo','Português'],coverEmoji:'📗'},
  {id:'l3',title:'1984',author:'George Orwell',description:'Distopia sobre um futuro totalitário e vigilância em massa.',category:'Literature',rating:4.6,tags:['Distopia','Política','Ficção'],coverEmoji:'📘'},
  {id:'p1',title:'Código Limpo',author:'Robert C. Martin',description:'Boas práticas de programação para código legível e sustentável.',category:'Programming',rating:4.5,tags:['Clean Code','Boas Práticas','Profissional'],coverEmoji:'💻'},
  {id:'p2',title:'Estruturas de Dados e Algoritmos',author:'Thomas Cormen',description:'O guia de referência para algoritmos e estruturas de dados.',category:'Programming',rating:4.7,tags:['Algoritmos','Dados','Informática'],coverEmoji:'⚙️'},
  {id:'p3',title:'O Programador Pragmático',author:'David Thomas',description:'Conselhos práticos para programadores que querem evoluir.',category:'Programming',rating:4.4,tags:['Carreira','Prática','Profissional'],coverEmoji:'🛠️'},
  {id:'a1',title:'História da Arte',author:'E.H. Gombrich',description:'A mais famosa introdução à história da arte mundial.',category:'Art',rating:4.8,tags:['Arte','História','Cultura'],coverEmoji:'🎨'},
  {id:'a2',title:'Modos de Ver',author:'John Berger',description:'Ensaios sobre como olhamos e interpretamos a arte visual.',category:'Art',rating:4.3,tags:['Arte','Perceção','Ensaios'],coverEmoji:'🖼️'},
  {id:'mu1',title:'O Poder da Música',author:'Música e Cérebro',description:'Como a música afeta o cérebro, as emoções e a aprendizagem.',category:'Music',rating:4.2,tags:['Música','Neurociência','Aprendizagem'],coverEmoji:'🎵'},
  {id:'la1',title:'Fluent em 3 Meses',author:'Benny Lewis',description:'Métodos práticos para aprender qualquer idioma rapidamente.',category:'Languages',rating:4.1,tags:['Idiomas','Aprendizagem','Comunicação'],coverEmoji:'🌍'},
  {id:'la2',title:'O Livro dos Porquês',author:'Vários Autores',description:'Perguntas e respostas fascinantes sobre várias línguas.',category:'Languages',rating:3.9,tags:['Linguística','Curiosidades','Cultura'],coverEmoji:'💬'},
  {id:'g1',title:'Why Geography Matters',author:'Harm de Blij',description:'Como a geografia molda a história, política e economia mundial.',category:'Geography',rating:4.0,tags:['Geografia','Global','Política'],coverEmoji:'🌏'},
  {id:'ph1',title:'O Mundo de Sofia',author:'Jostein Gaarder',description:'Romance que introduz a história da filosofia de forma cativante.',category:'Philosophy',rating:4.6,tags:['Filosofia','Romance','Aprendizagem'],coverEmoji:'💭'},
  {id:'ph2',title:'Meditações',author:'Marco Aurélio',description:'Reflexões do imperador estoico sobre a vida e a virtude.',category:'Philosophy',rating:4.5,tags:['Estoicismo','Filosofia','Reflexão'],coverEmoji:'🏛️'},
  {id:'ph3',title:'Assim Falou Zaratustra',author:'Friedrich Nietzsche',description:'Obra filosófica poética sobre o super-homem e a vontade de poder.',category:'Philosophy',rating:4.2,tags:['Filosofia','Poesia','Existencialismo'],coverEmoji:'⚡'},
];

const LIVRO_CATEGORIES = ['All','Mathematics','Science','History','Literature','Programming','Art','Music','Languages','Geography','Philosophy'];

let lvState = {
  books: LIVROS_DATA,
  filtered: LIVROS_DATA,
  readingList: [],
  activeCategory: 'All',
  searchQuery: '',
  sortBy: 'rating',
  currentBookId: null,
  widgetOpen: true,
  widgetTipInterval: null
};

window.renderLivros = function renderLivros(area) {
  lvState.widgetOpen = true;
  area.innerHTML = `
    <div style="max-width:1100px;margin:0 auto;padding:20px 0;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;flex-wrap:wrap;gap:12px;">
        <div>
          <h2 style="font-size:20px;font-weight:700;">📚 Recomendações de Livros</h2>
          <p style="font-size:13px;color:var(--text-light);margin-top:4px;">Descobre livros educativos recomendados para ti</p>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-ai" onclick="lvRecommendAI()" style="font-size:12px;">🤖 Recomendar para mim</button>
          <button class="btn btn-outline" onclick="lvToggleWidget()" style="font-size:12px;">💬 Widget</button>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;">
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px;">
          <label style="font-size:11px;font-weight:600;color:var(--text-light);text-transform:uppercase;letter-spacing:0.5px;">🔍 Pesquisar</label>
          <input id="lv-search" type="text" placeholder="Título, autor ou descrição..." style="width:100%;padding:10px 14px;background:var(--card);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:14px;margin-top:6px;" oninput="lvApplyFilters()">
        </div>
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px;">
          <label style="font-size:11px;font-weight:600;color:var(--text-light);text-transform:uppercase;letter-spacing:0.5px;">📂 Categoria</label>
          <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;" id="lv-categories">
            ${LIVRO_CATEGORIES.map(c => `<button class="btn btn-sm ${c==='All'?'btn-primary':'btn-ghost'}" onclick="lvSetCategory('${c}',this)" style="font-size:11px;">${c==='All'?'Todas':c}</button>`).join('')}
          </div>
        </div>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:8px;">
        <div style="display:flex;gap:8px;align-items:center;">
          <span style="font-size:12px;color:var(--text-light);">Ordenar:</span>
          <button class="btn btn-sm btn-ghost" onclick="lvSetSort('rating')" style="font-size:11px;${lvState.sortBy==='rating'?'background:rgba(37,99,235,0.15);border-color:var(--primary);':''}">⭐ Rating</button>
          <button class="btn btn-sm btn-ghost" onclick="lvSetSort('title')" style="font-size:11px;${lvState.sortBy==='title'?'background:rgba(37,99,235,0.15);border-color:var(--primary);':''}">🔤 Título</button>
        </div>
        <span id="lv-count" style="font-size:12px;color:var(--text-light);">${lvState.filtered.length} livros</span>
      </div>

      <div id="lv-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px;"></div>

      <div style="margin-top:32px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
          <h3 style="font-size:16px;font-weight:700;display:flex;align-items:center;gap:8px;">📋 Minha Lista de Leitura</h3>
          <div id="lv-stats" style="display:flex;gap:14px;font-size:12px;color:var(--text-light);"></div>
        </div>
        <div id="lv-reading-list" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px;"></div>
      </div>
    </div>

    <div id="lv-widget" style="position:fixed;bottom:90px;right:100px;z-index:999;width:280px;background:var(--surface-solid);border:1px solid var(--border);border-radius:14px;box-shadow:var(--shadow-lg);overflow:hidden;display:${lvState.widgetOpen?'block':'none'};animation:fadeInUp .4s cubic-bezier(.16,1,.3,1);">
      <div style="background:var(--gradient-flow);background-size:200% 200%;animation:gradientFlow 4s ease infinite;padding:12px 14px;display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:13px;font-weight:700;color:#fff;">💡 Dica de Leitura</span>
        <div style="display:flex;gap:6px;">
          <span onclick="lvWidgetQuickAdd()" style="color:#fff;cursor:pointer;font-size:13px;opacity:.8;hover:opacity:1;" title="Adicionar livro atual">➕</span>
          <span onclick="lvToggleWidget()" style="color:#fff;cursor:pointer;font-size:16px;opacity:.8;hover:opacity:1;">${lvState.widgetOpen?'−':'+'}</span>
        </div>
      </div>
      <div id="lv-widget-body" style="padding:14px;min-height:100px;">
        <div style="text-align:center;color:var(--text-light);font-size:13px;">A carregar dica...</div>
      </div>
    </div>
  `;

  lvLoadReadingList();
  lvApplyFilters();
  lvStartWidget();
}

function lvApplyFilters() {
  const q = (document.getElementById('lv-search')?.value||'').toLowerCase().trim();
  lvState.searchQuery = q;
  let filtered = lvState.books;
  if (lvState.activeCategory !== 'All') {
    filtered = filtered.filter(b => b.category === lvState.activeCategory);
  }
  if (q) {
    filtered = filtered.filter(b =>
      b.title.toLowerCase().includes(q) ||
      b.author.toLowerCase().includes(q) ||
      b.description.toLowerCase().includes(q) ||
      b.tags.some(t => t.toLowerCase().includes(q))
    );
  }
  if (lvState.sortBy === 'rating') {
    filtered = [...filtered].sort((a, b) => b.rating - a.rating);
  } else {
    filtered = [...filtered].sort((a, b) => a.title.localeCompare(b.title));
  }
  lvState.filtered = filtered;
  const cnt = document.getElementById('lv-count');
  if (cnt) cnt.textContent = `${filtered.length} livros`;
  lvRenderGrid();
}

function lvSetCategory(cat, btn) {
  lvState.activeCategory = cat;
  document.querySelectorAll('#lv-categories .btn').forEach(b => {
    b.className = 'btn btn-sm btn-ghost';
    b.style.background = '';
    b.style.borderColor = '';
  });
  if (btn) {
    btn.className = 'btn btn-sm btn-primary';
  }
  lvApplyFilters();
}

function lvSetSort(s) {
  lvState.sortBy = s;
  lvApplyFilters();
}

function lvRenderGrid() {
  const grid = document.getElementById('lv-grid');
  if (!grid) return;
  if (lvState.filtered.length === 0) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--text-light);"><div style="font-size:48px;margin-bottom:12px;">📭</div><h3>Nenhum livro encontrado</h3></div>';
    return;
  }
  const inList = id => lvState.readingList.some(b => b.id === id);
  grid.innerHTML = lvState.filtered.map(b => `
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:18px;transition:all .3s;display:flex;flex-direction:column;"
      onmouseover="this.style.borderColor='rgba(37,99,235,0.3)';this.style.transform='translateY(-2px)'"
      onmouseout="this.style.borderColor='var(--border)';this.style.transform='none'">
      <div style="display:flex;align-items:start;gap:12px;margin-bottom:10px;">
        <div style="font-size:42px;line-height:1;">${b.coverEmoji}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:14px;font-weight:700;line-height:1.3;">${b.title}</div>
          <div style="font-size:12px;color:var(--text-light);margin-top:2px;">${b.author}</div>
          <div style="display:flex;align-items:center;gap:6px;margin-top:4px;">
            <span style="font-size:12px;color:#f59e0b;">${'★'.repeat(Math.round(b.rating))}${'☆'.repeat(5-Math.round(b.rating))}</span>
            <span style="font-size:11px;color:var(--text-light);">${b.rating}</span>
            <span style="font-size:10px;background:rgba(99,102,241,0.1);color:#818cf8;padding:2px 8px;border-radius:4px;">${b.category}</span>
          </div>
        </div>
      </div>
      <div style="font-size:12px;color:var(--text-light);line-height:1.5;margin-bottom:10px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;">${b.description}</div>
      <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:12px;">
        ${b.tags.map(t => `<span style="font-size:10px;background:var(--card);border:1px solid var(--border);padding:2px 8px;border-radius:4px;color:var(--text-light);">#${t}</span>`).join('')}
      </div>
      <div style="margin-top:auto;">
        ${inList(b.id)
          ? `<button class="btn btn-sm btn-success" style="width:100%;font-size:12px;" disabled>✅ Na lista</button>`
          : `<button class="btn btn-sm btn-primary" onclick="lvAddToList('${b.id}')" style="width:100%;font-size:12px;">📖 Adicionar à Lista</button>`}
      </div>
    </div>
  `).join('');
}

async function lvAddToList(id) {
  const book = lvState.books.find(b => b.id === id);
  if (!book) return;
  const entry = { ...book, status: 'not_started', addedAt: Date.now() };
  lvState.readingList.push(entry);
  lvRenderGrid();
  lvRenderReadingList();
  lvRenderStats();
  if (typeof currentUser !== 'undefined' && currentUser?.uid) {
    try {
      await dbPush(`reading_list/${currentUser.uid}`, entry);
      showToast(`📚 "${book.title}" adicionado!`, 'success');
    } catch (e) {
      showToast('Erro ao guardar: ' + e.message, 'error');
    }
  } else {
    showToast(`📚 "${book.title}" adicionado!`, 'success');
  }
}

async function lvRemoveFromList(id) {
  if (!confirm('Remover este livro da lista?')) return;
  lvState.readingList = lvState.readingList.filter(b => b.id !== id);
  lvRenderGrid();
  lvRenderReadingList();
  lvRenderStats();
  if (typeof currentUser !== 'undefined' && currentUser?.uid) {
    const snap = await dbGet(`reading_list/${currentUser.uid}`);
    if (snap) {
      for (const [key, val] of Object.entries(snap)) {
        if (val.id === id) {
          await dbRemove(`reading_list/${currentUser.uid}/${key}`);
          break;
        }
      }
    }
  }
  showToast('Livro removido', 'success');
}

async function lvSetStatus(id, status) {
  const book = lvState.readingList.find(b => b.id === id);
  if (book) book.status = status;
  lvRenderReadingList();
  lvRenderStats();
  if (typeof currentUser !== 'undefined' && currentUser?.uid) {
    const snap = await dbGet(`reading_list/${currentUser.uid}`);
    if (snap) {
      for (const [key, val] of Object.entries(snap)) {
        if (val.id === id) {
          await dbUpdate(`reading_list/${currentUser.uid}/${key}`, { status });
          break;
        }
      }
    }
  }
}

async function lvLoadReadingList() {
  if (typeof currentUser !== 'undefined' && currentUser?.uid) {
    try {
      const snap = await dbGet(`reading_list/${currentUser.uid}`);
      if (snap) {
        lvState.readingList = Object.values(snap);
        lvRenderReadingList();
        lvRenderStats();
        lvRenderGrid();
      }
    } catch (e) {
      console.warn('Erro ao carregar lista:', e);
    }
  }
}

function lvRenderReadingList() {
  const el = document.getElementById('lv-reading-list');
  if (!el) return;
  const list = lvState.readingList;
  if (list.length === 0) {
    el.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text-light);grid-column:1/-1;"><div style="font-size:36px;margin-bottom:8px;">📖</div><p>A tua lista de leitura está vazia.</p></div>';
    return;
  }
  const statusOpts = ['not_started', 'reading', 'finished'];
  const statusLabels = { not_started: '⬜ Não iniciado', reading: '📖 A ler', finished: '✅ Lido' };
  const statusColors = { not_started: 'var(--text-light)', reading: 'var(--primary)', finished: 'var(--success)' };
  el.innerHTML = list.map(b => `
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:14px;display:flex;align-items:center;gap:12px;transition:all .2s;"
      onmouseover="this.style.borderColor='rgba(37,99,235,0.2)'" onmouseout="this.style.borderColor='var(--border)'">
      <div style="font-size:32px;">${b.coverEmoji}</div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:13px;font-weight:600;line-height:1.3;">${b.title}</div>
        <div style="font-size:11px;color:var(--text-light);margin-top:1px;">${b.author}</div>
        <select onchange="lvSetStatus('${b.id}',this.value)" style="margin-top:6px;padding:4px 8px;background:var(--card);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:11px;">
          ${statusOpts.map(s => `<option value="${s}" ${b.status===s?'selected':''}>${statusLabels[s]}</option>`).join('')}
        </select>
      </div>
      <button onclick="lvRemoveFromList('${b.id}')" style="background:none;border:none;color:var(--danger);cursor:pointer;font-size:16px;padding:4px;" title="Remover">✕</button>
    </div>
  `).join('');
}

function lvRenderStats() {
  const el = document.getElementById('lv-stats');
  if (!el) return;
  const total = lvState.readingList.length;
  const finished = lvState.readingList.filter(b => b.status === 'finished').length;
  const reading = lvState.readingList.filter(b => b.status === 'reading').length;
  const pagesEst = total * 250;
  el.innerHTML = `
    <span>📚 ${total} livros</span>
    <span>📖 ${reading} a ler</span>
    <span>✅ ${finished} lidos</span>
    <span>📄 ~${pagesEst} págs</span>
  `;
}

async function lvRecommendAI() {
  const subject = lvState.activeCategory !== 'All' ? lvState.activeCategory : 'várias áreas';
  const prompt = `Sou um estudante a estudar ${subject}. Recomenda-me 5 livros educativos relacionados. Para cada livro, dá título, autor, uma breve descrição e uma categoria. Responde em JSON: [{"title":"...","author":"...","description":"...","category":"..."}] Apenas JSON.`;
  const el = document.getElementById('lv-grid');
  if (!el) return;
  el.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-light);"><div class="spinner" style="margin:0 auto 12px;"></div>A IA a recomendar livros...</div>';
  try {
    const raw = await callAI(prompt);
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('Resposta inválida');
    const recs = JSON.parse(jsonMatch[0]);
    if (!recs.length) throw new Error('Sem recomendações');
    el.innerHTML = recs.map((r, i) => `
      <div style="background:var(--surface);border:1px solid rgba(139,92,246,0.3);border-radius:14px;padding:18px;display:flex;flex-direction:column;animation:fadeInUp .4s ${i*0.1}s both;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
          <div style="font-size:32px;">📚</div>
          <div style="flex:1;">
            <div style="font-size:14px;font-weight:700;">${r.title}</div>
            <div style="font-size:12px;color:var(--text-light);">${r.author||''} ${r.category?'· '+r.category:''}</div>
          </div>
          <span style="font-size:10px;background:rgba(139,92,246,0.1);color:#a78bfa;padding:2px 8px;border-radius:4px;">IA</span>
        </div>
        <div style="font-size:12px;color:var(--text-light);line-height:1.5;">${r.description||'Recomendação inteligente com base no teu estudo.'}</div>
      </div>
    `).join('');
    showToast('🤖 Recomendações geradas!', 'success');
  } catch (e) {
    el.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--danger);">❌ ${e.message}</div>`;
  }
}

function lvStartWidget() {
  lvShowTip();
  if (lvState.widgetTipInterval) clearInterval(lvState.widgetTipInterval);
  lvState.widgetTipInterval = setInterval(lvShowTip, 30000);
}

function lvShowTip() {
  const body = document.getElementById('lv-widget-body');
  if (!body) return;
  const inList = lvState.readingList.filter(b => b.status === 'reading');
  if (inList.length > 0) {
    const current = inList[0];
    body.innerHTML = `
      <div style="text-align:center;margin-bottom:8px;">
        <div style="font-size:48px;margin-bottom:6px;">${current.coverEmoji}</div>
        <div style="font-size:13px;font-weight:700;">${current.title}</div>
        <div style="font-size:11px;color:var(--text-light);">${current.author}</div>
        <div style="margin-top:8px;">
          <span style="font-size:10px;background:rgba(37,99,235,0.1);color:#93c5fd;padding:2px 10px;border-radius:4px;">📖 A ler agora</span>
        </div>
      </div>
    `;
    return;
  }
  const randomBook = lvState.books[Math.floor(Math.random() * lvState.books.length)];
  body.innerHTML = `
    <div style="text-align:center;margin-bottom:8px;">
      <div style="font-size:42px;margin-bottom:6px;">${randomBook.coverEmoji}</div>
      <div style="font-size:13px;font-weight:700;">${randomBook.title}</div>
      <div style="font-size:11px;color:var(--text-light);">${randomBook.author}</div>
      <div style="font-size:11px;color:#f59e0b;margin-top:4px;">${'★'.repeat(Math.round(randomBook.rating))}${'☆'.repeat(5-Math.round(randomBook.rating))}</div>
      <div style="margin-top:8px;">
        <button class="btn btn-sm btn-primary" onclick="lvAddToList('${randomBook.id}');lvShowTip();" style="font-size:10px;">📖 Adicionar</button>
      </div>
    </div>
  `;
}

function lvToggleWidget() {
  lvState.widgetOpen = !lvState.widgetOpen;
  const w = document.getElementById('lv-widget');
  if (w) w.style.display = lvState.widgetOpen ? 'block' : 'none';
}

function lvWidgetQuickAdd() {
  const reading = lvState.readingList.filter(b => b.status === 'reading');
  if (reading.length > 0) {
    showToast(`📖 A ler: "${reading[0].title}"`, 'success');
    return;
  }
  if (lvState.readingList.length > 0) {
    const last = lvState.readingList[lvState.readingList.length - 1];
    showToast(`📚 Último: "${last.title}"`, 'success');
    return;
  }
  const random = lvState.books[Math.floor(Math.random() * lvState.books.length)];
  lvAddToList(random.id);
}
