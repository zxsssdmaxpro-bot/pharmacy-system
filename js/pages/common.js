/**
 * أدوات مشتركة تُستخدم في كل صفحات النظام
 */
const PageUtils = (function () {
  function el(html) {
    const div = document.createElement('div');
    div.innerHTML = html.trim();
    return div.firstElementChild;
  }

  function content() {
    return document.getElementById('page-content');
  }

  function render(html) {
    content().innerHTML = html;
  }

  function fmtDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d)) return String(iso).slice(0, 10);
    return d.toLocaleDateString('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit' });
  }

  function fmtDateTime(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d)) return String(iso);
    return d.toLocaleString('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  function fmtMoney(n) {
    n = Number(n) || 0;
    return n.toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function daysUntil(iso) {
    const d = new Date(iso);
    if (isNaN(d)) return null;
    return Math.ceil((d - new Date()) / (1000 * 60 * 60 * 24));
  }

  function stockBadge(medicine) {
    const qty = Number(medicine.TotalQuantity || 0);
    const min = Number(medicine.MinStock || 0);
    if (qty <= 0) return '<span class="badge badge-danger">نفد المخزون</span>';
    if (qty <= min) return '<span class="badge badge-warning">مخزون منخفض</span>';
    return '<span class="badge badge-success">مخزون جيد</span>';
  }

  function expiryBadge(days) {
    if (days === null) return '';
    if (days < 0) return '<span class="badge badge-danger">منتهي الصلاحية</span>';
    if (days <= 30) return '<span class="badge badge-danger">ينتهي خلال ' + days + ' يوم</span>';
    if (days <= 90) return '<span class="badge badge-warning">قريب الانتهاء (' + days + ' يوم)</span>';
    return '<span class="badge badge-success">صالح</span>';
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function toCSV(rows, headers) {
    const lines = [headers.join(',')];
    rows.forEach(function (r) {
      lines.push(headers.map(function (h) {
        const v = r[h] == null ? '' : String(r[h]).replace(/"/g, '""');
        return '"' + v + '"';
      }).join(','));
    });
    return '\uFEFF' + lines.join('\n'); // BOM لدعم العربية في Excel
  }

  function downloadFile(filename, content, mime) {
    const blob = new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function printHTML(title, bodyHtml) {
    const w = window.open('', '_blank');
    w.document.write('<html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>' + title +
      '</title><style>body{font-family:Tahoma,Arial,sans-serif;padding:24px} table{width:100%;border-collapse:collapse} ' +
      'th,td{border:1px solid #ccc;padding:8px;text-align:right;font-size:13px} th{background:#0d6e5c;color:#fff} ' +
      'h1{color:#0d6e5c}</style></head><body>' + bodyHtml + '</body></html>');
    w.document.close();
    setTimeout(function () { w.print(); }, 300);
  }

  return { el, content, render, fmtDate, fmtDateTime, fmtMoney, daysUntil, stockBadge, expiryBadge, escapeHtml, toCSV, downloadFile, printHTML };
})();
