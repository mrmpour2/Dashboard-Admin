# Nebula Admin — فرانت‌اند

پنل کاربری React (Vite + Tailwind v4) این پروژه.

راهنمای کامل نصب، اجرا، معماری و نکات امنیتی در فایل [`../README.md`](../README.md) در ریشه پروژه قرار دارد.

## دستورات سریع

```bash
npm install
cp .env.example .env
npm run dev      # اجرای حالت توسعه روی پورت 5173
npm run build    # ساخت نسخه نهایی
npm run lint     # بررسی کیفیت کد
```

## Mock Data

تمام Featureهای اصلی پروژه دارای داده‌های Fake و واقع‌گرایانه هستند. داده‌ها کنار Feature مربوط به خود نگهداری می‌شوند تا در زمان اتصال API بتوان هر فایل `data.js` را با Service/Query واقعی جایگزین کرد.
