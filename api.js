(function(){
  const cfg = window.APP_CONFIG || {};
  const base = String(cfg.API_BASE || "").replace(/\/$/,'');
  const publishableKey = String(cfg.SUPABASE_PUBLISHABLE_KEY || "").trim();
  if (!base || base.includes("YOUR_PROJECT_REF")) console.warn("請先在 config.js 設定 Supabase API_BASE。");
  if (!publishableKey) console.warn("請先在 config.js 設定 Supabase publishable key。");

  async function call(path, options){
    const opts = options || {};
    const token = localStorage.getItem('dls_token');
    const headers = Object.assign({
      'Content-Type':'application/json',
      'apikey': publishableKey
    }, opts.headers || {});
    if (token) headers.Authorization = 'Bearer ' + token;
    const response = await fetch(base + path, Object.assign({}, opts, {headers}));
    let body = null;
    try { body = await response.json(); } catch (_) {}
    if (!response.ok) {
      const err = new Error((body && body.error) || '連線失敗');
      err.status = response.status;
      err.body = body;
      throw err;
    }
    return body;
  }

  window.api = {
    get: (path) => call(path, {method:'GET'}),
    post: (path, data) => call(path, {method:'POST', body: JSON.stringify(data || {})}),
    put: (path, data) => call(path, {method:'PUT', body: JSON.stringify(data || {})}),
    delete: (path) => call(path, {method:'DELETE'}),
    setToken: (token, role) => { localStorage.setItem('dls_token', token); localStorage.setItem('dls_role', role || ''); },
    clearToken: () => { localStorage.removeItem('dls_token'); localStorage.removeItem('dls_role'); },
    hasToken: () => !!localStorage.getItem('dls_token'),
    tokenRole: () => localStorage.getItem('dls_role') || ''
  };
})();
