const UsersPage = (function () {
  let users = [];

  async function render() {
    PageUtils.render('<div class="flex justify-center py-16"><div class="spinner"></div></div>');
    try { users = await API.list('Users', null); }
    catch (err) { PageUtils.render(App.errorBlock('تعذر تحميل المستخدمين', err.message)); return; }
    draw();
  }

  function draw() {
    PageUtils.render(`
      <div class="toolbar"><h3 class="flex-1"></h3>
        <button class="btn btn-primary" id="user-add"><i data-lucide="user-plus"></i> إضافة مستخدم</button>
      </div>
      <div class="table-wrap card">
        <table class="data-table">
          <thead><tr><th>الاسم</th><th>اسم الدخول</th><th>الصلاحية</th><th>آخر دخول</th><th></th></tr></thead>
          <tbody>
            ${users.map(u => `
              <tr>
                <td><b>${PageUtils.escapeHtml(u.Name)}</b></td>
                <td>${PageUtils.escapeHtml(u.Username)}</td>
                <td><span class="badge badge-info">${CONFIG.ROLE_LABELS[u.Role] || u.Role}</span></td>
                <td class="text-muted">${PageUtils.fmtDateTime(u.LastLogin)}</td>
                <td><button class="icon-btn" data-edit="${u.ID}"><i data-lucide="pencil"></i></button></td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div id="user-modal"></div>
    `);
    App.refreshIcons();
    document.getElementById('user-add').addEventListener('click', () => openForm());
    document.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => openForm(users.find(u => u.ID === b.dataset.edit))));
  }

  function openForm(user) {
    const u = user || {};
    document.getElementById('user-modal').innerHTML = `
      <div class="modal-backdrop">
        <div class="modal card">
          <h3 class="card-title">${user ? 'تعديل مستخدم' : 'إضافة مستخدم جديد'}</h3>
          <form id="user-form" class="form-grid">
            <div class="form-field"><label>الاسم الكامل *</label><input name="Name" required value="${PageUtils.escapeHtml(u.Name || '')}"></div>
            <div class="form-field"><label>اسم الدخول *</label><input name="Username" required value="${PageUtils.escapeHtml(u.Username || '')}" ${user ? 'readonly' : ''}></div>
            <div class="form-field"><label>${user ? 'كلمة مرور جديدة (اتركها فارغة للإبقاء عليها)' : 'كلمة المرور *'}</label><input name="Password" type="password" ${user ? '' : 'required'}></div>
            <div class="form-field">
              <label>الصلاحية</label>
              <select name="Role">
                <option value="admin" ${u.Role === 'admin' ? 'selected' : ''}>مدير النظام</option>
                <option value="warehouse" ${u.Role === 'warehouse' ? 'selected' : ''}>موظف مخزن</option>
                <option value="sales" ${u.Role === 'sales' ? 'selected' : ''}>صيدلي / مبيعات</option>
              </select>
            </div>
            <div class="form-actions span-2">
              <button type="submit" class="btn btn-primary">حفظ</button>
              <button type="button" class="btn btn-outline" id="user-cancel">إلغاء</button>
            </div>
          </form>
        </div>
      </div>`;
    document.getElementById('user-cancel').addEventListener('click', () => { document.getElementById('user-modal').innerHTML = ''; });
    document.getElementById('user-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target).entries());
      if (data.Password) {
        data.PasswordHash = await sha256(data.Password);
      }
      delete data.Password;
      try {
        if (u.ID) await API.update('Users', u.ID, data, Auth.getUser());
        else await API.create('Users', Object.assign(data, { Active: true }), Auth.getUser());
        App.showToast('تم الحفظ بنجاح', 'success');
        render();
      } catch (err) { App.showToast('فشل: ' + err.message, 'error'); }
    });
  }

  async function sha256(text) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  return { render };
})();
