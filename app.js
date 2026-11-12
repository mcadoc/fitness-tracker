/* app.js - screens, saving to Supabase, and the dashboard chart. */
'use strict';

// ====== SETTINGS: paste your values from Supabase > Project Settings > API ======
const SUPABASE_URL = 'https://fcdkvfeoxidxlwryjnaz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_lPgLgvFCdGnpmYcL0vs45Q_xisgTn6l';
// Usernames are turned into a made-up internal email. If Supabase rejects ".local",
// change this to "example.com" (and create the users with that domain instead).
const EMAIL_DOMAIN = 'fit.local';
// ================================================================================

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const $ = function (id) { return document.getElementById(id); };

const state = {
  user: null, profile: null, logs: [], targets: [],
  date: null, weekStart: null, tab: 'today', chart: null
};

// ---------- small helpers ----------
async function must(promise) { // throw if Supabase returns an error
  const r = await promise;
  if (r.error) throw r.error;
  return r.data;
}
function numOrNull(v) {
  if (v === '' || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function textOrNull(v) { v = (v || '').trim(); return v ? v : null; }
function fmt(n, dp) {
  if (n == null || !Number.isFinite(n)) return '-';
  return n.toLocaleString('en-US', { minimumFractionDigits: dp || 0, maximumFractionDigits: dp || 0 });
}
function signed(n, dp) { return n == null ? '-' : (n > 0 ? '+' : '') + fmt(n, dp); }
function nice(dateStr, withYear) {
  return Calc.parseDate(dateStr).toLocaleDateString('en-GB',
    withYear ? { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' } : { weekday: 'short', day: 'numeric', month: 'short' });
}
function say(id, text, kind) { const el = $(id); el.textContent = text || ''; el.className = 'msg' + (kind ? ' ' + kind : ''); }
function el(tag, text, cls) { const e = document.createElement(tag); if (text != null) e.textContent = text; if (cls) e.className = cls; return e; }
function tile(label, value, sub) {
  const t = el('div', null, 'tile');
  t.appendChild(el('div', label, 'l')); t.appendChild(el('div', value, 'v'));
  if (sub) t.appendChild(el('div', sub, 's'));
  return t;
}
function series() { return state.profile ? Calc.buildSeries(state.logs, state.profile.trend_window_days) : []; }

// ---------- screens ----------
function showScreen(name) { // 'login' or 'app'
  $('login').classList.toggle('hidden', name !== 'login');
  $('app').classList.toggle('hidden', name !== 'app');
  $('who-box').classList.toggle('hidden', name !== 'app');
}

function showTab(name) {
  if (!state.profile && name !== 'profile') name = 'profile'; // must finish profile first
  state.tab = name;
  ['today', 'week', 'dashboard', 'profile'].forEach(function (t) { $('tab-' + t).classList.toggle('hidden', t !== name); });
  document.querySelectorAll('#tabs button').forEach(function (b) {
    b.classList.toggle('active', b.dataset.tab === name);
    b.disabled = !state.profile && b.dataset.tab !== 'profile';
  });
  if (name === 'today') renderToday();
  if (name === 'week') renderWeek();
  if (name === 'dashboard') renderDashboard();
  if (name === 'profile') renderProfile();
}

// ---------- login / logout ----------
async function doLogin() {
  const username = $('username').value.trim().toLowerCase();
  const password = $('password').value;
  if (!/^[a-z0-9._-]{3,30}$/.test(username)) { say('loginMsg', 'Enter your username.', 'err'); return; }
  say('loginMsg', 'Logging in...');
  const r = await db.auth.signInWithPassword({ email: username + '@' + EMAIL_DOMAIN, password: password });
  if (r.error) say('loginMsg', 'Login failed. Check your username and password.', 'err');
  else $('password').value = '';
}

async function onSession(session) {
  // Token refreshes fire this again for the same user; ignore those so the screen doesn't reset.
  if (session && state.user && session.user.id === state.user.id) return;
  if (!session) {
    state.user = null; state.profile = null; state.logs = []; state.targets = [];
    if (state.chart) { state.chart.destroy(); state.chart = null; }
    showScreen('login'); say('loginMsg', '');
    return;
  }
  state.user = session.user;
  $('who').textContent = session.user.email.split('@')[0];
  showScreen('app');
  try {
    const results = await Promise.all([
      must(db.from('profiles').select('*').maybeSingle()),
      must(db.from('daily_logs').select('*').order('date', { ascending: true }).limit(5000)),
      must(db.from('weekly_targets').select('*').order('week_start', { ascending: true }))
    ]);
    state.profile = results[0]; state.logs = results[1]; state.targets = results[2];
  } catch (e) {
    showTab('profile'); say('profileMsg', 'Could not load your data: ' + e.message, 'err'); return;
  }
  state.date = Calc.toDateStr(new Date());
  state.weekStart = Calc.weekStart(state.date);
  showTab(state.profile ? 'today' : 'profile');
}

// ---------- PROFILE ----------
function renderProfile() {
  const p = state.profile;
  $('profileIntro').classList.toggle('hidden', !!p);
  if (p) {
    $('p-name').value = p.first_name; $('p-sex').value = p.sex; $('p-age').value = p.age;
    $('p-height').value = p.height_cm; $('p-goal').value = p.goal; $('p-window').value = p.trend_window_days;
  }
  say('profileMsg', '');
}

async function saveProfile() {
  const row = {
    user_id: state.user.id,
    first_name: $('p-name').value.trim(), sex: $('p-sex').value,
    age: numOrNull($('p-age').value), height_cm: numOrNull($('p-height').value),
    goal: $('p-goal').value, trend_window_days: numOrNull($('p-window').value) || 10
  };
  if (!row.first_name || !row.sex || !row.age || !row.height_cm) { say('profileMsg', 'Please fill in every field.', 'err'); return; }
  try {
    state.profile = await must(db.from('profiles').upsert(row, { onConflict: 'user_id' }).select().single());
    say('profileMsg', 'Saved.', 'ok');
    showTab('today');
  } catch (e) { say('profileMsg', 'Could not save: ' + e.message, 'err'); }
}

// ---------- TODAY ----------
function fillScale(selectId) {
  const s = $(selectId); s.innerHTML = '';
  s.appendChild(new Option('-', ''));
  for (let i = 1; i <= 5; i++) s.appendChild(new Option(String(i), String(i)));
}

function renderToday() {
  $('logDate').value = state.date;
  const l = state.logs.find(function (x) { return x.date === state.date; }) || {};
  const v = function (x) { return x == null ? '' : x; };
  $('f-weight').value = v(l.weight_kg); $('f-steps').value = v(l.steps);
  $('f-calories').value = v(l.calories); $('f-protein').value = v(l.protein_g);
  $('f-workout').checked = !!l.did_workout;
  $('f-activities').value = v(l.activities);
  $('f-sleep').value = v(l.sleep_quality); $('f-stress').value = v(l.stress_level); $('f-hunger').value = v(l.hunger_level);
  $('f-wins').value = v(l.wins); $('f-tomorrow').value = v(l.tomorrow_plan);
  say('todayMsg', l.date ? 'Editing the entry saved for this day.' : '');
}

async function saveDay() {
  const row = {
    user_id: state.user.id, date: state.date,
    weight_kg: numOrNull($('f-weight').value), steps: numOrNull($('f-steps').value),
    calories: numOrNull($('f-calories').value), protein_g: numOrNull($('f-protein').value),
    did_workout: $('f-workout').checked,
    activities: textOrNull($('f-activities').value),
    sleep_quality: numOrNull($('f-sleep').value), stress_level: numOrNull($('f-stress').value), hunger_level: numOrNull($('f-hunger').value),
    wins: textOrNull($('f-wins').value), tomorrow_plan: textOrNull($('f-tomorrow').value)
  };
  try {
    const saved = await must(db.from('daily_logs').upsert(row, { onConflict: 'user_id,date' }).select().single());
    state.logs = state.logs.filter(function (x) { return x.date !== saved.date; }).concat(saved)
      .sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    say('todayMsg', 'Saved for ' + nice(state.date) + '.', 'ok');
  } catch (e) { say('todayMsg', 'Could not save: ' + e.message, 'err'); }
}

function moveDay(n) {
  if (!$('logDate').value) return;
  state.date = Calc.addDays(state.date, n); renderToday();
}

// ---------- WEEK ----------
function renderWeek() {
  const wk = state.weekStart;
  $('weekLabel').textContent = nice(wk) + ' - ' + nice(Calc.addDays(wk, 6));
  const own = state.targets.find(function (t) { return t.week_start === wk; });
  const t = own || Calc.targetsFor(wk, state.targets) || {};
  const v = function (x) { return x == null ? '' : x; };
  $('t-calories').value = v(t.calories); $('t-protein').value = v(t.protein_g);
  $('t-steps').value = v(t.steps); $('t-workouts').value = v(t.workouts);
  say('targetMsg', own ? '' : (t.week_start ? 'No targets set for this week yet. Showing the ones from the week of ' + nice(t.week_start) + '. Save to confirm them.' : 'No targets yet. Fill them in or tap "Suggest from my profile".'));

  const sum = Calc.summarizeWeek(state.logs, wk, t.week_start ? t : null);
  const tiles = $('weekTiles'); tiles.innerHTML = '';
  tiles.appendChild(tile('Avg calories', fmt(sum.avgCalories), t.calories ? 'target ' + fmt(t.calories) : ''));
  tiles.appendChild(tile('Protein days hit', sum.proteinDaysHit == null ? '-' : sum.proteinDaysHit + ' / 7', t.protein_g ? 'target ' + t.protein_g + ' g' : ''));
  tiles.appendChild(tile('Avg steps', fmt(sum.avgSteps), t.steps ? 'target ' + fmt(t.steps) : ''));
  tiles.appendChild(tile('Workouts', String(sum.workouts), t.workouts != null ? 'target ' + t.workouts : ''));
  tiles.appendChild(tile('Sleep / Stress / Hunger', [sum.avgSleep, sum.avgStress, sum.avgHunger].map(function (x) { return x == null ? '-' : fmt(x, 1); }).join(' / '), 'weekly averages (1-5)'));

  const body = $('weekRows'); body.innerHTML = '';
  sum.days.forEach(function (d) {
    const l = d.log || {};
    const tr = document.createElement('tr');
    [nice(d.date), l.weight_kg != null ? fmt(Number(l.weight_kg), 1) : '-', fmt(l.calories), fmt(l.protein_g), fmt(l.steps), l.did_workout ? 'Yes' : '-']
      .forEach(function (c) { tr.appendChild(el('td', c)); });
    body.appendChild(tr);
  });
}

function moveWeek(n) { state.weekStart = Calc.addDays(state.weekStart, 7 * n); renderWeek(); }

async function saveTargets() {
  const row = {
    user_id: state.user.id, week_start: state.weekStart,
    calories: numOrNull($('t-calories').value), protein_g: numOrNull($('t-protein').value),
    steps: numOrNull($('t-steps').value), workouts: numOrNull($('t-workouts').value)
  };
  try {
    const saved = await must(db.from('weekly_targets').upsert(row, { onConflict: 'user_id,week_start' }).select().single());
    state.targets = state.targets.filter(function (x) { return x.week_start !== saved.week_start; }).concat(saved)
      .sort(function (a, b) { return a.week_start < b.week_start ? -1 : 1; });
    renderWeek(); say('targetMsg', 'Targets saved.', 'ok');
  } catch (e) { say('targetMsg', 'Could not save: ' + e.message, 'err'); }
}

function suggestTargets() {
  const s = series();
  const last = s.length ? s[s.length - 1] : null;
  const weight = last ? last.trend : null;
  const steps = numOrNull($('t-steps').value), workouts = numOrNull($('t-workouts').value);
  if (weight == null) { say('targetMsg', 'Log at least one weight first so we can calculate.', 'err'); return; }
  if (steps == null || workouts == null) { say('targetMsg', 'Enter your planned daily steps and workouts per week first, then tap Suggest.', 'err'); return; }
  const r = Calc.suggestTargets({ sex: state.profile.sex, age: state.profile.age, heightCm: Number(state.profile.height_cm),
    weightKg: weight, goal: state.profile.goal, steps: steps, workouts: workouts });
  $('t-calories').value = r.calories; $('t-protein').value = r.protein;
  say('targetMsg', 'Suggestion (not saved yet): about ' + fmt(r.tdee) + ' kcal to maintain; ' + state.profile.goal +
    ' range ' + fmt(r.caloriesLow) + ' to ' + fmt(r.caloriesHigh) + ' kcal; protein ' + r.proteinMin + ' to ' + r.proteinMax + ' g. Adjust, then Save targets.');
}

// ---------- DASHBOARD ----------
function renderDashboard() {
  const s = series();
  const tiles = $('dashTiles'); tiles.innerHTML = '';
  if (!s.length) {
    tiles.appendChild(tile('No data yet', '-', 'Log a weight on the Today tab'));
    if (state.chart) { state.chart.destroy(); state.chart = null; }
    return;
  }
  const last = s[s.length - 1];
  const back = function (n) { return s.length > n ? s[s.length - 1 - n].trend : null; };
  const d7 = last.weeklyChange, d14 = back(14) != null ? last.trend - back(14) : null;
  const recent = s.slice(-7);
  const avgOf = function (f) { const a = recent.map(function (p) { return p[f]; }).filter(function (x) { return x != null; }); return a.length ? a.reduce(function (x, y) { return x + y; }, 0) / a.length : null; };
  tiles.appendChild(tile('Trend weight', fmt(last.trend, 2) + ' kg', 'latest weigh-in ' + (s.filter(function (p) { return p.weight != null; }).pop().weight) + ' kg'));
  tiles.appendChild(tile('Rate of change (7 days)', d7 == null ? '-' : signed(d7, 2) + ' kg', last.weeklyChangePct == null ? '' : signed(last.weeklyChangePct * 100, 2) + '% per week'));
  tiles.appendChild(tile('Change (14 days)', d14 == null ? '-' : signed(d14, 2) + ' kg', 'based on trend weight'));
  tiles.appendChild(tile('Total change', signed(last.trend - s[0].trend, 2) + ' kg', 'since ' + nice(s[0].date)));
  tiles.appendChild(tile('Avg calories (7 days)', fmt(avgOf('calories')), ''));
  tiles.appendChild(tile('Avg steps (7 days)', fmt(avgOf('steps')), ''));
  tiles.appendChild(tile('Est. maintenance', last.tdee == null ? 'Waiting' : fmt(last.tdee) + ' kcal', last.tdee == null ? 'needs ~5 weigh-ins and ~5 calorie days in 10 days' : 'from intake and weight trend'));
  drawChart(s);
}

function drawChart(s) {
  // Make chart text and gridlines follow the page's light/dark colours.
  if (Chart.defaults) {
    const css = getComputedStyle(document.documentElement);
    Chart.defaults.color = css.getPropertyValue('--muted').trim() || '#666';
    Chart.defaults.borderColor = css.getPropertyValue('--line').trim() || '#ddd';
  }
  const range = Number($('range').value);
  const pts = range ? s.slice(-range) : s;
  const on = function (k) { return $('ov-' + k).checked; };
  const datasets = [
    { label: 'Weight (actual)', data: pts.map(function (p) { return p.weight; }), showLine: false, pointRadius: 3, borderColor: '#9ca3af', backgroundColor: '#9ca3af', yAxisID: 'y' },
    { label: 'Trend weight', data: pts.map(function (p) { return p.trend; }), borderColor: '#2563eb', backgroundColor: '#2563eb', borderWidth: 3, pointRadius: 0, tension: 0.2, yAxisID: 'y' }
  ];
  const line = function (label, key, color, axis) {
    return { label: label, data: pts.map(function (p) { return p[key]; }), borderColor: color, backgroundColor: color, borderWidth: 1.5, borderDash: [4, 3], pointRadius: 1.5, spanGaps: true, yAxisID: axis };
  };
  if (on('calories')) datasets.push(line('Calories', 'calories', '#f59e0b', 'yCal'));
  if (on('protein')) datasets.push(line('Protein (g)', 'protein', '#10b981', 'yPro'));
  if (on('steps')) datasets.push(line('Steps', 'steps', '#8b5cf6', 'ySteps'));
  if (on('workouts')) datasets.push({ type: 'bar', label: 'Workout', data: pts.map(function (p) { return p.did_workout ? 1 : null; }), backgroundColor: 'rgba(239,68,68,0.35)', yAxisID: 'yWork' });

  const hidden = function (extra) { return Object.assign({ display: false, position: 'right', grid: { drawOnChartArea: false } }, extra || {}); };
  if (state.chart) state.chart.destroy();
  state.chart = new Chart($('chart'), {
    type: 'line',
    data: { labels: pts.map(function (p) { return p.date; }), datasets: datasets },
    options: {
      responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
      scales: {
        x: { ticks: { maxTicksLimit: 8 } },
        y: { title: { display: true, text: 'kg' } },
        yCal: hidden(), yPro: hidden(), ySteps: hidden(), yWork: hidden({ min: 0, max: 4 })
      }
    }
  });
  say('dashMsg', 'Calories, protein, steps and workouts are drawn on their own hidden scales; hover to see the real values.');
}

// ---------- start ----------
function wire() {
  fillScale('f-sleep'); fillScale('f-stress'); fillScale('f-hunger');
  $('loginBtn').onclick = doLogin;
  $('password').addEventListener('keydown', function (e) { if (e.key === 'Enter') doLogin(); });
  $('logoutBtn').onclick = function () { db.auth.signOut(); };
  document.querySelectorAll('#tabs button').forEach(function (b) { b.onclick = function () { showTab(b.dataset.tab); }; });
  $('saveProfile').onclick = saveProfile;
  $('saveDay').onclick = saveDay;
  $('dayPrev').onclick = function () { moveDay(-1); };
  $('dayNext').onclick = function () { moveDay(1); };
  $('logDate').onchange = function () { if ($('logDate').value) { state.date = $('logDate').value; renderToday(); } };
  $('weekPrev').onclick = function () { moveWeek(-1); };
  $('weekNext').onclick = function () { moveWeek(1); };
  $('saveTargets').onclick = saveTargets;
  $('suggestBtn').onclick = suggestTargets;
  $('range').onchange = renderDashboard;
  ['calories', 'protein', 'steps', 'workouts'].forEach(function (k) { $('ov-' + k).onchange = renderDashboard; });

  // Note: do not call other Supabase functions directly inside this callback; defer with setTimeout.
  db.auth.onAuthStateChange(function (_event, session) { setTimeout(function () { onSession(session); }, 0); });
}
wire();
