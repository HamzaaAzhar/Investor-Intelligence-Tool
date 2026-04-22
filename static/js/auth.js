/* Auth module — login, register with risk quiz, session */
const Auth = (() => {
  let _user = null;
  let _halal = false;
  const _sel = {};   // quiz option selections

  const $ = id => document.getElementById(id);
  const show = id => { const e=$(id); if(e) e.classList.remove('hidden'); };
  const hide = id => { const e=$(id); if(e) e.classList.add('hidden'); };
  const err  = (id, msg) => { const e=$(id); if(!e) return; e.textContent=msg; show(id); setTimeout(()=>hide(id),5000); };
  const setBtn = (id, loading) => { const b=$(id); if(!b) return; b.disabled=loading; b.textContent=loading?'Please wait…':b.dataset.orig||(b.textContent||''); };

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
    const name = u.name||'User';
    const init = name.split(' ').map(w=>w[0]||'').join('').toUpperCase().slice(0,2)||'U';
    const av=$('user-avatar'), nm=$('user-name-display'), rc=$('risk-chip');
    if(av) av.textContent=init;
    if(nm) nm.textContent=name.split(' ')[0];
    if(rc && u.risk_label) { rc.textContent=u.risk_label; rc.className=`rbadge ${u.risk_label}`; }
  }

  function showStep(n) {
    [1,2,3,4].forEach(i => { const s=$(`step-${i}`); if(s) s.classList.toggle('hidden', i!==n); });
  }

  // ── Tab switching ─────────────────────────────────────────────────
  function initTabs() {
    document.querySelectorAll('.auth-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const w = tab.dataset.tab;
        const lf=$('login-form'), rf=$('register-flow');
        if(lf) lf.classList.toggle('hidden', w!=='login');
        if(rf) rf.classList.toggle('hidden', w!=='register');
        if(w==='register') showStep(1);
      });
    });
  }

  // ── Option grid buttons ───────────────────────────────────────────
  function initOpts() {
    document.querySelectorAll('.opt-grid').forEach(grid => {
      grid.querySelectorAll('.opt').forEach(btn => {
        btn.addEventListener('click', () => {
          grid.querySelectorAll('.opt').forEach(b=>b.classList.remove('sel'));
          btn.classList.add('sel');
          _sel[grid.id] = btn.dataset.val;
        });
      });
    });
  }

  // ── Login ────────────────────────────────────────────────────────
  async function submitLogin() {
    const email=$('login-email')?.value?.trim()||'';
    const pw=$('login-password')?.value||'';
    if(!email||!pw) { err('login-error','Please fill in all fields'); return; }
    const btn=$('login-btn');
    if(btn) { btn.dataset.orig='Sign In →'; btn.disabled=true; btn.textContent='Signing in…'; }
    const d = await API.login(email, pw);
    if(btn) { btn.disabled=false; btn.textContent='Sign In →'; }
    if(d.error) { err('login-error', d.error); return; }
    _user=d.user; updateUI(d.user); showApp();
    window.App && window.App.init && window.App.init();
  }

  // ── Register steps ────────────────────────────────────────────────
  function regNext(target) {
    if(target===2) {
      const n=$('reg-name')?.value?.trim()||'';
      const e=$('reg-email')?.value?.trim()||'';
      const p=$('reg-password')?.value||'';
      if(n.length<2)  { err('reg-err-1','Name must be at least 2 characters'); return; }
      if(!e.includes('@')) { err('reg-err-1','Enter a valid email'); return; }
      if(p.length<8)  { err('reg-err-1','Password must be at least 8 characters'); return; }
    }
    if(target===3) {
      const age=$('q-age')?.value, inc=$('q-income')?.value, goal=$('q-goal')?.value;
      if(!age||!inc||!goal) { err('reg-err-2','Please complete all fields'); return; }
    }
    showStep(target);
  }

  function regBack(step) { showStep(step); }

  function toggleHalal() {
    _halal=!_halal;
    const t=$('halal-pref-tog');
    if(t) t.classList.toggle('on', _halal);
  }

  async function submitRegister() {
    const horizon=_sel['opt-horizon'], loss=_sel['opt-loss'], exp=_sel['opt-exp'];
    if(!horizon||!loss||!exp) { err('reg-err-3','Please answer all questions'); return; }
    const btn=$('reg-submit');
    if(btn) { btn.disabled=true; btn.textContent='Creating account…'; }

    const name=$('reg-name')?.value?.trim()||'';
    const email=$('reg-email')?.value?.trim()||'';
    const pw=$('reg-password')?.value||'';
    const age=$('q-age')?.value||'';
    const income=$('q-income')?.value||'';
    const savings=$('q-savings')?.value||'';
    const goal=$('q-goal')?.value||'';

    const reg = await API.register({ name, email, password: pw });
    if(reg.error) { if(btn){btn.disabled=false;btn.textContent='Create Account →';} err('reg-err-3',reg.error); return; }

    const quiz = await API.profileQuiz({ age_group:age, income_range:income, invest_goal:goal,
      invest_horizon:horizon, monthly_savings:savings, loss_tolerance:loss, experience:exp, halal_only:_halal });
    if(btn){btn.disabled=false;btn.textContent='Create Account →';}
    if(quiz.error) { err('reg-err-3',quiz.error); return; }

    _user=quiz.user;
    const badges={conservative:'🛡️ Conservative',moderate:'⚖️ Moderate',aggressive:'🚀 Aggressive'};
    const descs={
      conservative:'You prefer capital safety. Recommended: NSS, Money Market Funds, Gold.',
      moderate:'You balance risk and reward. Recommended: Balanced Funds, Dividend Stocks, REITs.',
      aggressive:'You seek maximum growth. Recommended: Equity Funds, Growth Stocks, REITs.',
    };
    const colors={conservative:'#10B981',moderate:'#F59E0B',aggressive:'#EF4444'};
    const rb=$('risk-badge'), rs=$('risk-score-num'), rd=$('risk-desc');
    if(rb) { rb.textContent=badges[quiz.risk_label]||quiz.risk_label; rb.style.color=colors[quiz.risk_label]||'#fff'; }
    if(rs) rs.textContent=quiz.risk_score;
    if(rd) rd.textContent=descs[quiz.risk_label]||'';
    showStep(4);
  }

  function finishRegister() {
    updateUI(_user); showApp();
    window.App && window.App.init && window.App.init();
  }

  async function boot() {
    const d = await API.me();
    if(d && d.email) { _user=d; updateUI(d); showApp(); return true; }
    showAuth();
    return false;
  }

  function initLogout() {
    const btn=$('logout-btn');
    if(btn) btn.addEventListener('click', async () => {
      await API.logout(); _user=null; API.clearCache(); showAuth();
      document.querySelector('.auth-tab[data-tab="login"]')?.click();
    });
  }

  function getUser() { return _user; }

  function init() { initTabs(); initOpts(); initLogout(); }

  return { init, boot, getUser, updateUI, submitLogin, regNext, regBack, toggleHalal, submitRegister, finishRegister };
})();

window.Auth = Auth;
// Also expose on App namespace for backward compat
window.App = window.App || {};
window.App.Auth = Auth;
