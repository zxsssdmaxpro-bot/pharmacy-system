const InventoryCountPage = (function () {
  let meds = [];
  let counted = {}; // medicineId -> actualQuantity

  async function render() {
    PageUtils.render('<div class="flex justify-center py-16"><div class="spinner"></div></div>');
    try { meds = await API.list('Medicines', 'medicines'); }
    catch (err) { PageUtils.render(App.errorBlock('تعذر تحميل الأدوية', err.message)); return; }
    counted = {};
    draw();
  }

  function draw() {
    PageUtils.render(`
      <div class="card">
        <h3 class="card-title"><i data-lucide="clipboard-list"></i> الجرد الفعلي للمخزن</h3>
        <p class="text-muted text-sm mb-3">امسح أو ابحث عن كل صنف وأدخل الكمية الفعلية الموجودة فعلياً في المخزن. سيظهر الفرق تلقائياً مقارنةً بالكمية المسجلة في النظام.</p>
        <div class="search-box mb-3"><i data-lucide="search"></i><input id="count-search" data-scanner-input="true" placeholder="ابحث أو امسح الباركود..." autofocus></div>
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>الدواء</th><th>المسجل بالنظام</th><th>الكمية الفعلية</th><th>الفرق</th><th></th></tr></thead>
            <tbody id="count-tbody"></tbody>
          </table>
        </div>
        <div class="form-actions mt-3">
          <button class="btn btn-primary" id="count-submit"><i data-lucide="check"></i> اعتماد الجرد وتحديث المخزون</button>
        </div>
      </div>
    `);
    App.refreshIcons();
    renderRows();

    document.getElementById('count-search').addEventListener('input', (e) => {
      const q = e.target.value.trim().toLowerCase();
      if (q.length < 2) return;
      const match = meds.find(m => String(m.Barcode || '').toLowerCase() === q) ||
        meds.find(m => m.Name.toLowerCase().includes(q));
      if (match && !(match.ID in counted)) {
        counted[match.ID] = match.TotalQuantity || 0;
        renderRows();
      }
    });
    Scanner.enableUsbScanner((code) => {
      const input = document.getElementById('count-search');
      input.value = code;
      input.dispatchEvent(new Event('input'));
      input.value = '';
    });

    document.getElementById('count-submit').addEventListener('click', submitCount);
  }

  function renderRows() {
    const tbody = document.getElementById('count-tbody');
    const ids = Object.keys(counted);
    if (!ids.length) { tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-8">لم يتم إضافة أي صنف بعد</td></tr>`; return; }
    tbody.innerHTML = ids.map(id => {
      const med = meds.find(m => m.ID === id);
      const registered = Number(med.TotalQuantity || 0);
      const actual = Number(counted[id]);
      const diff = actual - registered;
      return `<tr>
        <td><b>${PageUtils.escapeHtml(med.Name)}</b></td>
        <td>${registered}</td>
        <td><input type="number" min="0" value="${actual}" class="count-input" data-id="${id}" style="width:90px"></td>
        <td class="${diff === 0 ? '' : diff > 0 ? 'text-success' : 'text-danger'}">${diff > 0 ? '+' : ''}${diff}</td>
        <td><button class="icon-btn danger" data-remove="${id}"><i data-lucide="x"></i></button></td>
      </tr>`;
    }).join('');
    App.refreshIcons();
    tbody.querySelectorAll('.count-input').forEach(inp => {
      inp.addEventListener('input', () => { counted[inp.dataset.id] = inp.value; renderRows(); });
    });
    tbody.querySelectorAll('[data-remove]').forEach(btn => {
      btn.addEventListener('click', () => { delete counted[btn.dataset.remove]; renderRows(); });
    });
  }

  async function submitCount() {
    const ids = Object.keys(counted);
    if (!ids.length) { App.showToast('لم تضف أي صنف للجرد', 'warning'); return; }
    if (!confirm('سيتم تحديث كميات المخزون فوراً بناءً على الجرد. هل تريد المتابعة؟')) return;
    let ok = 0, fail = 0;
    for (const id of ids) {
      try {
        await API.inventoryCount({ medicineId: id, actualQuantity: counted[id], reason: 'جرد فعلي' }, Auth.getUser());
        ok++;
      } catch (e) { fail++; }
    }
    App.showToast(`تم اعتماد الجرد: ${ok} صنف${fail ? '، فشل: ' + fail : ''}`, fail ? 'warning' : 'success');
    render();
  }

  function cleanup() { Scanner.disableUsbScanner(); }

  return { render, cleanup };
})();
