/*
  Lõunakarbi mäng (ET)
  - Paki karpi sobilik valik toite (ja väldi vimkasid)
  - Hinda karpi, seejärel toida tüdrukut ja jälgi näoilmet
  - Lihtsad heliefektid WebAudio abil
*/

// --- Audio --------------------------------------------------------------
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audio;
function initAudio() {
  if (!audio) audio = new AudioCtx();
  if (audio && audio.state === 'suspended' && audio.resume) {
    audio.resume();
  }
}
function beep({ freq = 440, duration = 0.1, type = 'sine', volume = 0.08 } = {}) {
  if (!audio) return;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = volume;
  osc.connect(gain).connect(audio.destination);
  osc.start();
  osc.stop(audio.currentTime + duration);
}
function chord(freqs = [261.6, 329.6, 392.0], duration = 0.2, volume = 0.05) {
  if (!audio) return;
  const merger = audio.createGain();
  merger.gain.value = volume;
  merger.connect(audio.destination);
  freqs.forEach((f) => {
    const o = audio.createOscillator();
    o.type = 'sine';
    o.frequency.value = f;
    o.connect(merger);
    o.start();
    o.stop(audio.currentTime + duration);
  });
}
function badBuzz() {
  if (!audio) return;
  const o = audio.createOscillator();
  const g = audio.createGain();
  o.type = 'square';
  o.frequency.value = 110;
  g.gain.value = 0.06;
  o.connect(g).connect(audio.destination);
  o.start();
  o.frequency.exponentialRampToValueAtTime(40, audio.currentTime + 0.25);
  o.stop(audio.currentTime + 0.3);
}

// --- Data ---------------------------------------------------------------
const CATEGORIES = [
  'puuviljad','köögiviljad','joogid','võileivad','praad','supp','snäkid','magus','kiirtoit','muu','vimkad'
];

const ITEMS = [
  // Sobivad
  { id:'õun', name:'Õun', cat:'puuviljad', tags:['puuvili','kiud'], score: 8, emoji:'🍎' },
  { id:'pirn', name:'Pirn', cat:'puuviljad', tags:['puuvili'], score: 7, emoji:'🍐' },
  { id:'banaan', name:'Banaan', cat:'puuviljad', tags:['puuvili','energia'], score: 7, emoji:'🍌' },
  { id:'maasikad', name:'Maasikad', cat:'puuviljad', tags:['puuvili'], score: 7, emoji:'🍓' },
  { id:'viinamarjad', name:'Viinamarjad', cat:'puuviljad', tags:['puuvili'], score: 6, emoji:'🍇' },
  { id:'porgandipulgad', name:'Porgandipulgad', cat:'köögiviljad', tags:['köögivili','krõmps'], score: 8, emoji:'🥕' },
  { id:'kurgiviilud', name:'Kurgiviilud', cat:'köögiviljad', tags:['köögivili','vesi'], score: 6, emoji:'🥒' },
  { id:'paprika', name:'Paprikaviilud', cat:'köögiviljad', tags:['köögivili'], score: 6, emoji:'🫑' },
  { id:'täistera-võileib', name:'Täistera võileib', cat:'võileivad', tags:['süsivesik','valk'], score: 9, emoji:'🥪' },
  { id:'kana-riis', name:'Kana ja riis', cat:'praad', tags:['valk','süsivesik'], score: 9, emoji:'🍗' },
  { id:'lõhesalat', name:'Lõhesalat', cat:'praad', tags:['valk','omega'], score: 9, emoji:'🥗' },
  { id:'köögiviljasupp', name:'Köögiviljasupp', cat:'supp', tags:['köögivili','soe'], score: 8, emoji:'🥣' },
  { id:'tomatisupp', name:'Tomatisupp', cat:'supp', tags:['köögivili'], score: 7, emoji:'🍅' },
  { id:'jogurt-naturell', name:'Jogurt (naturell)', cat:'snäkid', tags:['valk','kaltsium'], score: 7, emoji:'🥛' },
  { id:'pähklid', name:'Pähklisegu', cat:'snäkid', tags:['rasv','valk'], score: 6, emoji:'🥜' },
  { id:'vesi', name:'Vesi', cat:'joogid', tags:['jook','vesi'], score: 10, emoji:'💧' },
  { id:'piim', name:'Piim', cat:'joogid', tags:['jook','valk'], score: 7, emoji:'🥛' },
  { id:'taimne-joog', name:'Taimne jook', cat:'joogid', tags:['jook'], score: 6, emoji:'🧃' },
  { id:'munawrap', name:'Muna-wrap', cat:'võileivad', tags:['valk'], score: 8, emoji:'🌯' },
  { id:'hummus', name:'Hummus', cat:'snäkid', tags:['valk'], score: 7, emoji:'🧆' },

  // Piiripealsed / mõõdukalt ok
  { id:'mahla-joog', name:'Mahla jook', cat:'joogid', tags:['jook','suhkur'], score: 3, emoji:'🧃' },
  { id:'magus-müsli-batoon', name:'Magus müslibatoon', cat:'snäkid', tags:['suhkur'], score: 2, emoji:'🍫' },
  { id:'valge-leib-võileib', name:'Valge leiva võileib', cat:'võileivad', tags:['süsivesik'], score: 3, emoji:'🍞' },

  // Vähe sobivad
  { id:'limonaad', name:'Limonaad', cat:'joogid', tags:['jook','suhkur'], score: -4, emoji:'🥤' },
  { id:'energjook', name:'Energiajoog', cat:'joogid', tags:['jook','kofeiin'], score: -8, emoji:'⚡' },
  { id:'friikad', name:'Friikartulid', cat:'kiirtoit', tags:['rasv','sool'], score: -3, emoji:'🍟' },
  { id:'burger', name:'Burger', cat:'kiirtoit', tags:['rasv','sool'], score: -4, emoji:'🍔' },
  { id:'pitsa', name:'Pitsa', cat:'kiirtoit', tags:['rasv','sool'], score: -2, emoji:'🍕' },
  { id:'kringel', name:'Kringel', cat:'magus', tags:['suhkur'], score: -3, emoji:'🥨' },
  { id:'kommikott', name:'Kommikott', cat:'magus', tags:['suhkur'], score: -8, emoji:'🍬' },
  { id:'šokolaad', name:'Šokolaaditahvel', cat:'magus', tags:['suhkur'], score: -5, emoji:'🍫' },
  { id:'vahukoor', name:'Vahukoor', cat:'magus', tags:['rasv','suhkur'], score: -4, emoji:'🥛' },

  // Vimkad – mitte söödavad või naljakaotused
  { id:'kriit', name:'Kriit', cat:'vimkad', tags:['mitte-söödav'], score: -20, emoji:'🧱', unsafeness: 3 },
  { id:'kruvi', name:'Kruvi', cat:'vimkad', tags:['mitte-söödav','metall'], score: -25, emoji:'🔩', unsafeness: 4 },
  { id:'kassitoit', name:'Kassitoit', cat:'vimkad', tags:['loomatoit'], score: -12, emoji:'🐱', unsafeness: 2 },
  { id:'seep', name:'Seep', cat:'vimkad', tags:['mitte-söödav'], score: -15, emoji:'🧼', unsafeness: 3 },
  { id:'liim', name:'Liimipulk', cat:'vimkad', tags:['mitte-söödav'], score: -15, emoji:'📎', unsafeness: 3 },

  // Veel valikut
  { id:'riisi-kook', name:'Riisigaletid', cat:'snäkid', tags:['kerge'], score: 4, emoji:'🍘' },
  { id:'juustukuubikud', name:'Juustukuubikud', cat:'snäkid', tags:['valk','rasv'], score: 5, emoji:'🧀' },
  { id:'munad', name:'Keedumunad', cat:'snäkid', tags:['valk'], score: 7, emoji:'🥚' },
  { id:'marjad', name:'Segumarjad', cat:'puuviljad', tags:['antioks'], score: 8, emoji:'🫐' },
  { id:'läätsesupp', name:'Läätsesupp', cat:'supp', tags:['valk','kiud'], score: 8, emoji:'🥣' },
  { id:'kalapulgad', name:'Kalapulgad', cat:'praad', tags:['valk','rasv'], score: 2, emoji:'🐟' },
  { id:'pelmeenid', name:'Pelmeenid', cat:'praad', tags:['süsivesik','rasv'], score: 1, emoji:'🥟' },
  { id:'puuvilja-ampsud', name:'Puuviljaampsud', cat:'snäkid', tags:['puuvili'], score: 6, emoji:'🍡' },
  { id:'täistera-krõpsud', name:'Täisterakrõpsud', cat:'snäkid', tags:['kiud'], score: 3, emoji:'🧇' },
  { id:'kurk-vesi', name:'Kurk vees', cat:'joogid', tags:['jook','vesi'], score: 8, emoji:'🥒💧' },
];

// Karbi piirangud
const MAX_ITEMS = 8; // maht

// --- State --------------------------------------------------------------
let state = {
  box: [], // item ids in order
  filterCat: 'kõik',
  search: ''
};

// --- DOM refs -----------------------------------------------------------
const el = (id) => document.getElementById(id);
const itemsEl = el('items');
const dropEl = el('dropzone');
const categoriesEl = el('categories');
const capacityHintEl = el('capacityHint');
const scorePanelEl = el('scorePanel');
const evaluateBtn = el('evaluateBtn');
const resetBtn = el('resetBtn');
const feedPanel = el('feedPanel');
const currentItemEl = el('currentItem');
const feedBtn = el('feedBtn');
const backToPackBtn = el('backToPackBtn');
const faceEl = el('face');
const moodTextEl = el('moodText');
const moodBarEl = el('moodBar');
const mouthNeutralPath = document.getElementById('mouthNeutral');
const mouthHappyPath = document.getElementById('mouthHappy');
const mouthSadPath = document.getElementById('mouthSad');
const vomitEl = document.getElementById('vomit');

function showMouth(state){
  if (!mouthNeutralPath || !mouthHappyPath || !mouthSadPath) return;
  mouthNeutralPath.classList.remove('active');
  mouthHappyPath.classList.remove('active');
  mouthSadPath.classList.remove('active');
  if (state==='happy') mouthHappyPath.classList.add('active');
  else if (state==='sad') mouthSadPath.classList.add('active');
  else mouthNeutralPath.classList.add('active');
}

function puke(){
  if (!vomitEl) return;
  vomitEl.classList.remove('show');
  // Restart animation by forcing reflow
  void vomitEl.offsetWidth;
  vomitEl.classList.add('show');
}

// --- Utils --------------------------------------------------------------
const byId = (id) => ITEMS.find((i) => i.id === id);
const fmt = (n) => (n>0?`+${n}`:`${n}`);

// --- Render -------------------------------------------------------------
function renderCategories() {
  categoriesEl.innerHTML = '';
  const cats = ['kõik', ...CATEGORIES];
  cats.forEach((c) => {
    const chip = document.createElement('button');
    chip.className = 'chip'+(state.filterCat===c?' active':'');
    chip.textContent = c.charAt(0).toUpperCase()+c.slice(1);
    chip.setAttribute('role','tab');
    chip.addEventListener('click', () => {
      state.filterCat = c;
      renderItems();
    });
    categoriesEl.appendChild(chip);
  });
}

function renderItems() {
  const q = (el('search').value || '').toLowerCase();
  const cat = state.filterCat;
  const list = ITEMS.filter((it) => {
    const matchesCat = cat === 'kõik' || it.cat === cat;
    const matchesQ = !q || it.name.toLowerCase().includes(q) || it.tags.some(t=>t.includes(q));
    return matchesCat && matchesQ;
  });
  itemsEl.innerHTML = '';
  list.forEach((it) => {
    const card = document.createElement('div');
    card.className = 'item';
    card.draggable = true;
    card.dataset.itemId = it.id;
    card.innerHTML = `
      <div class="emoji" style="font-size:24px">${it.emoji || '🍽️'}</div>
      <h4>${it.name}</h4>
      <div class="meta">${it.cat} • hinne ${fmt(it.score)}</div>
      <div>${it.tags.map(t=>`<span class='tag'>${t}</span>`).join('')}</div>
      <button class="secondary">Lisa</button>
    `;
    card.querySelector('button').addEventListener('click', () => addToBox(it.id));
    card.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', it.id);
    });
    itemsEl.appendChild(card);
  });
}

function renderBox() {
  capacityHintEl.textContent = `(${state.box.length}/${MAX_ITEMS})`;
  dropEl.innerHTML = '';
  state.box.forEach((id, idx) => {
    const it = byId(id);
    const elBox = document.createElement('div');
    elBox.className = 'box-item';
    elBox.innerHTML = `
      <div style="font-size:22px">${it.emoji}</div>
      <div><strong>${it.name}</strong></div>
      <div class="meta">${it.cat} • ${fmt(it.score)}</div>
      <button class="remove" title="Eemalda" aria-label="Eemalda">✕</button>
    `;
    elBox.querySelector('.remove').addEventListener('click', () => removeFromBox(idx));
    dropEl.appendChild(elBox);
  });
}

function setMood(score) {
  // Score from -100..100 -> 0..100
  const clamp = (v,min,max)=>Math.max(min,Math.min(max,v));
  const p = clamp((score+100)/2, 0, 100);
  moodBarEl.style.width = `${p}%`;
  if (score > 20) {
    showMouth('happy');
    moodTextEl.textContent = 'rõõmus';
  } else if (score < -10) {
    showMouth('sad');
    moodTextEl.textContent = 'kurb';
  } else {
    showMouth('neutral');
    moodTextEl.textContent = 'neutraalne';
  }
}

// --- Box ops ------------------------------------------------------------
function addToBox(id) {
  initAudio();
  if (state.box.length >= MAX_ITEMS) {
    badBuzz();
    toast('Karp on täis!');
    return;
  }
  state.box.push(id);
  renderBox();
  beep({ freq: 660, duration: 0.06 });
}

function removeFromBox(index) {
  initAudio();
  state.box.splice(index, 1);
  renderBox();
  beep({ freq: 300, duration: 0.05 });
}

// --- Dropzone -----------------------------------------------------------
dropEl.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropEl.classList.add('dragover');
});
dropEl.addEventListener('dragleave', () => dropEl.classList.remove('dragover'));
dropEl.addEventListener('drop', (e) => {
  e.preventDefault();
  dropEl.classList.remove('dragover');
  const id = e.dataTransfer.getData('text/plain');
  if (id) addToBox(id);
});

// --- Evaluate -----------------------------------------------------------
function evaluateBox() {
  if (state.box.length === 0) {
    toast('Lisa vähemalt üks asi karpi!');
    badBuzz();
    return;
  }
  const items = state.box.map(byId);
  let total = 0;
  let waterBonus = 0;
  let variety = new Set(items.map(i=>i.cat)).size;
  let unsafety = 0;

  for (const it of items) {
    total += it.score;
    if (it.id === 'vesi' || it.tags.includes('vesi')) waterBonus += 2;
    if (it.unsafeness) unsafety += it.unsafeness * 5;
  }

  // mitmekesisuse boonus
  total += Math.min(variety * 1.5, 8);
  total += waterBonus;

  // tasakaal: kui magusat/kiirtoitu palju, miinus
  const sugary = items.filter(i=>i.cat==='magus').length;
  const junk = items.filter(i=>i.cat==='kiirtoit').length;
  total -= Math.max(0, (sugary-1))*3;
  total -= Math.max(0, (junk-0))*2;

  // turvalisus maha
  total -= unsafety;

  const capped = Math.max(-100, Math.min(100, Math.round(total)));

  // UI
  scorePanelEl.classList.remove('hidden');
  scorePanelEl.innerHTML = `
    <div class="row"><span>Esemeid</span><strong>${items.length}</strong></div>
    <div class="row"><span>Mitmekesisus</span><strong>${variety}</strong></div>
    <div class="row"><span>Vesi/joogid boonus</span><strong>${fmt(waterBonus)}</strong></div>
    <div class="row"><span>Turvalisus miinus</span><strong>${fmt(-unsafety)}</strong></div>
    <div class="row total"><span>Kogu sobilikkus</span><strong>${capped}</strong></div>
  `;

  setMood(capped);
  if (capped >= 12) chord([523.3,659.3,783.99], 0.18);
  else if (capped <= -5) badBuzz();
  else beep({freq: 440, duration: 0.08});

  // Start feeding phase
  startFeeding();
}

function startFeeding(){
  feedPanel.classList.remove('hidden');
  currentFeedIndex = 0;
  updateFeedUI();
}

let currentFeedIndex = 0;
function updateFeedUI(){
  const left = state.box.length - currentFeedIndex;
  el('feedQueueCount').textContent = String(left);
  currentItemEl.textContent = left > 0 ? `${byId(state.box[currentFeedIndex]).emoji} ${byId(state.box[currentFeedIndex]).name}` : 'Kõik söödud!';
  feedBtn.disabled = left<=0;
}

function feedNext(){
  if (currentFeedIndex >= state.box.length) return;
  const item = byId(state.box[currentFeedIndex]);
  // Affect mood
  const delta = Math.max(-20, Math.min(20, item.score - (item.unsafeness? item.unsafeness*10 : 0)));
  const shouldPuke = (delta <= -6) || (item.unsafeness && item.unsafeness >= 2) || item.cat === 'vimkad';
  initAudio();
  if (delta >= 6) {
    chord([659.3,783.99,987.77], 0.12, 0.04);
  } else if (shouldPuke) {
    badBuzz();
    puke();
  } else {
    beep({ freq: delta >= 0 ? 560 : 260, duration: 0.07 });
  }

  const current = parseFloat(moodBarEl.style.width) || 40;
  const newVal = Math.max(0, Math.min(100, current + delta));
  moodBarEl.style.width = `${newVal}%`;

  // Põhi-ilme sõltuvalt üldisest tasemest
  let base = 'neutral';
  if (newVal > 60) base = 'happy';
  else if (newVal < 30) base = 'sad';
  showMouth(base);
  moodTextEl.textContent = base === 'happy' ? 'rõõmus' : base === 'sad' ? 'kurb' : 'neutraalne';

  // Kiirreageering väikesele positiivsele/negatiivsele muutusele
  if (base === 'neutral'){
    if (delta > 0) {
      showMouth('happy');
      setTimeout(()=>showMouth('neutral'), 600);
    } else if (delta < 0) {
      showMouth('sad');
      setTimeout(()=>showMouth('neutral'), 600);
    }
  }

  // Oksendamisel jäta kurb ilme hetkeks
  if (shouldPuke) {
    showMouth('sad');
    setTimeout(()=>{ if (moodBarEl.style.width && parseFloat(moodBarEl.style.width) >= 30 && parseFloat(moodBarEl.style.width) <= 60) showMouth('neutral'); }, 800);
  }

  currentFeedIndex++;
  updateFeedUI();
}

// --- Toast --------------------------------------------------------------
let toastDiv;
function toast(msg){
  if (!toastDiv){
    toastDiv = document.createElement('div');
    toastDiv.style.position='fixed';
    toastDiv.style.bottom='16px';
    toastDiv.style.left='50%';
    toastDiv.style.transform='translateX(-50%)';
    toastDiv.style.background='#111827';
    toastDiv.style.color='white';
    toastDiv.style.padding='10px 14px';
    toastDiv.style.borderRadius='10px';
    toastDiv.style.boxShadow='0 6px 20px rgba(0,0,0,.2)';
    document.body.appendChild(toastDiv);
  }
  toastDiv.textContent = msg;
  toastDiv.style.opacity='1';
  setTimeout(()=>toastDiv.style.opacity='0', 1600);
}

// --- Events -------------------------------------------------------------
resetBtn.addEventListener('click', () => {
  state.box = [];
  scorePanelEl.classList.add('hidden');
  feedPanel.classList.add('hidden');
  renderBox();
  setMood(0);
});

el('search').addEventListener('input', renderItems);
evaluateBtn.addEventListener('click', evaluateBox);
feedBtn.addEventListener('click', feedNext);
backToPackBtn.addEventListener('click', ()=>{
  feedPanel.classList.add('hidden');
});

// --- Init ---------------------------------------------------------------
renderCategories();
renderItems();
renderBox();
setMood(0);
showMouth('neutral');
