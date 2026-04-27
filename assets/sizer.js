// ─── Project Sizer ────────────────────────────────────────
// Lightweight 4-question intake that suggests a team shape,
// timeline, investment range, and the closest Metova case
// study + service. Triggered from the hero side button.
//
// Numbers are first-pass benchmarks (Levels.fyi + nearshore
// market data). Always shown as ranges with a "refined on
// the call" disclaimer — the call is where precision lives.
//
// Lead capture: Web3Forms (no backend). Booking: Calendly
// when configured, /contact form fallback.
// ──────────────────────────────────────────────────────────

(function () {
  'use strict';

  // ─── Config: swap these in any time, no code changes ─────
  const CONFIG = {
    BOOKING_URL: '',                       // e.g. 'https://calendly.com/metova/30min' — empty = falls back to /contact
    WEB3FORMS_KEY: '',                     // Web3Forms access key — empty = email form is hidden until configured
    BRAND_FROM_NAME: 'Metova Project Sizer',
  };

  // ─── Lookup tables (first-pass, defensible benchmarks) ───
  const SCOPE = {
    ai: {
      team: ['Tech lead', 'Senior full-stack engineer', 'AI / ML engineer', 'Product designer (½ time)'],
      baseWeeks: 12,
      monthlyMin: 80, // $k/month for default team
      monthlyMax: 120,
    },
    mobile: {
      team: ['Product manager', 'Senior iOS engineer', 'Senior Android engineer', 'Backend engineer', 'Product designer'],
      baseWeeks: 16,
      monthlyMin: 95,
      monthlyMax: 145,
    },
    web: {
      team: ['Tech lead', '2× Senior full-stack engineer', 'Product designer'],
      baseWeeks: 12,
      monthlyMin: 75,
      monthlyMax: 120,
    },
    iot: {
      team: ['Tech lead', 'Firmware engineer', 'Backend engineer', 'Hardware advisor (½ time)'],
      baseWeeks: 18,
      monthlyMin: 90,
      monthlyMax: 145,
    },
    modernize: {
      team: ['Tech lead / architect', '2–3× Senior engineer', 'Product manager (½ time)'],
      baseWeeks: 14,
      monthlyMin: 95,
      monthlyMax: 160,
    },
    exploring: {
      team: ['Senior product strategist', 'Senior engineer', 'Product designer'],
      baseWeeks: 4,
      monthlyMin: 40,
      monthlyMax: 75,
    },
  };

  const START_MOD = {
    idea:        { weeksFactor: 1.30, complexity: 1.00 },
    mvp:         { weeksFactor: 1.00, complexity: 1.10 },
    scaling:     { weeksFactor: 0.90, complexity: 1.20 },
    replatform:  { weeksFactor: 1.20, complexity: 1.40 },
  };

  const WHEN_MOD = {
    '4wk':       { teamMult: 1.6, lockWeeks: 4 },
    '8-12wk':    { teamMult: 1.0, lockWeeks: null },
    '3-6mo':     { teamMult: 0.85, lockWeeks: null },
    '6+mo':      { teamMult: 0.75, lockWeeks: null },
    flexible:    { teamMult: 1.0, lockWeeks: null },
  };

  const GAP_MOD = {
    noTeam:      { teamMult: 1.00, label: 'Full team' },
    extension:   { teamMult: 0.65, label: 'Extension squad' },
    specialist:  { teamMult: 0.30, label: 'Embedded specialist' },
    leadership:  { teamMult: 0.55, label: 'Tech leadership + senior eng' },
  };

  const CASE_BY_BUILD = {
    ai:         { slug: 'fiton',     name: 'FitOn — scaling a fitness platform to 12M+ members' },
    mobile:     { slug: 'mybambu',   name: 'MyBambu — full-stack fintech mobile' },
    web:        { slug: 'acoustic',  name: 'Acoustic — multichannel marketing SaaS' },
    iot:        { slug: 'tnaa',      name: 'TNAA — connected workforce platform' },
    modernize:  { slug: 'acoustic',  name: 'Acoustic — platform modernization' },
    exploring:  { slug: 'setf',      name: 'SETF — humanitarian product discovery' },
  };

  const SERVICE_BY_BUILD = {
    ai:         { slug: 'ai-product-development',      name: 'AI Product Development' },
    mobile:     { slug: 'custom-software-engineering', name: 'Custom Software Engineering' },
    web:        { slug: 'custom-software-engineering', name: 'Custom Software Engineering' },
    iot:        { slug: 'iot-emerging-tech',           name: 'IoT & Emerging Tech' },
    modernize:  { slug: 'digital-consulting-strategy', name: 'Digital Consulting & Strategy' },
    exploring:  { slug: 'digital-consulting-strategy', name: 'Digital Consulting & Strategy' },
  };

  // ─── DOM refs ────────────────────────────────────────────
  const modal = document.getElementById('sizer-modal');
  if (!modal) return;

  const stages = modal.querySelectorAll('.sizer-stage');
  const progressBar = modal.querySelector('.sizer-progress-bar');
  const backBtn = modal.querySelector('[data-sizer-back]');

  const TOTAL_QUESTIONS = 4;
  const state = { step: 0, answers: {} };

  // ─── Open / close ────────────────────────────────────────
  function open() {
    document.body.style.overflow = 'hidden';
    modal.hidden = false;
    requestAnimationFrame(() => modal.classList.add('is-open'));
    // Focus first option for accessibility
    const firstOpt = modal.querySelector('.sizer-stage.is-active .sizer-opt');
    if (firstOpt) firstOpt.focus();
  }

  function close() {
    modal.classList.remove('is-open');
    document.body.style.overflow = '';
    setTimeout(() => { modal.hidden = true; }, 240);
  }

  function reset() {
    state.step = 0;
    state.answers = {};
    setStage(0);
    // Clear selected pills
    modal.querySelectorAll('.sizer-opt.is-selected').forEach(el => el.classList.remove('is-selected'));
    const status = document.getElementById('sizer-form-status');
    if (status) status.textContent = '';
    const form = document.getElementById('sizer-form');
    if (form) form.reset();
  }

  function setStage(stepKey) {
    stages.forEach(s => {
      const matches = String(s.dataset.step) === String(stepKey);
      s.hidden = !matches;
      s.classList.toggle('is-active', matches);
    });
    state.step = stepKey;
    updateProgress();
    backBtn.hidden = stepKey === 0 || stepKey === 'result';
    // scroll to top of shell
    const shell = modal.querySelector('.sizer-shell');
    if (shell) shell.scrollTop = 0;
  }

  function updateProgress() {
    let pct = 0;
    if (state.step === 'result') pct = 100;
    else if (typeof state.step === 'number') pct = ((state.step) / TOTAL_QUESTIONS) * 100;
    progressBar.style.width = pct + '%';
  }

  // ─── Compute result ──────────────────────────────────────
  function computeResult(answers) {
    const scope = SCOPE[answers.build] || SCOPE.web;
    const startMod = START_MOD[answers.start] || START_MOD.mvp;
    const whenMod = WHEN_MOD[answers.when] || WHEN_MOD['8-12wk'];
    const gapMod = GAP_MOD[answers.gap] || GAP_MOD.noTeam;

    // Timeline
    let weeks = whenMod.lockWeeks != null
      ? whenMod.lockWeeks
      : Math.round(scope.baseWeeks * startMod.weeksFactor);

    const timelineLabel = weeks <= 6
      ? `${weeks} weeks`
      : weeks <= 14
        ? `${weeks - 2}–${weeks + 2} weeks`
        : `${Math.round(weeks / 4) - 1}–${Math.round(weeks / 4) + 1} months`;

    // Team — apply gap to scope.team. If gap=specialist, show 1 role.
    const teamMult = whenMod.teamMult * gapMod.teamMult;
    let team;
    if (answers.gap === 'specialist') {
      team = [pickSpecialist(answers.build)];
    } else if (answers.gap === 'leadership') {
      team = [scope.team[0], 'Senior engineer'];
    } else if (answers.gap === 'extension') {
      // pick top 2-3 from team
      team = scope.team.slice(0, Math.max(2, Math.ceil(scope.team.length * 0.6)));
    } else {
      team = scope.team.slice();
    }

    // Investment
    const months = weeks / 4.33;
    const baseMin = scope.monthlyMin * teamMult * startMod.complexity;
    const baseMax = scope.monthlyMax * teamMult * startMod.complexity;
    const totalMin = baseMin * months;
    const totalMax = baseMax * months;
    const invLabel = formatRange(totalMin, totalMax);

    // Case study + service
    const caseRef = CASE_BY_BUILD[answers.build] || CASE_BY_BUILD.web;
    const serviceRef = SERVICE_BY_BUILD[answers.build] || SERVICE_BY_BUILD.web;

    return {
      team,
      timelineLabel,
      timelineSub: deriveTimelineSub(answers, weeks),
      invLabel,
      caseRef,
      serviceRef,
      gapLabel: gapMod.label,
    };
  }

  function pickSpecialist(build) {
    return ({
      ai: 'Senior AI / ML engineer',
      mobile: 'Senior mobile engineer (iOS or Android)',
      web: 'Senior full-stack engineer',
      iot: 'Senior firmware engineer',
      modernize: 'Senior architect',
      exploring: 'Senior product strategist',
    })[build] || 'Senior engineer';
  }

  function deriveTimelineSub(a, weeks) {
    if (a.when === '4wk') return 'Compressed timeline — larger team to hit it';
    if (a.when === 'flexible') return 'Right-sized team, no rush premium';
    if (weeks <= 12) return 'Single phase';
    if (weeks <= 24) return 'One major release window';
    return 'Multi-phase engagement';
  }

  function formatRange(min, max) {
    const round = n => {
      if (n >= 1000) return Math.round(n / 50) * 50; // round to 50k
      if (n >= 200) return Math.round(n / 25) * 25;
      if (n >= 100) return Math.round(n / 10) * 10;
      return Math.round(n / 5) * 5;
    };
    const fmt = n => {
      if (n >= 1000) return `$${(n / 1000).toFixed(1)}M`.replace(/\.0M/, 'M');
      return `$${Math.round(n)}k`;
    };
    return `${fmt(round(min))} – ${fmt(round(max))}`;
  }

  // ─── Render result ───────────────────────────────────────
  function renderResult() {
    const result = computeResult(state.answers);

    const teamUl = document.getElementById('sizer-team');
    teamUl.innerHTML = '';
    result.team.forEach(member => {
      const li = document.createElement('li');
      li.textContent = member;
      teamUl.appendChild(li);
    });

    document.getElementById('sizer-timeline').textContent = result.timelineLabel;
    document.getElementById('sizer-timeline-sub').textContent = result.timelineSub;
    document.getElementById('sizer-investment').textContent = result.invLabel;

    const caseLink = document.getElementById('sizer-case-link');
    caseLink.href = `/work/${result.caseRef.slug}`;
    document.getElementById('sizer-case-name').textContent = result.caseRef.name;

    const svcLink = document.getElementById('sizer-service-link');
    svcLink.href = `/services/${result.serviceRef.slug}`;
    document.getElementById('sizer-service-name').textContent = result.serviceRef.name;

    const bookBtn = document.getElementById('sizer-book');
    if (CONFIG.BOOKING_URL) {
      bookBtn.href = CONFIG.BOOKING_URL;
      bookBtn.target = '_blank';
      bookBtn.rel = 'noopener';
    }

    // Hide the email form if Web3Forms isn't configured yet
    const form = document.getElementById('sizer-form');
    if (!CONFIG.WEB3FORMS_KEY) form.style.display = 'none';

    setStage('result');
  }

  // ─── Wire up option buttons ──────────────────────────────
  modal.querySelectorAll('.sizer-options').forEach(group => {
    const key = group.dataset.key;
    group.querySelectorAll('.sizer-opt').forEach(btn => {
      btn.addEventListener('click', () => {
        // Mark selection in current group
        group.querySelectorAll('.sizer-opt.is-selected').forEach(el => el.classList.remove('is-selected'));
        btn.classList.add('is-selected');

        state.answers[key] = btn.dataset.value;

        const next = (typeof state.step === 'number') ? state.step + 1 : 0;
        setTimeout(() => {
          if (next >= TOTAL_QUESTIONS) renderResult();
          else setStage(next);
        }, 220);
      });
    });
  });

  // Back button
  backBtn.addEventListener('click', () => {
    if (typeof state.step === 'number' && state.step > 0) {
      setStage(state.step - 1);
    }
  });

  // Restart
  modal.querySelector('[data-sizer-restart]').addEventListener('click', reset);

  // Close
  modal.querySelectorAll('[data-sizer-close]').forEach(btn => btn.addEventListener('click', close));

  // Triggers
  document.querySelectorAll('[data-sizer-open]').forEach(btn => btn.addEventListener('click', open));

  // ESC to close
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !modal.hidden) close();
  });

  // ─── Email submission via Web3Forms ──────────────────────
  const form = document.getElementById('sizer-form');
  if (form) {
    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (!CONFIG.WEB3FORMS_KEY) {
        showStatus('Email capture not configured yet. Use the booking button →', false);
        return;
      }
      const status = document.getElementById('sizer-form-status');
      const btn = form.querySelector('button[type="submit"]');
      const originalText = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Sending…';
      status.textContent = '';

      const result = computeResult(state.answers);
      const summary = [
        `Build: ${labelFor('build', state.answers.build)}`,
        `Starting from: ${labelFor('start', state.answers.start)}`,
        `Timeline target: ${labelFor('when', state.answers.when)}`,
        `Team gap: ${labelFor('gap', state.answers.gap)}`,
        ``,
        `Recommended team:`,
        ...result.team.map(t => `  • ${t}`),
        ``,
        `Timeline: ${result.timelineLabel} (${result.timelineSub})`,
        `Investment range: ${result.invLabel}`,
        `Closest case study: ${result.caseRef.name}`,
        `Service track: ${result.serviceRef.name}`,
      ].join('\n');

      const payload = {
        access_key: CONFIG.WEB3FORMS_KEY,
        from_name: CONFIG.BRAND_FROM_NAME,
        subject: 'Project sizer — your suggested team',
        email: form.email.value,
        message: summary,
      };

      try {
        const res = await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.success) {
          showStatus('Sent! Check your inbox.', true);
          form.reset();
        } else {
          showStatus(data.message || 'Could not send. Try the booking button →', false);
        }
      } catch (err) {
        showStatus('Network error. Try the booking button →', false);
      } finally {
        btn.disabled = false;
        btn.textContent = originalText;
      }
    });
  }

  function showStatus(text, ok) {
    const status = document.getElementById('sizer-form-status');
    status.textContent = text;
    status.style.color = ok ? '#BAEB42' : 'rgba(255,180,180,0.85)';
  }

  function labelFor(key, value) {
    const opt = modal.querySelector(`.sizer-options[data-key="${key}"] .sizer-opt[data-value="${value}"]`);
    return opt ? opt.textContent.trim() : value;
  }

  // ─── Public API: also wire up #estimate route ────────────
  window.MetovaSizer = {
    open, close, reset,
    setConfig: patch => Object.assign(CONFIG, patch || {}),
  };

  // Auto-open on /estimate page or #estimate hash
  if (location.pathname.replace(/\/$/, '') === '/estimate' || location.hash === '#estimate') {
    setTimeout(open, 150);
  }
})();
