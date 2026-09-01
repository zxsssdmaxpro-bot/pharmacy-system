const InventoryPage = (function () {
  let meds = [], batches = [];

  async function render() {
    PageUtils.render('<div class="flex justify-center py-16"><div class="spinner"></div></div>');
    try {
      meds = await API.list('Medicines', 'medicines');
      batches = await API.list('Batches', 'batches');
    } catch (err) {
      PageUtils.render(App.errorBlock('تعذر تحميل بيانات المخزون', err.message));
      return;
    }
    draw();
  }

  function draw() {
    const rows = buildRows();
    PageUtils.render(`
      <div class="toolbar">
        <div class="search-box"><i data-lucide="search"></i><input id="inv-search" placeholder="بحث..."></div>
        <select id="inv-filter" class="select-filter">
          <option value="">كل الحالات</option>
          <option value="good">مخزون جيد</option>
          <option value="low">مخزون منخفض</option>
          <option value="out">نفد المخزون</option>
          <option value="soon">قريب الانتهاء</option>
          <option value="expired">منتهي الصلاحية</option>
        </select>
        <button class="btn btn-outline" id="inv-export"><i data-lucide="download"></i> تصدير CSV</button>
        <button class="btn btn-outline" id="inv-print"><i data-lucide="printer"></i> طباعة</button>
      </div>
      <div class="table-wrap card">
        <table class="data-table">
          <thead><tr><th>الدواء</th><th>الكود</th><th>التشغيلة</th><th>الكمية</th><th>الانتهاء</th><th>حالة المخزون</th><th>حالة الصلاحية</th><th>الموقع</th></tr></thead>
          <tbody id="inv-tbody"></tbody>
        </table>
      </div>
    `);
    App.refreshIcons();
    renderRows(rows);

    document.getElementById('inv-search').addEventListener('input', applyFilters);
    document.getElementById('inv-filter').addEventListener('change', applyFilters);
    document.getElementById('inv-export').addEventListener('click', () => {
      PageUtils.downloadFile('inventory.csv', PageUtils.toCSV(rows, ['MedName', 'Barcode', 'BatchNumber', 'Quantity', 'ExpiryDate', 'StorageLocation']), 'text/csv;charset=utf-8');
    });
    document.getElementById('inv-print').addEventListener('click', () => {
      const html = rows.map(r => `<tr><td>${PageUtils.escapeHtml(r.MedName)}</td><td>${PageUtils.escapeHtml(r.BatchNumber || '—')}</td><td>${r.Quantity}</td><td>${PageUtils.fmtDate(r.ExpiryDate)}</td></tr>`).join('');
      PageUtils.printHTML('تقرير المخزون', `<h1>تقرير المخزون</h1><table><thead><tr><th>الدواء</th><th>التشغيلة</th><th>الكمية</th><th>الانتهاء</th></tr></thead><tbody>${html}</tbody></table>`);
    });

    function applyFilters() {
      const q = document.getElementById('inv-search').value.trim().toLowerCase();
      const status = document.getElementById('inv-filter').value;
      const filtered = rows.filter(r => {
        const matchQ = !q || r.MedName.toLowerCase().includes(q) || String(r.Barcode || '').toLowerCase().includes(q);
        if (!matchQ) return false;
        if (!status) return true;
        if (status === 'good') return r.stockStatus === 'good';
        if (status === 'low') return r.stockStatus === 'low';
        if (status === 'out') return r.stockStatus === 'out';
        if (status === 'soon') return r.expDays !== null && r.expDays >= 0 && r.expDays <= 90;
        if (status === 'expired') return r.expDays !== null && r.expDays < 0;
        return true;
      });
      renderRows(filtered);
    }
  }

  function buildRows() {
    const rows = [];
    meds.forEach(m => {
      const medBatches = batches.filter(b => String(b.MedicineID) === String(m.ID) && Number(b.Quantity) > 0);
      const qty = Number(m.TotalQuantity || 0);
      const min = Number(m.MinStock || 0);
      const stockStatus = qty <= 0 ? 'out' : (qty <= min ? 'low' : 'good');
      if (medBatches.length === 0) {
        rows.push({ MedName: m.Name, Barcode: m.Barcode, BatchNumber: '', Quantity: qty, ExpiryDate: '', StorageLocation: m.StorageLocation, stockStatus, expDays: null });
      } else {
        medBatches.forEach(b => {
          rows.push({
            MedName: m.Name, Barcode: m.Barcode, BatchNumber: b.BatchNumber, Quantity: b.Quantity,
            ExpiryDate: b.ExpiryDate, StorageLocation: b.StorageLocation || m.StorageLocation,
            stockStatus, expDays: PageUtils.daysUntil(b.ExpiryDate),
          });
        });
      }
    });
    return rows;
  }

  function renderRows(rows) {
    const tbody = document.getElementById('inv-tbody');
    if (!rows.length) { tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-8">لا توجد نتائج</td></tr>`; return; }
    tbody.innerHTML = rows.map(r => `
      <tr>
        <td><b>${PageUtils.escapeHtml(r.MedName)}</b></td>
        <td class="text-muted">${PageUtils.escapeHtml(r.Barcode || '—')}</td>
        <td>${PageUtils.escapeHtml(r.BatchNumber || '—')}</td>
        <td><b>${r.Quantity}</b></td>
        <td>${PageUtils.fmtDate(r.ExpiryDate)}</td>
        <td>${r.stockStatus === 'out' ? '<span class="badge badge-danger">نفد</span>' : r.stockStatus === 'low' ? '<span class="badge badge-warning">منخفض</span>' : '<span class="badge badge-success">جيد</span>'}</td>
        <td>${PageUtils.expiryBadge(r.expDays)}</td>
        <td>${PageUtils.escapeHtml(r.StorageLocation || '—')}</td>
      </tr>`).join('');
  }

  return { render };
})();
