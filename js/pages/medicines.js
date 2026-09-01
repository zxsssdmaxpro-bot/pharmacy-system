const MedicinesPage = (function () {
  let cachedMeds = [];
  let cachedSuppliers = [];

  async function renderList() {
    PageUtils.render('<div class="flex justify-center py-16"><div class="spinner"></div></div>');
    try {
      cachedMeds = await API.list('Medicines', 'medicines');
      cachedSuppliers = await API.list('Suppliers', 'suppliers').catch(() => []);
    } catch (err) {
      PageUtils.render(App.errorBlock('تعذر تحميل قائمة الأدوية', err.message));
      return;
    }
    draw(cachedMeds);
  }

  function draw(meds) {
    PageUtils.render(`
      <div class="toolbar">
        <div class="search-box">
          <i data-lucide="search"></i>
          <input id="med-search" type="text" placeholder="ابحث بالاسم، الاسم العلمي، الشركة، الباركود...">
        </div>
        ${Auth.can('medicines.create') ? `<button class="btn btn-primary" onclick="Router.navigate('medicines-new')"><i data-lucide="plus"></i> إضافة دواء</button>` : ''}
        <button class="btn btn-outline" id="med-export"><i data-lucide="download"></i> تصدير CSV</button>
        <button class="btn btn-outline" id="med-print"><i data-lucide="printer"></i> طباعة</button>
      </div>

      <div class="table-wrap card">
        <table class="data-table" id="med-table">
          <thead>
            <tr>
              <th>الاسم</th><th>الشركة</th><th>الشكل</th><th>الكمية</th><th>الحالة</th>
              <th>سعر البيع</th><th>الموقع</th><th></th>
            </tr>
          </thead>
          <tbody id="med-tbody"></tbody>
        </table>
      </div>
    `);
    App.refreshIcons();
    renderRows(meds);

    document.getElementById('med-search').addEventListener('input', function (e) {
      const q = e.target.value.trim().toLowerCase();
      const filtered = !q ? meds : meds.filter(m =>
        ['Name', 'ScientificName', 'Manufacturer', 'Barcode', 'QRCode', 'ItemNumber']
          .some(f => String(m[f] || '').toLowerCase().includes(q)));
      renderRows(filtered);
    });

    document.getElementById('med-export').addEventListener('click', function () {
      const headers = ['Name', 'ScientificName', 'Manufacturer', 'Category', 'Form', 'Barcode', 'TotalQuantity', 'MinStock', 'SalePrice', 'StorageLocation'];
      PageUtils.downloadFile('medicines.csv', PageUtils.toCSV(meds, headers), 'text/csv;charset=utf-8');
    });

    document.getElementById('med-print').addEventListener('click', function () {
      const rows = meds.map(m => `<tr><td>${PageUtils.escapeHtml(m.Name)}</td><td>${PageUtils.escapeHtml(m.Manufacturer)}</td>
        <td>${m.TotalQuantity}</td><td>${PageUtils.fmtMoney(m.SalePrice)}</td></tr>`).join('');
      PageUtils.printHTML('قائمة الأدوية', `<h1>قائمة الأدوية</h1><table><thead><tr><th>الاسم</th><th>الشركة</th><th>الكمية</th><th>السعر</th></tr></thead><tbody>${rows}</tbody></table>`);
    });
  }

  function renderRows(meds) {
    const tbody = document.getElementById('med-tbody');
    if (!meds.length) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-8">لا توجد نتائج</td></tr>`;
      return;
    }
    tbody.innerHTML = meds.map(m => `
      <tr>
        <td><b>${PageUtils.escapeHtml(m.Name)}</b><div class="text-muted text-xs">${PageUtils.escapeHtml(m.ScientificName || '')}</div></td>
        <td>${PageUtils.escapeHtml(m.Manufacturer || '—')}</td>
        <td>${PageUtils.escapeHtml(m.Form || '—')}</td>
        <td><b>${m.TotalQuantity || 0}</b></td>
        <td>${PageUtils.stockBadge(m)}</td>
        <td>${PageUtils.fmtMoney(m.SalePrice)}</td>
        <td>${PageUtils.escapeHtml(m.StorageLocation || '—')}</td>
        <td class="row-actions">
          <button class="icon-btn" title="عرض/تعديل" onclick="MedicinesPage.edit('${m.ID}')"><i data-lucide="pencil"></i></button>
          ${Auth.isAdmin() ? `<button class="icon-btn danger" title="أرشفة" onclick="MedicinesPage.archive('${m.ID}')"><i data-lucide="archive"></i></button>` : ''}
        </td>
      </tr>`).join('');
    App.refreshIcons();
  }

  async function renderForm(medicineId) {
    PageUtils.render('<div class="flex justify-center py-16"><div class="spinner"></div></div>');
    let med = null;
    try {
      if (!cachedSuppliers.length) cachedSuppliers = await API.list('Suppliers', 'suppliers').catch(() => []);
      if (medicineId) {
        if (!cachedMeds.length) cachedMeds = await API.list('Medicines', 'medicines');
        med = cachedMeds.find(m => m.ID === medicineId);
      }
    } catch (err) {
      PageUtils.render(App.errorBlock('تعذر تحميل البيانات', err.message));
      return;
    }
    med = med || {};

    PageUtils.render(`
      <form id="med-form" class="card form-card">
        <div class="form-grid">
          ${field('Name', 'اسم الدواء *', med.Name, 'text', true)}
          ${field('ScientificName', 'الاسم العلمي', med.ScientificName)}
          ${field('Manufacturer', 'الشركة المصنعة', med.Manufacturer)}
          ${field('Category', 'التصنيف', med.Category)}
          ${field('Form', 'الشكل الدوائي (أقراص/شراب/حقن...)', med.Form)}
          ${field('Concentration', 'التركيز', med.Concentration)}
          ${field('PackageSize', 'حجم العبوة', med.PackageSize)}
          ${field('Barcode', 'الباركود', med.Barcode)}
          ${field('QRCode', 'كود QR الداخلي', med.QRCode || (med.ID ? '' : 'QR-' + Date.now()))}
          ${field('ItemNumber', 'رقم الصنف', med.ItemNumber)}
          ${field('PurchasePrice', 'سعر الشراء', med.PurchasePrice, 'number')}
          ${field('SalePrice', 'سعر البيع', med.SalePrice, 'number')}
          ${field('MinStock', 'الحد الأدنى للمخزون', med.MinStock ?? 10, 'number')}
          ${field('StorageLocation', 'مكان التخزين', med.StorageLocation)}
          <div class="form-field">
            <label>المورد</label>
            <select name="SupplierID">
              <option value="">— بدون —</option>
              ${cachedSuppliers.map(s => `<option value="${s.ID}" ${s.ID === med.SupplierID ? 'selected' : ''}>${PageUtils.escapeHtml(s.Name)}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-field">
          <label>ملاحظات</label>
          <textarea name="Notes" rows="2">${PageUtils.escapeHtml(med.Notes || '')}</textarea>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary"><i data-lucide="save"></i> حفظ</button>
          <button type="button" class="btn btn-outline" onclick="Router.navigate('medicines')">إلغاء</button>
        </div>
      </form>
    `);
    App.refreshIcons();

    document.getElementById('med-form').addEventListener('submit', async function (e) {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target).entries());
      data.TotalQuantity = med.TotalQuantity || 0;
      try {
        if (med.ID) {
          await API.update('Medicines', med.ID, data, Auth.getUser());
          App.showToast('تم تعديل بيانات الدواء بنجاح', 'success');
        } else {
          await API.create('Medicines', data, Auth.getUser());
          App.showToast('تمت إضافة الدواء بنجاح', 'success');
        }
        cachedMeds = [];
        Router.navigate('medicines');
      } catch (err) {
        App.showToast('فشل الحفظ: ' + err.message, 'error');
      }
    });
  }

  function field(name, label, value, type, required) {
    return `<div class="form-field">
      <label>${label}</label>
      <input name="${name}" type="${type || 'text'}" value="${PageUtils.escapeHtml(value ?? '')}" ${required ? 'required' : ''}>
    </div>`;
  }

  async function archive(id) {
    if (!confirm('هل تريد أرشفة هذا الصنف؟ لن يتم حذفه نهائياً ويمكن استرجاعه لاحقاً.')) return;
    try {
      await API.archive('Medicines', id, Auth.getUser());
      App.showToast('تمت الأرشفة بنجاح', 'success');
      cachedMeds = [];
      renderList();
    } catch (err) {
      App.showToast('فشل: ' + err.message, 'error');
    }
  }

  function edit(id) {
    window.__editId = id;
    Router.navigate('medicines-edit');
  }

  return { renderList, renderForm, edit, archive, getCached: () => cachedMeds };
})();
