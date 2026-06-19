/* Dagboek — rustige habit- & check-in tool. Alles lokaal (localStorage), geen backend. */

const STORAGE_KEY = 'dagboek_v1';

/* Kernactie van level 1. Blijft altijd staan, verdwijnt nooit. */
const CORE = { emoji: '💊', label: 'Pillen gepakt', sub: 'Gekoppeld aan je pillenmoment' };

/* Vaste dagelijkse dagboekvraag + snelle tik-labels (data-basis). */
const QUESTION = 'Wat zat je vandaag het meest tegen?';
const LABELS = ['Gevoel', 'Gedachte', 'Probleem'];

const DEFAULT_STATE = {
  log: {},               // 'JJJJ-MM-DD' -> { done, answer, label, extras }
  queue: [],             // geparkeerde kandidaat-gewoontes: [{id, text}]
  habits: [],            // meespelen: vrij toegevoegd, optioneel, geen pillar
  pillars: [],           // vastgezette extra pillars (na de poort) — vaste musts
  braindump: [],         // [{id, text, side: 'zorg'|'invloed'|null, date}]
  settings: { gateCheckins: 14 }, // onverliesbare drempel voor nieuwe habit
  promptSnoozedAt: null,
  seeded: false
};

let state = load();
let activeTab = 'vandaag';
let calCursor = startOfMonth(new Date());

/* ---------------- opslag ---------------- */
function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seed(structuredClone(DEFAULT_STATE));
    const s = Object.assign(structuredClone(DEFAULT_STATE), JSON.parse(raw));
    // migratie: oude promptAfterDays -> gateCheckins
    if (s.settings && s.settings.promptAfterDays && !s.settings.gateCheckins) {
      s.settings.gateCheckins = s.settings.promptAfterDays;
    }
    return s;
  } catch (e) {
    return seed(structuredClone(DEFAULT_STATE));
  }
}
function seed(s) {
  s.queue = [{ id: uid(), text: 'Dagboek invullen (de volledige vragenlijst)' }];
  s.seeded = true;
  return s;
}
function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function uid() { return Math.random().toString(36).slice(2, 9); }

/* ---------------- datum-helpers (lokaal) ---------------- */
function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function parseKey(k) { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); }
function todayKey() { return dateKey(new Date()); }
function addDays(k, n) { const d = parseKey(k); d.setDate(d.getDate() + n); return dateKey(d); }
function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }

/* ---------------- log ---------------- */
function entry(k) {
  if (!state.log[k]) state.log[k] = { done: false, answer: '', label: '', extras: {} };
  return state.log[k];
}
function isDone(k) { return !!(state.log[k] && state.log[k].done); }
function isDoneToday() { return isDone(todayKey()); }
function setDone(k, done) { entry(k).done = done; save(); }
function toggleExtra(id) { const e = entry(todayKey()); e.extras[id] = !e.extras[id]; save(); }

/* ---------------- veerkracht (geen fragiele reeks) ---------------- */
function totalCheckins() { return Object.values(state.log).filter(e => e.done).length; }
function countLastN(n) {
  let c = 0;
  for (let i = 0; i < n; i++) if (isDone(addDays(todayKey(), -i))) c++;
  return c;
}
function last7() {
  const arr = [];
  for (let i = 6; i >= 0; i--) arr.push(isDone(addDays(todayKey(), -i)));
  return arr;
}

/* ---------------- acties ---------------- */
function addToQueue(text) {
  text = text.trim();
  if (!text) return;
  state.queue.push({ id: uid(), text });
  save(); render();
}
function removeFromQueue(id) {
  state.queue = state.queue.filter(q => q.id !== id);
  save(); render();
}
function addMeespeler(id) { // vrij meespelen — geen poort
  const item = state.queue.find(q => q.id === id);
  if (!item) return;
  state.habits.push({ id: item.id, emoji: '🌱', label: item.text });
  state.queue = state.queue.filter(q => q.id !== id);
  save(); render();
}
function lockAsPillar(id) { // vastzetten als vaste pillar — alleen na de poort
  if (!gateOpen()) return;
  const h = state.habits.find(x => x.id === id);
  if (!h) return;
  state.pillars.push({ id: h.id, emoji: '📌', label: h.label });
  state.habits = state.habits.filter(x => x.id !== id);
  state.promptSnoozedAt = null;
  save(); render();
}
function removeHabit(id) {
  state.habits = state.habits.filter(h => h.id !== id);
  save(); render();
}
function removePillar(id) {
  state.pillars = state.pillars.filter(p => p.id !== id);
  save(); render();
}
function snoozeOffer() { state.promptSnoozedAt = totalCheckins(); save(); render(); }

/* Harde poort: pas een nieuwe habit toevoegen na de onverliesbare drempel. */
function gateOpen() { return totalCheckins() >= state.settings.gateCheckins; }
function shouldOffer() {
  return gateOpen() && state.habits.length > 0 && state.promptSnoozedAt !== totalCheckins();
}

/* ---------------- render ---------------- */
const view = document.getElementById('view');

function render() {
  document.querySelectorAll('.tab').forEach(t =>
    t.classList.toggle('active', t.dataset.tab === activeTab));
  if (activeTab === 'vandaag') renderVandaag();
  else if (activeTab === 'voortgang') renderVoortgang();
  else if (activeTab === 'wachtrij') renderWachtrij();
  else renderBrein();
}

function greet() {
  const h = new Date().getHours();
  if (h < 6) return 'Goedenacht';
  if (h < 12) return 'Goedemorgen';
  if (h < 18) return 'Goedemiddag';
  return 'Goedenavond';
}

function renderVandaag() {
  const done = isDoneToday();
  const total = totalCheckins();
  const e = entry(todayKey());

  let html = `<p class="greeting">${greet()}</p><h1 class="page-title">Vandaag</h1>`;

  // veerkracht — onverliesbaar, geen straf
  if (total > 0) {
    html += `<div class="veerkracht">
      <div><span class="vk-num">${total}</span> <span class="vk-label">keer ingecheckt 🌱</span></div>
      <div class="dots">${last7().map(on => `<span class="dot ${on ? 'on' : ''}"></span>`).join('')}</div>
      <p class="vk-sub">laatste 30 dagen: ${countLastN(30)} keer · elke dag telt, één missen is geen drama</p>
    </div>`;
  } else {
    html += `<p class="streak-gentle">Begin rustig. Inchecken is de winst 🌱</p>`;
  }

  // gisteren alsnog invullen (na drinken/vergeten — niet bestraffen)
  if (total > 0 && !isDone(addDays(todayKey(), -1))) {
    html += `<button class="backfill" data-backfill>Gisteren niet afgevinkt — alsnog doen</button>`;
  }

  // vrijblijvend aanbod (poort open)
  if (shouldOffer()) {
    html += `<div class="card offer">
      <p class="offer-title">Je hebt ${total} keer ingecheckt 🎉</p>
      <p class="offer-text">Genoeg basis. Wil je een meespeler vastzetten als vaste pillar? Nooit verplicht.</p>
      ${state.habits.map(h => `<div class="offer-item"><span>${esc(h.label)}</span>
        <button class="mini-btn" data-lock="${h.id}">Vastzetten</button></div>`).join('')}
      <button class="offer-dismiss" data-snooze>Niet nu</button>
    </div>`;
  }

  // kernactie (level 1)
  html += `<div class="card">
    <p class="habit-name">${CORE.emoji} ${CORE.label}</p>
    <p class="habit-sub">${CORE.sub}</p>`;
  html += done
    ? `<div class="done-state">Vandaag ingecheckt ✓<br>
        <button class="undo-link" data-undo>ongedaan maken</button></div>`
    : `<button class="done-btn" data-done>Gedaan</button>`;
  html += `</div>`;

  // dagelijkse dagboekvraag + label (de databron) — vrijblijvend, leeg mag
  html += `<div class="card qcard">
    <p class="habit-name" style="font-size:17px">📝 ${QUESTION}</p>
    <textarea class="note-input" rows="2" data-answer
      placeholder="In één regel (mag leeg)">${esc(e.answer || '')}</textarea>
    <div class="chips">
      ${LABELS.map(l => `<button class="chip ${e.label === l ? 'on' : ''}" data-label="${l}">${l}</button>`).join('')}
    </div>
    <p class="note-hint">Loggen zelf is de winst. Het label maakt je data later doorzoekbaar.</p>
  </div>`;

  // extra vaste pillars (na de poort vastgezet) — musts, prominent
  if (state.pillars.length) {
    html += `<p class="section-title">Vaste pillars · elke dag</p><div class="card">`;
    html += state.pillars.map(p => {
      const on = !!e.extras[p.id];
      return `<div class="extra-item ${on ? 'checked' : ''}" data-extra="${p.id}">
        <span class="extra-check">${on ? '✓' : ''}</span>
        <span class="extra-label">${p.emoji} ${esc(p.label)}</span></div>`;
    }).join('');
    html += `</div>`;
  }

  // meespelen — vrij toegevoegd, optioneel, breekt niets
  if (state.habits.length) {
    html += `<p class="section-title">Meespelen · vrij, breekt niets</p><div class="card">`;
    html += state.habits.map(h => {
      const on = !!e.extras[h.id];
      return `<div class="extra-item ${on ? 'checked' : ''}" data-extra="${h.id}">
        <span class="extra-check">${on ? '✓' : ''}</span>
        <span class="extra-label">${h.emoji} ${esc(h.label)}</span></div>`;
    }).join('');
    html += `</div>`;
  }

  view.innerHTML = html;

  bind('[data-done]', el => el.onclick = () => { setDone(todayKey(), true); render(); });
  bind('[data-undo]', el => el.onclick = () => { setDone(todayKey(), false); render(); });
  bind('[data-backfill]', el => el.onclick = () => { setDone(addDays(todayKey(), -1), true); render(); });
  const ans = view.querySelector('[data-answer]');
  if (ans) ans.oninput = (ev) => { entry(todayKey()).answer = ev.target.value; save(); }; // geen re-render
  view.querySelectorAll('[data-label]').forEach(el =>
    el.onclick = () => { const e2 = entry(todayKey()); e2.label = (e2.label === el.dataset.label ? '' : el.dataset.label); save(); render(); });
  view.querySelectorAll('[data-extra]').forEach(el =>
    el.onclick = () => { toggleExtra(el.dataset.extra); render(); });
  view.querySelectorAll('[data-lock]').forEach(el =>
    el.onclick = () => lockAsPillar(el.dataset.lock));
  bind('[data-snooze]', el => el.onclick = snoozeOffer);
}

function renderVoortgang() {
  let html = `<h1 class="page-title">Voortgang</h1>
    <div class="stats">
      <div class="stat"><div class="stat-num">${totalCheckins()}</div><div class="stat-label">keer ingecheckt</div></div>
      <div class="stat"><div class="stat-num">${countLastN(30)}</div><div class="stat-label">laatste 30 dagen</div></div>
    </div>`;

  const y = calCursor.getFullYear(), m = calCursor.getMonth();
  const months = ['januari', 'februari', 'maart', 'april', 'mei', 'juni',
    'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
  const isThisMonth = (y === new Date().getFullYear() && m === new Date().getMonth());

  html += `<div class="card">
    <div class="cal-head">
      <button class="cal-nav" data-cal="-1">‹</button>
      <span class="cal-month">${months[m]} ${y}</span>
      <button class="cal-nav" data-cal="1" ${isThisMonth ? 'disabled' : ''}>›</button>
    </div>
    <div class="cal-grid">`;
  ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'].forEach(d => html += `<div class="cal-dow">${d}</div>`);

  const lead = (new Date(y, m, 1).getDay() + 6) % 7;
  for (let i = 0; i < lead; i++) html += `<div class="cal-cell empty"></div>`;

  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const tk = todayKey();
  for (let day = 1; day <= daysInMonth; day++) {
    const k = dateKey(new Date(y, m, day));
    const cls = ['cal-cell'];
    if (isDone(k)) cls.push('done');
    if (k === tk) cls.push('today');
    if (k > tk) cls.push('future'); else cls.push('clickable');
    html += `<div class="${cls.join(' ')}" data-day="${k}">${day}</div>`;
  }
  html += `</div></div>
    <p class="note-hint" style="text-align:center;margin-top:14px">
      Tik een dag aan om 'm alsnog af te vinken. Gemiste dagen zijn leeg — geen rood, geen oordeel.</p>`;

  view.innerHTML = html;
  view.querySelectorAll('[data-cal]').forEach(b => b.onclick = () => {
    calCursor = new Date(y, m + Number(b.dataset.cal), 1); render();
  });
  view.querySelectorAll('.cal-cell.clickable').forEach(c => c.onclick = () => {
    setDone(c.dataset.day, !isDone(c.dataset.day)); render();
  });
}

function renderWachtrij() {
  const open = gateOpen();
  const total = totalCheckins();
  const need = Math.max(0, state.settings.gateCheckins - total);

  let html = `<h1 class="page-title">Wachtrij</h1>
    <p class="lead">Parkeer hier ideeën. Je kunt ze altijd vrij laten <strong>meespelen</strong>. Iets <strong>vastzetten als pillar</strong> (een vaste must) mag pas na genoeg check-ins.</p>`;

  html += open
    ? `<p class="gate-note open">Poort open 🌱 — je mag nu een meespeler vastzetten als vaste pillar.</p>`
    : `<p class="gate-note">Meespelen mag altijd. Een meespeler <strong>vastzetten als pillar</strong> kan na nog <strong>${need}</strong> keer inchecken (${total}/${state.settings.gateCheckins}).</p>`;

  html += `<div class="add-row">
      <input class="add-input" data-add placeholder="Nieuw idee parkeren…" />
      <button class="add-btn" data-addbtn>+</button>
    </div>`;

  if (state.queue.length) {
    html += state.queue.map(q => `<div class="queue-item"><span>${esc(q.text)}</span>
      <span style="display:flex;gap:6px;align-items:center">
        <button class="mini-btn" data-meedoe="${q.id}">Doe mee</button>
        <button class="icon-btn" data-del="${q.id}">✕</button>
      </span></div>`).join('');
  } else {
    html += `<p class="empty">Je wachtrij is leeg.</p>`;
  }

  if (state.habits.length) {
    html += `<p class="section-title">Meespelen · vrij</p>`;
    html += state.habits.map(h => `<div class="active-item"><span>${h.emoji} ${esc(h.label)}</span>
      <span style="display:flex;gap:6px;align-items:center">
        <button class="mini-btn" data-lock="${h.id}" ${open ? '' : 'disabled'}>Vastzetten</button>
        <button class="icon-btn" data-rm="${h.id}">✕</button>
      </span></div>`).join('');
  }

  if (state.pillars.length) {
    html += `<p class="section-title">Vaste pillars · elke dag</p>`;
    html += state.pillars.map(p => `<div class="active-item"><span>${p.emoji} ${esc(p.label)}</span>
      <button class="icon-btn" data-rmp="${p.id}">✕</button></div>`).join('');
  }

  html += `<p class="section-title">Instelling</p>
    <div class="card"><div class="setting-row">
      <label>Check-ins nodig om als pillar vast te zetten</label>
      <input class="num-input" type="number" min="1" max="365" value="${state.settings.gateCheckins}" data-gate />
    </div></div>`;

  view.innerHTML = html;

  const input = view.querySelector('[data-add]');
  const submit = () => addToQueue(input.value);
  view.querySelector('[data-addbtn]').onclick = submit;
  input.onkeydown = (e) => { if (e.key === 'Enter') submit(); };
  view.querySelectorAll('[data-meedoe]').forEach(b => b.onclick = () => addMeespeler(b.dataset.meedoe));
  view.querySelectorAll('[data-lock]').forEach(b => b.onclick = () => lockAsPillar(b.dataset.lock));
  view.querySelectorAll('[data-del]').forEach(b => b.onclick = () => removeFromQueue(b.dataset.del));
  view.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => removeHabit(b.dataset.rm));
  view.querySelectorAll('[data-rmp]').forEach(b => b.onclick = () => removePillar(b.dataset.rmp));
  view.querySelector('[data-gate]').onchange = (e) => {
    state.settings.gateCheckins = Math.max(1, Math.min(365, Number(e.target.value) || 14)); save();
  };
}

function renderBrein() {
  const items = state.braindump;
  const unsorted = items.filter(i => !i.side);
  const zorg = items.filter(i => i.side === 'zorg');
  const invloed = items.filter(i => i.side === 'invloed');

  let html = `<h1 class="page-title">Brain dump</h1>
    <p class="lead">Schrijf op wat er door je hoofd maalt. Sorteer daarna elk ding:
    kun je er zelf iets aan doen (<strong>invloed</strong>), of moet je het loslaten
    (<strong>zorg</strong>)? Bijna alles is zorg — en dat is oké.</p>
    <div class="add-row">
      <input class="add-input" data-bd placeholder="Wat maalt er door je hoofd?" />
      <button class="add-btn" data-bdadd>+</button>
    </div>`;

  if (unsorted.length) {
    html += `<p class="section-title">Nog sorteren</p>`;
    html += unsorted.map(i => `<div class="bd-card">
      <span class="bd-text">${esc(i.text)}</span>
      <div class="bd-actions">
        <button class="chip" data-side="zorg" data-id="${i.id}">🌀 Zorg</button>
        <button class="chip" data-side="invloed" data-id="${i.id}">🎯 Invloed</button>
        <button class="icon-btn" data-bddel="${i.id}">✕</button>
      </div></div>`).join('');
  }

  html += `<p class="section-title">🌀 Zorg — geen grip, mag je loslaten</p>`;
  html += zorg.length
    ? zorg.map(i => `<div class="queue-item"><span>${esc(i.text)}</span>
        <button class="icon-btn" data-bddel="${i.id}">✕</button></div>`).join('')
    : `<p class="empty">Nog niets losgelaten.</p>`;

  html += `<p class="section-title">🎯 Invloed — hier kun jij wél iets</p>
    <p class="note-hint" style="margin:-6px 2px 12px">Hier past eigenlijk maar één ding:
    jij. Je gedachten, hoe je je dag indeelt, en vooral hóé je reageert.</p>`;
  html += invloed.length
    ? invloed.map(i => `<div class="active-item"><span>${esc(i.text)}</span>
        <span style="display:flex;gap:6px;align-items:center">
          <button class="mini-btn" data-bdq="${i.id}">→ Wachtrij</button>
          <button class="icon-btn" data-bddel="${i.id}">✕</button>
        </span></div>`).join('')
    : `<p class="empty">Nog niets in jouw invloed gezet.</p>`;

  view.innerHTML = html;

  const input = view.querySelector('[data-bd]');
  const submit = () => {
    const t = input.value.trim();
    if (!t) return;
    state.braindump.unshift({ id: uid(), text: t, side: null, date: todayKey() });
    save(); render();
  };
  view.querySelector('[data-bdadd]').onclick = submit;
  input.onkeydown = (e) => { if (e.key === 'Enter') submit(); };
  view.querySelectorAll('[data-side]').forEach(b => b.onclick = () => {
    const it = state.braindump.find(x => x.id === b.dataset.id);
    if (it) { it.side = b.dataset.side; save(); render(); }
  });
  view.querySelectorAll('[data-bddel]').forEach(b => b.onclick = () => {
    state.braindump = state.braindump.filter(x => x.id !== b.dataset.bddel); save(); render();
  });
  view.querySelectorAll('[data-bdq]').forEach(b => b.onclick = () => {
    const it = state.braindump.find(x => x.id === b.dataset.bdq);
    if (!it) return;
    state.queue.push({ id: uid(), text: it.text });
    state.braindump = state.braindump.filter(x => x.id !== it.id);
    save(); render();
  });
}

function bind(sel, fn) { const el = view.querySelector(sel); if (el) fn(el); }
function esc(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ---------------- tabs & start ---------------- */
document.querySelectorAll('.tab').forEach(tab =>
  tab.onclick = () => { activeTab = tab.dataset.tab; render(); });

render();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
