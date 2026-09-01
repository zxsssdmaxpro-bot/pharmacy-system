/**
 * إعدادات النظام العامة
 * -----------------------------------------------------------
 * ضع هنا رابط Web App الخاص بـ Google Apps Script بعد نشره.
 * راجع apps-script/SETUP.md لمعرفة كيفية الحصول على الرابط.
 * إذا كان الرابط فارغاً أو منتهي بحدث خطأ، ستظهر رسالة واضحة توضح السبب.
 */
const CONFIG = {
  // مثال: 'https://script.google.com/macros/s/AKfycb.../exec'
  API_URL: 'https://script.google.com/macros/s/AKfycbxYPhSCwFRAVt22e9aOLslNfuPiQpOHZv4HefZeAb0_/dev',

  APP_NAME: 'صيدليتي - نظام إدارة المخزن',
  VERSION: '1.0.0',

  // عدد الأيام التي تعتبر بها الصلاحية "قريبة الانتهاء" (تُقرأ فعلياً من إعدادات السيرفر أيضاً)
  DEFAULT_EXPIRY_ALERT_DAYS: 90,

  // مفاتيح التخزين المحلي
  STORAGE_KEYS: {
    SESSION: 'pharmacy_session',
    OFFLINE_QUEUE: 'pharmacy_offline_queue',
    THEME: 'pharmacy_theme',
  },

  ROLES: {
    ADMIN: 'admin',
    WAREHOUSE: 'warehouse',
    SALES: 'sales',
  },

  ROLE_LABELS: {
    admin: 'مدير النظام',
    warehouse: 'موظف مخزن',
    sales: 'صيدلي / مبيعات',
  },
};
