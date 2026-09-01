# Nebula Admin — بک‌اند

API سرور این پروژه (Express 5 + Prisma + PostgreSQL).

راهنمای کامل نصب، اجرا، معماری و نکات امنیتی در فایل [`../README.md`](../README.md) در ریشه پروژه قرار دارد.

## دستورات سریع

```bash
npm install
cp .env.example .env   # سپس مقادیر را ویرایش کنید
npm run prisma:generate
npm run prisma:migrate
npm run seed            # اختیاری — داده نمونه
npm run dev              # اجرای حالت توسعه روی پورت 4000
```
