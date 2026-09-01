/**
 * طبقة التخزين المحلي (IndexedDB) لدعم العمل دون اتصال بالإنترنت.
 * تُستخدم لتخزين نسخة مخبأة من البيانات، وقائمة انتظار للعمليات
 * التي تمت أثناء انقطاع الاتصال، ليتم مزامنتها لاحقاً.
 */
const LocalDB = (function () {
  const DB_NAME = 'pharmacy_db';
  const DB_VERSION = 1;
  const STORES = ['medicines', 'batches', 'suppliers', 'movements', 'meta', 'outbox'];
  let dbPromise = null;

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function () {
        const db = req.result;
        STORES.forEach(function (name) {
          if (!db.objectStoreNames.contains(name)) {
            const keyPath = name === 'outbox' ? 'opId' : 'ID';
            db.createObjectStore(name, { keyPath: keyPath });
          }
        });
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
    return dbPromise;
  }

  async function tx(store, mode) {
    const db = await open();
    return db.transaction(store, mode).objectStore(store);
  }

  return {
    async putAll(store, records) {
      const db = await open();
      const t = db.transaction(store, 'readwrite');
      const os = t.objectStore(store);
      records.forEach(function (r) { os.put(r); });
      return new Promise(function (resolve, reject) {
        t.oncomplete = resolve;
        t.onerror = function () { reject(t.error); };
      });
    },

    async getAll(store) {
      const os = await tx(store, 'readonly');
      return new Promise(function (resolve, reject) {
        const req = os.getAll();
        req.onsuccess = function () { resolve(req.result || []); };
        req.onerror = function () { reject(req.error); };
      });
    },

    async put(store, record) {
      const os = await tx(store, 'readwrite');
      return new Promise(function (resolve, reject) {
        const req = os.put(record);
        req.onsuccess = function () { resolve(record); };
        req.onerror = function () { reject(req.error); };
      });
    },

    async delete(store, key) {
      const os = await tx(store, 'readwrite');
      return new Promise(function (resolve, reject) {
        const req = os.delete(key);
        req.onsuccess = function () { resolve(); };
        req.onerror = function () { reject(req.error); };
      });
    },

    // قائمة انتظار العمليات (outbox) للمزامنة عند عودة الاتصال
    async queueOperation(op) {
      op.opId = op.opId || ('OP-' + Date.now() + '-' + Math.floor(Math.random() * 10000));
      op.createdAt = new Date().toISOString();
      await this.put('outbox', op);
      return op;
    },

    async getOutbox() {
      return this.getAll('outbox');
    },

    async clearOutboxItem(opId) {
      return this.delete('outbox', opId);
    },

    async setMeta(key, value) {
      return this.put('meta', { ID: key, value: value });
    },

    async getMeta(key) {
      const os = await tx('meta', 'readonly');
      return new Promise(function (resolve, reject) {
        const req = os.get(key);
        req.onsuccess = function () { resolve(req.result ? req.result.value : null); };
        req.onerror = function () { reject(req.error); };
      });
    },
  };
})();
