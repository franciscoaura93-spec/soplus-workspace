// ═══════════════════════════════════════════════════════════════
// S&O+ Ultra Workspace — Escrita Musical Profissional v1.0
// Pentagrama, 100+ instrumentos, mixer, playback, save/load
// ═══════════════════════════════════════════════════════════════

const MUSICAL_DATA = {
    NOTE_NAMES: ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'],
    CLEF_OFFSETS: { treble: 4, bass: -2 },
    DURATIONS: [
        { id:'whole', label:'𝅝', beats:4, stem:false, fill:false },
        { id:'half', label:'𝅗𝅥', beats:2, stem:true, fill:false },
        { id:'quarter', label:'♩', beats:1, stem:true, fill:true },
        { id:'eighth', label:'♪', beats:0.5, stem:true, fill:true, flag:1 },
        { id:'sixteenth', label:'♬', beats:0.25, stem:true, fill:true, flag:2 },
        { id:'32nd', label:'𝅘𝅥𝅯', beats:0.125, stem:true, fill:true, flag:3 },
        { id:'whole_r', label:'𝄻', beats:4, rest:true },
        { id:'half_r', label:'𝄼', beats:2, rest:true },
        { id:'quarter_r', label:'𝄽', beats:1, rest:true },
        { id:'eighth_r', label:'𝄾', beats:0.5, rest:true },
        { id:'sixteenth_r', label:'𝄿', beats:0.25, rest:true },
        { id:'32nd_r', label:'𝅀', beats:0.125, rest:true }
    ],
    TIME_SIGS: ['4/4','3/4','2/4','6/8','5/4','7/8','2/2'],
    KEY_SIGS: ['C','G','D','A','E','B','F#','C#','F','Bb','Eb','Ab','Db','Gb'],
    FAMILIES: {
      strings:{name:'Cordas',icon:'🎻'}, woodwinds:{name:'Madeiras',icon:'🪈'}, brass:{name:'Metais',icon:'🎺'},
      percussion:{name:'Percussão',icon:'🥁'}, keyboards:{name:'Teclados',icon:'🎹'}, electronic:{name:'Eletrónica',icon:'🎛️'},
      world:{name:'Mundial',icon:'🌍'}, voice:{name:'Voz',icon:'🎤'}
    }
};

const INST_DB = [
  {n:'Violino',f:'strings',wave:'sawtooth',atk:0.02,dec:0.1,sus:0.7,rel:0.3,gl:0.04,filter:4000},
  {n:'Viola',f:'strings',wave:'sawtooth',atk:0.03,dec:0.12,sus:0.65,rel:0.35,gl:0.04,filter:3500},
  {n:'Violoncelo',f:'strings',wave:'sawtooth',atk:0.04,dec:0.15,sus:0.6,rel:0.4,gl:0.05,filter:3000},
  {n:'Contrabaixo',f:'strings',wave:'sawtooth',atk:0.05,dec:0.18,sus:0.5,rel:0.45,gl:0.06,filter:2000},
  {n:'Guitarra Acústica',f:'strings',wave:'triangle',atk:0.005,dec:0.3,sus:0.3,rel:0.5,gl:0,filter:6000},
  {n:'Guitarra Elétrica',f:'strings',wave:'sawtooth',atk:0.01,dec:0.2,sus:0.5,rel:0.3,gl:0.02,filter:5000},
  {n:'Guitarra Clássica',f:'strings',wave:'triangle',atk:0.005,dec:0.35,sus:0.25,rel:0.5,gl:0,filter:5500},
  {n:'Harpa',f:'strings',wave:'sine',atk:0.005,dec:0.5,sus:0.2,rel:0.8,gl:0,filter:8000},
  {n:'Ukulele',f:'strings',wave:'triangle',atk:0.003,dec:0.25,sus:0.2,rel:0.4,gl:0,filter:7000},
  {n:'Banjo',f:'strings',wave:'square',atk:0.003,dec:0.15,sus:0.3,rel:0.2,gl:0,filter:4500},
  {n:'Mandolim',f:'strings',wave:'triangle',atk:0.003,dec:0.12,sus:0.35,rel:0.2,gl:0,filter:6000},
  {n:'Erhu',f:'strings',wave:'sawtooth',atk:0.03,dec:0.1,sus:0.7,rel:0.3,gl:0.06,filter:3500},
  {n:'Koto',f:'world',wave:'kite',atk:0.003,dec:0.4,sus:0.15,rel:0.6,gl:0,filter:5000},
  {n:'Sitar',f:'world',wave:'sawtooth',atk:0.01,dec:0.3,sus:0.4,rel:0.5,gl:0.03,filter:3000},
  {n:'Shamisen',f:'world',wave:'square',atk:0.003,dec:0.2,sus:0.25,rel:0.3,gl:0,filter:4000},
  {n:'Flauta',f:'woodwinds',wave:'sine',atk:0.05,dec:0.1,sus:0.8,rel:0.2,gl:0.02,filter:8000},
  {n:'Piccolo',f:'woodwinds',wave:'sine',atk:0.03,dec:0.08,sus:0.85,rel:0.15,gl:0.02,filter:10000},
  {n:'Clarinete',f:'woodwinds',wave:'square',atk:0.03,dec:0.12,sus:0.7,rel:0.25,gl:0.02,filter:3500},
  {n:'Clarinete Baixo',f:'woodwinds',wave:'square',atk:0.04,dec:0.15,sus:0.65,rel:0.3,gl:0.03,filter:2500},
  {n:'Oboé',f:'woodwinds',wave:'sawtooth',atk:0.02,dec:0.1,sus:0.75,rel:0.2,gl:0.01,filter:4000},
  {n:'Corne Inglês',f:'woodwinds',wave:'sawtooth',atk:0.03,dec:0.12,sus:0.7,rel:0.25,gl:0.02,filter:3500},
  {n:'Fagote',f:'woodwinds',wave:'square',atk:0.04,dec:0.15,sus:0.6,rel:0.3,gl:0.03,filter:2500},
  {n:'Contrafagote',f:'woodwinds',wave:'square',atk:0.05,dec:0.18,sus:0.55,rel:0.35,gl:0.04,filter:2000},
  {n:'Sax Soprano',f:'woodwinds',wave:'sawtooth',atk:0.02,dec:0.1,sus:0.75,rel:0.2,gl:0.02,filter:4500},
  {n:'Sax Alto',f:'woodwinds',wave:'sawtooth',atk:0.02,dec:0.12,sus:0.7,rel:0.25,gl:0.02,filter:4000},
  {n:'Sax Tenor',f:'woodwinds',wave:'sawtooth',atk:0.025,dec:0.14,sus:0.65,rel:0.3,gl:0.03,filter:3500},
  {n:'Sax Barítono',f:'woodwinds',wave:'sawtooth',atk:0.03,dec:0.16,sus:0.6,rel:0.35,gl:0.03,filter:3000},
  {n:'Flauta de Pã',f:'world',wave:'sine',atk:0.04,dec:0.1,sus:0.7,rel:0.3,gl:0.01,filter:6000},
  {n:'Flauta Dulce',f:'woodwinds',wave:'sine',atk:0.03,dec:0.1,sus:0.75,rel:0.2,gl:0.01,filter:7000},
  {n:'Gaita',f:'world',wave:'sawtooth',atk:0.05,dec:0.15,sus:0.8,rel:0.3,gl:0,filter:3000},
  {n:'Trompete',f:'brass',wave:'sawtooth',atk:0.02,dec:0.1,sus:0.8,rel:0.2,gl:0.01,filter:5000},
  {n:'Corneta',f:'brass',wave:'sawtooth',atk:0.02,dec:0.1,sus:0.8,rel:0.2,gl:0.01,filter:5500},
  {n:'Fliscorno',f:'brass',wave:'sawtooth',atk:0.025,dec:0.12,sus:0.75,rel:0.25,gl:0.015,filter:4500},
  {n:'Trompa',f:'brass',wave:'sawtooth',atk:0.04,dec:0.15,sus:0.7,rel:0.3,gl:0.03,filter:3500},
  {n:'Trombone',f:'brass',wave:'sawtooth',atk:0.03,dec:0.12,sus:0.75,rel:0.25,gl:0.02,filter:3500},
  {n:'Trombone Baixo',f:'brass',wave:'sawtooth',atk:0.04,dec:0.15,sus:0.7,rel:0.3,gl:0.03,filter:2800},
  {n:'Tuba',f:'brass',wave:'sawtooth',atk:0.05,dec:0.18,sus:0.65,rel:0.35,gl:0.04,filter:2000},
  {n:'Eufónio',f:'brass',wave:'sawtooth',atk:0.04,dec:0.14,sus:0.7,rel:0.3,gl:0.03,filter:3000},
  {n:'Sousafone',f:'brass',wave:'sawtooth',atk:0.05,dec:0.18,sus:0.6,rel:0.35,gl:0.04,filter:1800},
  {n:'Bugle',f:'brass',wave:'sawtooth',atk:0.02,dec:0.1,sus:0.8,rel:0.2,gl:0.01,filter:5000},
  {n:'Mellofone',f:'brass',wave:'sawtooth',atk:0.03,dec:0.12,sus:0.75,rel:0.25,gl:0.02,filter:4000},
  {n:'Shofar',f:'world',wave:'sawtooth',atk:0.05,dec:0.2,sus:0.6,rel:0.4,gl:0.05,filter:2500},
  {n:'Piano',f:'keyboards',wave:'triangle',atk:0.005,dec:0.4,sus:0.3,rel:0.5,gl:0,filter:8000},
  {n:'Celesta',f:'percussion',wave:'sine',atk:0.005,dec:0.5,sus:0.15,rel:0.8,gl:0,filter:10000},
  {n:'Glockenspiel',f:'percussion',wave:'sine',atk:0.003,dec:0.4,sus:0.1,rel:0.6,gl:0,filter:12000},
  {n:'Vibrafone',f:'percussion',wave:'sine',atk:0.005,dec:0.6,sus:0.2,rel:0.9,gl:0,filter:8000},
  {n:'Marimba',f:'percussion',wave:'triangle',atk:0.003,dec:0.3,sus:0.1,rel:0.4,gl:0,filter:6000},
  {n:'Xilofone',f:'percussion',wave:'square',atk:0.003,dec:0.2,sus:0.1,rel:0.3,gl:0,filter:7000},
  {n:'Tímpano',f:'percussion',wave:'sine',atk:0.01,dec:0.4,sus:0.3,rel:0.6,gl:0,filter:2000},
  {n:'Caixa',f:'percussion',wave:'noise',atk:0.002,dec:0.08,sus:0.05,rel:0.1,gl:0,filter:6000,noise:true},
  {n:'Bumbo',f:'percussion',wave:'sine',atk:0.002,dec:0.15,sus:0.1,rel:0.2,gl:0,filter:200},
  {n:'Hi-Hat Fechado',f:'percussion',wave:'noise',atk:0.001,dec:0.05,sus:0.02,rel:0.05,gl:0,filter:8000,noise:true},
  {n:'Hi-Hat Aberto',f:'percussion',wave:'noise',atk:0.001,dec:0.15,sus:0.05,rel:0.2,gl:0,filter:8000,noise:true},
  {n:'Prato',f:'percussion',wave:'noise',atk:0.001,dec:0.3,sus:0.1,rel:0.5,gl:0,filter:6000,noise:true},
  {n:'Ride',f:'percussion',wave:'noise',atk:0.001,dec:0.4,sus:0.15,rel:0.6,gl:0,filter:7000,noise:true},
  {n:'Tom Alto',f:'percussion',wave:'sine',atk:0.003,dec:0.2,sus:0.1,rel:0.3,gl:0,filter:400},
  {n:'Tom Médio',f:'percussion',wave:'sine',atk:0.003,dec:0.25,sus:0.1,rel:0.35,gl:0,filter:300},
  {n:'Tom Baixo',f:'percussion',wave:'sine',atk:0.003,dec:0.3,sus:0.1,rel:0.4,gl:0,filter:200},
  {n:'Conga',f:'percussion',wave:'sine',atk:0.003,dec:0.2,sus:0.08,rel:0.25,gl:0,filter:500},
  {n:'Bongos',f:'percussion',wave:'triangle',atk:0.002,dec:0.15,sus:0.05,rel:0.2,gl:0,filter:800},
  {n:'Tabla',f:'world',wave:'sine',atk:0.003,dec:0.2,sus:0.1,rel:0.3,gl:0,filter:600},
  {n:'Cravo',f:'keyboards',wave:'square',atk:0.003,dec:0.25,sus:0.15,rel:0.3,gl:0,filter:5000},
  {n:'Clavicórdio',f:'keyboards',wave:'triangle',atk:0.005,dec:0.3,sus:0.2,rel:0.4,gl:0,filter:4000},
  {n:'Órgão de Tubos',f:'keyboards',wave:'sine',atk:0.1,dec:0.1,sus:0.9,rel:0.3,gl:0,filter:6000},
  {n:'Órgão Elétrico',f:'keyboards',wave:'sawtooth',atk:0.05,dec:0.1,sus:0.85,rel:0.2,gl:0,filter:5000},
  {n:'Acordeão',f:'keyboards',wave:'sawtooth',atk:0.02,dec:0.1,sus:0.8,rel:0.25,gl:0,filter:3500},
  {n:'Concertina',f:'keyboards',wave:'sawtooth',atk:0.02,dec:0.12,sus:0.75,rel:0.25,gl:0,filter:4000},
  {n:'Melódica',f:'keyboards',wave:'square',atk:0.02,dec:0.1,sus:0.8,rel:0.2,gl:0,filter:4500},
  {n:'Piano Sintetizado',f:'keyboards',wave:'triangle',atk:0.005,dec:0.35,sus:0.35,rel:0.5,gl:0,filter:7000},
  {n:'Piano Elétrico',f:'keyboards',wave:'sine',atk:0.005,dec:0.3,sus:0.4,rel:0.4,gl:0,filter:6000},
  {n:'Rhodes',f:'keyboards',wave:'sine',atk:0.005,dec:0.4,sus:0.35,rel:0.5,gl:0,filter:5000},
  {n:'Wurlitzer',f:'keyboards',wave:'sawtooth',atk:0.005,dec:0.3,sus:0.4,rel:0.4,gl:0,filter:4500},
  {n:'Piano de Brinquedo',f:'keyboards',wave:'square',atk:0.003,dec:0.2,sus:0.1,rel:0.3,gl:0,filter:8000},
  {n:'Synth Lead',f:'electronic',wave:'sawtooth',atk:0.01,dec:0.1,sus:0.8,rel:0.2,gl:0.01,filter:6000},
  {n:'Synth Bass',f:'electronic',wave:'sawtooth',atk:0.005,dec:0.15,sus:0.7,rel:0.15,gl:0.01,filter:2000},
  {n:'Synth Pad',f:'electronic',wave:'sawtooth',atk:0.3,dec:0.2,sus:0.7,rel:0.5,gl:0,filter:4000},
  {n:'Synth Strings',f:'electronic',wave:'sawtooth',atk:0.2,dec:0.15,sus:0.75,rel:0.4,gl:0,filter:5000},
  {n:'Synth Brass',f:'electronic',wave:'sawtooth',atk:0.05,dec:0.12,sus:0.8,rel:0.3,gl:0.02,filter:4500},
  {n:'Synth Choir',f:'electronic',wave:'sine',atk:0.15,dec:0.2,sus:0.7,rel:0.4,gl:0,filter:3000},
  {n:'Synth Bell',f:'electronic',wave:'sine',atk:0.005,dec:0.6,sus:0.1,rel:0.8,gl:0,filter:10000},
  {n:'Synth Pluck',f:'electronic',wave:'triangle',atk:0.003,dec:0.2,sus:0.3,rel:0.3,gl:0,filter:6000},
  {n:'Pad Warm',f:'electronic',wave:'sawtooth',atk:0.5,dec:0.3,sus:0.7,rel:0.8,gl:0,filter:3000},
  {n:'Pad Bright',f:'electronic',wave:'square',atk:0.3,dec:0.2,sus:0.75,rel:0.6,gl:0,filter:6000},
  {n:'Arp Synth',f:'electronic',wave:'square',atk:0.005,dec:0.1,sus:0.6,rel:0.1,gl:0,filter:5000},
  {n:'Wobble Bass',f:'electronic',wave:'sawtooth',atk:0.01,dec:0.15,sus:0.7,rel:0.2,gl:0.02,filter:1500},
  {n:'Reese Bass',f:'electronic',wave:'sawtooth',atk:0.02,dec:0.2,sus:0.7,rel:0.3,gl:0.01,filter:1800},
  {n:'Onda Quadrada',f:'electronic',wave:'square',atk:0.01,dec:0.1,sus:0.8,rel:0.2,gl:0,filter:5000},
  {n:'Onda de Serra',f:'electronic',wave:'sawtooth',atk:0.01,dec:0.1,sus:0.8,rel:0.2,gl:0,filter:5000},
  {n:'Didgeridoo',f:'world',wave:'sawtooth',atk:0.1,dec:0.2,sus:0.8,rel:0.3,gl:0.05,filter:1500},
  {n:'Kalimba',f:'world',wave:'sine',atk:0.003,dec:0.4,sus:0.1,rel:0.6,gl:0,filter:7000},
  {n:'Maracas',f:'percussion',wave:'noise',atk:0.001,dec:0.08,sus:0.02,rel:0.1,gl:0,filter:9000,noise:true},
  {n:'Pandeiro',f:'percussion',wave:'noise',atk:0.002,dec:0.1,sus:0.03,rel:0.12,gl:0,filter:7000,noise:true},
  {n:'Cabasa',f:'percussion',wave:'noise',atk:0.001,dec:0.06,sus:0.02,rel:0.08,gl:0,filter:8000,noise:true},
  {n:'Gongo',f:'percussion',wave:'sine',atk:0.005,dec:0.5,sus:0.15,rel:0.8,gl:0,filter:1200},
  {n:'Agogô',f:'percussion',wave:'triangle',atk:0.003,dec:0.15,sus:0.1,rel:0.2,gl:0,filter:5000},
  {n:'Steel Drums',f:'world',wave:'sine',atk:0.003,dec:0.4,sus:0.15,rel:0.6,gl:0,filter:8000},
  {n:'Gamelan',f:'world',wave:'triangle',atk:0.003,dec:0.5,sus:0.1,rel:0.7,gl:0,filter:6000},
  {n:'Duduk',f:'world',wave:'sawtooth',atk:0.05,dec:0.15,sus:0.75,rel:0.3,gl:0.04,filter:3000},
  {n:'Zurna',f:'world',wave:'sawtooth',atk:0.02,dec:0.1,sus:0.8,rel:0.2,gl:0.03,filter:4000},
  {n:'Ney',f:'world',wave:'sine',atk:0.06,dec:0.12,sus:0.7,rel:0.35,gl:0.02,filter:5000},
  {n:'Oud',f:'world',wave:'triangle',atk:0.005,dec:0.3,sus:0.2,rel:0.4,gl:0,filter:4500},
  {n:'Bouzouki',f:'world',wave:'triangle',atk:0.005,dec:0.25,sus:0.25,rel:0.35,gl:0,filter:5000},
  {n:'Balalaika',f:'world',wave:'triangle',atk:0.003,dec:0.2,sus:0.2,rel:0.3,gl:0,filter:5500},
  {n:'Voz Soprano',f:'voice',wave:'sine',atk:0.05,dec:0.1,sus:0.8,rel:0.3,gl:0.02,filter:4000},
  {n:'Voz Alto',f:'voice',wave:'sine',atk:0.05,dec:0.12,sus:0.75,rel:0.3,gl:0.02,filter:3500},
  {n:'Voz Tenor',f:'voice',wave:'sine',atk:0.06,dec:0.12,sus:0.75,rel:0.3,gl:0.03,filter:3000},
  {n:'Voz Baixo',f:'voice',wave:'sine',atk:0.06,dec:0.15,sus:0.7,rel:0.35,gl:0.03,filter:2500},
  {n:'Coro',f:'voice',wave:'sine',atk:0.1,dec:0.15,sus:0.8,rel:0.4,gl:0,filter:3500}
].map((o,i) => ({id:i+1, name:o.n, family:o.f, wave:o.wave, atk:o.atk, dec:o.dec, sus:o.sus, rel:o.rel, gl:o.gl||0, filter:o.filter, noise:o.noise||false}));

function renderEscritaMusical(el) {
    if(typeof Tone === 'undefined') {
        el.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:60vh;"><div style="text-align:center;"><div class="spinner" style="margin:0 auto 16px;width:32px;height:32px;"></div><div style="color:var(--text-light);font-size:14px;">A carregar motor de áudio (Tone.js)...</div></div></div>';
        const savedRequire = window.require;
        const savedDefine = window.define;
        window.define = undefined;
        window.require = undefined;
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/tone@14.7.77/build/Tone.min.js';
        s.onload = () => {
            window.define = savedDefine;
            window.require = savedRequire;
            renderEscritaMusical(el);
        };
        s.onerror = () => {
            window.define = savedDefine;
            window.require = savedRequire;
            el.innerHTML = '<div class="empty-state"><div class="icon">⚠️</div><h3>Erro ao carregar Tone.js</h3><p>Verifica a ligação à internet.</p></div>';
        };
        document.head.appendChild(s);
        return;
    }
    el.innerHTML = `
    <div id="mus-app" style="display:flex;flex-direction:column;height:calc(100vh - 60px);background:var(--bg);">
      <div id="mus-toolbar" style="display:flex;align-items:center;gap:10px;padding:10px 16px;background:var(--surface);border-bottom:1px solid var(--border);flex-wrap:wrap;">
        <div style="font-weight:700;font-size:15px;margin-right:8px;">🎵 ${typeof t==='function'?t('ext_escrita_musical'):'Escrita Musical'}</div>
        <button id="mus-play" class="btn btn-primary" onclick="musPlay()" style="font-size:12px;padding:6px 14px;">▶ Play</button>
        <button id="mus-stop" class="btn btn-outline" onclick="musStop()" style="font-size:12px;padding:6px 14px;">⏹ Stop</button>
        <div style="width:1px;height:24px;background:var(--border);"></div>
        <label style="font-size:11px;color:var(--text-light);">BPM</label>
        <input id="mus-bpm" type="number" value="120" min="20" max="300" style="width:60px;padding:4px 8px;background:var(--card);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:12px;text-align:center;" onchange="musState.bpm=+this.value">
        <label style="font-size:11px;color:var(--text-light);">Compasso</label>
        <select id="mus-time" style="padding:4px 8px;background:var(--card);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:12px;" onchange="musSetTimeSig(this.value)">
          <option>4/4</option><option>3/4</option><option>2/4</option><option>6/8</option><option>5/4</option><option>7/8</option>
        </select>
        <label style="font-size:11px;color:var(--text-light);">Tom</label>
        <select id="mus-key" style="padding:4px 8px;background:var(--card);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:12px;" onchange="musState.keySig=this.value">
          ${MUSICAL_DATA.KEY_SIGS.map(k=>`<option value="${k}">${k}</option>`).join('')}
        </select>
        <div style="width:1px;height:24px;background:var(--border);"></div>
        <button class="btn btn-outline" onclick="musAddMeasure()" style="font-size:11px;padding:5px 10px;">+ Compasso</button>
        <button class="btn btn-outline" onclick="musSave()" style="font-size:11px;padding:5px 10px;">💾 Guardar</button>
        <button class="btn btn-outline" onclick="musLoad()" style="font-size:11px;padding:5px 10px;">📂 Carregar</button>
      </div>

      <div style="display:flex;flex:1;overflow:hidden;">
        <div id="mus-left" style="width:220px;background:var(--surface);border-right:1px solid var(--border);display:flex;flex-direction:column;overflow-y:auto;">
          <div style="padding:10px 12px;border-bottom:1px solid var(--border);font-weight:600;font-size:13px;">🎼 Instrumentos</div>
          <div id="mus-inst-list" style="flex:1;overflow-y:auto;padding:4px;"></div>
          <div style="padding:8px 12px;border-top:1px solid var(--border);">
            <select id="mus-add-inst" style="width:100%;padding:6px 8px;background:var(--card);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:11px;margin-bottom:6px;">
              <optgroup id="mus-inst-opts"></optgroup>
            </select>
            <button class="btn btn-primary" onclick="musAddInstrument()" style="width:100%;font-size:11px;padding:6px;">+ Adicionar</button>
          </div>
          <div style="padding:8px 12px;border-top:1px solid var(--border);">
            <div style="font-weight:600;font-size:12px;margin-bottom:6px;">🎹 Notas</div>
            <div id="mus-note-palette" style="display:grid;grid-template-columns:repeat(3,1fr);gap:4px;"></div>
          </div>
        </div>

        <div id="mus-center" style="flex:1;overflow:auto;background:var(--bg);position:relative;">
          <canvas id="mus-canvas" style="display:block;"></canvas>
        </div>

        <div id="mus-mixer" style="width:200px;background:var(--surface);border-left:1px solid var(--border);overflow-y:auto;">
          <div style="padding:10px 12px;border-bottom:1px solid var(--border);font-weight:600;font-size:13px;">🎚️ Mixer</div>
          <div id="mus-mixer-channels" style="padding:4px;"></div>
        </div>
      </div>

      <div id="mus-statusbar" style="padding:6px 16px;background:var(--surface);border-top:1px solid var(--border);font-size:11px;color:var(--text-light);display:flex;gap:16px;">
        <span id="mus-pos">Compasso 1 | Batida 1.0</span>
        <span id="mus-inst-count">0 instrumentos</span>
        <span id="mus-note-count">0 notas</span>
      </div>
    </div>`;

    musState.tracks = [
      { id:1, instId:43, name:'Piano', volume:0, muted:false, solo:false, notes:[] }
    ];
    musState.selectedTrack = 0;
    musState.selectedDur = 2;
    musState.measures = 4;
    musState.clef = 'treble';
    musState.bpm = 120;
    musState.timeSig = [4,4];
    musState.keySig = 'C';
    musState.scrollX = 0;
    musState.playing = false;
    musState.playPos = 0;

    musRenderInstOpts();
    musRenderInstList();
    musRenderNotePalette();
    musRenderMixer();
    musRenderCanvas();
    musSetupCanvas();
}

let musState = {
    tracks:[], selectedTrack:0, selectedDur:2, measures:4, clef:'treble',
    bpm:120, timeSig:[4,4], keySig:'C', scrollX:0, playing:false, playPos:0,
    hoverBeat:-1, hoverNote:-1, toneStarted:false, transport:null, parts:[]
};

function musRenderInstOpts() {
    const sel = document.getElementById('mus-add-inst');
    if(!sel) return;
    const families = {};
    INST_DB.forEach(inst => {
        if(!families[inst.family]) families[inst.family] = [];
        families[inst.family].push(inst);
    });
    sel.innerHTML = Object.entries(MUSICAL_DATA.FAMILIES).map(([fk,fo]) => {
        const items = families[fk] || [];
        return `<optgroup label="${fo.icon} ${fo.name}">
          ${items.map(i=>`<option value="${i.id}">${i.name}</option>`).join('')}
        </optgroup>`;
    }).join('');
}

function musRenderInstList() {
    const el = document.getElementById('mus-inst-list');
    if(!el) return;
    el.innerHTML = musState.tracks.map((tr,i) => {
        const inst = INST_DB.find(x=>x.id===tr.instId) || INST_DB[0];
        return `<div style="padding:8px 12px;border-bottom:1px solid var(--border);cursor:pointer;background:${i===musState.selectedTrack?'rgba(99,102,241,0.15)':'transparent'};" onclick="musSelectTrack(${i})">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:13px;font-weight:600;color:${i===musState.selectedTrack?'var(--primary)':'var(--text)'};">${tr.name}</span>
            <button onclick="event.stopPropagation();musRemoveTrack(${i})" style="background:none;border:none;color:var(--danger);cursor:pointer;font-size:14px;">×</button>
          </div>
          <div style="font-size:11px;color:var(--text-light);margin-top:2px;">${inst.name} • ${tr.notes.length} notas</div>
        </div>`;
    }).join('');
}

function musRenderNotePalette() {
    const el = document.getElementById('mus-note-palette');
    if(!el) return;
    el.innerHTML = MUSICAL_DATA.DURATIONS.map((d,i) => {
        const isRest = d.rest;
        const bg = i===musState.selectedDur ? 'rgba(99,102,241,0.3)' : 'var(--card)';
        return `<button onclick="musSelectDur(${i})" style="padding:8px 4px;background:${bg};border:1px solid ${i===musState.selectedDur?'var(--primary)':'var(--border)'};border-radius:6px;color:var(--text);cursor:pointer;font-size:18px;text-align:center;line-height:1;" title="${d.id} (${d.beats} batida${d.beats!==1?'s':''})">
          <div>${d.label}</div>
          <div style="font-size:9px;color:var(--text-light);margin-top:2px;">${d.beats}</div>
        </button>`;
    }).join('');
}

function musRenderMixer() {
    const el = document.getElementById('mus-mixer-channels');
    if(!el) return;
    el.innerHTML = musState.tracks.map((tr,i) => {
        const inst = INST_DB.find(x=>x.id===tr.instId) || INST_DB[0];
        return `<div style="padding:10px 12px;border-bottom:1px solid var(--border);">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <span style="font-size:11px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100px;">${tr.name}</span>
            <div style="display:flex;gap:4px;">
              <button onclick="musToggleMute(${i})" style="width:22px;height:22px;border-radius:4px;border:1px solid ${tr.muted?'var(--danger)':'var(--border)'};background:${tr.muted?'rgba(239,68,68,0.2)':'var(--card)'};color:${tr.muted?'#ef4444':'var(--text-light)'};font-size:9px;font-weight:700;cursor:pointer;">M</button>
              <button onclick="musToggleSolo(${i})" style="width:22px;height:22px;border-radius:4px;border:1px solid ${tr.solo?'var(--primary)':'var(--border)'};background:${tr.solo?'rgba(99,102,241,0.2)':'var(--card)'};color:${tr.solo?'#a78bfa':'var(--text-light)'};font-size:9px;font-weight:700;cursor:pointer;">S</button>
            </div>
          </div>
          <input type="range" min="-24" max="6" value="${tr.volume}" style="width:100%;height:4px;" onchange="musSetVolume(${i},+this.value)" oninput="musSetVolume(${i},+this.value)">
          <div style="text-align:center;font-size:10px;color:var(--text-light);">${tr.volume>0?'+':''}${tr.volume} dB</div>
        </div>`;
    }).join('');
}

function musSelectTrack(i) { musState.selectedTrack=i; musRenderInstList(); musRenderMixer(); musRenderCanvas(); }
function musSelectDur(i) { musState.selectedDur=i; musRenderNotePalette(); }
function musAddInstrument() {
    const sel = document.getElementById('mus-add-inst');
    const instId = +sel.value;
    const inst = INST_DB.find(x=>x.id===instId);
    if(!inst) return;
    musState.tracks.push({ id:Date.now(), instId, name:inst.name, volume:0, muted:false, solo:false, notes:[] });
    musState.selectedTrack = musState.tracks.length-1;
    musRenderInstList(); musRenderMixer(); musRenderCanvas(); musUpdateStatus();
}
function musRemoveTrack(i) {
    musState.tracks.splice(i,1);
    if(musState.selectedTrack >= musState.tracks.length) musState.selectedTrack = Math.max(0,musState.tracks.length-1);
    musRenderInstList(); musRenderMixer(); musRenderCanvas(); musUpdateStatus();
}
function musSetVolume(i,v) { musState.tracks[i].volume=v; musRenderMixer(); }
function musToggleMute(i) { musState.tracks[i].muted=!musState.tracks[i].muted; musRenderMixer(); musRenderCanvas(); }
function musToggleSolo(i) { musState.tracks[i].solo=!musState.tracks[i].solo; musRenderMixer(); musRenderCanvas(); }
function musSetTimeSig(v) { const p=v.split('/').map(Number); musState.timeSig=p; musRenderCanvas(); }
function musAddMeasure() { musState.measures++; musRenderCanvas(); musUpdateStatus(); }

// ── Canvas Rendering ──
const STAFF_LINE_SPACE = 10;
const STAFF_HEIGHT = STAFF_LINE_SPACE * 4;
const STAFF_MARGIN_TOP = 80;
const STAFF_GAP = 100;
const NOTE_HEAD_RX = 6;
const NOTE_HEAD_RY = 4.5;
const BEAT_WIDTH = 50;
const MEASURE_PAD_LEFT = 60;
const STAFF_PAD_LEFT = 80;

function musGetTotalBeats() { return musState.measures * musState.timeSig[0]; }
function musBeatToX(beat) { return MEASURE_PAD_LEFT + beat * BEAT_WIDTH; }
function musPitchToY(pitch, staffIdx) {
    const base = STAFF_MARGIN_TOP + staffIdx * (STAFF_HEIGHT + STAFF_GAP);
    const stepsFromE4 = ['B','C','D','E','F','G','A'].indexOf(pitch.note%7===0?'C':(['C','D','E','F','G','A','B'][pitch.note%7]));
    let octaveShift = pitch.octave - 4;
    let linePos;
    const noteMap = {0:6, 1:5, 2:4.5, 3:4, 4:3, 5:2, 6:1.5, 7:1};
    const noteIdx = pitch.note % 12;
    const isSharp = [1,3,6,8,10].includes(noteIdx);
    const scalePos = [0,0,1,1,2,3,3,4,4,5,5,6][noteIdx];
    linePos = 5 - (scalePos + (pitch.octave-4)*3.5 - 2.5);
    return base + linePos * (STAFF_LINE_SPACE/1);
}

function musNoteInfo(noteNum) {
    const name = MUSICAL_DATA.NOTE_NAMES[noteNum % 12];
    const octave = Math.floor(noteNum / 12) - 1;
    const step = ['C','D','E','F','G','A','B'].indexOf(name.replace('#',''));
    const isSharp = name.includes('#');
    return { note:noteNum, name, octave, step, isSharp };
}

function musDrawStaff(ctx, x, y, clef) {
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    for(let i=0;i<5;i++) {
        const ly = y + i * STAFF_LINE_SPACE;
        ctx.beginPath(); ctx.moveTo(x, ly); ctx.lineTo(x + musState.measures * musState.timeSig[0] * BEAT_WIDTH + 40, ly); ctx.stroke();
    }
    ctx.fillStyle = '#a78bfa';
    ctx.font = '36px serif';
    if(clef === 'treble') { ctx.fillText('𝄞', x-2, y + STAFF_LINE_SPACE*4 - 4); }
    else { ctx.fillText('𝄢', x-2, y + STAFF_LINE_SPACE*3 + 6); }

    ctx.font = 'bold 13px Inter, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText(musState.keySig, x + 28, y + STAFF_LINE_SPACE*2 + 5);

    const tsX = x + 48;
    ctx.font = 'bold 22px Inter, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillText(musState.timeSig[0], tsX, y + STAFF_LINE_SPACE*2 - 1);
    ctx.fillText(musState.timeSig[1], tsX, y + STAFF_LINE_SPACE*4 - 1);

    for(let m=0;m<musState.measures;m++) {
        const mx = MEASURE_PAD_LEFT + m * musState.timeSig[0] * BEAT_WIDTH;
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.beginPath(); ctx.moveTo(mx, y); ctx.lineTo(mx, y+STAFF_HEIGHT); ctx.stroke();
        for(let b=0;b<musState.timeSig[0];b++) {
            const bx = mx + b * BEAT_WIDTH;
            ctx.strokeStyle = 'rgba(255,255,255,0.04)';
            ctx.setLineDash([2,4]);
            ctx.beginPath(); ctx.moveTo(bx, y); ctx.lineTo(bx, y+STAFF_HEIGHT); ctx.stroke();
            ctx.setLineDash([]);
        }
    }
    const ex = MEASURE_PAD_LEFT + musState.measures * musState.timeSig[0] * BEAT_WIDTH;
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(ex, y); ctx.lineTo(ex, y+STAFF_HEIGHT); ctx.stroke();
    ctx.lineWidth = 1;
}

function musDrawNote(ctx, x, y, dur, isRest, isSharp) {
    const d = MUSICAL_DATA.DURATIONS[dur];
    if(!d) return;
    if(d.rest) {
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '20px serif';
        ctx.textAlign = 'center';
        ctx.fillText(d.label, x, y+6);
        ctx.textAlign = 'left';
        return;
    }
    const stemUp = y > STAFF_MARGIN_TOP + STAFF_HEIGHT/2;
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.fillStyle = d.fill ? 'rgba(255,255,255,0.85)' : 'transparent';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(x, y, NOTE_HEAD_RX, NOTE_HEAD_RY, -0.2, 0, Math.PI*2);
    ctx.fill();
    ctx.stroke();

    if(d.stem) {
        const stemDir = stemUp ? -1 : 1;
        const stemLen = 28;
        const sx = stemUp ? x + NOTE_HEAD_RX - 1 : x - NOTE_HEAD_RX + 1;
        ctx.beginPath();
        ctx.moveTo(sx, y);
        ctx.lineTo(sx, y + stemDir * stemLen);
        ctx.stroke();
        if(d.flag) {
            for(let f=0;f<d.flag;f++) {
                const fy = y + stemDir * (stemLen - f*6);
                ctx.beginPath();
                ctx.moveTo(sx, fy);
                ctx.quadraticCurveTo(sx + 10, fy + stemDir*6, sx + 4, fy + stemDir*12);
                ctx.stroke();
            }
        }
    }
    if(isSharp) {
        ctx.fillStyle = 'rgba(234,179,8,0.8)';
        ctx.font = '11px sans-serif';
        ctx.fillText('#', x - NOTE_HEAD_RX - 10, y + 4);
    }
}

function musRenderCanvas() {
    const canvas = document.getElementById('mus-canvas');
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    const totalW = MEASURE_PAD_LEFT + musState.measures * musState.timeSig[0] * BEAT_WIDTH + 100;
    const totalH = STAFF_MARGIN_TOP + musState.tracks.length * (STAFF_HEIGHT + STAFF_GAP) + 60;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = totalW * dpr;
    canvas.height = totalH * dpr;
    canvas.style.width = totalW + 'px';
    canvas.style.height = totalH + 'px';
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, totalW, totalH);

    musState.tracks.forEach((tr, ti) => {
        const staffY = STAFF_MARGIN_TOP + ti * (STAFF_HEIGHT + STAFF_GAP);
        musDrawStaff(ctx, STAFF_PAD_LEFT, staffY, musState.clef);
        ctx.fillStyle = 'rgba(167,139,250,0.7)';
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.fillText(tr.name, 4, staffY + STAFF_HEIGHT/2 + 4);
        tr.notes.forEach(n => {
            const nx = musBeatToX(n.beat);
            const ny = musPitchToY(musNoteInfo(n.midi), ti);
            musDrawNote(ctx, nx, ny, n.dur, n.dur >= 6 && n.dur <= 11, musNoteInfo(n.midi).isSharp);
        });
    });

    if(musState.playing && musState.playPos >= 0) {
        const px = musBeatToX(musState.playPos);
        ctx.strokeStyle = 'rgba(99,102,241,0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px, STAFF_MARGIN_TOP - 10);
        ctx.lineTo(px, totalH - 20);
        ctx.stroke();
        ctx.lineWidth = 1;
    }
}

function musSetupCanvas() {
    const canvas = document.getElementById('mus-canvas');
    if(!canvas) return;
    canvas.addEventListener('click', e => {
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const mx = (e.clientX - rect.left);
        const my = (e.clientY - rect.top);

        let closestTrack = -1;
        let minDist = Infinity;
        musState.tracks.forEach((tr, ti) => {
            const staffY = STAFF_MARGIN_TOP + ti * (STAFF_HEIGHT + STAFF_GAP);
            const dist = Math.abs(my - (staffY + STAFF_HEIGHT/2));
            if(dist < minDist && dist < 60) { minDist = dist; closestTrack = ti; }
        });
        if(closestTrack < 0) return;

        const beat = (mx - MEASURE_PAD_LEFT) / BEAT_WIDTH;
        const totalBeats = musState.timeSig[0] * musState.measures;
        if(beat < 0 || beat >= totalBeats) return;
        const snapBeat = Math.round(beat * 4) / 4;

        const staffY = STAFF_MARGIN_TOP + closestTrack * (STAFF_HEIGHT + STAFF_GAP);
        const relY = my - staffY;
        const stepsPerUnit = 1;
    const linePos = (relY / stepsPerUnit);
    const closestLine = Math.round(linePos);

    const scaleMap = [0,1,2,3,4,5,6];
    const baseNote = scaleMap[Math.abs(closestLine) % 7] || 0;
    const octaveShift = Math.floor(closestLine / 7);
    let midi = 60 + baseNote + octaveShift * 7;
    if(closestLine > 5) midi -= 7;
    if(closestLine < 1) midi += 7;
    midi = Math.max(36, Math.min(96, midi));

        const existingIdx = musState.tracks[closestTrack].notes.findIndex(n => Math.abs(n.beat - snapBeat) < 0.1);
        if(existingIdx >= 0) {
            musState.tracks[closestTrack].notes.splice(existingIdx, 1);
        } else {
            musState.tracks[closestTrack].notes.push({ beat:snapBeat, midi, dur:musState.selectedDur });
            musState.tracks[closestTrack].notes.sort((a,b) => a.beat - b.beat);
        }
        musRenderCanvas();
        musRenderInstList();
        musUpdateStatus();
    });

    canvas.addEventListener('mousemove', e => {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const beat = (mx - MEASURE_PAD_LEFT) / BEAT_WIDTH;
        const measure = Math.floor(beat / musState.timeSig[0]) + 1;
        const inMeasure = (beat % musState.timeSig[0]) + 1;
        document.getElementById('mus-pos').textContent = `Compasso ${measure} | Batida ${inMeasure.toFixed(1)}`;
    });
}

function musUpdateStatus() {
    const totalNotes = musState.tracks.reduce((s,t) => s+t.notes.length, 0);
    document.getElementById('mus-inst-count').textContent = `${musState.tracks.length} instrumento${musState.tracks.length!==1?'s':''}`;
    document.getElementById('mus-note-count').textContent = `${totalNotes} nota${totalNotes!==1?'s':''}`;
}

// ── Audio Engine ──
async function musInitTone() {
    if(musState.toneStarted) return;
    await Tone.start();
    musState.toneStarted = true;
}

function musCreateSynth(inst) {
    if(inst.noise) {
        const noise = new Tone.NoiseSynth({
            noise: { type: 'white' },
            envelope: { attack: inst.atk, decay: inst.dec, sustain: inst.sus, release: inst.rel }
        });
        return { synth: noise, isNoise: true };
    }
    const filter = new Tone.Filter(inst.filter, 'lowpass').toDestination();
    const synth = new Tone.Synth({
        oscillator: { type: inst.wave || 'sawtooth' },
        envelope: { attack: inst.atk, decay: inst.dec, sustain: inst.sus, release: inst.rel },
        portamento: inst.gl || 0
    }).connect(filter);
    return { synth, isNoise: false, filter };
}

async function musPlay() {
    await musInitTone();
    musStop();
    Tone.Transport.bpm.value = musState.bpm;
    Tone.Transport.position = 0;
    const totalBeats = musState.timeSig[0] * musState.measures;
    const hasSolo = musState.tracks.some(t => t.solo);

    musState.tracks.forEach((tr, ti) => {
        if(tr.muted) return;
        if(hasSolo && !tr.solo) return;
        const inst = INST_DB.find(x=>x.id===tr.instId) || INST_DB[0];
        const { synth, isNoise } = musCreateSynth(inst);
        const vol = new Tone.Volume(tr.volume).toDestination();
        synth.connect(vol);

        const part = new Tone.Part((time, note) => {
            const midi = note.midi;
            const freq = Tone.Frequency(midi, 'midi');
            if(isNoise) {
                synth.triggerAttackRelease('8n', time);
            } else {
                synth.triggerAttackRelease(freq, MUSICAL_DATA.DURATIONS[note.dur].beats + 'n', time);
            }
        }, tr.notes.map(n => [n.beat, { midi:n.midi, dur:n.dur }]));

        part.start(0);
        part.stop(totalBeats);
        musState.parts.push({ part, synth, vol });
    });

    musState.playing = true;
    musState.playPos = 0;
    document.getElementById('mus-play').textContent = '⏸ Pause';
    document.getElementById('mus-play').onclick = musPause;

    const animLoop = new Tone.Loop(time => {
        const pos = Tone.Transport.getProgress() * totalBeats;
        musState.playPos = pos;
        musRenderCanvas();
        if(pos >= totalBeats) musStop();
    }, '8n');
    animLoop.start(0);
    musState.parts.push({ part: animLoop });
    Tone.Transport.start();
}

function musPause() {
    if(musState.playing) {
        Tone.Transport.pause();
        musState.playing = false;
        document.getElementById('mus-play').textContent = '▶ Play';
        document.getElementById('mus-play').onclick = musPlay;
    }
}

function musStop() {
    Tone.Transport.stop();
    Tone.Transport.position = 0;
    musState.parts.forEach(p => {
        try { p.part.dispose(); } catch(e) {}
        try { if(p.synth) p.synth.dispose(); } catch(e) {}
        try { if(p.vol) p.vol.dispose(); } catch(e) {}
    });
    musState.parts = [];
    musState.playing = false;
    musState.playPos = 0;
    document.getElementById('mus-play').textContent = '▶ Play';
    document.getElementById('mus-play').onclick = musPlay;
    musRenderCanvas();
}

// ── Save / Load ──
async function musSave() {
    const data = {
        tracks: musState.tracks,
        measures: musState.measures,
        bpm: musState.bpm,
        timeSig: musState.timeSig,
        keySig: musState.keySig,
        clef: musState.clef,
        savedAt: Date.now()
    };
    try {
        if(typeof currentUser !== 'undefined' && currentUser && currentUser.uid) {
            await db.ref(`music/${currentUser.uid}`).set(data);
            showToast('🎵 Música guardada!', 'success');
        } else {
            const json = JSON.stringify(data);
            const blob = new Blob([json], {type:'application/json'});
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'minha-musica.json';
            a.click();
            showToast('📁 Ficheiro descarregado!', 'success');
        }
    } catch(e) { showToast('Erro ao guardar: '+e.message, 'error'); }
}

async function musLoad() {
    try {
        if(typeof currentUser !== 'undefined' && currentUser && currentUser.uid) {
            const snap = await db.ref(`music/${currentUser.uid}`).once('value');
            const data = snap.val();
            if(data) { musApplyData(data); showToast('🎵 Música carregada!', 'success'); }
            else showToast('Nenhuma música guardada', 'warning');
        } else {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = e => {
                const reader = new FileReader();
                reader.onload = ev => {
                    try { musApplyData(JSON.parse(ev.target.result)); showToast('🎵 Música carregada!', 'success'); }
                    catch(err) { showToast('Ficheiro inválido', 'error'); }
                };
                reader.readAsText(e.target.files[0]);
            };
            input.click();
        }
    } catch(e) { showToast('Erro ao carregar: '+e.message, 'error'); }
}

function musApplyData(data) {
    if(data.tracks) musState.tracks = data.tracks;
    if(data.measures) musState.measures = data.measures;
    if(data.bpm) { musState.bpm = data.bpm; document.getElementById('mus-bpm').value = data.bpm; }
    if(data.timeSig) { musState.timeSig = data.timeSig; document.getElementById('mus-time').value = data.timeSig.join('/'); }
    if(data.keySig) { musState.keySig = data.keySig; document.getElementById('mus-key').value = data.keySig; }
    if(data.clef) musState.clef = data.clef;
    musState.selectedTrack = 0;
    musRenderInstList(); musRenderMixer(); musRenderCanvas(); musUpdateStatus();
}
