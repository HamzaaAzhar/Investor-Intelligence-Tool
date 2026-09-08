/* API Client — all fetch calls go through here */
const API = (() => {
  const BASE = '';
  const _cache = {};
  async function req(method, path, body, useCache) {
    if (useCache && _cache[path] && Date.now() - _cache[path].ts < 30000)
      return _cache[path].data;
    const opts = { method, credentials: 'include', headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    try {
      const r = await fetch(BASE + path, opts);
      const d = await r.json();
      if (useCache) _cache[path] = { data: d, ts: Date.now() };
      return d;
    } catch (e) { console.error('[API]', path, e); return { error: 'Network error' }; }
  }
  const get  = (p, c) => req('GET',  p, null, c);
  const post = (p, b) => req('POST', p, b);
  const put  = (p, b) => req('PUT',  p, b);
  const del  = (p)    => req('DELETE', p);
  return {
    login:           (email, pw) => post('/auth/login', { email, password: pw }),
    guestLogin:      ()          => post('/auth/guest'),
    logout:          ()          => post('/auth/logout'),
    register:        (d)         => post('/auth/register', d),
    profileQuiz:     (d)         => post('/auth/profile-quiz', d),
    me:              ()          => get('/auth/me'),
    updateMe:        (d)         => put('/auth/me', d),
    init:            ()          => get('/api/init', true),
    gold:            ()          => get('/api/gold'),
    stocks:          ()          => get('/api/stocks'),
    funds:           ()          => get('/api/funds', true),
    fixed:           ()          => get('/api/fixed', true),
    reits:           ()          => get('/api/reits', true),
    exchange:        ()          => get('/api/exchange'),
    sectors:         ()          => get('/api/sectors', true),
    opportunities:   ()          => get('/api/opportunities'),
    history:         (a, p)      => get(`/api/history?asset=${encodeURIComponent(a)}&period=${p}`),
    aiInsight:       (topic, ctx)=> post('/api/ai-insight', { topic, context: ctx }),
    listPortfolios:  ()          => get('/portfolio/'),
    createPortfolio: (n, c)      => post('/portfolio/', { name: n, color: c }),
    deletePortfolio: (id)        => del(`/portfolio/${id}`),
    addHolding:      (pid, d)    => post(`/portfolio/${pid}/holdings`, d),
    removeHolding:   (pid, hid)  => del(`/portfolio/${pid}/holdings/${hid}`),
    comparePortfolios:()         => get('/portfolio/compare'),
    projection:      (pid)       => get(`/portfolio/${pid}/projection`),
    trackEvent:      (sid, ev, mod, dur) =>
      post('/analytics/event', { session_id: sid, event: ev, module: mod, duration_s: dur }),
    clearCache:      () => { Object.keys(_cache).forEach(k => delete _cache[k]); },
  };
})();
window.API = API;
