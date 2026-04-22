/* ── PAGES — complete rewrite ────────────────────────────────────────────────
   No inline onclick handlers. All filters use addEventListener after render.
   Exported as window.BTP (BazaarTradePro) to avoid name collision.
   ─────────────────────────────────────────────────────────────────────────── */

/* ── Shared helpers ─────────────────────────────────────────────────────────── */
const $ = id => document.getElementById(id);
const fmtPKR = n => n >= 1e7 ? `₨${(n/1e7).toFixed(2)}Cr` : n >= 1e5 ? `₨${(n/1e5).toFixed(2)}L` : `₨${Math.round(n).toLocaleString()}`;
const chgHtml = (v, sz=11) => {
  const cls = v >= 0 ? 'up' : 'dn', arr = v >= 0 ? '▲' : '▼';
  return `<span class="mono ${cls}" style="font-size:${sz}px">${arr}${Math.abs(v||0).toFixed(2)}%</span>`;
};
const pillHtml  = (t, cls='pill-grey') => `<span class="pill ${cls}">${t}</span>`;
const riskColor = r => ({'Very Low':'#02c076','Low':'#06b6d4','Medium':'#f59e0b','High':'#f6465d'}[r]||'#848e9c');
const starHtml  = n => Array.from({length:5},(_,i)=>`<span style="color:${i<n?'#f0b90b':'#2b3139'};font-size:12px">★</span>`).join('');
const statCard  = (label, value, chg, col='#eaecef', sub='') =>
  `<div class="stat-card"><div class="stat-label">${label}</div>` +
  `<div class="stat-value" style="color:${col}">${value}</div>` +
  (sub ? `<div class="stat-sub">${sub}</div>` : '') +
  (chg !== undefined ? `<div class="stat-chg">${chgHtml(chg)}</div>` : '') +
  `</div>`;
const pbtns = (active, ...periods) =>
  `<div class="pbtns">${periods.map(p=>`<button class="pbtn${p===active?' active':''}" data-p="${p}">${p}</button>`).join('')}</div>`;

// AI panel - returns HTML, wires button after insertion
let _aiCounter = 0;
function aiPanel(topic, label) {
  const id = 'ai' + (++_aiCounter);
  setTimeout(() => {
    const btn = $(id + 'btn');
    if (!btn) return;
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      btn.innerHTML = '<span class="spin-sm">↻</span> Analysing…';
      try {
        const d = await API.aiInsight(topic, '');
        const body = $(id + 'body');
        if (body) body.innerHTML = d.error
          ? `<div style="color:#f6465d;font-size:12px">⚠ ${d.error}</div>`
          : `<div class="ai-body">${(d.insight||'').replace(/</g,'&lt;')}</div>`;
      } catch(e) {
        const body = $(id + 'body');
        if (body) body.innerHTML = '<div style="color:#f6465d;font-size:12px">⚠ Network error</div>';
      }
      btn.disabled = false;
      btn.innerHTML = '⚡ Get AI Insights';
    });
  }, 50);
  return `<div class="ai-panel"><div class="ai-hd">
    <div class="ai-label">🧠 AI INTELLIGENCE — ${label.toUpperCase()}</div>
    <button class="btn-ai" id="${id}btn">⚡ Get AI Insights</button>
  </div>
  <div id="${id}body" class="ai-hint" style="margin-top:8px">Click to generate real-time Pakistan market analysis powered by Claude AI</div>
  </div>`;
}

// ── MARKET DATA ───────────────────────────────────────────────────────────────
const STOCKS = [
  {sym:'OGDC', name:'Oil & Gas Dev.',      p:198.45,  d:2.3,  w:3.1,  m:8.2,  q:18.5, y:32.1, sec:'Energy',     pe:8.2,  dv:5.1, cap:'₨620B', col:'#f59e0b'},
  {sym:'HBL',  name:'Habib Bank',           p:243.80,  d:1.8,  w:2.9,  m:7.5,  q:16.8, y:28.4, sec:'Banking',    pe:7.5,  dv:6.2, cap:'₨375B', col:'#1890ff'},
  {sym:'MCB',  name:'MCB Bank',             p:338.20,  d:-0.9, w:-1.2, m:4.1,  q:9.8,  y:22.3, sec:'Banking',    pe:6.8,  dv:7.1, cap:'₨404B', col:'#06b6d4'},
  {sym:'ENGRO',name:'Engro Corp',           p:412.50,  d:3.2,  w:5.1,  m:14.3, q:28.1, y:48.2, sec:'Fertilizer', pe:12.1, dv:4.8, cap:'₨695B', col:'#a855f7'},
  {sym:'PPL',  name:'Pakistan Petroleum',   p:178.90,  d:1.5,  w:2.8,  m:6.9,  q:15.2, y:28.9, sec:'Energy',     pe:7.1,  dv:5.9, cap:'₨298B', col:'#f6465d'},
  {sym:'FFC',  name:'Fauji Fertilizer',     p:152.30,  d:-1.2, w:-0.8, m:2.3,  q:8.1,  y:18.5, sec:'Fertilizer', pe:9.3,  dv:8.2, cap:'₨218B', col:'#f0b90b'},
  {sym:'LUCK', name:'Lucky Cement',         p:1285.0,  d:4.1,  w:6.8,  m:18.5, q:38.2, y:62.1, sec:'Cement',     pe:11.2, dv:3.1, cap:'₨420B', col:'#f59e0b'},
  {sym:'UBL',  name:'United Bank',          p:298.45,  d:2.1,  w:3.4,  m:9.1,  q:20.5, y:35.8, sec:'Banking',    pe:7.2,  dv:6.8, cap:'₨366B', col:'#1890ff'},
  {sym:'HUBC', name:'Hub Power',            p:145.70,  d:0.8,  w:1.2,  m:3.8,  q:9.2,  y:15.4, sec:'Power',      pe:10.5, dv:7.5, cap:'₨198B', col:'#02c076'},
  {sym:'EFERT',name:'Engro Fertilizers',    p:98.60,   d:-0.5, w:0.3,  m:5.2,  q:12.1, y:22.8, sec:'Fertilizer', pe:8.8,  dv:9.1, cap:'₨156B', col:'#a855f7'},
  {sym:'BAHL', name:'Bank AL Habib',        p:87.40,   d:1.4,  w:2.1,  m:6.1,  q:13.5, y:24.2, sec:'Banking',    pe:5.9,  dv:5.5, cap:'₨122B', col:'#06b6d4'},
  {sym:'MARI', name:'Mari Petroleum',       p:2890.0,  d:3.8,  w:5.2,  m:15.9, q:32.8, y:55.4, sec:'Energy',     pe:9.8,  dv:2.8, cap:'₨332B', col:'#f6465d'},
  {sym:'MLCF', name:'Maple Leaf Cement',    p:68.20,   d:-2.1, w:-3.2, m:1.4,  q:5.8,  y:12.1, sec:'Cement',     pe:7.5,  dv:3.9, cap:'₨38B',  col:'#f0b90b'},
  {sym:'NETSOL',name:'NetSol Technologies', p:156.50,  d:5.2,  w:8.9,  m:28.4, q:65.2, y:110.5,sec:'Technology', pe:18.5, dv:1.2, cap:'₨19B',  col:'#a855f7'},
  {sym:'MEBL', name:'Meezan Bank',          p:218.90,  d:2.5,  w:3.8,  m:11.2, q:24.5, y:41.2, sec:'Banking',    pe:9.2,  dv:4.1, cap:'₨310B', col:'#02c076'},
];
const SECTORS = [
  {n:'Technology',  d:2.8,  w:7.2,  m:28.4, q:65,  cap:'₨142B', cnt:8,  col:'#a855f7'},
  {n:'Cement',      d:1.2,  w:3.1,  m:15.2, q:38,  cap:'₨580B', cnt:20, col:'#f59e0b'},
  {n:'Fertilizer',  d:0.8,  w:2.8,  m:12.5, q:31,  cap:'₨890B', cnt:6,  col:'#f0b90b'},
  {n:'Banking',     d:1.4,  w:2.9,  m:9.1,  q:24,  cap:'₨2.1T', cnt:25, col:'#1890ff'},
  {n:'Energy',      d:1.6,  w:3.5,  m:10.2, q:28,  cap:'₨1.8T', cnt:18, col:'#f6465d'},
  {n:'Power',       d:0.5,  w:1.2,  m:4.8,  q:15,  cap:'₨420B', cnt:12, col:'#06b6d4'},
];
const FUNDS = [
  {id:'meezan-cash',  name:'Meezan Cash Fund',         cat:'Money Market', amc:'Meezan',  y1:21.5,y3:18.2,y5:16.5,risk:'Low',   min:500,  halal:true, aum:'₨180B',er:0.85,stars:5},
  {id:'alhabib-inc',  name:'Al-Habib Income Fund',      cat:'Income',       amc:'Al-Habib',y1:20.8,y3:17.9,y5:15.9,risk:'Low',   min:1000, halal:false,aum:'₨82B', er:1.20,stars:4},
  {id:'meezan-bal',   name:'Meezan Balanced Fund',      cat:'Balanced',     amc:'Meezan',  y1:28.3,y3:22.1,y5:20.2,risk:'Medium',min:1000, halal:true, aum:'₨95B', er:2.10,stars:5},
  {id:'nbp-stock',    name:'NBP Stock Fund',            cat:'Equity',       amc:'NBP',     y1:35.2,y3:28.5,y5:25.8,risk:'High',  min:5000, halal:false,aum:'₨48B', er:2.50,stars:3},
  {id:'meezan-eq',    name:'Meezan Islamic Equity',     cat:'Equity',       amc:'Meezan',  y1:31.5,y3:25.3,y5:22.4,risk:'High',  min:500,  halal:true, aum:'₨120B',er:2.25,stars:5},
  {id:'nafa-inc',     name:'NAFA Islamic Income',       cat:'Income',       amc:'NAFA',    y1:19.8,y3:17.1,y5:15.5,risk:'Low',   min:500,  halal:true, aum:'₨44B', er:1.10,stars:4},
  {id:'atlas-eq',     name:'Atlas Stock Market Fund',   cat:'Equity',       amc:'Atlas',   y1:29.5,y3:23.8,y5:21.5,risk:'High',  min:1000, halal:false,aum:'₨28B', er:2.40,stars:4},
  {id:'hbl-mm',       name:'HBL Money Market Fund',    cat:'Money Market', amc:'HBL',     y1:20.9,y3:17.8,y5:16.1,risk:'Low',   min:500,  halal:false,aum:'₨92B', er:0.90,stars:4},
];
const FIXED = [
  {name:'NSS Regular Savings', abbr:'NSS-RS', rate:17.4, term:'Flexible',risk:'Very Low',min:'₨500',  halal:true, tag:'BEGINNER', issuer:'GoP'},
  {name:'NSS Special Savings', abbr:'NSS-SS', rate:18.5, term:'3 yr',    risk:'Very Low',min:'₨500',  halal:true, tag:'BEST RATE', issuer:'GoP'},
  {name:'NSS Bahbood Cert.',   abbr:'NSS-BC', rate:21.12,term:'3 yr',    risk:'Very Low',min:'₨500',  halal:true, tag:'PENSIONERS',issuer:'GoP'},
  {name:'T-Bill 91 Day',       abbr:'T-91',   rate:16.2, term:'91 days', risk:'Very Low',min:'₨50K',  halal:false,tag:'LIQUID',    issuer:'GoP'},
  {name:'T-Bill 182 Day',      abbr:'T-182',  rate:16.8, term:'6 months',risk:'Very Low',min:'₨50K',  halal:false,tag:'LIQUID',    issuer:'GoP'},
  {name:'PIB 3 Year',          abbr:'PIB-3',  rate:17.8, term:'3 yr',    risk:'Very Low',min:'₨100K', halal:false,tag:'',         issuer:'GoP'},
  {name:'PIB 5 Year',          abbr:'PIB-5',  rate:17.9, term:'5 yr',    risk:'Very Low',min:'₨100K', halal:false,tag:'',         issuer:'GoP'},
  {name:'Sukuk (Ijarah)',      abbr:'Sukuk',  rate:17.2, term:'3-5 yr',  risk:'Low',     min:'₨10K',  halal:true, tag:'HALAL',    issuer:'GoP'},
  {name:'Corp Bonds AA+',      abbr:'Corp',   rate:20.5, term:'2-5 yr',  risk:'Low',     min:'₨100K', halal:false,tag:'HIGH YIELD',issuer:'Corp'},
  {name:'Bank Fixed Deposit',  abbr:'FD',     rate:15.5, term:'1-3 yr',  risk:'Very Low',min:'₨10K',  halal:false,tag:'',         issuer:'Bank'},
  {name:'Real Estate (DHA)',   abbr:'RE-DHA', rate:15.0, term:'Varies',  risk:'Medium',  min:'₨50L+', halal:true, tag:'',         issuer:'Market'},
  {name:'USD Savings',         abbr:'FX/USD', rate:4.5,  term:'Flexible',risk:'Medium',  min:'₨25K',  halal:false,tag:'FX HEDGE', issuer:'Bank'},
];
const REITS = [
  {sym:'SREIT',name:'Dolmen City REIT',       p:10.25,yield:8.2, nav:11.5,sector:'Commercial',dist:'Quarterly',  col:'#1890ff'},
  {sym:'AREIT',name:'Arif Habib REIT',        p:8.90, yield:9.1, nav:9.8, sector:'Mixed',      dist:'Semi-Annual',col:'#a855f7'},
  {sym:'PREIT',name:'Pakistan REIT',          p:6.45, yield:10.5,nav:7.2, sector:'Industrial', dist:'Annual',     col:'#02c076'},
  {sym:'BREIT',name:'Al-Baraka REIT (Halal)', p:9.80, yield:8.8, nav:10.5,sector:'Commercial', dist:'Quarterly',  col:'#f0b90b'},
];

// Seeded chart data
const _rng = s => { let x=s&0xFFFFFFFF; return ()=>{ x=(x*1664525+1013904223)&0xFFFFFFFF; return (x>>>0)/0xFFFFFFFF; }; };
const ASSET_CFG = {
  kse100:{base:90400,vol:0.012,trend:0.18,seed:42}, gold:{base:327000,vol:0.008,trend:0.14,seed:99},
  silver:{base:3620,vol:0.01,trend:0.12,seed:77},
  OGDC:{base:198.45,vol:0.018,trend:0.32,seed:11}, HBL:{base:243.80,vol:0.016,trend:0.28,seed:22},
  MCB:{base:338.20,vol:0.015,trend:0.22,seed:33},  ENGRO:{base:412.50,vol:0.02,trend:0.48,seed:44},
  PPL:{base:178.90,vol:0.017,trend:0.29,seed:55},  FFC:{base:152.30,vol:0.014,trend:0.18,seed:66},
  LUCK:{base:1285,vol:0.022,trend:0.62,seed:77},   UBL:{base:298.45,vol:0.016,trend:0.36,seed:88},
  MEBL:{base:218.90,vol:0.016,trend:0.41,seed:68}, MARI:{base:2890,vol:0.019,trend:0.55,seed:35},
  NETSOL:{base:156.50,vol:0.028,trend:1.1,seed:57},
};
const PERIOD_N = {D:24,W:7,M:30,'3M':13,'6M':26,'1Y':52};
const PERIOD_LBL = {
  D:i=>`${i}h`, W:i=>['Mo','Tu','We','Th','Fr','Sa','Su'][i], M:i=>`${i+1}`,
  '3M':i=>`W${i+1}`, '6M':i=>['Oct','Nov','Dec','Jan','Feb','Mar'][Math.floor(i*6/26)]||'',
  '1Y':i=>['Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar'][Math.floor(i*12/52)]||'',
};
function buildSeries(asset, period) {
  const cfg = ASSET_CFG[asset]||{base:100,vol:0.015,trend:0.2,seed:1};
  const key = period.replace('1','');
  const n   = PERIOD_N[key]||12;
  const lbl = PERIOD_LBL[key]||((i)=>`${i}`);
  const rng = _rng(cfg.seed+period.charCodeAt(0)*7);
  const tf  = cfg.trend*(n/52);
  let p     = cfg.base/(1+tf);
  const labels=[], values=[];
  for (let i=0;i<n;i++) {
    p *= 1+tf/n+(rng()-.47)*cfg.vol;
    labels.push(lbl(i)); values.push(Math.round(p*100)/100);
  }
  return {labels,values};
}

// ─────────────────────────────────────────────────────────────────────────────
// OVERVIEW
// ─────────────────────────────────────────────────────────────────────────────
async function overview() {
  let chartPeriod = '1M', sectPeriod = '1M';
  const gainers = [...STOCKS].filter(s=>s.d>0).sort((a,b)=>b.d-a.d).slice(0,6);
  const losers  = [...STOCKS].filter(s=>s.d<0).sort((a,b)=>a.d-b.d).slice(0,6);

  const el = $('content'); if (!el) return;
  el.innerHTML = `
  <div class="stats-row">
    ${statCard('KSE-100','90,400',2.6,'#02c076')}
    ${statCard('Gold / Tola','₨3,27,000',2.5,'#f0b90b')}
    ${statCard('Silver / Tola','₨3,620',1.7,'#06b6d4')}
    ${statCard('PKR / USD','₨278.40',-0.3,'#848e9c')}
    ${statCard('SBP Rate','17.50%',undefined,'#f59e0b','Policy rate')}
    ${statCard('CPI Inflation','12.6%',undefined,'#f6465d','Mar 2026 YoY')}
  </div>

  <div class="g2 mb10">
    <div class="card">
      <div class="card-hd">
        <div><div class="card-title">KSE-100 Index</div><div class="card-sub">Pakistan Stock Exchange · Click a period to update</div></div>
        <div id="kse-period-btns">${pbtns(chartPeriod,'1D','1W','1M','3M','6M','1Y')}</div>
      </div>
      <div class="card-body"><div class="chart-wrap" style="height:185px"><canvas id="kse-chart"></canvas></div></div>
    </div>
    <div class="card">
      <div class="card-hd"><div class="card-title">Market Snapshot</div></div>
      <div class="card-body">
        <div style="font-size:10px;color:var(--t2);text-transform:uppercase;letter-spacing:.6px;font-weight:700;margin-bottom:8px">Market Breadth</div>
        ${[{l:'Advances',v:312,tot:520,c:'#02c076'},{l:'Declines',v:186,tot:520,c:'#f6465d'},{l:'Unchanged',v:22,tot:520,c:'#848e9c'}].map(x=>`
        <div class="breadth-item">
          <div class="breadth-hd"><span>${x.l}</span><span class="mono" style="color:${x.c};font-weight:600">${x.v}</span></div>
          <div class="prog-track"><div class="prog-fill" style="width:${(x.v/x.tot*100).toFixed(1)}%;background:${x.c}"></div></div>
        </div>`).join('')}
        <div style="border-top:1px solid var(--brd);margin:12px 0 8px"></div>
        ${[{k:'52W Highs',v:'48',c:'#02c076'},{k:'52W Lows',v:'12',c:'#f6465d'},{k:'Daily Volume',v:'₨28.4B',c:'#eaecef'},{k:'Avg P/E',v:'8.2×',c:'#f59e0b'},{k:'Div Yield',v:'5.8%',c:'#06b6d4'}].map(x=>`
        <div class="kv"><span class="kv-k">${x.k}</span><span class="kv-v" style="color:${x.c}">${x.v}</span></div>`).join('')}
      </div>
    </div>
  </div>

  <div class="g2 mb10">
    <div class="card">
      <div class="card-hd">
        <div><div class="card-title" style="color:#f0b90b">Gold (PKR / Tola)</div><div class="card-sub">24K benchmark</div></div>
        <div id="gold-period-btns">${pbtns(chartPeriod,'1W','1M','3M','6M','1Y')}</div>
      </div>
      <div class="card-body"><div class="chart-wrap" style="height:145px"><canvas id="gold-chart"></canvas></div></div>
    </div>
    <div class="card">
      <div class="card-hd">
        <div class="card-title">Sector Performance</div>
        <div id="sect-period-btns">${pbtns(sectPeriod,'1D','1W','1M','3M')}</div>
      </div>
      <div style="padding:8px 16px"><div class="chart-wrap" style="height:163px"><canvas id="sect-chart"></canvas></div></div>
    </div>
  </div>

  <div class="g2 mb10">
    ${[{title:'🟢 Top Gainers',data:gainers},{title:'🔴 Top Losers',data:losers}].map(({title,data})=>`
    <div class="card"><div class="card-hd"><div class="card-title">${title}</div><span style="font-size:10px;color:var(--t2)">Today</span></div>
      ${data.map(s=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 16px;border-bottom:1px solid rgba(43,49,57,.3)">
        <div style="display:flex;align-items:center;gap:7px">
          <span style="width:7px;height:7px;border-radius:50%;background:${s.col};flex-shrink:0"></span>
          <div><span class="mono" style="font-weight:700;font-size:12px;color:${s.col}">${s.sym}</span>
          <span style="font-size:10px;color:var(--t2);margin-left:5px">${s.sec}</span></div>
        </div>
        <div style="text-align:right"><div class="mono" style="font-size:12px;color:var(--t1)">₨${s.p.toFixed(2)}</div>${chgHtml(s.d)}</div>
      </div>`).join('')}
    </div>`).join('')}
  </div>

  <div class="card mb10">
    <div class="card-hd"><div class="card-title">Asset Class Annual Returns vs Inflation</div><div class="card-sub">Red line = CPI 12.6%</div></div>
    <div class="card-body"><div class="chart-wrap" style="height:180px"><canvas id="asset-chart"></canvas></div></div>
  </div>
  ${aiPanel('Pakistan overall financial markets March 2026 — KSE-100 at 90,400, gold ₨327K/tola, SBP rate 17.5%, inflation 12.6%, IMF program outlook','Market Overview')}`;

  // Draw initial charts
  await drawKSE(chartPeriod);
  await drawGold(chartPeriod);
  drawSectors(sectPeriod);
  drawAssetCompare();

  // Wire period buttons — KSE
  el.querySelector('#kse-period-btns').addEventListener('click', async e => {
    const btn = e.target.closest('.pbtn'); if (!btn) return;
    chartPeriod = btn.dataset.p;
    el.querySelectorAll('#kse-period-btns .pbtn').forEach(b => b.classList.toggle('active', b.dataset.p === chartPeriod));
    await drawKSE(chartPeriod);
  });
  // Gold periods
  el.querySelector('#gold-period-btns').addEventListener('click', async e => {
    const btn = e.target.closest('.pbtn'); if (!btn) return;
    chartPeriod = btn.dataset.p;
    el.querySelectorAll('#gold-period-btns .pbtn').forEach(b => b.classList.toggle('active', b.dataset.p === chartPeriod));
    await drawGold(chartPeriod);
  });
  // Sector periods
  el.querySelector('#sect-period-btns').addEventListener('click', e => {
    const btn = e.target.closest('.pbtn'); if (!btn) return;
    sectPeriod = btn.dataset.p;
    el.querySelectorAll('#sect-period-btns .pbtn').forEach(b => b.classList.toggle('active', b.dataset.p === sectPeriod));
    drawSectors(sectPeriod);
  });
}

async function drawKSE(period) {
  const d = buildSeries('kse100', period);
  Charts.area('kse-chart', d.labels, d.values, '#02c076', {yFmt: v=>`${(v/1000).toFixed(0)}K`});
}
async function drawGold(period) {
  const d = buildSeries('gold', period);
  Charts.area('gold-chart', d.labels, d.values, '#f0b90b', {yFmt: v=>`₨${(v/1000).toFixed(0)}K`});
}
function drawSectors(period) {
  const key = {D:'d',W:'w',M:'m','3M':'q','1D':'d','1W':'w','1M':'m'}[period.replace('1','')]||'m';
  const sorted = [...SECTORS].sort((a,b)=>b[key]-a[key]);
  Charts.hbar('sect-chart', sorted.map(s=>s.n), sorted.map(s=>s[key]), sorted.map(s=>s.col));
}
function drawAssetCompare() {
  const data = [
    {n:'NSS',r:18.5,c:'#02c076'},{n:'T-Bills',r:16.2,c:'#1890ff'},{n:'Sukuk',r:17.2,c:'#a855f7'},
    {n:'Gold',r:18.5,c:'#f0b90b'},{n:'MF Avg',r:26.5,c:'#06b6d4'},{n:'PSX Avg',r:24.5,c:'#f59e0b'},
    {n:'Best Fund',r:35.2,c:'#02c076'},{n:'Best Stock',r:110.5,c:'#f6465d'},
  ];
  Charts.vbar('asset-chart', data.map(d=>d.n), data.map(d=>d.r), data.map(d=>d.c), {yFmt:v=>v+'%', refLine:12.6});
}

// ─────────────────────────────────────────────────────────────────────────────
// GOLD & SILVER
// ─────────────────────────────────────────────────────────────────────────────
async function gold() {
  let period = '1M', purity = '24K';
  const PM = {'24K':1,'22K':0.9167,'21K':0.875,'18K':0.75};
  const g24 = 327000;

  const el = $('content'); if (!el) return;
  el.innerHTML = `
  <div class="stats-row">
    ${statCard('Gold 24K / Tola','₨3,27,000',2.5,'#f0b90b')}
    ${statCard('Gold / 10g','₨2,80,220',undefined,'#f0b90b',"Int'l ~$3,120/oz")}
    ${statCard('Silver / Tola','₨3,620',1.7,'#06b6d4')}
    ${statCard('Gold : Silver','90.3 : 1',undefined,'#848e9c','Historic avg ~65:1')}
  </div>

  <div class="card mb10">
    <div class="card-hd">
      <div><div class="card-title">Purity Price Calculator</div><div class="card-sub">Select purity to see prices</div></div>
      <div id="purity-btns" class="pbtns">
        ${['24K','22K','21K','18K'].map(k=>`<button class="pbtn${k==='24K'?' active':''}" data-purity="${k}">${k}</button>`).join('')}
      </div>
    </div>
    <div id="purity-values" class="card-body">
      <div class="g4">${renderPurityValues(g24, '24K', PM)}</div>
    </div>
  </div>

  <div class="card mb10">
    <div class="card-hd">
      <div><div class="card-title">Gold vs Silver — Historical PKR</div><div class="card-sub">Gold left axis · Silver right axis</div></div>
      <div id="gold-period-btns">${pbtns(period,'1W','1M','3M','6M','1Y')}</div>
    </div>
    <div class="card-body">
      <div style="display:flex;gap:16px;margin-bottom:8px">
        <div style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--t2)"><span style="width:18px;height:2px;background:#f0b90b;display:inline-block"></span>Gold</div>
        <div style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--t2)"><span style="width:18px;height:2px;background:#06b6d4;display:inline-block;border-top:2px dashed #06b6d4"></span>Silver</div>
      </div>
      <div class="chart-wrap" style="height:200px"><canvas id="gold-hist-chart"></canvas></div>
    </div>
  </div>

  <div class="card mb10">
    <div class="card-hd"><div class="card-title">Where to Buy Gold in Pakistan</div><div class="card-sub">Verified sources</div></div>
    <div class="card-body">
      <div class="g2">
        ${[
          {n:'Sarafa Bazaar',t:'Physical',tc:'pill-gold',d:'Anarkali/Johari (Lahore), Bohri/Saddar (Karachi). Buy hallmarked bars. Negotiate on making charges.',pro:'No platform fees · Tangible',con:'Needs safe storage'},
          {n:'Pakistan Mint',t:'Official Bullion',tc:'pill-green',d:'24K bullion coins & bars from SBP-authorised dealers. Government-guaranteed 9999 fine purity.',pro:'Guaranteed purity',con:'Limited availability'},
          {n:'Meezan / HBL Digital Gold',t:'Digital',tc:'pill-blue',d:'Buy from ₨1,000 via mobile banking. Gold held in certified vault. Instant buy/sell.',pro:'Start from ₨1,000',con:'Annual custody fee ~0.5%'},
          {n:'PSX Gold ETF (NCCPL)',t:'Exchange',tc:'pill-purple',d:'Trade gold certificates on PSX. Tracks international gold price in PKR. Most liquid.',pro:'Highly liquid · Tight spread',con:'Tracks intl price'},
        ].map(x=>`<div style="background:var(--bg2);border:1px solid var(--brd);border-radius:var(--r);padding:12px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <span style="font-weight:600;font-size:12.5px;color:var(--t1)">${x.n}</span>${pillHtml(x.t,x.tc)}</div>
          <div style="font-size:11px;color:var(--t2);line-height:1.55;margin-bottom:7px">${x.d}</div>
          <div style="font-size:10px;color:#02c076">✓ ${x.pro}</div>
          <div style="font-size:10px;color:#f6465d">✗ ${x.con}</div>
        </div>`).join('')}
      </div>
    </div>
  </div>
  ${aiPanel('Gold and silver investment Pakistan March 2026 — ₨327K/tola, international $3,120/oz, PKR correlation, inflation hedge, entry strategy','Gold & Silver')}`;

  await drawGoldHistChart(period);

  // Purity buttons
  el.querySelector('#purity-btns').addEventListener('click', e => {
    const btn = e.target.closest('.pbtn'); if (!btn) return;
    purity = btn.dataset.purity;
    el.querySelectorAll('#purity-btns .pbtn').forEach(b => b.classList.toggle('active', b.dataset.purity === purity));
    el.querySelector('#purity-values').innerHTML = `<div class="g4">${renderPurityValues(g24, purity, PM)}</div>`;
  });
  // Period buttons
  el.querySelector('#gold-period-btns').addEventListener('click', async e => {
    const btn = e.target.closest('.pbtn'); if (!btn) return;
    period = btn.dataset.p;
    el.querySelectorAll('#gold-period-btns .pbtn').forEach(b => b.classList.toggle('active', b.dataset.p === period));
    await drawGoldHistChart(period);
  });
}

function renderPurityValues(base, purity, PM) {
  const adj = base * PM[purity];
  return [{l:'Per Tola (11.66g)',v:fmtPKR(adj)},{l:'Per 10 Grams',v:fmtPKR(adj*0.857)},{l:'Per Gram',v:fmtPKR(adj*0.0857)},{l:'Per Troy Oz',v:fmtPKR(adj*2.667)}]
    .map(x=>`<div style="background:var(--bg2);border:1px solid rgba(240,185,11,.15);border-radius:var(--r);padding:12px;text-align:center">
      <div style="font-size:9.5px;color:var(--t2);margin-bottom:4px">${x.l}</div>
      <div style="font-size:16px;font-weight:700;color:#f0b90b;font-family:var(--mono)">${x.v}</div>
    </div>`).join('');
}

async function drawGoldHistChart(period) {
  const gd = buildSeries('gold', period), sd = buildSeries('silver', period);
  Charts.dualLine('gold-hist-chart', gd.labels,
    {data:gd.values, color:'#f0b90b', label:'Gold'},
    {data:sd.values, color:'#06b6d4', label:'Silver'});
}

// ─────────────────────────────────────────────────────────────────────────────
// PSX STOCKS
// ─────────────────────────────────────────────────────────────────────────────
async function stocks() {
  let period = '1M', secFilter = 'All', sortCol = 'd', sortDir = -1, selSym = null;
  const allSecs = ['All', ...new Set(STOCKS.map(s=>s.sec))];
  const el = $('content'); if (!el) return;

  function sorted() {
    let list = STOCKS.filter(s => secFilter === 'All' || s.sec === secFilter);
    return [...list].sort((a,b) => sortDir * ((b[sortCol]||0) - (a[sortCol]||0)));
  }

  function tableRows(list) {
    return list.map((s,i)=>`<tr class="${i%2?'':'row-even'}" data-sym="${s.sym}">
      <td class="mono" style="color:${s.col};font-weight:700">${s.sym}</td>
      <td style="color:var(--t1)">${s.name}</td>
      <td class="mono">₨${s.p.toFixed(2)}</td>
      <td>${chgHtml(s.d)}</td><td>${chgHtml(s.w)}</td><td>${chgHtml(s.m)}</td>
      <td>${chgHtml(s.q)}</td><td>${chgHtml(s.y)}</td>
      <td class="mono muted">${s.pe}×</td>
      <td class="mono" style="color:#06b6d4">${s.dv}%</td>
      <td class="muted">${s.cap}</td>
    </tr>`).join('');
  }

  function thHtml(k, l) {
    return `<th class="${k===sortCol?'sorted-col':''}" data-sort="${k}">${l}${k===sortCol?(sortDir>0?' ↑':' ↓'):''}</th>`;
  }

  el.innerHTML = `
  <div class="stats-row">
    ${statCard('KSE-100','90,400',2.6,'#02c076')}
    ${statCard('KSE-30','38,820',2.1,'#1890ff')}
    ${statCard('Listed Cos.','520+',undefined,'#848e9c','On PSX')}
    ${statCard('Mkt Cap','~$45B',undefined,'#848e9c')}
    ${statCard('Avg P/E','8.2×',undefined,'#f59e0b')}
    ${statCard('Avg Div Yield','5.8%',undefined,'#06b6d4','Trailing 12M')}
  </div>

  <div class="g2 mb10">
    <div class="card">
      <div class="card-hd">
        <div>
          <div class="card-title" id="chart-title">KSE-100 Index</div>
          <div class="card-sub" id="chart-sub">Pakistan Stock Exchange · Click a stock row to see its chart</div>
        </div>
        <div style="display:flex;gap:4px;align-items:center">
          <button id="back-idx-btn" class="btn-ghost btn-sm" style="display:none">↩ Index</button>
          <div id="stock-period-btns">${pbtns(period,'1D','1W','1M','3M','6M','1Y')}</div>
        </div>
      </div>
      <div class="card-body"><div class="chart-wrap" style="height:185px"><canvas id="stock-chart"></canvas></div></div>
    </div>
    <div class="card">
      <div class="card-hd"><div class="card-title">Sector Heatmap</div><div class="card-sub">Click to filter table below</div></div>
      <div class="card-body" style="padding:8px">
        <div class="heatmap" id="sector-heatmap">
          ${SECTORS.map(s=>`<div class="heat-cell" data-sec="${s.n}" style="background:${s.col}18;border:1px solid ${s.col}30">
            <div class="heat-name">${s.n}</div>
            <div class="heat-val" style="color:${s.col}">+${s.m}%</div>
            <div class="heat-meta">${s.cnt} stocks · ${s.cap}</div>
          </div>`).join('')}
        </div>
      </div>
    </div>
  </div>

  <div class="card">
    <div class="card-hd">
      <div><div class="card-title" id="tbl-title">All PSX Stocks</div><div class="card-sub">Click column headers to sort · Click row to view chart</div></div>
      <div class="filter-bar" id="sec-filter-bar">
        ${allSecs.map(s=>`<button class="fbtn${s==='All'?' active':''}" data-sec="${s}">${s}</button>`).join('')}
      </div>
    </div>
    <div class="tbl-wrap tbl-scroll" id="stock-table-wrap">
      <table id="stock-table">
        <thead><tr>
          ${thHtml('sym','Symbol')}${thHtml('name','Company')}${thHtml('p','Price')}
          ${thHtml('d','Day%')}${thHtml('w','Week%')}${thHtml('m','Month%')}
          ${thHtml('q','3M%')}${thHtml('y','1Y%')}${thHtml('pe','P/E')}${thHtml('dv','Div%')}${thHtml('cap','Mkt Cap')}
        </tr></thead>
        <tbody id="stock-tbody">${tableRows(sorted())}</tbody>
      </table>
    </div>
  </div>
  ${aiPanel(`PSX KSE-100 at 90,400 Pakistan 2026 — sector picks, valuation, dividend stocks, strategy`,'PSX Stocks')}`;

  await drawKSE(period);

  // Period buttons
  el.querySelector('#stock-period-btns').addEventListener('click', async e => {
    const btn = e.target.closest('.pbtn'); if (!btn) return;
    period = btn.dataset.p;
    el.querySelectorAll('#stock-period-btns .pbtn').forEach(b => b.classList.toggle('active', b.dataset.p === period));
    if (selSym) {
      const d = buildSeries(selSym, period);
      const st = STOCKS.find(s=>s.sym===selSym);
      Charts.area('stock-chart', d.labels, d.values, st?.col||'#1890ff');
    } else await drawKSE(period);
  });

  // Sector heatmap clicks
  el.querySelector('#sector-heatmap').addEventListener('click', e => {
    const cell = e.target.closest('.heat-cell'); if (!cell) return;
    const sec = cell.dataset.sec;
    secFilter = secFilter === sec ? 'All' : sec;
    el.querySelectorAll('#sector-heatmap .heat-cell').forEach(c => {
      c.classList.toggle('active', c.dataset.sec === secFilter);
      c.style.opacity = (secFilter === 'All' || c.dataset.sec === secFilter) ? '1' : '0.45';
    });
    el.querySelector('#tbl-title').textContent = secFilter === 'All' ? 'All PSX Stocks' : `${secFilter} Stocks`;
    // Also sync filter bar
    el.querySelectorAll('#sec-filter-bar .fbtn').forEach(b => b.classList.toggle('active', b.dataset.sec === secFilter));
    el.querySelector('#stock-tbody').innerHTML = tableRows(sorted());
  });

  // Sector filter bar clicks
  el.querySelector('#sec-filter-bar').addEventListener('click', e => {
    const btn = e.target.closest('.fbtn'); if (!btn) return;
    secFilter = btn.dataset.sec;
    el.querySelectorAll('#sec-filter-bar .fbtn').forEach(b => b.classList.toggle('active', b.dataset.sec === secFilter));
    el.querySelectorAll('#sector-heatmap .heat-cell').forEach(c => {
      c.classList.toggle('active', c.dataset.sec === secFilter);
      c.style.opacity = (secFilter === 'All' || c.dataset.sec === secFilter) ? '1' : '0.45';
    });
    el.querySelector('#tbl-title').textContent = secFilter === 'All' ? 'All PSX Stocks' : `${secFilter} Stocks`;
    el.querySelector('#stock-tbody').innerHTML = tableRows(sorted());
  });

  // Table header sort
  el.querySelector('#stock-table').addEventListener('click', e => {
    const th = e.target.closest('th[data-sort]');
    if (th) {
      const k = th.dataset.sort;
      sortDir = sortCol === k ? -sortDir : -1;
      sortCol = k;
      // Rebuild header
      const thead = el.querySelector('#stock-table thead tr');
      thead.innerHTML = `${thHtml('sym','Symbol')}${thHtml('name','Company')}${thHtml('p','Price')}${thHtml('d','Day%')}${thHtml('w','Week%')}${thHtml('m','Month%')}${thHtml('q','3M%')}${thHtml('y','1Y%')}${thHtml('pe','P/E')}${thHtml('dv','Div%')}${thHtml('cap','Mkt Cap')}`;
      el.querySelector('#stock-tbody').innerHTML = tableRows(sorted());
      return;
    }
    // Row click → show stock chart
    const row = e.target.closest('tr[data-sym]'); if (!row) return;
    const sym = row.dataset.sym;
    const stk = STOCKS.find(s => s.sym === sym); if (!stk) return;
    selSym = sym;
    el.querySelector('#chart-title').textContent = `${stk.sym} — ${stk.name}`;
    el.querySelector('#chart-sub').textContent   = `${stk.sec} · P/E ${stk.pe}× · Div Yield ${stk.dv}%`;
    el.querySelector('#back-idx-btn').style.display = 'inline-flex';
    const d = buildSeries(sym, period);
    Charts.area('stock-chart', d.labels, d.values, stk.col);
  });

  // Back to index
  el.querySelector('#back-idx-btn').addEventListener('click', async () => {
    selSym = null;
    el.querySelector('#chart-title').textContent = 'KSE-100 Index';
    el.querySelector('#chart-sub').textContent   = 'Pakistan Stock Exchange';
    el.querySelector('#back-idx-btn').style.display = 'none';
    await drawKSE(period);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// MUTUAL FUNDS
// ─────────────────────────────────────────────────────────────────────────────
async function funds() {
  let catFilter = 'All', halalOnly = false, sortBy = 'y1';
  const cats = ['All', 'Money Market', 'Income', 'Balanced', 'Equity'];
  const el = $('content'); if (!el) return;

  function getList() {
    return [...FUNDS]
      .filter(f => (catFilter === 'All' || f.cat === catFilter) && (!halalOnly || f.halal))
      .sort((a,b) => b[sortBy] - a[sortBy]);
  }

  function fundCards(list) {
    if (!list.length) return `<div class="empty"><div class="empty-icon">📊</div><div class="empty-msg">No funds match your filter</div><div class="empty-hint">Try adjusting the category or Halal filter</div></div>`;
    return `<div class="gauto">${list.map(f=>`<div class="card">
      <div style="padding:13px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">
          <div>
            <div style="font-weight:600;font-size:12.5px;color:var(--t1);margin-bottom:5px">${f.name}</div>
            <div style="display:flex;gap:4px;flex-wrap:wrap">${pillHtml(f.cat,'pill-blue')} ${pillHtml(f.amc,'pill-grey')} ${f.halal?pillHtml('HALAL ✓','pill-green'):''}</div>
          </div>
          <div style="text-align:right"><div class="fund-ret-big">${f.y1}%</div><div style="font-size:9px;color:var(--t2)">1Y return</div></div>
        </div>
        <div class="fund-grid3">
          <div class="fg-cell"><div class="fg-label">3Y Return</div><div class="fg-value" style="color:#06b6d4">${f.y3}%</div></div>
          <div class="fg-cell"><div class="fg-label">5Y Return</div><div class="fg-value" style="color:#1890ff">${f.y5}%</div></div>
          <div class="fg-cell"><div class="fg-label">AUM</div><div class="fg-value">${f.aum}</div></div>
        </div>
        <div class="fund-foot">
          <span style="color:var(--t2)">Min: <span class="mono" style="color:var(--t1)">₨${f.min.toLocaleString()}</span></span>
          <span style="color:var(--t2)">Risk: <span style="color:${riskColor(f.risk)}">${f.risk}</span></span>
          <span style="color:var(--t2)">Exp: <span class="mono" style="color:#f59e0b">${f.er}%</span></span>
          <div class="stars">${starHtml(f.stars)}</div>
        </div>
      </div>
    </div>`).join('')}</div>`;
  }

  el.innerHTML = `
  <div class="stats-row">
    ${statCard('Industry AUM','~₨2.8T',undefined,'#1890ff','Total assets')}
    ${statCard('Best 1Y Return','35.2%',undefined,'#02c076','NBP Stock Fund')}
    ${statCard('Min Investment','₨500',undefined,'#06b6d4','Meezan / NAFA')}
    ${statCard('Active AMCs','24',undefined,'#848e9c','SECP regulated')}
  </div>

  <div class="card mb10">
    <div class="card-hd"><div class="card-title">Fund Category Guide</div></div>
    <div class="card-body"><div class="g4">
      ${[{c:'Money Market',r:'Low',ret:'~20%',col:'#02c076',d:'Cash-like. T-Bills & bank deposits. Best for emergency funds.'},
         {c:'Income Fund',r:'Low-Med',ret:'~20%',col:'#06b6d4',d:'Bonds & Sukuks. Ideal for 1-2 year horizons.'},
         {c:'Balanced Fund',r:'Medium',ret:'~28%',col:'#f59e0b',d:'Mix of stocks and bonds. Good for 3+ year goals.'},
         {c:'Equity Fund',r:'High',ret:'30-35%',col:'#f6465d',d:'Pure stock exposure. Best for 5+ year horizon.'},
      ].map(x=>`<div style="background:var(--bg2);border-left:3px solid ${x.col};border-radius:var(--r);padding:12px">
        <div style="font-weight:700;font-size:12px;color:var(--t1);margin-bottom:4px">${x.c}</div>
        <div style="display:flex;gap:4px;margin-bottom:6px">${pillHtml(x.r+' risk','pill-grey')} ${pillHtml(x.ret,'pill-grey')}</div>
        <div style="font-size:10.5px;color:var(--t2);line-height:1.5">${x.d}</div>
      </div>`).join('')}
    </div></div>
  </div>

  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px">
    <div class="filter-bar" id="fund-cat-btns">
      ${cats.map(c=>`<button class="fbtn${c==='All'?' active':''}" data-cat="${c}">${c}</button>`).join('')}
    </div>
    <div style="display:flex;gap:6px;align-items:center">
      <button id="halal-toggle-btn" class="fbtn" style="display:flex;align-items:center;gap:5px">
        <span id="halal-dot" style="width:8px;height:8px;border-radius:50%;background:var(--brd2);transition:background .2s"></span>
        Halal Only
      </button>
      <select id="fund-sort" class="sel-input">
        <option value="y1">Sort: 1Y Return</option>
        <option value="y3">Sort: 3Y Return</option>
        <option value="y5">Sort: 5Y Return</option>
      </select>
    </div>
  </div>

  <div id="funds-grid">${fundCards(getList())}</div>
  ${aiPanel('Mutual funds Pakistan 2026 — SECP-regulated, best funds for beginners, Islamic vs conventional, expense ratios','Mutual Funds')}`;

  function refresh() {
    el.querySelector('#funds-grid').innerHTML = fundCards(getList());
  }

  // Category filter
  el.querySelector('#fund-cat-btns').addEventListener('click', e => {
    const btn = e.target.closest('.fbtn'); if (!btn) return;
    catFilter = btn.dataset.cat;
    el.querySelectorAll('#fund-cat-btns .fbtn').forEach(b => b.classList.toggle('active', b.dataset.cat === catFilter));
    refresh();
  });

  // Halal toggle
  el.querySelector('#halal-toggle-btn').addEventListener('click', () => {
    halalOnly = !halalOnly;
    const btn = el.querySelector('#halal-toggle-btn');
    btn.classList.toggle('a-green', halalOnly);
    el.querySelector('#halal-dot').style.background = halalOnly ? '#02c076' : 'var(--brd2)';
    refresh();
  });

  // Sort select
  el.querySelector('#fund-sort').addEventListener('change', e => {
    sortBy = e.target.value; refresh();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// FIXED INCOME
// ─────────────────────────────────────────────────────────────────────────────
async function fixedIncome() {
  const INFLATION = 12.6;
  const el = $('content'); if (!el) return;
  el.innerHTML = `
  <div class="stats-row">
    ${statCard('Best NSS Rate','21.12%',undefined,'#02c076','NSS Bahbood Cert.')}
    ${statCard('SBP Policy Rate','17.50%',undefined,'#f59e0b','As of Mar 2026')}
    ${statCard('Real Return NSS','~5.9%',undefined,'#06b6d4','After 12.6% inflation')}
    ${statCard('CPI Inflation','12.6%',undefined,'#f6465d','Mar 2026 YoY')}
  </div>

  <div class="card mb10">
    <div class="card-hd"><div class="card-title">Rate Comparison vs Inflation</div><div class="card-sub">Green = beats inflation · Red dashed line = CPI 12.6%</div></div>
    <div class="card-body"><div class="chart-wrap" style="height:200px"><canvas id="fixed-chart"></canvas></div></div>
  </div>

  <div style="display:flex;flex-direction:column;gap:7px;margin-bottom:12px">
    ${FIXED.map(f=>{
      const rc = f.rate>17?'#02c076':f.rate>14?'#f59e0b':f.rate>0?'#f6465d':'#848e9c';
      const rr = f.rate>0?`+${(f.rate-INFLATION).toFixed(1)}%`:'N/A';
      const rrCol = f.rate>INFLATION?'#02c076':'#f6465d';
      return `<div class="card"><div style="padding:12px 14px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
            <span style="font-size:13px;font-weight:700;color:var(--t1)">${f.name}</span>
            ${f.halal?pillHtml('HALAL','pill-green'):''}
            ${f.tag?pillHtml(f.tag,f.tag==='BEST RATE'?'pill-gold':f.tag==='HALAL'||f.tag==='BEGINNER'?'pill-green':f.tag==='LIQUID'?'pill-blue':f.tag==='HIGH YIELD'?'pill-purple':'pill-grey'):''}
          </div>
          <span class="fi-rate" style="color:${rc}">${f.rate?f.rate+'%':'Lottery'}</span>
        </div>
        <div class="fi-meta">
          <div class="fm-cell"><div class="fm-label">Term</div><div class="fm-value">${f.term}</div></div>
          <div class="fm-cell"><div class="fm-label">Min Invest</div><div class="fm-value">${f.min}</div></div>
          <div class="fm-cell"><div class="fm-label">Risk</div><div class="fm-value" style="color:${riskColor(f.risk)}">${f.risk}</div></div>
          <div class="fm-cell"><div class="fm-label">Real Return</div><div class="fm-value" style="color:${rrCol}">${rr}</div></div>
          <div class="fm-cell"><div class="fm-label">Issuer</div><div class="fm-value" style="color:var(--t2)">${f.issuer}</div></div>
        </div>
      </div></div>`;
    }).join('')}
  </div>
  ${aiPanel('Fixed income Pakistan 2026 — NSS Bahbood 21.12%, T-Bills, PIBs, Sukuk, real estate. Post-inflation real returns and tax.','Fixed Income')}`;

  const rateData = FIXED.filter(f=>f.rate>0).sort((a,b)=>b.rate-a.rate);
  Charts.hbar('fixed-chart', rateData.map(f=>f.abbr), rateData.map(f=>f.rate),
    rateData.map(f=>f.rate>INFLATION?'#02c076':'#f6465d'), {refLine:INFLATION});
}

// ─────────────────────────────────────────────────────────────────────────────
// REITs
// ─────────────────────────────────────────────────────────────────────────────
async function reits() {
  const el = $('content'); if (!el) return;
  el.innerHTML = `
  <div class="stats-row">
    ${statCard('REITs Listed','4',undefined,'#06b6d4','On PSX')}
    ${statCard('Avg Yield','9.2%',undefined,'#02c076','Distribution yield')}
    ${statCard('Min Investment','~₨5,000',undefined,'#848e9c','Market price')}
    ${statCard('Regulation','SECP',undefined,'#1890ff','2015 & 2020 Regs')}
  </div>

  <div class="card mb10">
    <div class="card-hd"><div class="card-title">What is a REIT?</div></div>
    <div class="card-body" style="font-size:12px;color:var(--t2);line-height:1.75">
      A <strong style="color:var(--t1)">Real Estate Investment Trust (REIT)</strong> lets you invest in income-generating real estate
      without buying property directly. Pakistan REITs are listed on PSX, regulated by SECP, and must
      distribute at least 90% of income as dividends — ideal for passive income investors wanting real
      estate exposure with stock-market liquidity.
    </div>
  </div>

  <div class="gauto mb10">
    ${REITS.map(r=>`<div class="card">
      <div style="padding:14px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">
          <div>
            <div style="font-weight:700;font-size:13px;color:var(--t1);margin-bottom:4px">${r.name}</div>
            <div style="display:flex;gap:4px">${pillHtml(r.sector,'pill-grey')} ${pillHtml(r.dist,'pill-blue')}</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:26px;font-weight:700;color:#06b6d4;font-family:var(--mono)">${r.yield}%</div>
            <div style="font-size:9px;color:var(--t2)">Distribution yield</div>
          </div>
        </div>
        <div class="g3">
          <div style="background:var(--bg2);border-radius:var(--r);padding:8px;text-align:center">
            <div style="font-size:9px;color:var(--t2)">Market Price</div><div class="mono" style="font-weight:600">₨${r.p}</div></div>
          <div style="background:var(--bg2);border-radius:var(--r);padding:8px;text-align:center">
            <div style="font-size:9px;color:var(--t2)">NAV</div><div class="mono" style="font-weight:600;color:var(--t2)">₨${r.nav}</div></div>
          <div style="background:var(--bg2);border-radius:var(--r);padding:8px;text-align:center">
            <div style="font-size:9px;color:var(--t2)">vs NAV</div>
            <div class="mono" style="font-weight:600;color:${r.p>r.nav?'#f6465d':'#02c076'}">${r.p>r.nav?'+':''}${((r.p-r.nav)/r.nav*100).toFixed(1)}%</div></div>
        </div>
      </div>
    </div>`).join('')}
  </div>
  ${aiPanel('REITs and real estate Pakistan 2026 — Dolmen REIT, rental yields, DHA vs REITs comparison, Islamic finance','REITs & Real Estate')}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// ALL OPPORTUNITIES
// ─────────────────────────────────────────────────────────────────────────────
async function opportunities() {
  const el = $('content'); if (!el) return;
  el.innerHTML = `<div class="init-loader"><div class="init-spinner"></div><div class="init-text">Loading opportunities…</div></div>`;

  // Build unified opportunity list
  const ops = [];
  ops.push({id:'gold',label:'Gold 24K (per Tola)',type:'Commodity',ret1y:18.5,ret3y:14.2,risk:'Low',min:'₨1,000',halal:true,col:'#f0b90b',tenure:'Flexible'});
  ops.push({id:'silver',label:'Silver (per Tola)',type:'Commodity',ret1y:12.1,ret3y:9.8,risk:'Medium',min:'₨500',halal:true,col:'#06b6d4',tenure:'Flexible'});
  STOCKS.slice(0,12).forEach(s=>ops.push({id:s.sym,label:`${s.sym} — ${s.name}`,type:'Stock',ret1y:s.y,ret3y:s.q*2.8,risk:'High',min:'₨5,000',halal:false,col:s.col,tenure:'Short-Long'}));
  FUNDS.forEach(f=>ops.push({id:f.id,label:f.name,type:'Mutual Fund',ret1y:f.y1,ret3y:f.y3,risk:f.risk,min:`₨${f.min.toLocaleString()}`,halal:f.halal,col:'#02c076',tenure:'Flexible'}));
  FIXED.filter(f=>f.rate>0).forEach(f=>ops.push({id:f.abbr,label:f.name,type:'Fixed Income',ret1y:f.rate,ret3y:f.rate,risk:f.risk,min:f.min,halal:f.halal,col:'#1890ff',tenure:f.term}));
  REITS.forEach(r=>ops.push({id:r.sym,label:r.name,type:'REIT',ret1y:r.yield,ret3y:r.yield*.9,risk:'Medium',min:'₨5,000',halal:false,col:r.col,tenure:'Long Term'}));

  let groupBy = 'risk', typeFilter = 'All', halalOnly = false;
  const types = ['All',...new Set(ops.map(o=>o.type))];
  const RISK_ORDER = ['Very Low','Low','Medium','High'];
  const RISK_COLS  = {'Very Low':'#02c076','Low':'#06b6d4','Medium':'#f59e0b','High':'#f6465d'};

  function getVisible() {
    return ops.filter(o => (typeFilter==='All'||o.type===typeFilter) && (!halalOnly||o.halal));
  }

  function renderGroups(list) {
    let groups = {};
    if (groupBy === 'risk') {
      RISK_ORDER.forEach(r => { groups[r] = list.filter(o=>o.risk===r||(!RISK_ORDER.includes(o.risk)&&r==='High')); });
    } else if (groupBy === 'type') {
      list.forEach(o => { groups[o.type] = groups[o.type]||[]; groups[o.type].push(o); });
    } else if (groupBy === 'returns') {
      groups['High (>25%)']     = list.filter(o=>o.ret1y>25);
      groups['Medium (12-25%)'] = list.filter(o=>o.ret1y>=12&&o.ret1y<=25);
      groups['Low (<12%)']      = list.filter(o=>o.ret1y<12);
    } else if (groupBy === 'tenure') {
      groups['Flexible / Short'] = list.filter(o=>o.tenure.includes('Flex')||o.tenure.includes('Short'));
      groups['Medium Term']      = list.filter(o=>o.tenure.includes('3')||o.tenure.includes('5'));
      groups['Long Term']        = list.filter(o=>o.tenure.includes('Long')||o.tenure.includes('10'));
    }
    return Object.entries(groups).filter(([,items])=>items.length>0).map(([grp,items])=>`
      <div style="margin-bottom:18px">
        <div style="font-size:13px;font-weight:700;color:${RISK_COLS[grp]||'#f0b90b'};margin-bottom:8px;display:flex;align-items:center;gap:7px">
          <span style="width:8px;height:8px;border-radius:50%;background:${RISK_COLS[grp]||'#f0b90b'}"></span>
          ${grp} <span style="font-size:10px;color:var(--t2);font-weight:400">${items.length} opportunities</span>
        </div>
        <div class="gauto">
          ${items.map(o=>`<div class="card opp-card">
            <div class="opp-stripe" style="background:${o.col}"></div>
            <div style="padding-left:8px">
              <div class="opp-type">${o.type}</div>
              <div class="opp-name">${o.label}</div>
              <div style="display:flex;justify-content:space-between;align-items:flex-end">
                <div><div style="font-size:9px;color:var(--t2)">1Y Return</div><div class="opp-ret" style="color:${o.col}">${o.ret1y}%</div></div>
                <div style="text-align:right"><div style="font-size:9px;color:var(--t2)">3Y Avg</div><div class="mono" style="font-size:12px;color:var(--t2)">${o.ret3y.toFixed(1)}%</div></div>
              </div>
              <div class="opp-meta">
                ${pillHtml(o.risk,o.risk==='Very Low'||o.risk==='Low'?'pill-green':o.risk==='Medium'?'pill-amber':'pill-red')}
                <span>Min: ${o.min}</span>
                ${o.halal?'<span style="color:#02c076">☾ Halal</span>':''}
              </div>
            </div>
          </div>`).join('')}
        </div>
      </div>`).join('');
  }

  el.innerHTML = `
  <div class="stats-row">
    ${statCard('Total Opportunities',ops.length,undefined,'#02c076','All asset classes')}
    ${statCard('Halal Options',ops.filter(o=>o.halal).length,undefined,'#06b6d4','Shariah-compliant')}
    ${statCard('Best 1Y Return',Math.max(...ops.map(o=>o.ret1y)).toFixed(1)+'%',undefined,'#f6465d','Highest available')}
    ${statCard('Very Low Risk',ops.filter(o=>o.risk==='Very Low').length,undefined,'#f59e0b','Govt-backed options')}
  </div>

  <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:12px">
    <span style="font-size:11px;color:var(--t2);font-weight:600">Group by:</span>
    <div class="filter-bar" id="grp-btns">
      ${['risk','type','returns','tenure'].map(g=>`<button class="fbtn${g==='risk'?' active':''}" data-grp="${g}">${g.charAt(0).toUpperCase()+g.slice(1)}</button>`).join('')}
    </div>
    <span style="font-size:11px;color:var(--t2);font-weight:600;margin-left:8px">Type:</span>
    <div class="filter-bar" id="type-btns">
      ${types.map(t=>`<button class="fbtn${t==='All'?' active':''}" data-type="${t}">${t}</button>`).join('')}
    </div>
    <button id="opp-halal-btn" class="fbtn" style="margin-left:auto">☾ Halal Only</button>
  </div>

  <div id="opp-grid">${renderGroups(getVisible())}</div>
  ${aiPanel('All investment opportunities Pakistan 2026 — comprehensive comparison of stocks, gold, funds, bonds, REITs for different investor profiles','All Opportunities')}`;

  el.querySelector('#grp-btns').addEventListener('click', e => {
    const btn = e.target.closest('.fbtn'); if (!btn) return;
    groupBy = btn.dataset.grp;
    el.querySelectorAll('#grp-btns .fbtn').forEach(b => b.classList.toggle('active', b.dataset.grp === groupBy));
    el.querySelector('#opp-grid').innerHTML = renderGroups(getVisible());
  });
  el.querySelector('#type-btns').addEventListener('click', e => {
    const btn = e.target.closest('.fbtn'); if (!btn) return;
    typeFilter = btn.dataset.type;
    el.querySelectorAll('#type-btns .fbtn').forEach(b => b.classList.toggle('active', b.dataset.type === typeFilter));
    el.querySelector('#opp-grid').innerHTML = renderGroups(getVisible());
  });
  el.querySelector('#opp-halal-btn').addEventListener('click', () => {
    halalOnly = !halalOnly;
    el.querySelector('#opp-halal-btn').classList.toggle('a-green', halalOnly);
    el.querySelector('#opp-grid').innerHTML = renderGroups(getVisible());
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// PORTFOLIO BUILDER
// ─────────────────────────────────────────────────────────────────────────────
async function portfolio() {
  let portfolios = [], activeId = null, compareMode = false;
  const allAssets = [
    ...STOCKS.map(s=>({id:s.sym,label:`${s.sym} — ${s.name}`,type:'Stock',price:s.p,ret1y:s.y,col:s.col})),
    ...FUNDS.map(f=>({id:f.id,label:f.name,type:'Mutual Fund',price:10000,ret1y:f.y1,col:'#02c076'})),
    {id:'GOLD',label:'Gold 24K (per Tola)',type:'Commodity',price:327000,ret1y:18.5,col:'#f0b90b'},
    {id:'SILVER',label:'Silver (per Tola)',type:'Commodity',price:3620,ret1y:12.1,col:'#06b6d4'},
    {id:'NSS',label:'NSS Special Savings',type:'Fixed Income',price:1000,ret1y:18.5,col:'#02c076'},
    {id:'SUKUK',label:'Sukuk Ijarah Bonds',type:'Fixed Income',price:1000,ret1y:17.2,col:'#a855f7'},
  ];

  async function load() {
    try {
      const d = await API.listPortfolios();
      portfolios = d.portfolios || [];
    } catch { portfolios = []; }
    if (!portfolios.length) {
      try { await API.createPortfolio('My Portfolio','#f0b90b'); const d = await API.listPortfolios(); portfolios = d.portfolios||[]; } catch {}
    }
    if (!activeId || !portfolios.find(p=>p.id===activeId)) activeId = portfolios[0]?.id || null;
    render();
  }

  function activePF() { return portfolios.find(p=>p.id===activeId)||portfolios[0]||{holdings:[]}; }
  function stats(pf) {
    const h = pf.holdings||[];
    const tv = h.reduce((s,x)=>s+x.value,0);
    const wr = tv>0?h.reduce((s,x)=>s+x.value*x.ret1y/100,0)/tv*100:0;
    return {tv,wr,projected:tv*wr/100,count:h.length};
  }

  function render() {
    const el = $('content'); if (!el) return;
    const pf  = activePF();
    const st  = stats(pf);
    const colors = ['#f0b90b','#a855f7','#06b6d4','#f59e0b','#f6465d','#1890ff'];

    el.innerHTML = `
    <div class="port-tabs" id="port-tab-bar">
      ${portfolios.map(p=>`<button class="ptab${p.id===activeId?' active':''}" data-pid="${p.id}"
        style="${p.id===activeId?`border-color:${p.color};color:${p.color};background:${p.color}18`:''}">
        📁 ${p.name}</button>`).join('')}
      <div style="display:flex;gap:4px">
        <input id="new-pf-input" class="inp" style="width:135px" placeholder="Portfolio name…"/>
        <button id="create-pf-btn" class="btn-primary btn-sm">+ Create</button>
      </div>
      <button id="compare-toggle-btn" class="btn-ghost btn-sm" style="margin-left:auto;${compareMode?'border-color:#f0b90b;color:#f0b90b':''}">
        ⚖ Compare
      </button>
    </div>

    ${compareMode ? renderCompare() : renderSingle(pf, st)}`;

    if (!compareMode) {
      // Draw pie chart
      setTimeout(() => {
        const h = pf.holdings||[];
        if (h.length) {
          Charts.doughnut('alloc-chart', h.map(x=>x.asset_id), h.map(x=>x.value), h.map(x=>x.color));
        }
      }, 50);
    }

    wirePortfolio(el, pf, st);
  }

  function renderSingle(pf, st) {
    const h = pf.holdings||[];
    return `
    <div class="stats-row mb10">
      ${statCard('Portfolio Value',fmtPKR(st.tv),undefined,pf.color||'#f0b90b')}
      ${statCard('Holdings',st.count,undefined,'#848e9c','Assets')}
      ${statCard('Wtd 1Y Return',st.wr.toFixed(1)+'%',st.wr,'#02c076')}
      ${statCard('Projected Gain',fmtPKR(st.projected),undefined,'#06b6d4','In 1 year')}
    </div>
    <div class="g2 mb10">
      <div class="card">
        <div class="card-hd">
          <div><div class="card-title">Holdings — ${pf.name||'Portfolio'}</div></div>
          <div style="display:flex;gap:4px">
            <button id="add-asset-btn" class="btn-primary btn-sm">+ Add Asset</button>
            <button id="del-pf-btn" class="btn-ghost btn-sm" style="color:#f6465d;border-color:rgba(246,70,93,.25)">🗑</button>
          </div>
        </div>
        ${!h.length?`<div class="empty"><div class="empty-icon">📊</div><div class="empty-msg">No holdings yet</div><div class="empty-hint">Click "Add Asset" to build your portfolio</div></div>`
        :h.map(x=>`<div class="holding-row" data-hid="${x.id}">
          <div style="display:flex;align-items:center;flex:1">
            <span class="h-dot" style="background:${x.color}"></span>
            <div><div class="h-sym">${x.asset_id}</div><div class="h-sub">${x.asset_label} · ${x.units?.toFixed(2)} units</div></div>
          </div>
          <div class="h-val"><div>${fmtPKR(x.value)}</div><div class="h-ret">${chgHtml(x.ret1y)} 1Y</div></div>
          <button class="btn-rm remove-holding-btn">×</button>
        </div>`).join('')}
      </div>
      <div class="card">
        <div class="card-hd"><div class="card-title">Asset Allocation</div></div>
        <div class="card-body">
          ${h.length?`<div style="height:190px"><canvas id="alloc-chart"></canvas></div>
          <div class="alloc-legend">
            ${h.map(x=>`<div class="al-item"><span class="al-dot" style="background:${x.color}"></span>${x.asset_id} ${st.tv>0?Math.round(x.value/st.tv*100):0}%</div>`).join('')}
          </div>`:`<div class="empty"><div class="empty-msg">Add holdings to see allocation</div></div>`}
        </div>
      </div>
    </div>
    ${h.length?aiPanel(`Portfolio: ${h.map(x=>`${x.asset_id}(${x.units?.toFixed(1)}u,1Y ${x.ret1y}%)`).join(', ')}. Total ${fmtPKR(st.tv)}, return ${st.wr.toFixed(1)}%.`,'Portfolio Analysis'):''}`;
  }

  function renderCompare() {
    const compare = portfolios.map(p=>({...p,...stats(p)}));
    return `
    <div class="gauto mb10">
      ${compare.map(p=>`<div class="card" style="border-color:${p.color||'var(--brd)'}44">
        <div style="padding:14px">
          <div style="font-size:12px;font-weight:600;color:${p.color||'#f0b90b'};margin-bottom:8px;display:flex;align-items:center;gap:5px">
            <span style="width:8px;height:8px;border-radius:50%;background:${p.color||'#f0b90b'}"></span>${p.name}
          </div>
          <div class="mono" style="font-size:22px;font-weight:700;color:var(--t1)">${fmtPKR(p.tv)}</div>
          <div style="font-size:10px;color:var(--t2);margin-bottom:6px">Portfolio Value</div>
          ${chgHtml(p.wr,13)}
          <div style="font-size:10px;color:var(--t2);margin-bottom:6px">Wtd 1Y Return</div>
          <div class="mono" style="font-size:12px;color:#06b6d4">+${fmtPKR(p.projected)}</div>
          <div style="font-size:10px;color:var(--t2)">${p.count} holdings</div>
        </div>
      </div>`).join('')}
    </div>
    ${compare.some(p=>p.tv>0)?`<div class="card mb10">
      <div class="card-hd"><div class="card-title">Value Comparison</div></div>
      <div class="card-body"><div style="height:180px"><canvas id="compare-chart"></canvas></div></div>
    </div>`:''}`;
  }

  function wirePortfolio(el, pf, st) {
    // Tab switching
    el.querySelector('#port-tab-bar').addEventListener('click', async e => {
      const tab = e.target.closest('.ptab[data-pid]');
      if (tab) { activeId = +tab.dataset.pid; render(); return; }

      if (e.target.id === 'create-pf-btn') {
        const name = el.querySelector('#new-pf-input')?.value?.trim();
        if (!name) return;
        try { await API.createPortfolio(name, ['#f0b90b','#a855f7','#06b6d4','#f6465d','#02c076'][portfolios.length%5]); }
        catch {}
        await load(); return;
      }
      if (e.target.id === 'compare-toggle-btn') {
        compareMode = !compareMode; render();
        if (compareMode) {
          setTimeout(() => {
            const c = portfolios.map(p=>({...p,...stats(p)}));
            if (c.some(p=>p.tv>0)) Charts.vbar('compare-chart', c.map(p=>p.name), c.map(p=>Math.round(p.tv)), c.map(p=>p.color||'#f0b90b'));
          }, 50);
        }
        return;
      }
    });

    if (!compareMode) {
      const addBtn = $('add-asset-btn');
      if (addBtn) addBtn.addEventListener('click', () => showAssetModal(pf.id));

      const delBtn = $('del-pf-btn');
      if (delBtn) delBtn.addEventListener('click', async () => {
        if (!confirm(`Delete "${pf.name}"?`)) return;
        try { await API.deletePortfolio(pf.id); } catch {}
        activeId = null; await load();
      });

      el.querySelectorAll('.remove-holding-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const hid = btn.closest('.holding-row')?.dataset.hid;
          if (!hid) return;
          try { await API.removeHolding(pf.id, +hid); } catch {}
          await load();
        });
      });
    }
  }

  function showAssetModal(pfId) {
    let search = '', investAmt = '';
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    modal.innerHTML = `
      <div class="modal-box">
        <div class="modal-hd">
          <div class="modal-title">Add Asset</div>
          <button class="modal-close" id="close-modal">×</button>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
          <input class="inp" id="modal-search" placeholder="Search stocks, funds, gold…"/>
          <input class="inp" type="number" id="modal-amount" placeholder="Invest amount ₨"/>
        </div>
        <div class="modal-list" id="modal-list"></div>
        <div style="font-size:10px;color:var(--t3);border-top:1px solid var(--brd);padding-top:9px;margin-top:8px">
          Enter an amount to auto-calculate units · Click any asset to add
        </div>
      </div>`;
    document.body.appendChild(modal);

    function renderAssets() {
      const q = modal.querySelector('#modal-search').value.toLowerCase();
      const filtered = allAssets.filter(a => a.label.toLowerCase().includes(q) || a.type.toLowerCase().includes(q));
      modal.querySelector('#modal-list').innerHTML = filtered.slice(0,20).map(a=>`
        <div class="asset-row" data-asset-id="${a.id}">
          <div style="display:flex;align-items:center;flex:1">
            <span class="asset-dot" style="background:${a.col}"></span>
            <div><div class="asset-name">${a.label}</div><div class="asset-type">${a.type}</div></div>
          </div>
          <div class="asset-price"><div>₨${a.price.toLocaleString()}</div>${chgHtml(a.ret1y)}</div>
        </div>`).join('');
    }
    renderAssets();

    modal.querySelector('#modal-search').addEventListener('input', renderAssets);
    modal.querySelector('#close-modal').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', async e => {
      if (e.target === modal) { modal.remove(); return; }
      const row = e.target.closest('.asset-row[data-asset-id]'); if (!row) return;
      const a = allAssets.find(x=>x.id===row.dataset.assetId); if (!a) return;
      const amt   = parseFloat(modal.querySelector('#modal-amount').value)||a.price;
      const units = +(amt/a.price).toFixed(4);
      try { await API.addHolding(pfId, {asset_id:a.id,asset_label:a.label,asset_type:a.type,buy_price:a.price,units,ret1y:a.ret1y,color:a.col}); } catch {}
      modal.remove();
      await load();
    });
  }

  await load();
}

// ─────────────────────────────────────────────────────────────────────────────
// SIMULATOR
// ─────────────────────────────────────────────────────────────────────────────
async function simulator() {
  const INIT = 1000000;
  let bal = INIT, holdings = {}, prices = {}, history = [{d:0,v:INIT}];
  let day = 0, trades = [], running = false, selSym = 'OGDC', qty = 10, speed = 1000, timer = null;
  STOCKS.forEach(s => { prices[s.sym] = s.p; });

  const portVal  = () => bal + Object.entries(holdings).reduce((s,[k,q])=>s+(prices[k]||0)*q, 0);
  const totalRet = () => ((portVal()-INIT)/INIT*100);

  function render() {
    const pv = portVal(), tr = totalRet();
    const el = $('content'); if (!el) return;
    const selStk = STOCKS.find(s=>s.sym===selSym)||STOCKS[0];
    const selPr  = prices[selSym]||selStk.p;
    const origPr = selStk.p;
    const chgPct = ((selPr-origPr)/origPr*100);

    el.innerHTML = `
    <div class="card mb10">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;padding:14px 16px">
        <div>
          <div style="font-size:14px;font-weight:700;color:var(--t1)">📈 Paper Trading Simulator</div>
          <div style="font-size:11px;color:var(--t2);margin-top:2px">Starting capital ₨10,00,000 · Day ${day} · Prices simulate real market movement</div>
        </div>
        <div style="display:flex;gap:6px;align-items:center">
          <select id="sim-speed-sel" class="sel-input">
            <option value="2000">Slow (2s/day)</option>
            <option value="1000" ${speed===1000?'selected':''}>Normal (1s/day)</option>
            <option value="500">Fast (0.5s)</option>
            <option value="200">Turbo (0.2s)</option>
          </select>
          <button id="sim-toggle-btn" class="${running?'btn-red-trade':'btn-green-trade'}" style="width:auto;padding:8px 16px">
            ${running?'⏸ Pause':'▶ Start'}
          </button>
          <button id="sim-reset-btn" class="btn-ghost">↺ Reset</button>
        </div>
      </div>
    </div>

    <div class="stats-row mb10">
      ${statCard('Portfolio Value',fmtPKR(pv),+tr.toFixed(2),tr>=0?'#02c076':'#f6465d')}
      ${statCard('Cash',fmtPKR(bal),undefined,'#1890ff')}
      ${statCard('Invested',fmtPKR(pv-bal),undefined,'#f59e0b')}
      ${statCard('Total P&L',fmtPKR(pv-INIT),undefined,tr>=0?'#02c076':'#f6465d',tr.toFixed(2)+'% return')}
    </div>

    <div class="g2 mb10">
      <div class="card">
        <div class="card-hd">
          <div class="card-title">Portfolio Value Over Time</div>
          ${running?`<div class="live-badge"><div class="live-dot"></div>LIVE</div>`:''}
        </div>
        <div class="card-body"><div style="height:185px"><canvas id="sim-chart"></canvas></div></div>
      </div>
      <div class="card">
        <div class="card-hd"><div class="card-title">Trade Execution</div></div>
        <div style="padding:14px;display:flex;flex-direction:column;gap:8px">
          <select id="sim-sym-sel" class="sel-input" style="width:100%">
            ${STOCKS.map(s=>`<option value="${s.sym}" ${s.sym===selSym?'selected':''}>
              ${s.sym} — ₨${(prices[s.sym]||s.p).toFixed(2)}</option>`).join('')}
          </select>
          <div style="background:var(--bg2);border:1px solid var(--brd);border-radius:var(--r);padding:10px 12px">
            <div style="font-size:10px;color:var(--t2)">${selStk.name}</div>
            <div class="mono" style="font-size:22px;font-weight:700;color:var(--t1)">₨${selPr.toFixed(2)}</div>
            <div style="display:flex;gap:10px;align-items:center;margin-top:2px">
              ${chgHtml(+chgPct.toFixed(2))}
              <span style="font-size:10px;color:#06b6d4;margin-left:4px">Held: ${holdings[selSym]||0} · ${fmtPKR((holdings[selSym]||0)*selPr)}</span>
            </div>
          </div>
          <input id="sim-qty-inp" class="inp" type="number" min="1" value="${qty}" placeholder="Quantity (shares)"/>
          <div style="font-size:10px;color:var(--t2)">
            Cost: ₨${Math.round((prices[selSym]||0)*(+el.querySelector?.('#sim-qty-inp')?.value||qty)).toLocaleString()} · Cash: ${fmtPKR(bal)}
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
            <button id="buy-btn" class="btn-green-trade">▲ BUY</button>
            <button id="sell-btn" class="btn-red-trade">▼ SELL</button>
          </div>
        </div>
      </div>
    </div>

    <div class="card mb10">
      <div class="card-hd"><div class="card-title">Live Price Board</div><div class="card-sub">Click a stock to select it</div></div>
      <div class="price-grid" id="price-grid" style="padding:12px 14px">
        ${STOCKS.slice(0,15).map(s=>{
          const cur=prices[s.sym]||s.p, chg=((cur-s.p)/s.p*100);
          return `<div class="px-cell${selSym===s.sym?' sel':''}" data-sym="${s.sym}"
            style="${selSym===s.sym?`border-color:${s.col};background:${s.col}18`:''}">
            <div class="px-sym" style="color:${s.col}">${s.sym}</div>
            <div class="px-pr">₨${cur.toFixed(1)}</div>
            ${chgHtml(+chg.toFixed(2))}
            ${(holdings[s.sym]||0)>0?`<div class="px-held">${holdings[s.sym]} held</div>`:''}
          </div>`;
        }).join('')}
      </div>
    </div>

    <div class="g2">
      <div class="card">
        <div class="card-hd"><div class="card-title">Open Positions</div></div>
        ${Object.entries(holdings).filter(([,q])=>q>0).length===0
          ?`<div class="empty"><div class="empty-msg">No open positions</div></div>`
          :Object.entries(holdings).filter(([,q])=>q>0).map(([sym,q])=>{
            const s=STOCKS.find(x=>x.sym===sym)||{};
            return `<div class="holding-row">
              <div style="display:flex;align-items:center;flex:1">
                <span class="h-dot" style="background:${s.col||'#fff'}"></span>
                <div><div class="h-sym">${sym}</div><div class="h-sub">${q} shares</div></div>
              </div>
              <div class="h-val">${fmtPKR((prices[sym]||0)*q)}</div>
            </div>`;
          }).join('')}
      </div>
      <div class="card">
        <div class="card-hd"><div class="card-title">Trade Log</div><div class="card-sub">${trades.length} trades</div></div>
        ${trades.length===0?`<div class="empty"><div class="empty-msg">No trades yet</div><div class="empty-hint">Start the simulator and trade</div></div>`
        :trades.slice(0,20).map(t=>`<div class="tlog-row">
          <span class="mono" style="color:${t.type==='BUY'?'#02c076':'#f6465d'};font-weight:700">${t.type}</span>
          <span class="mono">${t.sym}</span>
          <span class="muted">${t.q} shares</span>
          <span class="mono">₨${t.price?.toFixed(2)}</span>
          <span class="muted">D${t.day}</span>
        </div>`).join('')}
      </div>
    </div>`;

    Charts.area('sim-chart', history.map(h=>`D${h.d}`), history.map(h=>h.v),
      tr>=0?'#02c076':'#f6465d', {yFmt:v=>fmtPKR(v)});

    // Wire controls
    $('sim-toggle-btn').addEventListener('click', () => {
      running = !running;
      if (running) {
        timer = setInterval(() => {
          STOCKS.forEach(s=>{
            const chg=(Math.random()-.485)*.028;
            prices[s.sym]=Math.max(.01,Math.round(prices[s.sym]*(1+chg)*100)/100);
          });
          day++;
          history = [...history.slice(-119),{d:day,v:Math.round(portVal())}];
          render();
        }, speed);
      } else { clearInterval(timer); render(); }
    });
    $('sim-reset-btn').addEventListener('click',()=>{
      running=false; clearInterval(timer);
      bal=INIT; holdings={}; day=0; history=[{d:0,v:INIT}]; trades=[];
      STOCKS.forEach(s=>{prices[s.sym]=s.p;}); render();
    });
    $('sim-speed-sel').addEventListener('change', e=>{
      speed=+e.target.value;
      if(running){clearInterval(timer);timer=setInterval(()=>{
        STOCKS.forEach(s=>{const c=(Math.random()-.485)*.028;prices[s.sym]=Math.max(.01,Math.round(prices[s.sym]*(1+c)*100)/100);});
        day++;history=[...history.slice(-119),{d:day,v:Math.round(portVal())}];render();
      },speed);}
    });
    $('sim-sym-sel').addEventListener('change',e=>{selSym=e.target.value;render();});
    $('price-grid').addEventListener('click',e=>{
      const cell=e.target.closest('.px-cell[data-sym]');if(!cell)return;
      selSym=cell.dataset.sym;render();
    });
    $('sim-qty-inp').addEventListener('input',e=>{qty=+e.target.value||qty;});
    $('buy-btn').addEventListener('click',()=>{
      const q=parseInt($('sim-qty-inp').value)||qty; if(!q)return;
      const pr=prices[selSym]||100, cost=pr*q;
      if(cost>bal){alert('Insufficient cash balance');return;}
      bal=+(bal-cost).toFixed(2); holdings[selSym]=(holdings[selSym]||0)+q;
      trades.unshift({type:'BUY',sym:selSym,q,price:pr,day}); render();
    });
    $('sell-btn').addEventListener('click',()=>{
      const q=parseInt($('sim-qty-inp').value)||qty; if(!q)return;
      const have=holdings[selSym]||0;
      if(q>have){alert(`You only hold ${have} shares of ${selSym}`);return;}
      const pr=prices[selSym]||100;
      bal=+(bal+pr*q).toFixed(2);
      holdings[selSym]=have-q; if(!holdings[selSym])delete holdings[selSym];
      trades.unshift({type:'SELL',sym:selSym,q,price:pr,day}); render();
    });
  }

  render();
}

// ─────────────────────────────────────────────────────────────────────────────
// PROFILE
// ─────────────────────────────────────────────────────────────────────────────
async function profile() {
  const user = window.App?.state?.user || {};
  const el = $('content'); if (!el) return;
  const RECS = {
    conservative:[{type:'Fixed Income',name:'NSS Special Savings Cert.',ret:'18.5%',col:'#02c076'},{type:'Money Market',name:'Meezan Cash Fund',ret:'21.5%',col:'#06b6d4'},{type:'Commodity',name:'Gold (24K)',ret:'~14-18%',col:'#f0b90b'}],
    moderate:[{type:'Balanced Fund',name:'Meezan Balanced Fund',ret:'28.3%',col:'#a855f7'},{type:'REIT',name:'Dolmen City REIT',ret:'8.2% yield',col:'#06b6d4'},{type:'Equity (Div.)',name:'UBL — 6.8% div yield',ret:'35.8% 1Y',col:'#1890ff'}],
    aggressive:[{type:'Equity',name:'NETSOL Technologies',ret:'110.5% 1Y',col:'#f6465d'},{type:'Equity Fund',name:'NBP Stock Fund',ret:'35.2%',col:'#f59e0b'},{type:'Equity',name:'Lucky Cement (LUCK)',ret:'62.1% 1Y',col:'#f0b90b'}],
  };
  const recs = RECS[user.risk_label||'moderate'];

  el.innerHTML = `
  <div class="profile-section">
    <h3>👤 My Investor Profile</h3>
    <div class="g2">
      <div>
        ${[{k:'Name',v:user.name},{k:'Email',v:user.email},{k:'Risk Label',v:user.risk_label,c:user.risk_label==='aggressive'?'#f6465d':user.risk_label==='moderate'?'#f59e0b':'#02c076'},{k:'Risk Score',v:`${user.risk_score||0}/100`},{k:'Age Group',v:user.age_group},{k:'Income Range',v:user.income_range}]
        .map(x=>`<div class="kv"><span class="kv-k">${x.k}</span><span class="kv-v" style="${x.c?`color:${x.c}`:''};">${x.v||'—'}</span></div>`).join('')}
      </div>
      <div>
        ${[{k:'Investment Goal',v:(user.invest_goal||'').replace(/_/g,' ')},{k:'Horizon',v:user.invest_horizon},{k:'Monthly Savings',v:user.monthly_savings},{k:'Halal Only',v:user.halal_only?'Yes':'No',c:user.halal_only?'#02c076':'#848e9c'}]
        .map(x=>`<div class="kv"><span class="kv-k">${x.k}</span><span class="kv-v" style="${x.c?`color:${x.c}`:''};">${x.v||'—'}</span></div>`).join('')}
        <div style="margin-top:14px">
          <label class="toggle-row" id="halal-toggle-row" style="cursor:pointer">
            <div class="tog-track${user.halal_only?' on':''}" id="halal-tog"><div class="tog-knob"></div></div>
            <span class="toggle-label">Halal / Shariah-compliant only</span>
          </label>
          <button id="save-prefs-btn" class="btn-primary btn-sm" style="margin-top:10px">Save Preferences</button>
        </div>
      </div>
    </div>
  </div>

  <div class="profile-section">
    <h3>🎯 Recommended for Your Risk Profile</h3>
    <div class="g3">
      ${(recs||[]).map(r=>`<div class="rec-card" style="border-left-color:${r.col}">
        <div class="rec-type">${r.type}</div>
        <div class="rec-name">${r.name}</div>
        <div class="rec-ret" style="color:${r.col}">${r.ret}</div>
      </div>`).join('')}
    </div>
  </div>

  <div class="profile-section">
    <h3>📊 Your Risk Profile Explained</h3>
    <div style="font-size:12px;color:var(--t2);line-height:1.8">
      ${user.risk_label==='conservative'
        ?'Your profile prioritises <strong style="color:#02c076">capital safety</strong>. Allocate 70-80% in government-backed instruments (NSS, T-Bills), 15-20% in money market funds, and 5-10% in gold. Avoid direct stock market exposure until you gain confidence.'
        :user.risk_label==='aggressive'
        ?'Your profile can tolerate <strong style="color:#f6465d">significant volatility</strong> for maximum long-term gains. Allocate 60-70% in equity funds and growth stocks, 15-20% in REITs, and maintain 10-15% in liquid instruments as a buffer.'
        :'Your <strong style="color:#f59e0b">moderate profile</strong> suits a balanced approach. Allocate 40% in balanced/income mutual funds, 30% in dividend stocks or equity funds, 20% in fixed income (NSS/PIBs), and 10% in gold or REITs.'}
    </div>
  </div>`;

  let halalOn = user.halal_only || false;
  const tog = $('halal-tog');
  $('halal-toggle-row').addEventListener('click', () => {
    halalOn = !halalOn;
    tog.classList.toggle('on', halalOn);
  });
  $('save-prefs-btn').addEventListener('click', async () => {
    try { await API.updateMe({halal_only:halalOn}); } catch {}
    alert('Preferences saved!');
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Export to window
// ─────────────────────────────────────────────────────────────────────────────
window.BTP = { overview, gold, stocks, funds, fixedIncome, reits, opportunities, portfolio, simulator, profile };
