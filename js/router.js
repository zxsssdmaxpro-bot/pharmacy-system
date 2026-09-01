/**
 * موجّه بسيط للصفحة الواحدة (Hash Router)
 */
const Router = (function () {
  const routes = {};
  let currentRoute = null;

  function register(path, handler, options) {
    routes[path] = { handler: handler, options: options || {} };
  }

  function navigate(path) {
    window.location.hash = path;
  }

  async function resolve() {
    const hash = window.location.hash.replace('#', '') || 'dashboard';
    const path = hash.split('?')[0];
    const route = routes[path] || routes['dashboard'];

    if (route.options.permission && !Auth.can(route.options.permission)) {
      App.showToast('ليس لديك صلاحية للوصول إلى هذه الصفحة', 'error');
      navigate('dashboard');
      return;
    }

    currentRoute = path;
    highlightNav(path);
    const content = document.getElementById('page-content');
    content.classList.add('page-loading');
    try {
      await route.handler();
    } finally {
      content.classList.remove('page-loading');
    }
  }

  function highlightNav(path) {
    document.querySelectorAll('.nav-link').forEach(function (el) {
      el.classList.toggle('active', el.dataset.route === path);
    });
    const titleEl = document.getElementById('page-title');
    const activeLink = document.querySelector('.nav-link[data-route="' + path + '"]');
    if (titleEl && activeLink) titleEl.textContent = activeLink.dataset.label || activeLink.textContent.trim();
  }

  window.addEventListener('hashchange', resolve);

  return { register, navigate, resolve, getCurrentRoute: function () { return currentRoute; } };
})();
