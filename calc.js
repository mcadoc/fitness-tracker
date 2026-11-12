/* calc.js - all the maths and date helpers. No browser or database code here,
   so it can be tested on its own. Units: kg and cm. Weeks run Monday to Sunday. */
(function (root) {
  'use strict';

  // A weekly change of 1 kg equals about 7,700 kcal over the week = 1,100 kcal per day.
  const KCAL_PER_KG_PER_DAY = 1100;

  // ---------- Dates (always local dates as "YYYY-MM-DD" text, never UTC) ----------
  function pad(n) { return String(n).padStart(2, '0'); }
  function toDateStr(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parseDate(s) { const p = s.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); }
  function addDays(s, n) { const d = parseDate(s); d.setDate(d.getDate() + n); return toDateStr(d); }
  function weekStart(s) { const d = parseDate(s); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return toDateStr(d); }
  function daysBetween(a, b) { return Math.round((parseDate(b) - parseDate(a)) / 86400000); }

  // ---------- Trend weight (exponential moving average) ----------
  // alpha = 2 / (window + 1): 7-day = 0.25, 10-day = 0.1818, 16-day = 0.1176
  function alphaFor(windowDays) { return 2 / (windowDays + 1); }

  function countFilled(arr, field, from, to) {
    let n = 0;
    for (let i = from; i <= to; i++) if (arr[i][field] != null) n++;
    return n;
  }

  // logs: [{date, weight_kg, calories, protein_g, steps, did_workout, ...}]
  // Returns one point per calendar day from the first weigh-in to the last logged day.
  function buildSeries(logs, windowDays) {
    const byDate = {};
    logs.forEach(function (l) { byDate[l.date] = l; });
    const weighDates = logs.filter(function (l) { return l.weight_kg != null; })
      .map(function (l) { return l.date; }).sort();
    if (!weighDates.length) return [];

    const start = weighDates[0];
    const lastLog = logs.map(function (l) { return l.date; }).sort().pop();
    const end = lastLog > weighDates[weighDates.length - 1] ? lastLog : weighDates[weighDates.length - 1];

    const aW = alphaFor(windowDays);
    const aC = alphaFor(10); // calorie average and maintenance smoothing always use 10 days
    const KG = KCAL_PER_KG_PER_DAY;
    const out = [];
    let trend = null, calEma = null, tdee = null;

    for (let d = start, i = 0; d <= end; d = addDays(d, 1), i++) {
      const row = byDate[d] || {};
      const w = row.weight_kg != null ? Number(row.weight_kg) : null;
      const c = row.calories != null ? Number(row.calories) : null;

      if (w != null) trend = trend == null ? w : aW * w + (1 - aW) * trend;
      if (c != null) calEma = calEma == null ? c : aC * c + (1 - aC) * calEma;

      const p = {
        date: d, weight: w, trend: trend,
        calories: c,
        protein: row.protein_g != null ? Number(row.protein_g) : null,
        steps: row.steps != null ? Number(row.steps) : null,
        did_workout: row.date ? !!row.did_workout : null,
        calEma: calEma, weeklyChange: null, weeklyChangePct: null, tdee: null
      };
      out.push(p);

      // ROC: trend today minus trend 7 days ago (kg per week), and as a % of that earlier trend
      if (i >= 7 && out[i - 7].trend != null) {
        p.weeklyChange = trend - out[i - 7].trend;
        p.weeklyChangePct = p.weeklyChange / out[i - 7].trend;
      }

      // Estimated maintenance calories: average intake minus the surplus/deficit implied by
      // the weight trend. Only updated when the last 10 days have enough weigh-ins and entries.
      if (i >= 9 && p.weeklyChange != null && calEma != null &&
          countFilled(out, 'weight', i - 9, i) >= 5 && countFilled(out, 'calories', i - 9, i) >= 5) {
        const raw = calEma - p.weeklyChange * KG;
        tdee = tdee == null ? raw : aC * raw + (1 - aC) * tdee;
      }
      p.tdee = tdee;
    }
    return out;
  }

  // ---------- Starting targets for a new user ----------
  function bmr(sex, kg, cm, age) { // Mifflin-St Jeor
    return 10 * kg + 6.25 * cm - 5 * age + (sex === 'male' ? 5 : -161);
  }
  function activityFactor(steps) { // from planned average steps per day
    if (steps >= 15000) return 1.9;
    if (steps >= 10000) return 1.725;
    if (steps >= 7500) return 1.55;
    if (steps >= 5000) return 1.375;
    return 1.2; // under 5,000 steps: sedentary (assumption, not in the sheet)
  }
  function trainingFactor(sessionsPerWeek) {
    if (sessionsPerWeek >= 7) return 0.3;
    if (sessionsPerWeek >= 3) return 0.15;
    if (sessionsPerWeek >= 1) return 0.07;
    return 0;
  }
  function bodyFatPct(sex, age, kg, cm) { // BMI-based estimate (Gallagher et al.)
    const bmi = kg / Math.pow(cm / 100, 2);
    const f = sex === 'female' ? 1 : 0;
    return -44.988 + 0.503 * age + 10.689 * f + 3.172 * bmi - 0.026 * bmi * bmi +
      0.181 * bmi * f - 0.02 * bmi * age - 0.005 * bmi * bmi * f + 0.00021 * bmi * bmi * age;
  }
  const ceil25 = function (x) { return Math.ceil(x / 25) * 25; };
  const floor25 = function (x) { return Math.floor(x / 25) * 25; };
  const round25 = function (x) { return Math.round(x / 25) * 25; };

  // p: {sex, age, heightCm, weightKg, goal, steps (planned per day), workouts (planned per week)}
  function suggestTargets(p) {
    const tdee = bmr(p.sex, p.weightKg, p.heightCm, p.age) *
      (activityFactor(p.steps) + trainingFactor(p.workouts));
    const male = p.sex === 'male';
    let low, high;
    if (p.goal === 'cut') {
      // lose 0.75-1.15% of bodyweight per week (men), 0.6-1.0% (women)
      const fast = male ? 0.0115 : 0.01, slow = male ? 0.0075 : 0.006;
      low = ceil25(tdee - p.weightKg * fast * KCAL_PER_KG_PER_DAY);
      high = floor25(tdee - p.weightKg * slow * KCAL_PER_KG_PER_DAY);
    } else if (p.goal === 'bulk') {
      // gain 1-2% of bodyweight per month
      low = floor25(tdee + p.weightKg * 0.01 / 4 * KCAL_PER_KG_PER_DAY);
      high = ceil25(tdee + p.weightKg * 0.02 / 4 * KCAL_PER_KG_PER_DAY);
    } else {
      low = high = round25(tdee);
    }
    // protein: 1.0-1.3 g per lb of estimated lean mass
    const leanLb = p.weightKg * (1 - bodyFatPct(p.sex, p.age, p.weightKg, p.heightCm) / 100) * 2.205;
    return {
      tdee: Math.round(tdee),
      caloriesLow: low, caloriesHigh: high, calories: round25((low + high) / 2),
      proteinMin: Math.round(leanLb), proteinMax: Math.round(leanLb * 1.3),
      protein: Math.round(leanLb * 1.15)
    };
  }

  // ---------- Weekly summary ----------
  // The target row that applies to a week = the latest one set on or before that week.
  function targetsFor(week, targetRows) {
    let best = null;
    targetRows.forEach(function (t) {
      if (t.week_start <= week && (!best || t.week_start > best.week_start)) best = t;
    });
    return best;
  }

  function summarizeWeek(logs, week, targets) {
    const byDate = {};
    logs.forEach(function (l) { byDate[l.date] = l; });
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = addDays(week, i);
      days.push({ date: d, log: byDate[d] || null });
    }
    const vals = function (f) {
      return days.map(function (x) { return x.log ? x.log[f] : null; })
        .filter(function (v) { return v != null; }).map(Number);
    };
    const avg = function (a) { return a.length ? a.reduce(function (s, v) { return s + v; }, 0) / a.length : null; };
    const protein = vals('protein_g');
    return {
      days: days,
      avgCalories: avg(vals('calories')),
      avgSteps: avg(vals('steps')),
      avgSleep: avg(vals('sleep_quality')),
      avgStress: avg(vals('stress_level')),
      avgFatigue: avg(vals('fatigue_level')),
      avgHunger: avg(vals('hunger_level')),
      proteinDaysHit: targets && targets.protein_g ? protein.filter(function (v) { return v >= targets.protein_g; }).length : null,
      proteinDaysLogged: protein.length,
      workouts: days.filter(function (x) { return x.log && x.log.did_workout; }).length
    };
  }

  const api = {
    KCAL_PER_KG_PER_DAY: KCAL_PER_KG_PER_DAY,
    toDateStr: toDateStr, parseDate: parseDate, addDays: addDays, weekStart: weekStart, daysBetween: daysBetween,
    alphaFor: alphaFor, buildSeries: buildSeries,
    bmr: bmr, activityFactor: activityFactor, trainingFactor: trainingFactor, bodyFatPct: bodyFatPct,
    suggestTargets: suggestTargets, targetsFor: targetsFor, summarizeWeek: summarizeWeek
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.Calc = api;
})(typeof window !== 'undefined' ? window : globalThis);
