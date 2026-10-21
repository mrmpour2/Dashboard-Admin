# Nebula Admin Dashboard

پنل مدیریت Nebula با معماری Feature-based، React Query، API Layer، احراز هویت، RBAC و CRUD واقعی.

## امکانات اصلی
- Authentication و Protected Routes
- Role Based Access Control: ADMIN / MANAGER / STAFF
- محصولات: Create / Read / Update / Delete
- کاربران: Create / Read / Update / Delete
- اعتبارسنجی فرم‌ها با React Hook Form + Zod
- React Query برای cache و mutation invalidation
- Mock mode برای اجرای کامل رابط بدون Backend
- Backend: Express + Prisma + PostgreSQL
- امنیت: Helmet، Rate Limit، Validation، Refresh Token Hashing و Password Hashing

## اجرا

Frontend:
```bash
cd frontend
npm ci
npm run dev
```

Backend:
```bash
cd backend
npm ci
npm run prisma:generate
npm run prisma:migrate
npm run seed
npm run dev
```

برای اتصال به API واقعی:
```env
VITE_USE_MOCK_DATA=false
```

برای اجرای Demo بدون Backend:
```env
VITE_USE_MOCK_DATA=true
```

## Production data grid improvements
- Server-side pagination for Products and Users.
- Server-side search with debouncing.
- URL-persisted page, page size, sort field and sort direction.
- Server-side allowlisted sorting for Products, Users, Tickets and Comments.
- Table sorting is controlled from the feature layer and no longer forces a client-side full dataset fetch.
- Fixed malformed ticket update validation schema.
- Added reusable `useDebouncedValue` and `useUrlTableState` hooks.
