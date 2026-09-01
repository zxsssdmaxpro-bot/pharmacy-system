const App = (function () {
  function refreshIcons() {
    if (window.lucide) lucide.createIcons();
  }

  function showToast(message, type) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast toast-' + (type || 'info');
    const icons = { success: 'check-circle', error: 'x-circle', warning: 'alert-triangle', info: 'info' };
    toast.innerHTML = `<i data-lucide="${icons[type] || 'info'}"></i><span>${message}</span>`;
    container.appendChild(toast);
    refreshIcons();
    setTimeout(() => { toast.classList.add('toast-out'); setTimeout(() => toast.remove(), 300); }, 4000);
  }

  function errorBlock(title, message) {
    return `<div class="card error-block">
      <i data-lucide="alert-circle"></i>
      <h3>${title}</h3>
      <p class="text-muted">${message || ''}</p>
      <p class="text-muted text-sm">تأكد من ضبط رابط API في js/config.js ومن وجود اتصال بالإنترنت.</p>
    </div>`;
  }

  function toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem(CONFIG.STORAGE_KEYS.THEME, isDark ? 'dark' : 'light');
  }

  function applySavedTheme() {
    const theme = localStorage.getItem(CONFIG.STORAGE_KEYS.THEME);
    if (theme === 'dark') document.documentElement.classList.add('dark');
  }

  // تنظيف الصفحة السابقة (إيقاف الكاميرا وماسح USB) قبل الانتقال لصفحة جديدة
  const cleanupHandlers = {
    'stock-in': () => StockInPage.cleanup(),
    'stock-out': () => StockOutPage.cleanup(),
    'inventory-count': () => InventoryCountPage.cleanup(),
  };
  let lastRoute = null;
  function runCleanup() {
    if (lastRoute && cleanupHandlers[lastRoute]) cleanupHandlers[lastRoute]();
  }

  function buildSidebar() {
    const user = Auth.getUser();
    const links = [
      { route: 'dashboard', label: 'الرئيسية', icon: 'layout-dashboard', perm: 'dashboard' },
      { route: 'medicines', label: 'الأدوية والأصناف', icon: 'pill', perm: 'medicines.view' },
      { route: 'stock-in', label: 'إدخال مخزون', icon: 'log-in', perm: 'stockIn' },
      { route: 'stock-out', label: 'إخراج مخزون', icon: 'log-out', perm: 'stockOut' },
      { route: 'inventory', label: 'المخزون', icon: 'boxes', perm: 'inventory.view' },
      { route: 'inventory-count', label: 'الجرد', icon: 'clipboard-list', perm: 'inventoryCount' },
      { route: 'suppliers', label: 'الموردون', icon: 'truck', perm: 'suppliers.view' },
      { route: 'reports', label: 'التقارير', icon: 'bar-chart-3', perm: 'reports.view' },
      { route: 'activity-log', label: 'سجل العمليات', icon: 'history', perm: '*' },
      { route: 'settings', label: 'الإعدادات', icon: 'settings', perm: 'dashboard' },
    ];
    const nav = document.getElementById('sidebar-nav');
    nav.innerHTML = links.filter(l => l.perm === '*' ? Auth.isAdmin() : Auth.can(l.perm)).map(l => `
      <a href="#${l.route}" class="nav-link" data-route="${l.route}" data-label="${l.label}">
        <i data-lucide="${l.icon}"></i><span>${l.label}</span>
      </a>`).join('');
    document.getElementById('user-name').textContent = user ? user.Name : '';
    document.getElementById('user-role').textContent = user ? (CONFIG.ROLE_LABELS[user.Role] || user.Role) : '';
    refreshIcons();
  }

  function registerRoutes() {
    Router.register('dashboard', DashboardPage.render, { permission: 'dashboard' });
    Router.register('medicines', MedicinesPage.renderList, { permission: 'medicines.view' });
    Router.register('medicines-new', () => MedicinesPage.renderForm(null), { permission: 'medicines.create' });
    Router.register('medicines-edit', () => MedicinesPage.renderForm(window.__editId), { permission: 'medicines.view' });
    Router.register('stock-in', StockInPage.render, { permission: 'stockIn' });
    Router.register('stock-out', StockOutPage.render, { permission: 'stockOut' });
    Router.register('inventory', InventoryPage.render, { permission: 'inventory.view' });
    Router.register('inventory-count', InventoryCountPage.render, { permission: 'inventoryCount' });
    Router.register('suppliers', SuppliersPage.render, { permission: 'suppliers.view' });
    Router.register('reports', ReportsPage.render, { permission: 'reports.view' });
    Router.register('activity-log', ActivityLogPage.render, {});
    Router.register('users', UsersPage.render, {});
    Router.register('settings', SettingsPage.render, {});
  }

  async function boot() {
    applySavedTheme();
    document.getElementById('year').textContent = new Date().getFullYear();

    if (!Auth.isLoggedIn()) {
      showLogin();
      return;
    }
    showApp();
  }

  function showLogin() {
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('app-shell').classList.add('hidden');
    const form = document.getElementById('login-form');
    const errorEl = document.getElementById('login-error');
    form.onsubmit = async function (e) {
      e.preventDefault();
      errorEl.classList.add('hidden');
      const btn = form.querySelector('button[type=submit]');
      btn.disabled = true; btn.textContent = 'جارِ الدخول...';
      try {
        await Auth.login(form.username.value.trim(), form.password.value);
        showApp();
      } catch (err) {
        errorEl.textContent = err.message.includes('OFFLINE') ? 'لا يوجد اتصال بالإنترنت. سجّل الدخول أول مرة وأنت متصل.' : err.message;
        errorEl.classList.remove('hidden');
      } finally {
        btn.disabled = false; btn.textContent = 'تسجيل الدخول';
      }
    };
  }

  function showApp() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('app-shell').classList.remove('hidden');
    buildSidebar();
    registerRoutes();

    document.getElementById('logout-btn').addEventListener('click', () => {
      Auth.logout();
      location.hash = '';
      location.reload();
    });

    document.getElementById('menu-toggle').addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('open');
    });

    document.getElementById('sidebar-nav').addEventListener('click', (e) => {
      runCleanup();
      lastRoute = (e.target.closest('.nav-link') || {}).dataset?.route || lastRoute;
      document.getElementById('sidebar').classList.remove('open');
    });

    window.addEventListener('online', async () => {
      showToast('تم استعادة الاتصال بالإنترنت — جارِ المزامنة...', 'info');
      try { await API.syncOutbox(Auth.getUser()); showToast('تمت المزامنة بنجاح', 'success'); } catch (e) {}
    });
    window.addEventListener('offline', () => showToast('انقطع الاتصال بالإنترنت — سيستمر النظام بالعمل محلياً', 'warning'));

    Router.resolve();
  }

  return { refreshIcons, showToast, errorBlock, toggleTheme, boot };
})();

document.addEventListener('DOMContentLoaded', App.boot);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
