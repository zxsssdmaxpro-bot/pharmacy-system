const DashboardPage = (function () {
  async function render() {
    PageUtils.render('<div class="flex justify-center py-16"><div class="spinner"></div></div>');
    let stats;
    try {
      stats = await API.dashboard();
    } catch (err) {
      PageUtils.render(App.errorBlock('تعذر تحميل لوحة التحكم', err.message));
      return;
    }

    const cards = [
      { label: 'إجمالي الأصناف', value: stats.totalItems, icon: 'package', color: 'teal' },
      { label: 'إجمالي الكمية', value: stats.totalQuantity, icon: 'boxes', color: 'blue' },
      { label: 'مخزون منخفض', value: stats.lowStock, icon: 'trending-down', color: 'amber' },
      { label: 'قريبة الانتهاء', value: stats.expiringSoon, icon: 'clock', color: 'orange' },
      { label: 'منتهية الصلاحية', value: stats.expired, icon: 'alert-triangle', color: 'red' },
      { label: 'قيمة المخزون', value: PageUtils.fmtMoney(stats.totalValue), icon: 'wallet', color: 'green', suffix: ' ج.م' },
    ];

    PageUtils.render(`
      <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        ${cards.map(c => `
          <div class="stat-card stat-${c.color}">
            <i data-lucide="${c.icon}" class="stat-icon"></i>
            <div class="stat-value">${c.value}${c.suffix || ''}</div>
            <div class="stat-label">${c.label}</div>
          </div>`).join('')}
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div class="card lg:col-span-2">
          <h3 class="card-title">آخر حركات المخزون</h3>
          <div class="table-wrap">
            <table class="data-table">
              <thead><tr><th>النوع</th><th>الصنف</th><th>الكمية</th><th>الموظف</th><th>التاريخ</th></tr></thead>
              <tbody>
                ${stats.recentMovements.length ? stats.recentMovements.map(m => `
                  <tr>
                    <td>${m.Type === 'IN' ? '<span class="badge badge-success">إدخال</span>' : '<span class="badge badge-danger">إخراج</span>'}</td>
                    <td>${PageUtils.escapeHtml(m.MedicineName)}</td>
                    <td>${m.Quantity}</td>
                    <td>${PageUtils.escapeHtml(m.UserName)}</td>
                    <td class="text-muted">${PageUtils.fmtDateTime(m.Date)}</td>
                  </tr>`).join('') : `<tr><td colspan="5" class="text-center text-muted py-6">لا توجد حركات بعد</td></tr>`}
              </tbody>
            </table>
          </div>
        </div>

        <div class="card">
          <h3 class="card-title">الأكثر خروجاً</h3>
          <ul class="ranked-list">
            ${stats.topMoving.length ? stats.topMoving.map((m, i) => `
              <li><span class="rank">${i + 1}</span><span class="flex-1">${PageUtils.escapeHtml(m.name)}</span><b>${m.quantity}</b></li>
            `).join('') : '<li class="text-muted">لا توجد بيانات كافية</li>'}
          </ul>

          <h3 class="card-title mt-6">الأقل حركة</h3>
          <ul class="ranked-list">
            ${stats.leastMoving.length ? stats.leastMoving.map((m, i) => `
              <li><span class="rank rank-muted">${i + 1}</span><span class="flex-1">${PageUtils.escapeHtml(m.name)}</span><b>${m.quantity}</b></li>
            `).join('') : '<li class="text-muted">لا توجد بيانات كافية</li>'}
          </ul>
        </div>
      </div>

      <div class="quick-actions">
        <button class="quick-btn" onclick="Router.navigate('stock-out')"><i data-lucide="log-out"></i> إخراج دواء</button>
        <button class="quick-btn" onclick="Router.navigate('stock-in')"><i data-lucide="log-in"></i> إدخال دواء</button>
        <button class="quick-btn" onclick="Router.navigate('medicines')"><i data-lucide="search"></i> بحث عن دواء</button>
        <button class="quick-btn" onclick="Router.navigate('medicines-new')"><i data-lucide="plus-circle"></i> إضافة دواء</button>
      </div>
    `);
    App.refreshIcons();
  }

  return { render };
})();
