/**
 * إدارة تسجيل الدخول والجلسة والصلاحيات
 */
const Auth = (function () {
  let currentUser = null;

  function loadSession() {
    const raw = localStorage.getItem(CONFIG.STORAGE_KEYS.SESSION);
    if (raw) {
      try { currentUser = JSON.parse(raw); } catch (e) { currentUser = null; }
    }
    return currentUser;
  }

  function saveSession(user) {
    currentUser = user;
    localStorage.setItem(CONFIG.STORAGE_KEYS.SESSION, JSON.stringify(user));
  }

  function logout() {
    currentUser = null;
    localStorage.removeItem(CONFIG.STORAGE_KEYS.SESSION);
  }

  async function login(username, password) {
    const user = await API.login(username, password);
    saveSession(user);
    return user;
  }

  function getUser() {
    return currentUser || loadSession();
  }

  function isLoggedIn() {
    return !!getUser();
  }

  // صلاحيات كل دور
  const PERMISSIONS = {
    admin: ['*'],
    warehouse: ['dashboard', 'medicines.view', 'medicines.create', 'medicines.edit',
      'stockIn', 'stockOut', 'inventory.view', 'suppliers.view', 'reports.view', 'inventoryCount'],
    sales: ['dashboard', 'medicines.view', 'stockOut', 'inventory.view', 'reports.view'],
  };

  function can(permission) {
    const user = getUser();
    if (!user) return false;
    const role = user.Role || user.role;
    const perms = PERMISSIONS[role] || [];
    return perms.indexOf('*') !== -1 || perms.indexOf(permission) !== -1;
  }

  function isAdmin() {
    const user = getUser();
    return user && (user.Role || user.role) === 'admin';
  }

  return { login, logout, getUser, isLoggedIn, can, isAdmin };
})();
