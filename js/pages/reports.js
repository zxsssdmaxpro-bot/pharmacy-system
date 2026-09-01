const ReportsPage = (function () {
  const REPORTS = [
    { id: 'current-stock', name: 'المخزون الحالي', icon: 'boxes' },
    { id: 'low-stock', name: 'الأدوية منخفضة المخزون', icon: 'trending-down' },
    { id: 'expired', name: 'الأدوية المنتهية', icon: 'alert-triangle' },
    { id: 'expiring-soon', name: 'قريبة الانتهاء', icon: 'clock' },
    { id: 'stock-in', name: 'حركة الإدخال', icon: 'log-in' },
    { id: 'stock-out', name: 'حركة الإخراج', icon: 'log-out' },
    { id: 'stock-value', name: 'قيمة المخزون', icon: 'wallet' },
  ];

  async function render() {
    PageUtils.render(`
      <div class="report-grid">
        ${REPORTS.map(r => `
          <button class="report-card" data-id="${r.id}">
            <i data-lucide="${r.icon}"></i>
            <span>${r.name}</span>
          </button>`).join('')}
      </div>
      <div id="report-output" class="mt-4"></div>
    `);
    App.refreshIcons();
    document.querySelectorAll('.report-card').forEach(btn => {
      btn.addEventListener('click', () => runReport(btn.dataset.id));
    });
  }

  async function runReport(id) {
    const out = document.getElementById('report-output');
    out.innerHTML = '<div class="flex justify-center py-10"><div class="spinner"></div></div>';
    const meds = await API.list('Medicines', 'medicines');
    const batches = await API.list('Batches', 'batches');
    const movements = await API.list('StockMovements', 'movements');

    let rows = [], headers = [], title = '';

    if (id === 'current-stock') {
      title = 'المخزون الحالي';
      headers = ['Name', 'Manufacturer', 'TotalQuantity', 'MinStock', 'StorageLocation'];
      rows = meds.map(m => ({ Name: m.Name, Manufacturer: m.Manufacturer, TotalQuantity: m.TotalQuantity, MinStock: m.MinStock, StorageLocation: m.StorageLocation }));
    } else if (id === 'low-stock') {
      title = 'الأدوية منخفضة المخزون';
      headers = ['Name', 'TotalQuantity', 'MinStock'];
      rows = meds.filter(m => Number(m.TotalQuantity) <= Number(m.MinStock)).map(m => ({ Name: m.Name, TotalQuantity: m.TotalQuantity, MinStock: m.MinStock }));
    } else if (id === 'expired' || id === 'expiring-soon') {
      title = id === 'expired' ? 'الأدوية المنتهية الصلاحية' : 'الأدوية القريبة من انتهاء الصلاحية';
      headers = ['Name', 'BatchNumber', 'Quantity', 'ExpiryDate'];
      rows = batches.filter(b => {
        const d = PageUtils.daysUntil(b.ExpiryDate);
        return id === 'expired' ? d < 0 : (d >= 0 && d <= 90);
      }).map(b => {
        const med = meds.find(m => m.ID === b.MedicineID);
        return { Name: med ? med.Name : b.MedicineID, BatchNumber: b.BatchNumber, Quantity: b.Quantity, ExpiryDate: PageUtils.fmtDate(b.ExpiryDate) };
      });
    } else if (id === 'stock-in' || id === 'stock-out') {
      const type = id === 'stock-in' ? 'IN' : 'OUT';
      title = type === 'IN' ? 'تقرير حركة الإدخال' : 'تقرير حركة الإخراج';
      headers = ['MedicineName', 'Quantity', 'UserName', 'Date', 'Reason'];
      rows = movements.filter(m => m.Type === type).map(m => ({ ...m, Date: PageUtils.fmtDateTime(m.Date) }));
    } else if (id === 'stock-value') {
      title = 'تقرير قيمة المخزون';
      headers = ['Name', 'TotalQuantity', 'SalePrice', 'Value'];
      rows = meds.map(m => ({ Name: m.Name, TotalQuantity: m.TotalQuantity, SalePrice: m.SalePrice, Value: (Number(m.TotalQuantity) * Number(m.SalePrice)).toFixed(2) }));
    }

    const total = rows.length;
    out.innerHTML = `
      <div class="card">
        <div class="toolbar">
          <h3 class="card-title flex-1">${title} (${total})</h3>
          <button class="btn btn-outline" id="rep-csv"><i data-lucide="download"></i> CSV</button>
          <button class="btn btn-outline" id="rep-print"><i data-lucide="printer"></i> طباعة</button>
        </div>
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr>${headers.map(h => `<th>${headerLabel(h)}</th>`).join('')}</tr></thead>
            <tbody>
              ${rows.length ? rows.map(r => `<tr>${headers.map(h => `<td>${PageUtils.escapeHtml(r[h])}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="${headers.length}" class="text-center text-muted py-8">لا توجد بيانات</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>`;
    App.refreshIcons();

    document.getElementById('rep-csv').addEventListener('click', () => {
      PageUtils.downloadFile(id + '.csv', PageUtils.toCSV(rows, headers), 'text/csv;charset=utf-8');
    });
    document.getElementById('rep-print').addEventListener('click', () => {
      const html = rows.map(r => `<tr>${headers.map(h => `<td>${PageUtils.escapeHtml(r[h])}</td>`).join('')}</tr>`).join('');
      PageUtils.printHTML(title, `<h1>${title}</h1><table><thead><tr>${headers.map(h => `<th>${headerLabel(h)}</th>`).join('')}</tr></thead><tbody>${html}</tbody></table>`);
    });
  }

  function headerLabel(h) {
    const map = { Name: 'الاسم', Manufacturer: 'الشركة', TotalQuantity: 'الكمية', MinStock: 'الحد الأدنى',
      StorageLocation: 'الموقع', BatchNumber: 'التشغيلة', Quantity: 'الكمية', ExpiryDate: 'الانتهاء',
      MedicineName: 'الدواء', UserName: 'الموظف', Date: 'التاريخ', Reason: 'السبب', SalePrice: 'سعر البيع', Value: 'القيمة' };
    return map[h] || h;
  }

  return { render };
})();
