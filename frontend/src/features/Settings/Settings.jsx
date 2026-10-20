import { Moon, Sun } from "lucide-react";
import useTheme from "../../layouts/Theme/useTheme";
export default function Settings() {
  const { isDark, toggleTheme } = useTheme();
  return <section className="mx-auto max-w-2xl space-y-6" aria-labelledby="settings-title"><div><h1 id="settings-title" className="text-2xl font-bold">تنظیمات نمایش</h1><p className="mt-2 text-sm text-textSecondary">نمایش پنل را مطابق ترجیح خود تنظیم کنید.</p></div><div className="flex items-center justify-between gap-4 rounded-xl border border-Border bg-Surface p-6"><div className="flex items-center gap-3">{isDark ? <Moon className="text-primary" /> : <Sun className="text-primary" />}<div><h2 className="font-medium">حالت تیره</h2><p className="mt-1 text-xs text-textSecondary">انتخاب شما برای مراجعهٔ بعدی ذخیره می‌شود.</p></div></div><button type="button" role="switch" aria-label="حالت تیره" aria-checked={isDark} onClick={toggleTheme} className={isDark ? "rounded-full bg-primary px-4 py-2 text-sm text-white" : "rounded-full bg-SurfaceMuted px-4 py-2 text-sm text-textPrimary"}>{isDark ? "فعال" : "غیرفعال"}</button></div></section>;
}
