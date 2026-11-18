/* DGMS Mock Test PWA. Plain JavaScript, no build step. All learner data stays in this browser (localStorage). */
(() => {
  'use strict';

  // ---------- Storage ----------
  const KEY = 'dgms.v1';
  const store = {
    load() {
      try { return JSON.parse(localStorage.getItem(KEY)) || { profiles: {}, active: null }; }
      catch (e) { return { profiles: {}, active: null }; }
    },
    save() {
      try { localStorage.setItem(KEY, JSON.stringify(db)); }
      catch (e) { toast('Could not save progress on this device.'); }
    }
  };
  let db = store.load();
  const me = () => db.active && db.profiles[db.active];

  // ---------- Data ----------
  let BANK = null, AREAS = [], EXAM = null, BYID = {}, PAPERS = [];
  const DRILL_SIZE = 15;

  // ---------- Helpers ----------
  const $ = s => document.querySelector(s);
  const app = $('#app');
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const L = 'ABCD';
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const fmtTime = s => { s = Math.max(0, Math.round(s)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0'); };
  const fmtDur = s => { s = Math.round(s); const h = Math.floor(s / 3600), m = Math.round(s % 3600 / 60); return h ? `${h} h ${m} min` : `${m} min`; };
  const fmtDate = t => new Date(t).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
  const r2 = n => Math.round(n * 100) / 100;
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  let timerHandle = null;

  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toast._h); toast._h = setTimeout(() => (t.hidden = true), 2600);
  }
  function modal(html, wire) {
    const m = $('#modal'); $('#modalBody').innerHTML = html; m.hidden = false;
    const close = () => { m.hidden = true; $('#modalBody').innerHTML = ''; };
    m.onclick = e => { if (e.target === m) close(); };
    wire && wire(close);
    const f = $('#modalBody').querySelector('button, input'); f && f.focus();
    return close;
  }
  function setTop({ back = false, title = 'DGMS Mock Test', right = '' } = {}) {
    $('#backBtn').hidden = !back;
    $('#brand span').textContent = title;
    $('#topRight').innerHTML = right;
  }
  $('#backBtn').onclick = () => go('home');

  // ---------- Router ----------
  function go(view, arg) {
    clearInterval(timerHandle); timerHandle = null;
    document.body.classList.remove('testing');
    const old = document.querySelector('.bottombar'); old && old.remove();
    if (!me() && view !== 'setup') view = 'setup';
    ({ setup: viewSetup, home: viewHome, topics: viewTopics, test: viewTest, result: viewResult, review: viewReview, history: viewHistory, profile: viewProfile, mockIntro: viewMockIntro, papers: viewPapers }[view] || viewHome)(arg);
    window.scrollTo(0, 0);
    app.focus({ preventScroll: true });
  }

  // ---------- Setup / profile ----------
  function certLabel(p) { return `${p.cls} Class, ${p.mineral}`; }

  function viewSetup(editing) {
    const p = editing ? me() : { name: '', cls: 'First', mineral: 'Coal' };
    const others = Object.values(db.profiles).filter(x => !editing || x.id !== db.active);
    setTop({ back: !!editing, title: editing ? 'Your profile' : 'Welcome' });
    app.innerHTML = `
      <div class="card">
        <h1>${editing ? 'Edit your profile' : 'Set up your practice'}</h1>
        <p class="muted">Questions come from the OSH&amp;WC Code 2020 and the OSH&amp;WC (Central) Rules 2026. Your scores are saved on this device.</p>
        <label class="lbl" for="nm">Your name</label>
        <input type="text" id="nm" maxlength="40" value="${esc(p.name)}" placeholder="e.g. Girish" autocomplete="name">
        <span class="lbl">Which certificate are you preparing for?</span>
        <div class="choice-grid" data-k="cls">
          <button class="choice" aria-pressed="${p.cls === 'First'}" data-v="First">First Class</button>
          <button class="choice" aria-pressed="${p.cls === 'Second'}" data-v="Second">Second Class</button>
        </div>
        <div class="choice-grid" data-k="mineral">
          <button class="choice" aria-pressed="${p.mineral === 'Coal'}" data-v="Coal">Coal</button>
          <button class="choice" aria-pressed="${p.mineral === 'Metal'}" data-v="Metal">Metal</button>
        </div>
        <button class="btn primary block" id="save">${editing ? 'Save' : 'Start practising'}</button>
      </div>
      ${!editing && others.length ? `<div class="card"><h3>Or continue as</h3>${others.map(o => `<button class="topic" data-pid="${o.id}"><span><b>${esc(o.name)}</b><br><span class="meta">${esc(certLabel(o))}</span></span><span>&#8250;</span></button>`).join('')}</div>` : ''}`;
    const sel = { cls: p.cls, mineral: p.mineral };
    app.querySelectorAll('.choice-grid').forEach(g => g.addEventListener('click', e => {
      const b = e.target.closest('.choice'); if (!b) return;
      sel[g.dataset.k] = b.dataset.v;
      g.querySelectorAll('.choice').forEach(x => x.setAttribute('aria-pressed', x === b));
    }));
    app.querySelectorAll('[data-pid]').forEach(b => b.onclick = () => { db.active = b.dataset.pid; store.save(); go('home'); });
    $('#save').onclick = () => {
      const name = $('#nm').value.trim();
      if (!name) { toast('Please enter your name.'); $('#nm').focus(); return; }
      if (editing) Object.assign(me(), { name, ...sel });
      else { const id = uid(); db.profiles[id] = { id, name, ...sel, created: Date.now(), history: [], stats: {}, current: null }; db.active = id; }
      store.save(); go('home');
    };
  }

  function viewProfile() {
    const p = me();
    const others = Object.values(db.profiles).filter(x => x.id !== p.id);
    setTop({ back: true, title: 'Profile' });
    app.innerHTML = `
      <div class="card">
        <h2>${esc(p.name)}</h2>
        <p class="muted">${esc(certLabel(p))} · ${p.history.length} attempts saved on this device</p>
        <div class="row">
          <button class="btn" id="edit">Edit name or certificate</button>
          <button class="btn" id="add">Add another learner</button>
        </div>
      </div>
      ${others.length ? `<div class="card"><h3>Switch learner</h3>${others.map(o => `<button class="topic" data-pid="${o.id}"><span><b>${esc(o.name)}</b><br><span class="meta">${esc(certLabel(o))}</span></span><span>&#8250;</span></button>`).join('')}</div>` : ''}
      <div class="card">
        <h3>Appearance</h3>
        <div class="row">
          ${['auto', 'light', 'dark'].map(t => `<button class="btn" data-theme="${t}" aria-pressed="${(db.theme || 'auto') === t}">${t[0].toUpperCase() + t.slice(1)}</button>`).join('')}
        </div>
      </div>
      <div class="card">
        <h3>Reset</h3>
        <p class="muted small">Deletes this learner's scores and history from this device. This cannot be undone.</p>
        <button class="btn danger" id="reset">Delete my progress</button>
      </div>
      <p class="muted small center">Question bank version ${esc(BANK.version)} · ${BANK.questions.length} questions</p>`;
    $('#edit').onclick = () => viewSetup(true);
    $('#add').onclick = () => { db.active = null; store.save(); go('setup'); };
    app.querySelectorAll('[data-pid]').forEach(b => b.onclick = () => { db.active = b.dataset.pid; store.save(); go('home'); });
    app.querySelectorAll('[data-theme]').forEach(b => b.onclick = () => { db.theme = b.dataset.theme; store.save(); applyTheme(); viewProfile(); });
    $('#reset').onclick = () => modal(`<h2>Delete progress?</h2><p>All of ${esc(p.name)}'s attempts and topic scores on this device will be removed.</p>
      <div class="row"><button class="btn" id="no">Cancel</button><button class="btn dark" id="yes">Delete</button></div>`, close => {
      $('#no').onclick = close;
      $('#yes').onclick = () => { delete db.profiles[p.id]; db.active = null; store.save(); close(); go('setup'); };
    });
  }
  function applyTheme() {
    const t = db.theme || 'auto';
    if (t === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', t);
  }

  // ---------- Stats ----------
  function areaStats(p) {
    const s = AREAS.map(() => ({ seen: 0, right: 0, uniq: 0, total: 0 }));
    BANK.questions.forEach(q => s[q.a].total++);
    for (const [id, v] of Object.entries(p.stats)) {
      const q = BYID[id]; if (!q) continue;
      s[q.a].seen += v.seen; s[q.a].right += v.right; s[q.a].uniq++;
    }
    return s;
  }
  // Accuracy is only shown once a topic has enough answers to mean something.
  const MIN_ACC = 5;
  // One topic row: the bar shows how much of the topic has been practised (coverage); accuracy is text beside it.
  function coverageLine(st) {
    const cov = st.total ? st.uniq / st.total : 0;
    const acc = st.seen >= MIN_ACC ? st.right / st.seen : null;
    const accTxt = !st.seen ? 'Not practised yet'
      : acc === null ? `${st.uniq} of ${st.total} practised · score after ${MIN_ACC} answers`
      : `${st.uniq} of ${st.total} practised · <span class="acc ${accClass(acc)}">${Math.round(acc * 100)}% correct</span>`;
    return `<div class="bar cov"><i style="width:${st.uniq ? Math.max(2, Math.round(cov * 100)) : 0}%"></i></div><div class="meta">${accTxt}</div>`;
  }
  function weakAreas(p, n = 3) {
    return areaStats(p).map((s, i) => ({ i, acc: s.seen ? s.right / s.seen : null, seen: s.seen }))
      .filter(x => x.seen >= MIN_ACC).sort((a, b) => a.acc - b.acc).slice(0, n);
  }
  const accClass = a => a >= .75 ? '' : a >= .5 ? 'mid' : 'low';

  // ---------- Home ----------
  function viewHome() {
    const p = me();
    setTop({ right: `<button class="icon-btn" id="prof" aria-label="Profile" title="Profile">&#9786;</button>` });
    $('#prof').onclick = () => go('profile');
    const mocks = p.history.filter(h => h.mode === 'mock');
    const best = mocks.length ? Math.max(...mocks.map(h => h.net)) : null;
    const seen = Object.keys(p.stats).length;
    const weak = weakAreas(p, 1)[0];
    const cur = p.current;
    app.innerHTML = `
      <div class="card hero">
        <h1>Hello, ${esc(p.name)}</h1>
        <p class="muted">${esc(certLabel(p))} Manager's Certificate · ${BANK.questions.length} questions in the bank</p>
        <div class="stat-grid">
          <div class="stat"><b>${mocks.length}</b><span class="small">mocks taken</span></div>
          <div class="stat"><b>${best === null ? '–' : r2(best)}</b><span class="small">best score</span></div>
          <div class="stat"><b>${Math.round(seen / BANK.questions.length * 100)}%</b><span class="small">bank seen</span></div>
        </div>
      </div>
      ${cur ? `<div class="card" style="border-color:var(--accent)">
        <h3>Unfinished ${cur.mode === 'mock' ? esc(mockName(cur)) : 'drill'}</h3>
        <p class="muted small">${cur.answers.filter(a => a !== null).length} of ${cur.qs.length} answered${cur.mode === 'mock' ? ` · ${fmtTime(remaining(cur))} left` : ''}</p>
        <div class="row"><button class="btn primary" id="resume">Resume</button><button class="btn" id="discard">Discard</button></div>
      </div>` : ''}
      <button class="action" id="mock"><span class="ic">&#9201;</span><span><span class="t">Mock papers</span><span class="d">${PAPERS.length} full papers · ${PAPERS.filter((_, i) => paperStats(p, i).runs).length} of ${PAPERS.length} done · ${EXAM.questions} questions, ${EXAM.minutes / 60} hours each</span></span></button>
      <button class="action" id="drill"><span class="ic">&#9776;</span><span><span class="t">Topic drill</span><span class="d">${DRILL_SIZE} questions on one topic, answer shown after each question</span></span></button>
      <button class="action" id="mistakes"><span class="ic">&#8635;</span><span><span class="t">Practise my mistakes</span><span class="d">${countMistakes(p)} questions you last answered wrong</span></span></button>
      ${weak ? `<button class="action" id="weak"><span class="ic">&#9888;</span><span><span class="t">Drill my weakest topic</span><span class="d">${esc(AREAS[weak.i])} · ${Math.round(weak.acc * 100)}% correct so far</span></span></button>` : ''}
      <button class="action" id="hist"><span class="ic">&#128200;</span><span><span class="t">History and progress</span><span class="d">Past scores and accuracy by topic</span></span></button>
      <p class="muted small center">Every answer cites the Code section or Rule number so you can check it in the source.</p>`;
    $('#mock').onclick = () => go('papers');
    $('#drill').onclick = () => go('topics');
    $('#mistakes').onclick = () => { const n = countMistakes(p); if (!n) return toast('No mistakes saved yet. Take a drill or mock first.'); cur ? confirmReplace(startMistakes) : startMistakes(); };
    $('#hist').onclick = () => go('history');
    if (weak) $('#weak').onclick = () => cur ? confirmReplace(() => startDrill(weak.i)) : startDrill(weak.i);
    if (cur) { $('#resume').onclick = () => go('test'); $('#discard').onclick = () => { p.current = null; store.save(); go('home'); }; }
  }
  function confirmReplace(fn) {
    modal(`<h2>Start a new test?</h2><p>Your unfinished test will be discarded.</p><div class="row"><button class="btn" id="no">Keep it</button><button class="btn primary" id="yes">Start new</button></div>`, close => {
      $('#no').onclick = close; $('#yes').onclick = () => { close(); fn(); };
    });
  }
  const mockName = h => h.paper != null ? `Mock ${h.paper + 1}` : 'Mixed mock';
  function paperStats(p, i) {
    const runs = p.history.filter(h => h.mode === 'mock' && h.paper === i);
    return { list: runs, runs: runs.length, best: runs.length ? Math.max(...runs.map(h => h.net)) : null, last: runs[0] || null };
  }
  const countMistakes = p => Object.values(p.stats).filter(v => v.last === 0).length;


  // ---------- Mock papers: fixed numbered papers, no question repeated across papers ----------
  function viewPapers() {
    const p = me(), cur = p.current;
    setTop({ back: true, title: 'Mock papers' });
    const st = PAPERS.map((_, i) => paperStats(p, i));
    const done = st.filter(s => s.runs).length, passed = st.filter(s => s.best !== null && s.best >= EXAM.pass).length;
    app.innerHTML = `
      <div class="card">
        <h2>${PAPERS.length} full mock papers</h2>
        <p class="muted small">Each paper has ${EXAM.questions} different questions, so together they cover ${PAPERS.length * EXAM.questions} questions of the bank with no repeats. Every paper has a similar spread of topics.</p>
        <div class="bar"><i style="width:${Math.round(done / PAPERS.length * 100)}%"></i></div>
        <p class="small" style="margin:.4rem 0 0">${done} of ${PAPERS.length} attempted · ${passed} passed</p>
      </div>
      ${PAPERS.map((_, i) => {
        const s = st[i], inProg = cur && cur.mode === 'mock' && cur.paper === i;
        const tag = inProg ? '<span class="tag warn">In progress</span>'
          : s.best === null ? '<span class="tag">Not started</span>'
          : s.best >= EXAM.pass ? '<span class="tag ok">Passed</span>' : '<span class="tag bad">Not yet passed</span>';
        return `<button class="topic" data-p="${i}"><span style="flex:1;min-width:0"><b>Mock ${i + 1}</b>
          <div class="meta">${s.runs ? `Best ${r2(s.best)} / ${EXAM.questions} · ${s.runs} attempt${s.runs > 1 ? 's' : ''}` : `${EXAM.questions} questions · ${EXAM.minutes / 60} hours`}</div></span>${tag}</button>`;
      }).join('')}
      <button class="topic" data-p="r"><span style="flex:1;min-width:0"><b>Mixed mock</b>
        <div class="meta">${EXAM.questions} questions picked at random, favouring ones you haven't seen</div></span><span class="tag">Random</span></button>`;
    app.querySelectorAll('[data-p]').forEach(b => b.onclick = () => {
      const k = b.dataset.p === 'r' ? null : +b.dataset.p;
      if (cur && cur.mode === 'mock' && (cur.paper ?? null) === k) return go('test');
      go('mockIntro', k);
    });
  }

  // ---------- Mock instructions (nothing starts until the learner taps Start) ----------
  function viewMockIntro(paper = null) {
    const p = me(), cur = p.current;
    const name = mockName({ paper }), s = paper === null ? null : paperStats(p, paper);
    setTop({ back: true, title: name });
    const done = s && s.runs;
    app.innerHTML = `
      ${done ? `<div class="card">
        <h1>${esc(name)}: your results</h1>
        <div class="stat-grid">
          <div class="stat"><b>${r2(s.last.net)}</b><span class="small">last score</span></div>
          <div class="stat"><b>${r2(s.best)}</b><span class="small">best score</span></div>
          <div class="stat"><b>${s.runs}</b><span class="small">attempt${s.runs > 1 ? 's' : ''}</span></div>
        </div>
        <p class="small" style="margin:.75rem 0">${s.best >= EXAM.pass ? '<span class="tag ok">Passed</span> Your best score clears the pass mark.' : `<span class="tag bad">Not yet passed</span> You need ${r2(EXAM.pass - s.best)} more marks than your best to reach ${EXAM.pass}.`}</p>
        <table class="hist"><thead><tr><th>Attempt</th><th class="num">Right / wrong / skipped</th><th class="num">Score</th></tr></thead><tbody>
          ${s.list.map((h, i) => `<tr data-id="${h.id}" style="cursor:pointer"><td>#${s.runs - i} · ${fmtDate(h.date)}</td><td class="num">${h.right} / ${h.wrong} / ${h.skipped}</td>
            <td class="num">${r2(h.net)} ${h.passed ? '<span class="tag ok">Pass</span>' : '<span class="tag bad">Fail</span>'}</td></tr>`).join('')}
        </tbody></table>
        <p class="muted small" style="margin:.5rem 0 0">Tap an attempt to see its full result.</p>
        <div class="row" style="margin-top:.75rem"><button class="btn dark" id="revLast">Review last answers</button><button class="btn primary" id="retest">Retest</button></div>
      </div>` : ''}
      <${done ? 'details class="card"' : 'div class="card"'}>
        ${done ? `<summary style="cursor:pointer;font-weight:700">Paper pattern and rules</summary><div style="margin-top:.75rem">` : `<h1>${esc(name)}: before you start</h1>`}
        <p class="muted">This mock follows the pattern of the DGMS Manager's Certificate exam (${esc(certLabel(p))}).</p>
        <div class="stat-grid">
          <div class="stat"><b>${EXAM.questions}</b><span class="small">questions</span></div>
          <div class="stat"><b>${EXAM.minutes / 60} hours</b><span class="small">time limit</span></div>
          <div class="stat"><b>${EXAM.pass}</b><span class="small">pass mark</span></div>
        </div>
        <h3 style="margin-top:1rem">Rules</h3>
        <ul style="margin:0;padding-left:1.2rem">
          <li>Each question has one correct answer and carries ${EXAM.mark} mark.</li>
          <li><b>${EXAM.negative} marks are deducted for every wrong answer</b> (1 mark for every 4 wrong). Skipped questions score zero.</li>
          <li>You need <b>${EXAM.pass} net marks</b> out of ${EXAM.questions} to pass.</li>
          <li>The timer starts when you tap <b>Start test</b>. The test is submitted automatically when time runs out.</li>
          <li>Answers are shown only after you submit.</li>
          <li>Use <b>Mark</b> to flag a question for review, and the grid button at the top to jump to any question.</li>
          <li><b>Save and exit</b> (in the question grid) pauses the timer so you can resume later.</li>
          ${done ? '<li>A retest uses the same questions in the same order, with the options shuffled.</li>' : ''}
        </ul>
      ${done ? '</div></details>' : '</div>'}
      ${cur ? `<p class="small" style="color:var(--warn)">Starting this paper will discard your unfinished ${cur.mode === 'mock' ? esc(mockName(cur)) : 'drill'}.</p>` : ''}
      ${done ? '' : `<div class="row">
        <button class="btn" id="cancel">Not now</button>
        <button class="btn primary" id="begin">Start test</button>
      </div>`}`;
    const begin = () => cur ? confirmReplace(() => startMock(paper)) : startMock(paper);
    if (!done) { $('#cancel').onclick = () => go('papers'); $('#begin').onclick = begin; }
    else {
      $('#retest').onclick = begin;
      $('#revLast').onclick = () => go('review', s.last.id);
      app.querySelectorAll('tr[data-id]').forEach(tr => tr.onclick = () => go('result', tr.dataset.id));
    }
  }

  // ---------- Topic picker ----------
  function viewTopics() {
    const p = me(); const st = areaStats(p);
    setTop({ back: true, title: 'Topic drill' });
    app.innerHTML = `<h2>Choose a topic</h2><p class="muted">${DRILL_SIZE} questions, with the answer and rule shown after each one. The bar shows how much of the topic you have practised so far, counting drills and mocks.</p>
      ${AREAS.map((a, i) => {
        return `<button class="topic" data-a="${i}"><span style="flex:1;min-width:0"><b>${esc(a)}</b>${coverageLine(st[i])}</span></button>`;
      }).join('')}`;
    app.querySelectorAll('[data-a]').forEach(b => b.onclick = () => { const i = +b.dataset.a; me().current ? confirmReplace(() => startDrill(i)) : startDrill(i); });
  }

  // ---------- Building tests ----------
  // Weighted sample without replacement: questions seen less often come first; mines topics and the learner's mineral get more weight.
  function weightFor(q, p) {
    let w = 1;
    if (AREAS[q.a].startsWith('Mines')) w *= 1.6;
    if (q.t === 's') w *= 0.5; // 'which Section/Rule deals with...' questions: keep them to a share of each paper
    const txt = (q.q + ' ' + q.o.join(' ')).toLowerCase();
    const other = p.mineral === 'Coal' ? /metal/ : /coal/;
    const mine = p.mineral === 'Coal' ? /coal/ : /metal/;
    if (mine.test(txt)) w *= 1.4; else if (other.test(txt)) w *= 0.7;
    const s = p.stats[q.id];
    if (s) { w /= (1 + s.seen); if (s.last === 0) w *= 1.5; }
    return w;
  }
  function sample(pool, n, p) {
    return pool.map(q => ({ q, k: Math.pow(Math.random(), 1 / weightFor(q, p)) }))
      .sort((a, b) => b.k - a.k).slice(0, n).map(x => x.q);
  }
  function makeAttempt(mode, qs, extra = {}) {
    return {
      id: uid(), mode, started: Date.now(), elapsed: 0,
      qs: qs.map(q => q.id), order: qs.map(() => shuffle([0, 1, 2, 3])),
      answers: qs.map(() => null), marked: qs.map(() => false), idx: 0, ...extra
    };
  }
  function startMock(paper = null) {
    const p = me();
    if (paper !== null && PAPERS[paper]) {
      const qs = PAPERS[paper].map(id => BYID[id]).filter(Boolean);
      p.current = makeAttempt('mock', qs, { limit: EXAM.minutes * 60, paper });
      store.save(); return go('test');
    }
    // Keep every topic represented: take a proportional share from each area, then fill the rest by weight.
    const byArea = AREAS.map(() => []); BANK.questions.forEach(q => byArea[q.a].push(q));
    const total = BANK.questions.length; let picked = [];
    byArea.forEach(list => { const share = Math.floor(list.length / total * EXAM.questions * 0.6); picked.push(...sample(list, share, p)); });
    const used = new Set(picked.map(q => q.id));
    picked.push(...sample(BANK.questions.filter(q => !used.has(q.id)), EXAM.questions - picked.length, p));
    p.current = makeAttempt('mock', shuffle(picked), { limit: EXAM.minutes * 60 });
    store.save(); go('test');
  }
  function startDrill(i) {
    const p = me();
    const qs = sample(BANK.questions.filter(q => q.a === i), DRILL_SIZE, p);
    p.current = makeAttempt('drill', qs, { area: i }); store.save(); go('test');
  }
  function startMistakes() {
    const p = me();
    const ids = Object.entries(p.stats).filter(([, v]) => v.last === 0).map(([id]) => id).filter(id => BYID[id]);
    const qs = shuffle(ids.map(id => BYID[id])).slice(0, 25);
    p.current = makeAttempt('drill', qs, { area: -1 }); store.save(); go('test');
  }
  const remaining = c => c.limit - c.elapsed;

  // ---------- Test screen ----------
  function viewTest() {
    const p = me(), c = p.current;
    if (!c) return go('home');
    const isMock = c.mode === 'mock';
    document.body.classList.add('testing');
    let tickStart = Date.now();
    const saveElapsed = () => { const now = Date.now(); c.elapsed += (now - tickStart) / 1000; tickStart = now; };

    setTop({
      back: false,
      title: isMock ? 'Mock test' : (c.area >= 0 ? AREAS[c.area] : 'My mistakes'),
      right: isMock ? `<span class="timer" id="timer"></span><button class="icon-btn" id="pal" aria-label="All questions" title="All questions">&#9638;</button>`
                    : `<button class="icon-btn" id="quit" aria-label="Stop drill" title="Stop">&#10005;</button>`
    });

    const bar = document.createElement('div'); bar.className = 'bottombar';
    document.body.appendChild(bar);

    function render() {
      const q = BYID[c.qs[c.idx]], ord = c.order[c.idx], ans = c.answers[c.idx];
      const revealed = !isMock && ans !== null;
      app.innerHTML = `
        <div class="card">
          <div class="qhead"><span>Question ${c.idx + 1} of ${c.qs.length}</span>
            <span>${isMock ? esc(AREAS[q.a]) : `<span class="tag">${esc(q.s)} · ${esc(q.r)}</span>`}</span></div>
          <div class="qtext">${esc(q.q)}</div>
          <div role="radiogroup" aria-label="Options">
          ${ord.map((oi, pos) => {
            let cls = '';
            if (revealed) { if (oi === q.k) cls = 'right'; else if (oi === ans) cls = 'wrong'; }
            else if (ans === oi) cls = 'sel';
            return `<button class="opt ${cls}" role="radio" aria-checked="${ans === oi}" data-oi="${oi}" ${revealed ? 'disabled' : ''}><span class="l">${L[pos]}</span><span>${esc(q.o[oi])}</span></button>`;
          }).join('')}
          </div>
          ${revealed ? `<div class="explain"><b>${ans === q.k ? 'Correct.' : `Answer: ${L[ord.indexOf(q.k)]}.`}</b> ${esc(q.e)}<div class="small muted" style="margin-top:.35rem">${q.s === 'Code' ? 'OSH&amp;WC Code 2020' : 'OSH&amp;WC (Central) Rules 2026'}, ${esc(q.r)}</div></div>` : ''}
        </div>
        ${isMock ? `<p class="muted small center">${c.answers.filter(a => a !== null).length} answered · ${c.marked.filter(Boolean).length} marked for review</p>` : ''}`;
      app.querySelectorAll('.opt').forEach(b => b.onclick = () => choose(+b.dataset.oi));

      const last = c.idx === c.qs.length - 1;
      if (isMock) {
        bar.innerHTML = `<div class="inner">
          <button class="btn" id="prev" ${c.idx === 0 ? 'disabled' : ''}>&#8592; Prev</button>
          <button class="btn" id="mark">${c.marked[c.idx] ? 'Unmark' : 'Mark'}</button>
          ${ans !== null ? '<button class="btn" id="clear">Clear</button>' : ''}
          ${last ? '<button class="btn primary" id="submit">Submit</button>' : '<button class="btn dark" id="next">Next &#8594;</button>'}</div>`;
        $('#prev').onclick = () => move(-1);
        $('#mark').onclick = () => { c.marked[c.idx] = !c.marked[c.idx]; persist(); render(); };
        const cl = $('#clear'); cl && (cl.onclick = () => { c.answers[c.idx] = null; persist(); render(); });
        last ? ($('#submit').onclick = confirmSubmit) : ($('#next').onclick = () => move(1));
      } else {
        bar.innerHTML = `<div class="inner">${revealed
          ? (last ? '<button class="btn primary" id="fin">See result</button>' : '<button class="btn dark" id="next">Next question &#8594;</button>')
          : '<button class="btn" id="skip">Skip</button>'}</div>`;
        const n = $('#next'); n && (n.onclick = () => move(1));
        const f = $('#fin'); f && (f.onclick = finish);
        const s = $('#skip'); s && (s.onclick = () => last ? finish() : move(1));
      }
    }
    function choose(oi) {
      c.answers[c.idx] = oi; persist(); render();
      if (!isMock) { const ex = app.querySelector('.explain'); ex && ex.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
    }
    function move(d) { c.idx = Math.min(c.qs.length - 1, Math.max(0, c.idx + d)); persist(); render(); window.scrollTo(0, 0); }
    function persist() { saveElapsed(); store.save(); }

    function openPalette() {
      modal(`<h2>All questions</h2>
        <div class="legend"><span><i style="background:var(--ok)"></i>Answered</span><span><i style="background:var(--accent)"></i>Marked</span><span><i></i>Not answered</span></div>
        <div class="palette">${c.qs.map((_, i) => `<button class="pal ${c.marked[i] ? 'rev' : c.answers[i] !== null ? 'ans' : ''} ${i === c.idx ? 'cur' : ''}" data-i="${i}">${i + 1}</button>`).join('')}</div>
        <div class="row" style="margin-top:1rem"><button class="btn" id="cls">Close</button><button class="btn" id="exit">Save and exit</button><button class="btn primary" id="sub">Submit test</button></div>
        <p class="muted small" style="margin-top:.5rem">Save and exit pauses the timer. You can resume from the home screen.</p>`, close => {
        $('#exit').onclick = () => { close(); persist(); go('home'); };
        $('#modalBody').querySelectorAll('.pal').forEach(b => b.onclick = () => { c.idx = +b.dataset.i; close(); persist(); render(); window.scrollTo(0, 0); });
        $('#cls').onclick = close; $('#sub').onclick = () => { close(); confirmSubmit(); };
      });
    }
    function confirmSubmit() {
      const un = c.answers.filter(a => a === null).length, mk = c.marked.filter(Boolean).length;
      modal(`<h2>Submit the test?</h2><p>${un ? `<b>${un}</b> questions are not answered. ` : 'All questions answered. '}${mk ? `<b>${mk}</b> are marked for review. ` : ''}You have ${fmtTime(remaining(c))} left.</p>
        <p class="muted small">Unanswered questions score zero. Each wrong answer costs ${EXAM.negative} marks.</p>
        <div class="row"><button class="btn" id="no">Keep going</button><button class="btn primary" id="yes">Submit</button></div>`, close => {
        $('#no').onclick = close; $('#yes').onclick = () => { close(); finish(); };
      });
    }
    function finish() {
      saveElapsed(); clearInterval(timerHandle);
      const res = grade(p, c); p.current = null; p.history.unshift(res);
      if (p.history.length > 200) p.history.length = 200;
      store.save(); go('result', res.id);
    }

    if (isMock) {
      $('#pal').onclick = openPalette;
      const tEl = $('#timer');
      const tick = () => {
        const now = Date.now(); c.elapsed += (now - tickStart) / 1000; tickStart = now;
        const left = remaining(c);
        tEl.textContent = fmtTime(left);
        tEl.classList.toggle('low', left <= 300);
        if (left <= 0) { clearInterval(timerHandle); store.save(); toast('Time is up. Your test has been submitted.'); finish(); }
      };
      tick(); timerHandle = setInterval(() => { tick(); if (Math.floor(c.elapsed) % 15 === 0) store.save(); }, 1000);
    } else {
      $('#quit').onclick = () => {
        const done = c.answers.filter(a => a !== null).length;
        modal(`<h2>Stop this drill?</h2><p>${done ? `You answered ${done}. You can see the result for those now, or keep going.` : 'Nothing answered yet.'}</p>
          <div class="row"><button class="btn" id="no">Keep going</button>${done ? '<button class="btn primary" id="res">See result</button>' : ''}<button class="btn" id="home">Leave</button></div>`, close => {
          $('#no').onclick = close;
          const rb = $('#res'); rb && (rb.onclick = () => { close(); finish(); });
          $('#home').onclick = () => { close(); saveElapsed(); store.save(); go('home'); };
        });
      };
    }
    render();
  }

  // ---------- Grading ----------
  function grade(p, c) {
    let right = 0, wrong = 0, skipped = 0;
    const topic = {};
    const items = c.qs.map((id, i) => {
      const q = BYID[id], a = c.answers[i];
      const t = topic[q.a] || (topic[q.a] = { n: 0, right: 0 }); t.n++;
      let r = null;
      if (a === null) skipped++;
      else if (a === q.k) { right++; t.right++; r = 1; } else { wrong++; r = 0; }
      if (r !== null) {
        const s = p.stats[id] || (p.stats[id] = { seen: 0, right: 0, last: null });
        s.seen++; s.right += r; s.last = r;
      }
      return { id, a, o: c.order[i] };
    });
    const net = r2(right * EXAM.mark - wrong * EXAM.negative);
    return {
      id: c.id, mode: c.mode, area: c.area, paper: c.paper ?? null, date: Date.now(), time: Math.round(c.elapsed),
      total: c.qs.length, right, wrong, skipped, net,
      passed: c.mode === 'mock' ? net >= EXAM.pass : null, topic, items
    };
  }

  // ---------- Result ----------
  function viewResult(id) {
    const p = me(); const r = p.history.find(h => h.id === id) || p.history[0];
    if (!r) return go('home');
    const isMock = r.mode === 'mock';
    setTop({ back: true, title: 'Result' });
    const topics = Object.entries(r.topic).map(([a, t]) => ({ a: +a, ...t, acc: t.n ? t.right / t.n : 0 })).sort((x, y) => x.acc - y.acc);
    const attempted = r.right + r.wrong;
    app.innerHTML = `
      <div class="card center">
        <div class="muted small">${isMock ? esc(mockName(r)) : (r.area >= 0 ? esc(AREAS[r.area]) : 'My mistakes')} · ${fmtDate(r.date)}</div>
        <div class="score-big" style="margin-top:.5rem">${r2(r.net)}<span class="muted" style="font-size:1.1rem"> / ${r.total}</span></div>
        <div class="muted small">net marks after negative marking</div>
        ${isMock ? `<div class="verdict ${r.passed ? 'pass' : 'fail'}">${r.passed ? 'PASS' : 'NOT YET'} · pass mark ${EXAM.pass}</div>` : ''}
        <div class="stat-grid" style="margin-top:1rem">
          <div class="stat"><b style="color:var(--ok)">${r.right}</b><span class="small">right</span></div>
          <div class="stat"><b style="color:var(--bad)">${r.wrong}</b><span class="small">wrong (−${r2(r.wrong * EXAM.negative)})</span></div>
          <div class="stat"><b>${r.skipped}</b><span class="small">skipped</span></div>
        </div>
        <p class="muted small" style="margin-top:.75rem">Accuracy on attempted questions: ${attempted ? Math.round(r.right / attempted * 100) : 0}% · Time taken: ${fmtDur(r.time)}</p>
        ${isMock && !r.passed ? `<p class="small">You need ${r2(EXAM.pass - r.net)} more marks to pass.</p>` : ''}
      </div>
      ${topics.length > 1 ? `<div class="card"><h3>By topic</h3>${topics.map(t => `
        <div style="margin-bottom:.6rem"><div class="qhead" style="margin:0"><span style="color:var(--text)">${esc(AREAS[t.a])}</span><span>${t.right}/${t.n}</span></div>
        <div class="bar ${accClass(t.acc)}"><i style="width:${Math.round(t.acc * 100)}%"></i></div></div>`).join('')}</div>` : ''}
      <div class="row">
        <button class="btn dark" id="rev">Review answers</button>
        ${topics.length && topics[0].acc < 1 ? `<button class="btn primary" id="weak">Drill ${esc(AREAS[topics[0].a])}</button>` : ''}
        <button class="btn" id="home">Home</button>
      </div>`;
    $('#rev').onclick = () => go('review', r.id);
    $('#home').onclick = () => go('home');
    const w = $('#weak'); w && (w.onclick = () => startDrill(topics[0].a));
  }

  function viewReview(id) {
    const p = me(); const r = p.history.find(h => h.id === id);
    if (!r) return go('home');
    setTop({ back: true, title: 'Review answers' });
    let filter = r.wrong ? 'wrong' : 'all';
    const draw = () => {
      const list = r.items.map((it, i) => ({ ...it, i, q: BYID[it.id] })).filter(x => x.q)
        .filter(x => filter === 'all' || (filter === 'wrong' && x.a !== null && x.a !== x.q.k) || (filter === 'skipped' && x.a === null) || (filter === 'right' && x.a === x.q.k));
      app.innerHTML = `<div class="filters">${[['all', 'All', r.total], ['wrong', 'Wrong', r.wrong], ['skipped', 'Skipped', r.skipped], ['right', 'Right', r.right]]
        .map(([k, t, n]) => `<button class="btn" data-f="${k}" aria-pressed="${filter === k}">${t} (${n})</button>`).join('')}</div>
        ${list.length ? list.map(x => {
          const q = x.q, ord = x.o || [0, 1, 2, 3];
          const st = x.a === null ? '<span class="tag warn">Skipped</span>' : x.a === q.k ? '<span class="tag ok">Right</span>' : '<span class="tag bad">Wrong</span>';
          return `<div class="card"><div class="qhead"><span>Q${x.i + 1} · ${esc(q.s)} ${esc(q.r)}</span>${st}</div>
            <div class="qtext" style="font-size:1rem">${esc(q.q)}</div>
            ${ord.map((oi, pos) => `<div class="opt ${oi === q.k ? 'right' : oi === x.a ? 'wrong' : ''}" style="cursor:default"><span class="l">${L[pos]}</span><span>${esc(q.o[oi])}</span></div>`).join('')}
            <div class="explain">${esc(q.e)}</div></div>`;
        }).join('') : '<p class="muted center pad">Nothing in this list.</p>'}`;
      app.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { filter = b.dataset.f; draw(); });
    };
    draw();
  }

  // ---------- History ----------
  function viewHistory() {
    const p = me(); const st = areaStats(p);
    setTop({ back: true, title: 'History' });
    const mocks = p.history.filter(h => h.mode === 'mock').slice(0, 20).reverse();
    const chart = mocks.length > 1 ? (() => {
      const W = 600, H = 160, pad = 24, max = EXAM.questions;
      const x = i => pad + i * (W - 2 * pad) / (mocks.length - 1), y = v => H - pad - Math.max(0, v) / max * (H - 2 * pad);
      const pts = mocks.map((m, i) => `${x(i)},${y(m.net)}`).join(' ');
      return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Mock scores over time">
        <line x1="${pad}" x2="${W - pad}" y1="${y(EXAM.pass)}" y2="${y(EXAM.pass)}" stroke="var(--accent)" stroke-dasharray="6 5"/>
        <text x="${W - pad}" y="${y(EXAM.pass) - 6}" text-anchor="end" font-size="12" fill="var(--muted)">pass ${EXAM.pass}</text>
        <polyline points="${pts}" fill="none" stroke="var(--focus)" stroke-width="3" stroke-linejoin="round"/>
        ${mocks.map((m, i) => `<circle cx="${x(i)}" cy="${y(m.net)}" r="5" fill="${m.passed ? 'var(--ok)' : 'var(--bad)'}"><title>${r2(m.net)}</title></circle>`).join('')}
      </svg>`;
    })() : '';
    app.innerHTML = `
      ${chart ? `<div class="card"><h3>Mock scores</h3>${chart}</div>` : ''}
      <div class="card"><h3>Progress by topic</h3>
        <p class="muted small">The bar shows how much of each topic you have practised, in drills and mocks. Accuracy appears once you have ${MIN_ACC} answers in a topic.</p>
        ${AREAS.map((a, i) => `<div style="margin-bottom:.7rem"><b style="font-size:.95rem">${esc(a)}</b>${coverageLine(st[i])}</div>`).join('')}
      </div>
      <div class="card"><h3>All attempts</h3>
        ${p.history.length ? `<table class="hist"><thead><tr><th>Date</th><th>Test</th><th class="num">Score</th></tr></thead><tbody>
          ${p.history.map(h => `<tr data-id="${h.id}" style="cursor:pointer"><td>${fmtDate(h.date)}</td><td>${h.mode === 'mock' ? esc(mockName(h)) : (h.area >= 0 ? esc(AREAS[h.area]) : 'Mistakes')}</td>
            <td class="num">${r2(h.net)}/${h.total} ${h.mode === 'mock' ? (h.passed ? '<span class="tag ok">Pass</span>' : '<span class="tag bad">Fail</span>') : ''}</td></tr>`).join('')}
        </tbody></table>` : '<p class="muted">No attempts yet.</p>'}
      </div>`;
    app.querySelectorAll('tr[data-id]').forEach(tr => tr.onclick = () => go('result', tr.dataset.id));
  }

  // ---------- Boot ----------
  applyTheme();
  fetch('questions.json').then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }).then(data => {
    BANK = data; AREAS = data.areas; EXAM = data.exam; PAPERS = data.papers || [];
    data.questions.forEach(q => (BYID[q.id] = q));
    go(me() ? 'home' : 'setup');
  }).catch(() => {
    app.innerHTML = '<div class="card center"><h2>Could not load the questions</h2><p class="muted">Check your connection and reload the page.</p><button class="btn primary" onclick="location.reload()">Reload</button></div>';
  });

  window.addEventListener('beforeunload', () => store.save());
  document.addEventListener('visibilitychange', () => { if (document.hidden) store.save(); });

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
    // When a new version of the app takes over, reload once so the learner sees it straight away (not during a test).
    let reloaded = !navigator.serviceWorker.controller; // first visit: nothing old to replace
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloaded || (me() && me().current && document.body.classList.contains('testing'))) return;
      reloaded = true; store.save(); location.reload();
    });
  }
})();
