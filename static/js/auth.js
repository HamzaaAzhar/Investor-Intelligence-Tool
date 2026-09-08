/* ── AUTH MODULE ─────────────────────────────────────────────────────────────
   Login, multi-step registration with risk quiz, session management.
   ─────────────────────────────────────────────────────────────────────────── */
const Auth = (() => {
  let _user  = null;
  let _halal = false;
  const _sel = {};   // stores quiz option selections keyed by grid id

  const $   = id  => document.getElementById(id);
  const show = id => { const e=$(id); if(e) e.classList.remove('hidden'); };
  const hide = id => { const e=$(id); if(e) e.classList.add('hidden'); };

  function showErr(id, msg) {
    const e=$(id); if(!e) return;
    e.textContent = msg;
    e.classList.remove('hidden');
    setTimeout(() => e.classList.add('hidden'), 6000);
  }

  function showAuth() {
    const o=$('auth-overlay'), a=$('app');
    if(o) o.classList.remove('hidden');
    if(a) a.classList.add('hidden');
  }

  function showApp() {
    const o=$('auth-overlay'), a=$('app');
    if(o) o.classList.add('hidden');
    if(a) a.classList.remove('hidden');
  }

  function updateUI(u) {
    if(!u) return;
    const name  = u.name || 'User';
    const init  = name.split(' ').map(w=>w[0]||'').join('').toUpperCase().slice(0,2) || 'U';
    const av=$('user-avatar'), nm=$('user-name-display'), rc=$('risk-chip');
    if(av) av.textContent = init;
    if(nm) nm.textContent = name.split(' ')[0];
    if(rc && u.risk_label) {
      rc.textContent = u.risk_label;
      rc.className   = `risk-tag ${u.risk_label}`;
    }
  }

  function showStep(n) {
    [1,2,3,4].forEach(i => {
      const s = $(`step-${i}`);
      if(s) s.classList.toggle('hidden', i !== n);
    });
  }

  // ── Tab switching ───────────────────────────────────────────────────────
  function initTabs() {
    document.querySelectorAll('.auth-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const which = tab.dataset.tab;
        const lf = $('login-form'), rf = $('register-flow');
        if(lf) lf.classList.toggle('hidden', which !== 'login');
        if(rf) rf.classList.toggle('hidden', which !== 'register');
        if(which === 'register') showStep(1);
      });
    });
  }

  // ── Option grid (risk quiz buttons) ────────────────────────────────────
  // FIX: buttons use class .opt-btn not .opt
  function initOpts() {
    document.querySelectorAll('.opt-grid').forEach(grid => {
      grid.addEventListener('click', e => {
        const btn = e.target.closest('.opt-btn');
        if(!btn) return;
        grid.querySelectorAll('.opt-btn').forEach(b => b.classList.remove('sel'));
        btn.classList.add('sel');
        _sel[grid.id] = btn.dataset.val;
      });
    });
  }

  // ── Login ────────────────────────────────────────────────────────────
  async function submitLogin() {
    const email = $('login-email')?.value?.trim() || '';
    const pw    = $('login-password')?.value || '';
    if(!email || !pw) { showErr('login-error', 'Please fill in all fields'); return; }

    const btn = $('login-btn');
    if(btn) { btn.disabled=true; btn.textContent='Signing in…'; }

    const d = await API.login(email, pw);

    if(btn) { btn.disabled=false; btn.textContent='Sign In →'; }
    if(d.error) { showErr('login-error', d.error); return; }

    _user = d.user;
    updateUI(d.user);
    showApp();
    window.App?.state && (window.App.state.user = d.user);
    window.App?.init?.();
  }

  // ── Register: step navigation ──────────────────────────────────────────
  function regNext(target) {
    if(target === 2) {
      const n = $('reg-name')?.value?.trim()  || '';
      const e = $('reg-email')?.value?.trim() || '';
      const p = $('reg-password')?.value      || '';
      // FIX: error element IDs are reg-error-1/2/3 not reg-err-1/2/3
      if(n.length < 2)       { showErr('reg-error-1', 'Name must be at least 2 characters'); return; }
      if(!e.includes('@'))   { showErr('reg-error-1', 'Enter a valid email address'); return; }
      if(p.length < 8)       { showErr('reg-error-1', 'Password must be at least 8 characters'); return; }
    }
    if(target === 3) {
      const age  = $('q-age')?.value;
      const inc  = $('q-income')?.value;
      const goal = $('q-goal')?.value;
      if(!age || !inc || !goal) { showErr('reg-error-2', 'Please complete all fields'); return; }
    }
    showStep(target);
  }

  function regBack(step) { showStep(step); }

  // ── Halal toggle (called from HTML click) ───────────────────────────────
  function toggleHalal() {
    _halal = !_halal;
    const t = $('halal-pref-tog');
    if(t) t.classList.toggle('on', _halal);
  }

  // ── Register: final submit ──────────────────────────────────────────────
  async function submitRegister() {
    const horizon = _sel['opt-horizon'];
    const loss    = _sel['opt-loss'];
    const exp     = _sel['opt-exp'];

    // FIX: error element ID is reg-error-3 not reg-err-3
    if(!horizon) { showErr('reg-error-3', 'Please select your investment horizon'); return; }
    if(!loss)    { showErr('reg-error-3', 'Please select your loss tolerance'); return; }
    if(!exp)     { showErr('reg-error-3', 'Please select your experience level'); return; }

    // FIX: button ID is reg-submit-btn not reg-submit
    const btn = $('reg-submit-btn');
    if(btn) { btn.disabled=true; btn.textContent='Creating account…'; }

    const name    = $('reg-name')?.value?.trim()  || '';
    const email   = $('reg-email')?.value?.trim() || '';
    const pw      = $('reg-password')?.value      || '';
    const age     = $('q-age')?.value     || '';
    const income  = $('q-income')?.value  || '';
    const savings = $('q-savings')?.value || '';
    const goal    = $('q-goal')?.value    || '';

    // Step 1: create account
    const reg = await API.register({ name, email, password: pw });
    if(reg.error) {
      if(btn) { btn.disabled=false; btn.textContent='Create Account & See My Profile →'; }
      showErr('reg-error-3', reg.error);
      return;
    }

    // Step 2: save risk quiz
    const quiz = await API.profileQuiz({
      age_group: age, income_range: income, invest_goal: goal,
      invest_horizon: horizon, monthly_savings: savings,
      loss_tolerance: loss, experience: exp, halal_only: _halal,
    });

    if(btn) { btn.disabled=false; btn.textContent='Create Account & See My Profile →'; }
    if(quiz.error) { showErr('reg-error-3', quiz.error); return; }

    _user = quiz.user;

    // Show risk result on step 4
    const labels = { conservative:'🛡️ Conservative', moderate:'⚖️ Moderate', aggressive:'🚀 Aggressive' };
    const colors = { conservative:'#02c076', moderate:'#f59e0b', aggressive:'#f6465d' };
    const descs  = {
      conservative: 'You prioritise capital safety. Best choices: NSS certificates, money market funds, and gold as your core investments.',
      moderate:     'You balance risk and reward. Best choices: balanced mutual funds, dividend-paying stocks, and REITs.',
      aggressive:   'You seek maximum long-term growth. Best choices: equity funds, growth stocks, and PSX blue chips.',
    };

    // FIX: element IDs are risk-badge, risk-score-val, risk-desc (not risk-score-num)
    const rb = $('risk-badge');
    const rs = $('risk-score-val');
    const rd = $('risk-desc');
    if(rb) { rb.textContent = labels[quiz.risk_label] || quiz.risk_label; rb.style.color = colors[quiz.risk_label] || '#fff'; }
    if(rs) rs.textContent = quiz.risk_score;
    if(rd) rd.textContent = descs[quiz.risk_label] || '';

    showStep(4);
  }

  function finishRegister() {
    updateUI(_user);
    showApp();
    window.App?.state && (window.App.state.user = _user);
    window.App?.init?.();
  }

  // ── Boot: check existing session ───────────────────────────────────────
  async function boot() {
    try {
      const d = await API.me();
      if(d && d.email) {
        _user = d;
        updateUI(d);
        showApp();
        return true;
      }
    } catch {}
    showAuth();
    return false;
  }

  // ── Logout ─────────────────────────────────────────────────────────────
  function initLogout() {
    const btn = $('logout-btn');
    if(btn) btn.addEventListener('click', async () => {
      await API.logout();
      _user = null;
      API.clearCache();
      showAuth();
      document.querySelector('.auth-tab[data-tab="login"]')?.click();
    });
  }

  function getUser() { return _user; }

  function init() {
    initTabs();
    initOpts();
    initLogout();
  }

  return {
    init, boot, getUser, updateUI,
    submitLogin, regNext, regBack,
    toggleHalal, submitRegister, finishRegister,
  };
})();

window.Auth = Auth;
window.App  = window.App || {};
window.App.Auth = Auth;
