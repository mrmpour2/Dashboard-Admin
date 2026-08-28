// این فایل مسئول نگه‌داشتن ظاهر دکمه‌ها است.
// نکته مهم: همه رنگ‌ها از توکن‌های سراسری (theme tokens) گرفته می‌شوند
// تا با تغییر حالت دارک/لایت به‌صورت خودکار هماهنگ بمانند
// و نیازی به نوشتن دستی کلاس‌های dark: برای هر رنگ نباشد.
const base =
  "inline-flex items-center justify-center text-center align-middle text-sm font-bold leading-4.5 tracking-wide border transition-all duration-300 ease-out active:scale-[0.97]";

export const buttonVariants = {
  primary: `${base} border-transparent text-white bg-gradient-brand shadow-Glow hover:brightness-110 hover:-translate-y-0.5 active:brightness-95`,

  secondary: `${base} border-Border bg-Surface text-textPrimary hover:border-primary/50 hover:text-primary hover:bg-primary-50`,

  danger: `${base} border-Danger/30 text-Danger bg-Danger/10 hover:bg-Danger hover:text-white hover:border-Danger`,

  lite: `${base} border-transparent text-textSecondary bg-SurfaceMuted hover:bg-Border hover:text-textPrimary`,

  link: `${base} border-transparent text-secondary bg-secondary-100 hover:bg-secondary hover:text-white`,

  warning: `${base} border-Warning/30 text-Warning bg-Warning/10 hover:bg-Warning hover:text-white hover:border-Warning`,

  outline: `${base} border-primary/40 text-primary bg-transparent hover:bg-primary/10`,
};
