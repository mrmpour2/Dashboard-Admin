# Nebula Admin — Production Audit Report

تاریخ بررسی: 2026-09-03

## نتیجه

پروژه از نظر کد منبع، معماری UI، دسترسی‌پذیری، رفتارهای تعاملی، امنیت سمت کلاینت و ریسک‌های عملکردی بررسی و اصلاح شد.

### تغییرات مهم

- اضافه شدن `ErrorBoundary` برای جلوگیری از سقوط کامل رابط کاربری در خطاهای runtime.
- بهبود مدیریت Theme در برابر خطاهای `localStorage`.
- واکنش‌گرا شدن Layout و Sidebar برای موبایل و دسکتاپ.
- اضافه شدن منوی موبایل و overlay قابل دسترس.
- اصلاح `SearchBox` و جلوگیری از ایجاد history entry برای هر کاراکتر با `replace`.
- اصلاح کامپوننت `Input`: جداسازی class مربوط به container از input، رفع `pointer-events`، و اضافه شدن `aria-invalid` و `aria-describedby`.
- بازطراحی Table برای:
  - Sort واقعی، نه صرفاً نمایش فلش مرتب‌سازی.
  - Filter واقعی.
  - انتخاب ردیف با Checkbox.
  - انتخاب همه ردیف‌های قابل مشاهده.
  - پشتیبانی از controlled selection.
  - اسکرول افقی در نمایشگرهای کوچک.
  - بهبود semantics جدول.
- اصلاح باگ جدی Dropdown: مقدار پیش‌فرض `side="botton"` به `bottom` اصلاح شد؛ در نسخه قبلی positioning پیش‌فرض می‌توانست ناقص باشد.
- اصلاح alignment منوهای Dropdown با logical CSS برای RTL/LTR.
- اصلاح باگ `SelectItem` که مقدار انتخاب‌شده را با object مقایسه می‌کرد و در نتیجه selected state درست تشخیص داده نمی‌شد.
- بهبود accessibility در Modal: trigger واقعی button، Escape، قفل اسکرول body، focus loop، overlay و label/description.
- بهینه‌سازی تصویر آواتار از PNG بزرگ به WebP کوچک‌شده.
- حذف فایل‌های demo/archive غیرضروری از سورس production.
- اضافه شدن اسکریپت `npm run quality` برای کنترل‌های خودکار پایه.
- اضافه شدن `engines.node` مطابق نسخه React Router موجود در lockfile.

## تست‌های انجام‌شده

### 1. Syntax check
تمام فایل‌های JavaScript غیر-JSX با `node --check` بررسی شدند:

**PASS**

### 2. Quality/Security static audit

`npm run quality`

**PASS**

کنترل‌های انجام‌شده:
- عدم وجود `eval` و `new Function`
- عدم وجود `dangerouslySetInnerHTML` و assignment به `innerHTML`
- عدم ذخیره token/password/secret در localStorage
- وجود package-lock
- وجود build script
- وجود route components
- lang=`fa-IR`
- dir=`rtl`
- بررسی console debug

### 3. Dependency/build limitation

اجرای کامل `npm ci` در محیط بررسی به دلیل timeout شبکه تکمیل نشد و `node_modules` موجود نیز ناقص بود؛ بنابراین اجرای واقعی Vite build و browser-based Lighthouse در این محیط قابل اتکا نبود.

به همین دلیل **هیچ عدد ساختگی برای LCP/FCP/TTFB یا bundle size گزارش نشده است**.

## آمار پروژه پس از اصلاح

- فایل‌های پروژه بدون `node_modules`: 237
- فایل‌های JS/JSX/TS/TSX: 219
- خطوط سورس تقریبی: 5,226
- پوشه‌های UI: 21
- حجم assetهای `public`: حدود 583 KB
- حجم فونت‌ها: حدود 563 KB
- تصویر آواتار: حدود 3.6 KB پس از تبدیل به WebP

## وضعیت عملکرد

بزرگ‌ترین asset اولیه تصویر آواتار PNG با حدود 1.55 MB بود که به WebP حدود 3.6 KB تبدیل شد.

با این اصلاح، حجم assetهای public از حدود 2.2 MB به حدود 0.58 MB کاهش پیدا کرد؛ یعنی تقریباً **74% کاهش** در این بخش.

اما زمان واقعی load صفحه به JavaScript bundle، سرور، cache، شبکه و مرورگر وابسته است و بدون build نهایی و اجرای مرورگر نباید عدد ساختگی ارائه شود.

## نکات باقی‌مانده برای مرحله بعد

- اجرای `npm ci`
- اجرای `npm run lint`
- اجرای `npm run build`
- اجرای Lighthouse روی build production
- تست E2E با Playwright
- اتصال صفحات Products/Tickets/Comments به API واقعی
- تست API و authorization در سمت backend
- تنظیم Security Headers در وب‌سرور/CDN
- فعال‌سازی Brotli/Gzip و cache policy برای assetها

## دستورهای کنترل کیفیت

```bash
npm ci
npm run lint
npm run quality
npm run build
npm run preview
```

`npm run quality` مستقل از Vite و برای بررسی‌های پایه قابل اجراست.

## CRUD hardening — V5
- Product create/update/delete UI added with React Hook Form + Zod validation.
- User create/update/delete UI added with role-aware controls.
- Backend `POST /api/users` added; ADMIN-only and password is hashed server-side.
- React Query mutations invalidate feature lists after successful writes.
- Mock mode supports local CRUD so the demo remains fully interactive without a backend.
- Destructive actions require confirmation.
- Modal trigger now preserves consumer `onClick` while still opening the dialog.
- Validation messages and mutation error states are visible to users.
