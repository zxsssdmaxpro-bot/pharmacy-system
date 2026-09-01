const StockInPage = (function () {
  let selectedMed = null;
  let suppliers = [];

  async function render() {
    PageUtils.render('<div class="flex justify-center py-16"><div class="spinner"></div></div>');
    try {
      suppliers = await API.list('Suppliers', 'suppliers').catch(() => []);
    } catch (e) { suppliers = []; }

    PageUtils.render(`
      <div class="scan-layout">
        <div class="card">
          <h3 class="card-title"><i data-lucide="log-in"></i> إدخال دواء إلى المخزن</h3>
          <div class="search-box mb-3">
            <i data-lucide="search"></i>
            <input id="in-search" data-scanner-input="true" type="text" placeholder="ابحث بالاسم أو امسح الباركود..." autofocus>
          </div>
          <div class="scan-buttons">
            <button class="btn btn-outline" id="in-cam-btn"><i data-lucide="camera"></i> مسح بالكاميرا</button>
            <span class="text-muted text-xs">أو استخدم جهاز قارئ الباركود مباشرة</span>
          </div>
          <div id="in-cam-box" class="cam-box hidden"></div>
          <div id="in-results" class="results-list"></div>
        </div>

        <div class="card" id="in-form-card">
          ${selectedMed ? renderFormHtml(selectedMed) : `<div class="empty-hint"><i data-lucide="package-search"></i><p>اختر دواءً من نتائج البحث أو امسح الباركود لبدء الإدخال</p></div>`}
        </div>
      </div>
    `);
    App.refreshIcons();
    bindSearch();
    bindCamera();
    Scanner.enableUsbScanner(handleScan);
  }

  function bindSearch() {
    const input = document.getElementById('in-search');
    let debounce;
    input.addEventListener('input', function () {
      clearTimeout(debounce);
      debounce = setTimeout(() => doSearch(input.value), 250);
    });
  }

  async function doSearch(q) {
    if (!q || q.length < 2) { document.getElementById('in-results').innerHTML = ''; return; }
    let results = [];
    try { results = await API.search(q); } catch (e) { /* تجاهل */ }
    const box = document.getElementById('in-results');
    box.innerHTML = results.slice(0, 8).map(m => `
      <div class="result-item" data-id="${m.ID}">
        <div><b>${PageUtils.escapeHtml(m.Name)}</b><div class="text-muted text-xs">${PageUtils.escapeHtml(m.Manufacturer || '')} · الكمية الحالية: ${m.TotalQuantity || 0}</div></div>
        <i data-lucide="chevron-left"></i>
      </div>`).join('') || '<div class="text-muted text-sm py-2">لا توجد نتائج</div>';
    App.refreshIcons();
    box.querySelectorAll('.result-item').forEach(item => {
      item.addEventListener('click', () => {
        const med = results.find(r => r.ID === item.dataset.id);
        selectMedicine(med);
      });
    });
  }

  function bindCamera() {
    const btn = document.getElementById('in-cam-btn');
    const box = document.getElementById('in-cam-box');
    let active = false;
    btn.addEventListener('click', async function () {
      active = !active;
      box.classList.toggle('hidden', !active);
      if (active) {
        box.innerHTML = '<div id="in-cam-reader"></div>';
        await Scanner.startCamera('in-cam-reader', handleScan, msg => App.showToast(msg, 'error'));
      } else {
        await Scanner.stopCamera();
      }
    });
  }

  async function handleScan(code) {
    document.getElementById('in-search').value = code;
    await doSearch(code);
    const results = document.querySelectorAll('.result-item');
    if (results.length === 1) results[0].click();
  }

  async function selectMedicine(med) {
    selectedMed = med;
    document.getElementById('in-form-card').innerHTML = renderFormHtml(med);
    App.refreshIcons();
    bindForm();
    await Scanner.stopCamera();
    document.getElementById('in-cam-box')?.classList.add('hidden');
  }

  function renderFormHtml(med) {
    return `
      <h3 class="card-title">${PageUtils.escapeHtml(med.Name)}</h3>
      <p class="text-muted text-sm mb-3">الكمية الحالية في المخزن: <b>${med.TotalQuantity || 0}</b></p>
      <form id="in-form" class="form-grid">
        <div class="form-field"><label>الكمية الواردة *</label><input name="quantity" type="number" min="1" required></div>
        <div class="form-field"><label>رقم التشغيلة *</label><input name="batchNumber" type="text" required></div>
        <div class="form-field"><label>تاريخ الإنتاج</label><input name="productionDate" type="date"></div>
        <div class="form-field"><label>تاريخ انتهاء الصلاحية *</label><input name="expiryDate" type="date" required></div>
        <div class="form-field"><label>سعر الشراء</label><input name="purchasePrice" type="number" step="0.01"></div>
        <div class="form-field">
          <label>المورد</label>
          <select name="supplierId"><option value="">— بدون —</option>
            ${suppliers.map(s => `<option value="${s.ID}">${PageUtils.escapeHtml(s.Name)}</option>`).join('')}
          </select>
        </div>
        <div class="form-field"><label>مكان التخزين</label><input name="storageLocation" type="text" value="${PageUtils.escapeHtml(med.StorageLocation || '')}"></div>
        <div class="form-field span-2"><label>ملاحظات</label><textarea name="notes" rows="2"></textarea></div>
        <div class="form-actions span-2">
          <button type="submit" class="btn btn-primary"><i data-lucide="check"></i> تأكيد الإدخال</button>
        </div>
      </form>
    `;
  }

  function bindForm() {
    document.getElementById('in-form').addEventListener('submit', async function (e) {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target).entries());
      data.medicineId = selectedMed.ID;
      try {
        const res = await API.stockIn(data, Auth.getUser());
        if (res.online === false) {
          App.showToast('لا يوجد اتصال — تم حفظ العملية محلياً وستتم مزامنتها تلقائياً', 'warning');
        } else {
          App.showToast('تم إدخال الكمية بنجاح', 'success');
        }
        selectedMed = null;
        document.getElementById('in-search').value = '';
        document.getElementById('in-results').innerHTML = '';
        document.getElementById('in-form-card').innerHTML = `<div class="empty-hint"><i data-lucide="package-search"></i><p>اختر دواءً آخر لإدخاله</p></div>`;
        App.refreshIcons();
      } catch (err) {
        App.showToast('فشل الإدخال: ' + err.message, 'error');
      }
    });
  }

  function cleanup() {
    Scanner.disableUsbScanner();
    Scanner.stopCamera();
  }

  return { render, cleanup };
})();
