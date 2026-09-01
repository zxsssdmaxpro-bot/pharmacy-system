const SettingsPage = (function () {
  async function render() {
    PageUtils.render(`
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div class="card">
          <h3 class="card-title"><i data-lucide="settings"></i> إعدادات النظام</h3>
          <div class="form-field"><label>اسم الصيدلية</label><input id="set-name" value="${localStorage.getItem('pharmacy_name') || 'صيدليتي'}"></div>
          <div class="form-field"><label>تنبيه قبل انتهاء الصلاحية (بالأيام)</label><input id="set-days" type="number" value="${CONFIG.DEFAULT_EXPIRY_ALERT_DAYS}"></div>
          <div class="form-field">
            <label>الوضع الداكن</label>
            <button class="btn btn-outline" id="toggle-theme"><i data-lucide="moon"></i> تبديل الوضع الداكن/الفاتح</button>
          </div>
          <button class="btn btn-primary" id="save-settings">حفظ الإعدادات</button>
        </div>

        <div class="card">
          <h3 class="card-title"><i data-lucide="database-backup"></i> النسخ الاحتياطي</h3>
          <p class="text-muted text-sm mb-3">تصدير نسخة كاملة من بيانات المخزون المخزَّنة محلياً (كنسخة احتياطية إضافية إلى جانب Google Sheets نفسها التي تُعد المصدر الأساسي للبيانات).</p>
          <button class="btn btn-outline mb-2" id="backup-export"><i data-lucide="download"></i> تصدير نسخة احتياطية (JSON)</button>
          <div>
            <label class="btn btn-outline" style="display:inline-flex;cursor:pointer">
              <i data-lucide="upload"></i> استيراد نسخة احتياطية
              <input type="file" id="backup-import" accept="application/json" style="display:none">
            </label>
          </div>
        </div>

        <div class="card">
          <h3 class="card-title"><i data-lucide="wifi"></i> حالة الاتصال والمزامنة</h3>
          <p>الحالة الحالية: <span id="conn-status" class="badge ${navigator.onLine ? 'badge-success' : 'badge-danger'}">${navigator.onLine ? 'متصل' : 'غير متصل'}</span></p>
          <p class="text-muted text-sm">العمليات المعلّقة للمزامنة: <b id="pending-count">—</b></p>
          <button class="btn btn-primary" id="sync-now"><i data-lucide="refresh-cw"></i> مزامنة الآن</button>
        </div>

        ${Auth.isAdmin() ? `
        <div class="card">
          <h3 class="card-title"><i data-lucide="users"></i> إدارة المستخدمين</h3>
          <p class="text-muted text-sm mb-3">إضافة وتعديل حسابات الموظفين وصلاحياتهم.</p>
          <button class="btn btn-outline" onclick="Router.navigate('users')">فتح إدارة المستخدمين</button>
        </div>` : ''}
      </div>
    `);
    App.refreshIcons();

    document.getElementById('toggle-theme').addEventListener('click', () => App.toggleTheme());
    document.getElementById('save-settings').addEventListener('click', () => {
      localStorage.setItem('pharmacy_name', document.getElementById('set-name').value);
      App.showToast('تم حفظ الإعدادات', 'success');
    });

    document.getElementById('backup-export').addEventListener('click', async () => {
      const data = {
        medicines: await LocalDB.getAll('medicines'),
        batches: await LocalDB.getAll('batches'),
        suppliers: await LocalDB.getAll('suppliers'),
        exportedAt: new Date().toISOString(),
      };
      PageUtils.downloadFile('pharmacy-backup-' + Date.now() + '.json', JSON.stringify(data, null, 2), 'application/json');
    });

    document.getElementById('backup-import').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const text = await file.text();
      try {
        const data = JSON.parse(text);
        if (data.medicines) await LocalDB.putAll('medicines', data.medicines);
        if (data.batches) await LocalDB.putAll('batches', data.batches);
        if (data.suppliers) await LocalDB.putAll('suppliers', data.suppliers);
        App.showToast('تم استيراد النسخة الاحتياطية محلياً بنجاح', 'success');
      } catch (err) { App.showToast('ملف غير صالح', 'error'); }
    });

    const outbox = await LocalDB.getOutbox();
    document.getElementById('pending-count').textContent = outbox.length;
    document.getElementById('sync-now').addEventListener('click', async () => {
      try {
        const res = await API.syncOutbox(Auth.getUser());
        App.showToast(`تمت مزامنة ${res.synced || 0} عملية`, 'success');
        render();
      } catch (err) { App.showToast('تعذرت المزامنة: ' + err.message, 'error'); }
    });
  }

  return { render };
})();
