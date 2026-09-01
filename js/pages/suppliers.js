const SuppliersPage = (function () {
  let suppliers = [];

  async function render() {
    PageUtils.render('<div class="flex justify-center py-16"><div class="spinner"></div></div>');
    try { suppliers = await API.list('Suppliers', 'suppliers'); }
    catch (err) { PageUtils.render(App.errorBlock('تعذر تحميل الموردين', err.message)); return; }
    draw();
  }

  function draw() {
    PageUtils.render(`
      <div class="toolbar">
        <h3 class="flex-1"></h3>
        <button class="btn btn-primary" id="sup-add"><i data-lucide="plus"></i> إضافة مورد</button>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        ${suppliers.length ? suppliers.map(s => `
          <div class="card supplier-card">
            <div class="flex justify-between items-start">
              <h4>${PageUtils.escapeHtml(s.Name)}</h4>
              <button class="icon-btn" onclick="SuppliersPage.edit('${s.ID}')"><i data-lucide="pencil"></i></button>
            </div>
            <p class="text-muted text-sm"><i data-lucide="phone" class="inline-icon"></i> ${PageUtils.escapeHtml(s.Phone || '—')}</p>
            <p class="text-muted text-sm"><i data-lucide="mail" class="inline-icon"></i> ${PageUtils.escapeHtml(s.Email || '—')}</p>
            <p class="text-muted text-sm"><i data-lucide="map-pin" class="inline-icon"></i> ${PageUtils.escapeHtml(s.Address || '—')}</p>
          </div>`).join('') : '<p class="text-muted col-span-full text-center py-8">لا يوجد موردون بعد</p>'}
      </div>
      <div id="sup-modal"></div>
    `);
    App.refreshIcons();
    document.getElementById('sup-add').addEventListener('click', () => openForm());
  }

  function openForm(supplier) {
    const s = supplier || {};
    document.getElementById('sup-modal').innerHTML = `
      <div class="modal-backdrop">
        <div class="modal card">
          <h3 class="card-title">${supplier ? 'تعديل مورد' : 'إضافة مورد'}</h3>
          <form id="sup-form" class="form-grid">
            <div class="form-field"><label>اسم المورد *</label><input name="Name" required value="${PageUtils.escapeHtml(s.Name || '')}"></div>
            <div class="form-field"><label>رقم الهاتف</label><input name="Phone" value="${PageUtils.escapeHtml(s.Phone || '')}"></div>
            <div class="form-field"><label>البريد الإلكتروني</label><input name="Email" type="email" value="${PageUtils.escapeHtml(s.Email || '')}"></div>
            <div class="form-field span-2"><label>العنوان</label><input name="Address" value="${PageUtils.escapeHtml(s.Address || '')}"></div>
            <div class="form-field span-2"><label>ملاحظات</label><textarea name="Notes" rows="2">${PageUtils.escapeHtml(s.Notes || '')}</textarea></div>
            <div class="form-actions span-2">
              <button type="submit" class="btn btn-primary">حفظ</button>
              <button type="button" class="btn btn-outline" id="sup-cancel">إلغاء</button>
            </div>
          </form>
        </div>
      </div>`;
    document.getElementById('sup-cancel').addEventListener('click', () => { document.getElementById('sup-modal').innerHTML = ''; });
    document.getElementById('sup-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target).entries());
      try {
        if (s.ID) await API.update('Suppliers', s.ID, data, Auth.getUser());
        else await API.create('Suppliers', data, Auth.getUser());
        App.showToast('تم الحفظ بنجاح', 'success');
        render();
      } catch (err) { App.showToast('فشل: ' + err.message, 'error'); }
    });
  }

  function edit(id) { openForm(suppliers.find(s => s.ID === id)); }

  return { render, edit };
})();
