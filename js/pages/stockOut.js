const StockOutPage = (function () {
  let selectedMed = null;

  async function render() {
    PageUtils.render(`
      <div class="scan-layout">
        <div class="card">
          <h3 class="card-title"><i data-lucide="log-out"></i> إخراج دواء من المخزن</h3>
          <div class="search-box mb-3">
            <i data-lucide="search"></i>
            <input id="out-search" data-scanner-input="true" type="text" placeholder="ابحث بالاسم أو امسح الباركود..." autofocus>
          </div>
          <div class="scan-buttons">
            <button class="btn btn-outline" id="out-cam-btn"><i data-lucide="camera"></i> مسح بالكاميرا</button>
            <span class="text-muted text-xs">أو استخدم جهاز قارئ الباركود مباشرة</span>
          </div>
          <div id="out-cam-box" class="cam-box hidden"></div>
          <div id="out-results" class="results-list"></div>
        </div>

        <div class="card" id="out-form-card">
          <div class="empty-hint"><i data-lucide="package-search"></i><p>اختر دواءً من نتائج البحث أو امسح الباركود لبدء الإخراج</p></div>
        </div>
      </div>
    `);
    App.refreshIcons();

    const input = document.getElementById('out-search');
    let debounce;
    input.addEventListener('input', function () {
      clearTimeout(debounce);
      debounce = setTimeout(() => doSearch(input.value), 250);
    });

    document.getElementById('out-cam-btn').addEventListener('click', async function () {
      const box = document.getElementById('out-cam-box');
      const active = box.classList.contains('hidden');
      box.classList.toggle('hidden', !active);
      if (active) {
        box.innerHTML = '<div id="out-cam-reader"></div>';
        await Scanner.startCamera('out-cam-reader', handleScan, msg => App.showToast(msg, 'error'));
      } else {
        await Scanner.stopCamera();
      }
    });

    Scanner.enableUsbScanner(handleScan);
  }

  async function doSearch(q) {
    if (!q || q.length < 2) { document.getElementById('out-results').innerHTML = ''; return; }
    let results = [];
    try { results = await API.search(q); } catch (e) { /* تجاهل */ }
    const box = document.getElementById('out-results');
    box.innerHTML = results.slice(0, 8).map(m => `
      <div class="result-item" data-id="${m.ID}">
        <div><b>${PageUtils.escapeHtml(m.Name)}</b><div class="text-muted text-xs">متاح: ${m.TotalQuantity || 0}</div></div>
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

  async function handleScan(code) {
    document.getElementById('out-search').value = code;
    await doSearch(code);
    const results = document.querySelectorAll('#out-results .result-item');
    if (results.length === 1) results[0].click();
  }

  async function selectMedicine(med) {
    selectedMed = med;
    const isExpired = false; // تحقق تفصيلي بالدفعات يتم في السيرفر أيضاً كحماية إضافية
    document.getElementById('out-form-card').innerHTML = `
      <h3 class="card-title">${PageUtils.escapeHtml(med.Name)}</h3>
      <p class="text-muted text-sm mb-3">الكمية المتاحة: <b class="${Number(med.TotalQuantity) <= Number(med.MinStock) ? 'text-danger' : ''}">${med.TotalQuantity || 0}</b></p>
      <form id="out-form" class="form-grid">
        <div class="form-field"><label>الكمية المطلوب إخراجها *</label><input name="quantity" type="number" min="1" max="${med.TotalQuantity || 0}" required></div>
        <div class="form-field">
          <label>سبب الإخراج *</label>
          <select name="reason" required>
            <option value="بيع">بيع</option>
            <option value="صرف طبي">صرف طبي</option>
            <option value="تالف">تالف</option>
            <option value="منتهي الصلاحية">منتهي الصلاحية</option>
            <option value="أخرى">أخرى</option>
          </select>
        </div>
        <div class="form-field span-2"><label>ملاحظات</label><textarea name="notes" rows="2"></textarea></div>
        <p class="text-muted text-xs span-2"><i data-lucide="info"></i> سيتم اختيار الدفعات تلقائياً وفق نظام FEFO (الأقرب انتهاءً أولاً).</p>
        <div class="form-actions span-2">
          <button type="submit" class="btn btn-danger"><i data-lucide="check"></i> تأكيد الإخراج</button>
        </div>
      </form>
    `;
    App.refreshIcons();
    await Scanner.stopCamera();
    document.getElementById('out-cam-box')?.classList.add('hidden');

    document.getElementById('out-form').addEventListener('submit', async function (e) {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target).entries());
      data.medicineId = med.ID;
      if (Number(data.quantity) > Number(med.TotalQuantity || 0)) {
        App.showToast('لا يمكن إخراج كمية أكبر من المتاح', 'error');
        return;
      }
      try {
        const res = await API.stockOut(data, Auth.getUser());
        if (res.online === false) {
          App.showToast('لا يوجد اتصال — تم حفظ العملية محلياً وستتم مزامنتها تلقائياً', 'warning');
        } else {
          App.showToast('تم إخراج الكمية بنجاح', 'success');
        }
        selectedMed = null;
        document.getElementById('out-search').value = '';
        document.getElementById('out-results').innerHTML = '';
        document.getElementById('out-form-card').innerHTML = `<div class="empty-hint"><i data-lucide="package-search"></i><p>اختر دواءً آخر لإخراجه</p></div>`;
        App.refreshIcons();
      } catch (err) {
        App.showToast('فشل الإخراج: ' + err.message, 'error');
      }
    });
  }

  function cleanup() {
    Scanner.disableUsbScanner();
    Scanner.stopCamera();
  }

  return { render, cleanup };
})();
