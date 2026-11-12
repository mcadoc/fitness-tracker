<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Fitness Tracker</title>
  <style>
    :root { --bg:#f6f7f9; --fg:#1a1a1a; --muted:#666; --card:#fff; --line:#dcdfe4; --accent:#2563eb; --bad:#b00020; --ok:#15803d; }
    @media (prefers-color-scheme: dark) {
      :root { --bg:#121417; --fg:#ececec; --muted:#a0a4ab; --card:#1c1f24; --line:#2e333a; --accent:#60a5fa; --bad:#f87171; --ok:#4ade80; }
    }
    * { box-sizing: border-box; }
    body { margin:0; background:var(--bg); color:var(--fg); font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif; line-height:1.4; }
    main { max-width:720px; margin:0 auto; padding:12px 16px 48px; }
    header { display:flex; justify-content:space-between; align-items:center; gap:8px; }
    h1 { font-size:1.25rem; margin:8px 0; }
    h2 { font-size:1.05rem; margin:20px 0 8px; }
    .hidden { display:none !important; }
    .card { background:var(--card); border:1px solid var(--line); border-radius:10px; padding:14px; margin:10px 0; }
    label { display:block; font-size:.85rem; color:var(--muted); margin:10px 0 3px; }
    input, select, textarea, button { font:inherit; padding:.55rem; width:100%; border:1px solid var(--line); border-radius:8px; background:var(--card); color:var(--fg); }
    textarea { min-height:70px; resize:vertical; }
    input[type=checkbox] { width:auto; margin-right:6px; }
    .check { display:flex; align-items:center; color:var(--fg); font-size:1rem; margin:12px 0; }
    button { cursor:pointer; background:var(--accent); color:#fff; border:0; margin-top:12px; font-weight:600; }
    button.secondary { background:transparent; color:var(--accent); border:1px solid var(--accent); }
    button.small { width:auto; padding:.35rem .7rem; margin:0; font-weight:500; }
    .row { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
    nav { display:flex; gap:6px; margin:10px 0; }
    nav button { margin:0; background:transparent; color:var(--fg); border:1px solid var(--line); font-weight:500; padding:.5rem .3rem; }
    nav button.active { background:var(--accent); color:#fff; border-color:var(--accent); }
    nav button:disabled { opacity:.4; cursor:not-allowed; }
    .msg { min-height:1.2em; font-size:.9rem; color:var(--muted); margin:8px 0 0; }
    .msg.err { color:var(--bad); } .msg.ok { color:var(--ok); }
    .tiles { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:10px; }
    .tile { background:var(--card); border:1px solid var(--line); border-radius:10px; padding:10px 12px; }
    .tile .v { font-size:1.35rem; font-weight:700; } .tile .l { font-size:.78rem; color:var(--muted); } .tile .s { font-size:.78rem; color:var(--muted); }
    .nav2 { display:flex; align-items:center; justify-content:space-between; gap:8px; }
    .nav2 strong { text-align:center; flex:1; }
    table { width:100%; border-collapse:collapse; font-size:.88rem; }
    th, td { text-align:right; padding:6px 4px; border-bottom:1px solid var(--line); } th:first-child, td:first-child { text-align:left; }
    th { color:var(--muted); font-weight:500; }
    .overlays { display:flex; flex-wrap:wrap; gap:6px 14px; margin:8px 0; } .overlays label { display:flex; align-items:center; margin:0; color:var(--fg); font-size:.9rem; }
    .chartbox { position:relative; height:320px; }
    .hint { font-size:.8rem; color:var(--muted); }
    .dayname { text-align:center; font-weight:600; margin:8px 0 0; }
  </style>
</head>
<body>
<main>
  <header>
    <h1>Fitness Tracker</h1>
    <div id="who-box" class="hidden"><span id="who"></span> <button id="logoutBtn" class="small secondary">Log out</button></div>
  </header>

  <!-- LOGIN (no sign-up: accounts are created by the admin in Supabase) -->
  <section id="login" class="card hidden">
    <label for="username">Username</label>
    <input id="username" autocomplete="username" autocapitalize="none" />
    <label for="password">Password</label>
    <input id="password" type="password" autocomplete="current-password" />
    <button id="loginBtn">Log in</button>
    <p id="loginMsg" class="msg"></p>
  </section>

  <!-- APP -->
  <section id="app" class="hidden">
    <nav id="tabs">
      <button data-tab="today">Today</button>
      <button data-tab="week">Week</button>
      <button data-tab="dashboard">Dashboard</button>
      <button data-tab="profile">Profile</button>
    </nav>

    <!-- TODAY -->
    <div id="tab-today" class="hidden">
      <div class="card">
        <div class="nav2">
          <button id="dayPrev" class="small secondary">&larr;</button>
          <input id="logDate" type="date" style="max-width:190px" />
          <button id="dayNext" class="small secondary">&rarr;</button>
        </div>
        <p id="dayName" class="dayname"></p>
        <div class="row">
          <div><label for="f-weight">Weight (kg)</label><input id="f-weight" type="number" step="0.01" inputmode="decimal" /></div>
          <div><label for="f-steps">Steps</label><input id="f-steps" class="int" type="text" inputmode="numeric" autocomplete="off" /></div>
        </div>
        <div class="row">
          <div><label for="f-calories">Calories</label><input id="f-calories" class="int" type="text" inputmode="numeric" autocomplete="off" /></div>
          <div><label for="f-protein">Protein (g)</label><input id="f-protein" class="int" type="text" inputmode="numeric" autocomplete="off" /></div>
        </div>
        <label class="check"><input id="f-workout" type="checkbox" /> I worked out today</label>
        <label for="f-activities">Other activities (walk, swim, sports...)</label>
        <input id="f-activities" maxlength="500" />
        <div class="row">
          <div><label for="f-sleep">Sleep <span class="hint">(5 = great)</span></label><select id="f-sleep"></select></div>
          <div><label for="f-stress">Stress <span class="hint">(5 = high)</span></label><select id="f-stress"></select></div>
        </div>
        <div class="row">
          <div><label for="f-fatigue">Fatigue <span class="hint">(5 = high)</span></label><select id="f-fatigue"></select></div>
          <div><label for="f-hunger">Hunger <span class="hint">(5 = high)</span></label><select id="f-hunger"></select></div>
        </div>
        <label for="f-wins">Today's wins</label>
        <textarea id="f-wins" maxlength="1000"></textarea>
        <label for="f-tomorrow">What I plan to do tomorrow</label>
        <textarea id="f-tomorrow" maxlength="1000"></textarea>
        <button id="saveDay">Save day</button>
        <p id="todayMsg" class="msg"></p>
      </div>
    </div>

    <!-- WEEK -->
    <div id="tab-week" class="hidden">
      <div class="card">
        <div class="nav2">
          <button id="weekPrev" class="small secondary">&larr;</button>
          <strong id="weekLabel"></strong>
          <button id="weekNext" class="small secondary">&rarr;</button>
        </div>
        <h2>Targets for this week</h2>
        <div class="row">
          <div><label for="t-calories">Daily calories</label><input id="t-calories" class="int" type="text" inputmode="numeric" autocomplete="off" /></div>
          <div><label for="t-protein">Daily protein (g)</label><input id="t-protein" class="int" type="text" inputmode="numeric" autocomplete="off" /></div>
        </div>
        <div class="row">
          <div><label for="t-steps">Daily steps</label><input id="t-steps" class="int" type="text" inputmode="numeric" autocomplete="off" /></div>
          <div><label for="t-workouts">Workouts this week</label><input id="t-workouts" type="number" step="1" min="0" max="14" inputmode="numeric" /></div>
        </div>
        <div class="row">
          <button id="suggestBtn" class="secondary">Suggest from my profile</button>
          <button id="saveTargets">Save targets</button>
        </div>
        <p id="targetMsg" class="msg"></p>
      </div>
      <div class="card">
        <h2 style="margin-top:0">This week so far</h2>
        <div id="weekTiles" class="tiles"></div>
        <table style="margin-top:12px">
          <thead><tr><th>Day</th><th>kg</th><th>kcal</th><th>Protein</th><th>Steps</th><th>Gym</th></tr></thead>
          <tbody id="weekRows"></tbody>
        </table>
      </div>
    </div>

    <!-- DASHBOARD -->
    <div id="tab-dashboard" class="hidden">
      <div id="dashTiles" class="tiles"></div>
      <div class="card">
        <div class="row">
          <div><label for="range">Range</label>
            <select id="range"><option value="28">Last 4 weeks</option><option value="56" selected>Last 8 weeks</option><option value="112">Last 16 weeks</option><option value="0">All time</option></select></div>
        </div>
        <div class="overlays">
          <label><input type="checkbox" id="ov-calories" /> Calories</label>
          <label><input type="checkbox" id="ov-protein" /> Protein</label>
          <label><input type="checkbox" id="ov-steps" /> Steps</label>
          <label><input type="checkbox" id="ov-workouts" /> Workouts</label>
        </div>
        <div class="chartbox"><canvas id="chart"></canvas></div>
        <p id="dashMsg" class="msg"></p>
      </div>
    </div>

    <!-- PROFILE -->
    <div id="tab-profile" class="hidden">
      <div class="card">
        <p id="profileIntro" class="hint hidden">Welcome! Fill this in once. We only store your first name and the numbers needed for your target calculations.</p>
        <label for="p-name">First name</label><input id="p-name" maxlength="40" />
        <div class="row">
          <div><label for="p-sex">Sex</label><select id="p-sex"><option value="">Select</option><option value="male">Male</option><option value="female">Female</option></select></div>
          <div><label for="p-age">Age</label><input id="p-age" type="number" inputmode="numeric" /></div>
        </div>
        <div class="row">
          <div><label for="p-height">Height (cm)</label><input id="p-height" type="number" step="0.1" inputmode="decimal" /></div>
          <div><label for="p-goal">Goal</label><select id="p-goal"><option value="cut">Cut</option><option value="maintain">Maintain</option><option value="bulk">Bulk</option></select></div>
        </div>
        <label for="p-window">Trend smoothing (days)</label>
        <input id="p-window" type="number" min="5" max="30" value="10" />
        <p class="hint">Higher = smoother trend line. 10 is a good default.</p>
        <button id="saveProfile">Save profile</button>
        <p id="profileMsg" class="msg"></p>
      </div>
    </div>
  </section>
</main>

<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>
<script src="calc.js"></script>
<script src="app.js"></script>
</body>
</html>
