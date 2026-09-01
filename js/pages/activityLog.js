const ActivityLogPage = (function () {
  async function render() {
    PageUtils.render('<div class="flex justify-center py-16"><div class="spinner"></div></div>');
    let logs;
    try { logs = await API.list('ActivityLog', null); }
    catch (err) { PageUtils.render(App.errorBlock('تعذر تحميل سجل العمليات', err.message)); return; }

    logs.sort((a, b) => new Date(b.Date) - new Date(a.Date));

    PageUtils.render(`
      <div class="toolbar">
        <div class="search-box"><i data-lucide="search"></i><input id="log-search" placeholder="ابحث في السجل..."></div>
      </div>
      <div class="table-wrap card">
        <table class="data-table">
          <thead><tr><th>المستخدم</th><th>العملية</th><th>القسم</th><th>التفاصيل</th><th>التاريخ والوقت</th></tr></thead>
          <tbody id="log-tbody"></tbody>
        </table>
      </div>
    `);
    App.refreshIcons();
    renderRows(logs);
    document.getElementById('log-search').addEventListener('input', (e) => {
      const q = e.target.value.trim().toLowerCase();
      renderRows(logs.filter(l => JSON.stringify(l).toLowerCase().includes(q)));
    });

    function renderRows(rows) {
      const tbody = document.getElementById('log-tbody');
      tbody.innerHTML = rows.length ? rows.slice(0, 300).map(l => `
        <tr>
          <td><b>${PageUtils.escapeHtml(l.UserName)}</b></td>
          <td><span class="badge badge-info">${PageUtils.escapeHtml(l.Action)}</span></td>
          <td>${PageUtils.escapeHtml(l.Entity)}</td>
          <td class="text-muted">${PageUtils.escapeHtml(l.Details)}</td>
          <td class="text-muted">${PageUtils.fmtDateTime(l.Date)}</td>
        </tr>`).join('') : `<tr><td colspan="5" class="text-center text-muted py-8">لا توجد سجلات</td></tr>`;
    }
  }

  return { render };
})();
