/**
 * طبقة الاتصال بالخادم (Google Apps Script API)
 * - كل طلبات القراءة (GET) تُخزَّن محلياً لتُستخدم عند عدم الاتصال.
 * - كل طلبات الكتابة (POST) في حال عدم الاتصال تُحفظ في outbox
 *   وتُزامَن تلقائياً عند عودة الشبكة.
 */
const API = (function () {
  function isConfigured() {
    return !!(CONFIG.API_URL && String(CONFIG.API_URL).trim().indexOf('http') === 0);
  }

  function buildFetchError_(message, cause) {
    const base = message || 'تعذر الاتصال بـ Google Apps Script.';
    const extra = [];
    if (!isConfigured()) {
      extra.push('لم يتم ضبط رابط API_URL في js/config.js بعد؛ ضع رابط Web App الذي تحصل عليه من Apps Script.');
    }
    if (location.protocol === 'file:') {
      extra.push('تم فتح الموقع عبر file:// ، يجب تشغيله عبر خادم HTTP مثل python -m http.server 8000.');
    }
    extra.push('تأكد أيضاً أن المشروع منشور كـ Web App في Apps Script وأنه تم نشر نسخة جديدة بعد أي تعديل في Code.gs.');
    return new Error(base + (extra.length ? ' ' + extra.join(' ') : '') + (cause ? ' التفاصيل: ' + cause : ''));
  }

  async function parseJsonResponse_(res) {
    const text = await res.text();
    if (!text) throw buildFetchError_('استجاب الخادم بقيمة فارغة.', 'Empty response');
    try {
      return JSON.parse(text);
    } catch (e) {
      throw buildFetchError_('الخادم أعاد استجابة غير JSON.', text.slice(0, 200));
    }
  }

  async function get(action, params) {
    if (!isConfigured()) throw new Error('لم يتم إعداد رابط API بعد. افتح js/config.js وضع رابط Web App من Apps Script.');
    const url = new URL(CONFIG.API_URL);
    url.searchParams.set('action', action);
    Object.keys(params || {}).forEach(function (k) { url.searchParams.set(k, params[k]); });

    if (!navigator.onLine) throw new Error('OFFLINE');

    try {
      const res = await fetch(url.toString(), { method: 'GET' });
      if (!res.ok) {
        throw buildFetchError_('استجابة الخادم غير ناجحة.', 'status=' + res.status + ' ' + res.statusText);
      }
      const json = await parseJsonResponse_(res);
      if (!json.success) throw new Error(json.error || 'خطأ غير معروف من الخادم');
      return json.data;
    } catch (err) {
      if (err && err.message === 'OFFLINE') throw err;
      throw buildFetchError_(err && err.message ? err.message : 'تعذر الاتصال بـ Google Apps Script.', 'GET ' + url.toString());
    }
  }

  // نرسل الجسم كـ text/plain لتفادي تفعيل CORS preflight من المتصفح،
  // ويقوم Code.gs بعمل JSON.parse يدوياً على e.postData.contents
  async function post(action, payload) {
    if (!isConfigured()) throw new Error('لم يتم إعداد رابط API بعد. افتح js/config.js وضع رابط Web App من Apps Script.');
    if (!navigator.onLine) throw new Error('OFFLINE');

    const body = Object.assign({ action: action }, payload);
    try {
      const res = await fetch(CONFIG.API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        throw buildFetchError_('استجابة الخادم غير ناجحة.', 'status=' + res.status + ' ' + res.statusText);
      }
      const json = await parseJsonResponse_(res);
      if (!json.success) throw new Error(json.error || 'خطأ غير معروف من الخادم');
      return json.data;
    } catch (err) {
      if (err && err.message === 'OFFLINE') throw err;
      throw buildFetchError_(err && err.message ? err.message : 'تعذر الاتصال بـ Google Apps Script.', 'POST ' + CONFIG.API_URL);
    }
  }

  // --- قراءة عامة لقائمة سجلات مع كاش محلي ---
  async function list(sheetName, storeName) {
    try {
      const data = await get('list', { sheet: sheetName });
      if (storeName) await LocalDB.putAll(storeName, data);
      return data;
    } catch (err) {
      if (storeName) {
        const cached = await LocalDB.getAll(storeName);
        if (cached.length) return cached;
      }
      throw err;
    }
  }

  async function dashboard() {
    return get('dashboard', {});
  }

  async function search(query) {
    try {
      return await get('search', { q: query });
    } catch (err) {
      // بحث محلي احتياطي عند عدم الاتصال
      const meds = await LocalDB.getAll('medicines');
      const q = (query || '').toLowerCase();
      return meds.filter(function (m) {
        return ['Name', 'ScientificName', 'Manufacturer', 'Barcode', 'QRCode', 'ItemNumber']
          .some(function (f) { return String(m[f] || '').toLowerCase().indexOf(q) !== -1; });
      });
    }
  }

  // --- كتابة مع دعم قائمة الانتظار عند عدم الاتصال ---
  async function writeOrQueue(action, payload) {
    try {
      return { online: true, result: await post(action, payload) };
    } catch (err) {
      if (err.message === 'OFFLINE' || !navigator.onLine) {
        const op = await LocalDB.queueOperation({ action: action, data: payload.data, user: payload.user, sheet: payload.sheet });
        return { online: false, queued: op };
      }
      throw err;
    }
  }

  async function login(username, password) {
    return post('login', { username: username, password: password });
  }

  async function create(sheet, data, user) {
    return writeOrQueue('create', { sheet: sheet, data: data, user: user });
  }

  async function update(sheet, id, data, user) {
    return post('update', { sheet: sheet, id: id, data: data, user: user });
  }

  async function archive(sheet, id, user) {
    return post('delete', { sheet: sheet, id: id, user: user });
  }

  async function stockIn(data, user) {
    return writeOrQueue('stockIn', { data: data, user: user });
  }

  async function stockOut(data, user) {
    return writeOrQueue('stockOut', { data: data, user: user });
  }

  async function inventoryCount(data, user) {
    return writeOrQueue('inventoryCount', { data: data, user: user });
  }

  // مزامنة قائمة الانتظار (outbox) عند عودة الاتصال
  async function syncOutbox(user) {
    const ops = await LocalDB.getOutbox();
    if (!ops.length) return { synced: 0 };
    const res = await post('syncBatch', { operations: ops, user: user });
    for (const r of res) {
      if (r.success) await LocalDB.clearOutboxItem(r.opId);
    }
    return { synced: res.filter(function (r) { return r.success; }).length, total: ops.length, results: res };
  }

  return {
    isConfigured, get, post, list, dashboard, search, login,
    create, update, archive, stockIn, stockOut, inventoryCount, syncOutbox,
  };
})();
