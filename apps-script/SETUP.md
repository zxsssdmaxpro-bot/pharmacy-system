# دليل الإعداد: Google Sheets + Google Apps Script

اتبع هذه الخطوات بالترتيب. تستغرق العملية الكاملة حوالي 10 دقائق.

## الخطوة 1: إنشاء Google Sheet

1. افتح https://sheets.google.com وأنشئ ملف جديد.
2. سمِّه مثلاً: **Pharmacy DB**.
3. لا تحتاج لإنشاء أي أعمدة يدوياً — سيقوم الكود بذلك تلقائياً.

## الخطوة 2: إضافة كود Apps Script

1. من داخل الشيت: **الإضافات (Extensions) > Apps Script**.
2. احذف أي كود موجود في `Code.gs` الافتراضي.
3. انسخ محتوى ملف `apps-script/Code.gs` المرفق في هذا المشروع، والصقه بالكامل.
4. احفظ المشروع (Ctrl+S)، وسمِّه مثلاً "Pharmacy API".

## الخطوة 3: تشغيل دالة الإعداد الأولي

1. من القائمة العلوية في محرر Apps Script، اختر الدالة **setupSheets** من القائمة المنسدلة بجانب زر "تشغيل" (Run).
2. اضغط **Run**.
3. في أول تشغيل، سيطلب منك Google صلاحيات الوصول للشيت:
   - اضغط "Review permissions".
   - اختر حسابك.
   - قد تظهر رسالة "Google hasn't verified this app" — اضغط **Advanced** ثم **Go to Pharmacy API (unsafe)** — هذا طبيعي لأنه سكربت خاص بك أنت.
   - وافق على الصلاحيات المطلوبة.
4. بعد التشغيل، افتح الشيت مجدداً — ستجد أنه تم إنشاء الجداول التالية تلقائياً:
   `Medicines, Batches, StockMovements, Suppliers, Users, ActivityLog, Settings`
5. تم إنشاء مستخدم مدير افتراضي:
   - **اسم المستخدم:** admin
   - **كلمة المرور:** admin123
   - ⚠️ **غيّرها فوراً** بعد أول تسجيل دخول من صفحة "الإعدادات > إدارة المستخدمين".

## الخطوة 4: نشر السكربت كـ Web App

1. من محرر Apps Script: **Deploy (نشر) > New deployment (نشر جديد)**.
2. اضغط أيقونة الترس ⚙️ بجانب "Select type" واختر **Web app**.
3. الإعدادات:
   - **Description:** أي وصف، مثلاً "Pharmacy API v1"
   - **Execute as:** Me (حسابك)
   - **Who has access:** Anyone
     (هذا يعني أن أي شخص يملك الرابط يمكنه الوصول لنقطة API — وهذا آمن طالما لم تشارك الرابط علناً، فالوصول للبيانات نفسها محمي بتسجيل الدخول داخل الموقع. لمزيد من الحماية يمكنك لاحقاً إضافة تحقق بمفتاح API إضافي داخل Code.gs)
4. اضغط **Deploy**.
5. انسخ **Web app URL** الذي يظهر — يكون على الشكل:
   `https://script.google.com/macros/s/AKfycbxxxxxxxxxxxxxxxxxx/exec`

## الخطوة 5: ربط الموقع بالـ API

1. افتح ملف `js/config.js` في مشروع الموقع.
2. استبدل القيمة:
   ```js
   API_URL: 'PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE',
   ```
   بالرابط الذي نسخته:
   ```js
   API_URL: 'https://script.google.com/macros/s/AKfycbxxxxxxxxxxxxxxxxxx/exec',
   ```
3. احفظ الملف.

## الخطوة 6: تحديث النشر عند تعديل الكود مستقبلاً

كل مرة تعدّل فيها `Code.gs`، يجب عمل **نشر جديد لتحديث الإصدار**:
1. Deploy > Manage deployments.
2. اضغط أيقونة القلم ✏️ بجانب النشر الحالي.
3. غيّر **Version** إلى **New version**.
4. اضغط **Deploy**.

(رابط الـ Web App نفسه لا يتغيّر، فلا داعي لتعديل `config.js` مرة أخرى.)

## اختبار سريع

افتح الرابط مباشرة في المتصفح مضيفاً `?action=ping`، مثال:
`https://script.google.com/macros/s/AKfycbxxxx/exec?action=ping`

يجب أن تحصل على استجابة JSON مثل:
```json
{"success":true,"data":{"ok":true,"time":"..."}}
```

## ملاحظات أمان مهمة

- كل عملية (تسجيل دخول، إضافة، تعديل، حذف) تُسجَّل في جدول `ActivityLog` تلقائياً.
- عمليات الحذف كلها Soft Delete (أرشفة) — لا يتم حذف أي بيانات فعلياً من الجداول.
- كلمات المرور تُخزَّن كـ SHA-256 hash وليست نصاً واضحاً.
- يمكنك تقييد الوصول أكثر بربط Google Sheet بحساب Google Workspace خاص بالصيدلية بدلاً من "Anyone" في الخطوة 4، حسب احتياجك.
