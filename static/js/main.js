/* ── MAIN BOOTSTRAP ─────────────────────────────────────────────────────────── */
(async () => {
  const $ = id => document.getElementById(id);
  const SESSION_ID = (() => {
    let id = sessionStorage.getItem('bt_sid');
    if (!id) { id = Math.random().toString(36).slice(2)+Date.now().toString(36); sessionStorage.setItem('bt_sid',id); }
    return id;
  })();

  const Analytics = {
    track:(ev,mod)=>{ try{API.trackEvent(SESSION_ID,ev,mod,0).catch(()=>{});}catch{} },
    leave:(mod)=>{ try{API.trackEvent(SESSION_ID,'page_leave',mod,0).catch(()=>{});}catch{} },
    enter:(mod)=>{ try{API.trackEvent(SESSION_ID,'page_view',mod,0).catch(()=>{});}catch{} },
  };
  window.App = window.App || {};
  window.App.Analytics = Analytics;
  window.App.state = {};

  // Clock
  setInterval(()=>{ const el=$('clock'); if(el) el.textContent=new Date().toLocaleTimeString('en-PK',{hour:'2-digit',minute:'2-digit',second:'2-digit'}); },1000);

  // Sidebar toggle
  $('sidebar-toggle')?.addEventListener('click',()=>$('sidebar')?.classList.toggle('collapsed'));

  // Page registry — uses window.BTP which is set by pages.js
  const PAGE_TITLES = {
    overview:'Overview Dashboard', gold:'Gold & Silver', stocks:'PSX Stocks',
    funds:'Mutual Funds', fixed:'Govt Bonds & NSS', reits:'REITs & Real Estate',
    opportunities:'All Opportunities', portfolio:'Portfolio Builder',
    simulator:'Trading Simulator', profile:'My Profile',
  };

  let currentPage = 'overview';

  async function navigateTo(page) {
    const fn = window.BTP?.[page === 'fixed' ? 'fixedIncome' : page];
    if (!fn) {
      const el = $('content');
      if (el) el.innerHTML = `<div class="empty"><div class="empty-icon">⚠️</div>
        <div class="empty-msg">Page function not found</div>
        <div class="empty-hint">BTP.${page} is undefined — check pages.js loaded correctly</div></div>`;
      return;
    }

    Analytics.leave(currentPage);
    currentPage = page;

    document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.page === page));
    const titleEl = $('page-title'), subEl = $('page-sub'), content = $('content');
    if (titleEl) titleEl.textContent = PAGE_TITLES[page]||page;
    if (subEl)   subEl.textContent   = 'Pakistan Investment Intelligence · March 2026';
    if (content) content.innerHTML   = `<div class="init-loader"><div class="init-spinner"></div><div class="init-text">Loading ${PAGE_TITLES[page]||page}…</div></div>`;

    Analytics.enter(page);
    try { await fn(); }
    catch(err) {
      console.error('[Page error]', page, err);
      const c = $('content');
      if (c) c.innerHTML = `<div class="empty"><div class="empty-icon">⚠️</div>
        <div class="empty-msg">Error: ${err.message||err}</div>
        <div class="empty-hint">Check browser console for details</div></div>`;
    }
  }

  window.App.navigateTo = navigateTo;
  document.querySelectorAll('.nav-btn[data-page]').forEach(btn => {
    btn.addEventListener('click', () => navigateTo(btn.dataset.page));
  });

  // Ticker
  function buildTicker(stocks) {
    const t = $('ticker'); if (!t||!stocks?.length) return;
    const html = stocks.map(s=>{
      const cls=s.d>=0?'up':'dn', arr=s.d>=0?'▲':'▼';
      return `<span class="ti"><strong style="color:var(--t1)">${s.sym}</strong> ₨${(s.p||0).toFixed(2)} <span class="${cls}">${arr}${Math.abs(s.d||0)}%</span></span>`;
    }).join('');
    t.innerHTML = html+html;
  }

  function updateKSE(val, chg) {
    const v=$('kse-live'), c=$('kse-chg');
    if (v) v.textContent=(val||90400).toLocaleString();
    if (c) { const n=chg||0; c.textContent=`${n>=0?'▲':'▼'}${Math.abs(n).toFixed(2)}%`; c.className=`${n>=0?'up':'dn'}`; }
  }

  // Load market data
  async function initMarketData() {
    try {
      const d = await API.init();
      window.App.state = { stocks:d.stocks||[], sectors:d.sectors||[], exchange:d.exchange||{}, summary:d.summary||{} };
      buildTicker(d.stocks||[]);
      updateKSE(d.summary?.kse100, d.summary?.kse100_chg);
    } catch(err) {
      console.error('[Init]', err);
      window.App.state = { stocks:[], sectors:[], exchange:{}, summary:{} };
    }
    await navigateTo('overview');
    setInterval(async()=>{ try{const sd=await API.stocks();if(sd?.stocks){window.App.state.stocks=sd.stocks;buildTicker(sd.stocks);updateKSE(sd.kse100,sd.kse100_chg);}}catch{} },60000);
  }

  window.App.init = initMarketData;

  // Boot
  try {
    App.Auth.init();
    const loggedIn = await App.Auth.boot();
    if (loggedIn) {
      // Store user in state for profile page
      const me = await API.me();
      window.App.state.user = me;
      await initMarketData();
    }
  } catch(err) {
    console.error('[Boot]', err);
    const o=$('auth-overlay'), a=$('app');
    if(o) o.classList.remove('hidden');
    if(a) a.classList.add('hidden');
  }

  Analytics.track('session_start','overview');

})().catch(err=>{
  console.error('[Fatal]', err);
  const o=document.getElementById('auth-overlay');
  if(o) o.classList.remove('hidden');
});
