/**
 * وحدة المسح الضوئي:
 * 1) مسح بكاميرا الهاتف/الكمبيوتر عبر مكتبة html5-qrcode.
 * 2) دعم أجهزة قارئ الباركود USB التي تعمل كلوحة مفاتيح (HID) —
 *    يتم التقاط الأحرف السريعة المتتالية المنتهية بـ Enter كباركود.
 */
const Scanner = (function () {
  let html5QrCode = null;
  let usbBuffer = '';
  let usbTimer = null;
  let usbCallback = null;

  // ---------- مسح بالكاميرا ----------
  async function startCamera(elementId, onResult, onError) {
    if (typeof Html5Qrcode === 'undefined') {
      onError && onError('مكتبة المسح لم يتم تحميلها. تأكد من الاتصال بالإنترنت عند أول استخدام.');
      return;
    }
    stopCamera();
    html5QrCode = new Html5Qrcode(elementId);
    const config = {
      fps: 12,
      qrbox: function (viewfinderWidth, viewfinderHeight) {
        const size = Math.floor(Math.min(viewfinderWidth, viewfinderHeight) * 0.7);
        return { width: size, height: size };
      },
      formatsToSupport: window.Html5QrcodeSupportedFormats ? [
        Html5QrcodeSupportedFormats.QR_CODE,
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.ITF,
      ] : undefined,
    };

    try {
      await html5QrCode.start(
        { facingMode: 'environment' }, // الكاميرا الخلفية
        config,
        function (decodedText) {
          // اهتزاز خفيف كتأكيد على الهاتف
          if (navigator.vibrate) navigator.vibrate(80);
          onResult(decodedText);
        },
        function () { /* أخطاء الإطار الواحد - تُتجاهل بصمت */ }
      );
    } catch (err) {
      onError && onError('تعذر الوصول إلى الكاميرا: ' + err);
    }
  }

  async function stopCamera() {
    if (html5QrCode) {
      try {
        const state = html5QrCode.getState ? html5QrCode.getState() : null;
        if (state === 2 /* SCANNING */) await html5QrCode.stop();
        html5QrCode.clear();
      } catch (e) { /* تجاهل */ }
      html5QrCode = null;
    }
  }

  // ---------- دعم قارئ الباركود USB (يعمل كلوحة مفاتيح) ----------
  function enableUsbScanner(callback) {
    usbCallback = callback;
    document.addEventListener('keydown', handleUsbKeydown);
  }

  function disableUsbScanner() {
    usbCallback = null;
    document.removeEventListener('keydown', handleUsbKeydown);
  }

  function handleUsbKeydown(e) {
    // نتجاهل الكتابة العادية داخل حقول الإدخال (المستخدم يكتب يدوياً)
    const tag = (document.activeElement && document.activeElement.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA') {
      // نسمح فقط إن كان الحقل مخصصاً لاستقبال الماسح
      if (!document.activeElement.dataset || document.activeElement.dataset.scannerInput !== 'true') return;
    }

    if (usbTimer) clearTimeout(usbTimer);

    if (e.key === 'Enter') {
      if (usbBuffer.length >= 3) {
        const code = usbBuffer;
        usbBuffer = '';
        if (usbCallback) usbCallback(code);
      }
      usbBuffer = '';
      return;
    }

    if (e.key.length === 1) {
      usbBuffer += e.key;
    }

    // قارئات الباركود ترسل الأحرف بسرعة كبيرة جداً (خلال ميلي ثانية)؛
    // إن توقف الإدخال لأكثر من 100ms نعتبره كتابة يدوية ونصفّر المخزن المؤقت.
    usbTimer = setTimeout(function () { usbBuffer = ''; }, 100);
  }

  return { startCamera, stopCamera, enableUsbScanner, disableUsbScanner };
})();
