export const tickets = [
  { id: "TKT-3021", subject: "مشکل در پرداخت سفارش", customer: "علی رضایی", priority: "بالا", status: "باز", department: "مالی", createdAt: "1405/06/02 - 09:14", lastReply: "۲۲ دقیقه پیش", messages: 5 },
  { id: "TKT-3019", subject: "درخواست تعویض محصول", customer: "سارا محمدی", priority: "متوسط", status: "در حال بررسی", department: "فروش", createdAt: "1405/06/02 - 08:32", lastReply: "۴۵ دقیقه پیش", messages: 8 },
  { id: "TKT-3015", subject: "عدم دریافت پیامک سفارش", customer: "نگار حسینی", priority: "پایین", status: "بسته", department: "فنی", createdAt: "1405/06/01 - 18:40", lastReply: "۱ ساعت پیش", messages: 4 },
  { id: "TKT-3011", subject: "مغایرت مبلغ فاکتور", customer: "امیر موسوی", priority: "بالا", status: "باز", department: "مالی", createdAt: "1405/06/01 - 16:20", lastReply: "۲ ساعت پیش", messages: 11 },
  { id: "TKT-3008", subject: "راهنمای فعال‌سازی گارانتی", customer: "مریم احمدی", priority: "پایین", status: "بسته", department: "پشتیبانی", createdAt: "1405/06/01 - 13:05", lastReply: "۳ ساعت پیش", messages: 3 },
  { id: "TKT-3004", subject: "خطا هنگام ثبت آدرس", customer: "رضا حسینی", priority: "متوسط", status: "در حال بررسی", department: "فنی", createdAt: "1405/05/31 - 21:18", lastReply: "۵ ساعت پیش", messages: 6 },
  { id: "TKT-2998", subject: "لغو سفارش و بازگشت وجه", customer: "محمد کریمی", priority: "بالا", status: "باز", department: "مالی", createdAt: "1405/05/31 - 17:46", lastReply: "۶ ساعت پیش", messages: 9 },
  { id: "TKT-2991", subject: "پرسش درباره موجودی محصول", customer: "الهام نادری", priority: "پایین", status: "بسته", department: "فروش", createdAt: "1405/05/31 - 11:02", lastReply: "دیروز", messages: 2 },
  { id: "TKT-2986", subject: "مشکل ورود به حساب کاربری", customer: "سینا اکبری", priority: "متوسط", status: "در حال بررسی", department: "فنی", createdAt: "1405/05/30 - 19:31", lastReply: "دیروز", messages: 7 },
  { id: "TKT-2979", subject: "ثبت شکایت درباره ارسال", customer: "نیلوفر شریفی", priority: "بالا", status: "باز", department: "ارسال", createdAt: "1405/05/30 - 14:11", lastReply: "۲ روز پیش", messages: 13 },
];

export const ticketMessages = {
  "TKT-3021": [
    { id: 1, author: "علی رضایی", role: "مشتری", time: "09:14", text: "پرداخت انجام شد اما سفارش در حساب من ثبت نشده است." },
    { id: 2, author: "پشتیبانی مالی", role: "کارشناس", time: "09:28", text: "سلام، در حال بررسی تراکنش شما هستیم. لطفاً شماره پیگیری را ارسال کنید." },
    { id: 3, author: "علی رضایی", role: "مشتری", time: "09:35", text: "شماره پیگیری 784521963 است." },
    { id: 4, author: "پشتیبانی مالی", role: "کارشناس", time: "09:42", text: "تراکنش با موفقیت تأیید شد و سفارش تا چند دقیقه دیگر ایجاد می‌شود." },
  ],
};
