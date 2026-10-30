import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Moon, Sun } from "lucide-react";
import useTheme from "../../layouts/Theme/useTheme";
import { useAuth } from "../../auth/useAuth";
import { fetchOrderAlertPhones, saveOrderAlertPhones } from "../../services/api/settingsApi";

export default function Settings() {
  const { isDark, toggleTheme } = useTheme();
  const { hasRole } = useAuth();
  const canEditAlerts = hasRole("ADMIN", "MANAGER");
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery({ queryKey: ["order-alert-phones"], queryFn: fetchOrderAlertPhones, enabled: canEditAlerts });
  const [phoneText, setPhoneText] = useState(null);
  const [message, setMessage] = useState("");
  const save = useMutation({
    mutationFn: saveOrderAlertPhones,
    onSuccess: (result) => {
      setPhoneText(result.phones.join("\n"));
      setMessage("شماره‌های مدیر ذخیره شد.");
      queryClient.invalidateQueries({ queryKey: ["order-alert-phones"] });
    },
    onError: (error) => setMessage(error?.message || "ذخیره‌ی شماره‌ها ناموفق بود."),
  });

  return <section className="mx-auto max-w-2xl space-y-6" aria-labelledby="settings-title">
    <div><h1 id="settings-title" className="text-2xl font-bold">تنظیمات</h1><p className="mt-2 text-sm text-textSecondary">نمایش پنل و اعلان سفارش‌ها را مدیریت کنید.</p></div>
    <div className="flex items-center justify-between gap-4 rounded-xl border border-Border bg-Surface p-6"><div className="flex items-center gap-3">{isDark ? <Moon className="text-primary" /> : <Sun className="text-primary" />}<div><h2 className="font-medium">حالت تیره</h2><p className="mt-1 text-xs text-textSecondary">انتخاب شما برای مراجعهٔ بعدی ذخیره می‌شود.</p></div></div><button type="button" role="switch" aria-label="حالت تیره" aria-checked={isDark} onClick={toggleTheme} className={isDark ? "rounded-full bg-primary px-4 py-2 text-sm text-white" : "rounded-full bg-SurfaceMuted px-4 py-2 text-sm text-textPrimary"}>{isDark ? "فعال" : "غیرفعال"}</button></div>
    {canEditAlerts && <div className="space-y-4 rounded-xl border border-Border bg-Surface p-6">
      <div><h2 className="font-bold">اعلان سفارش مدیران</h2><p className="mt-1 text-sm text-textSecondary">برای هر سفارش تأییدشده، خلاصه‌ی سفارش به شماره‌های ثبت‌شده در outbox قرار می‌گیرد.</p></div>
      {isLoading ? <p className="text-sm text-textSecondary">در حال بارگذاری تنظیمات...</p> : isError ? <p role="alert" className="text-sm text-Danger">خواندن تنظیمات ناموفق بود.</p> : <>
        <label htmlFor="order-alert-phones" className="block text-sm font-medium">شماره‌های مدیر (هر شماره در یک خط)</label>
        <textarea id="order-alert-phones" value={phoneText ?? data?.phones?.join("\n") ?? ""} onChange={(event) => { setPhoneText(event.target.value); setMessage(""); }} dir="ltr" rows={4} maxLength={500} className="w-full rounded-lg border border-Border bg-Surface px-3 py-2 text-start" placeholder="09123456789" />
        <p className="text-xs text-textSecondary">وضعیت پیامک: {data?.smsEnabled ? "فعال" : "خاموش"}. تا اتصال ارائه‌دهنده و روشن‌کردن SMS_ENABLED، پیامک واقعی ارسال نمی‌شود.</p>
        <div className="flex items-center gap-3"><button type="button" disabled={save.isPending} onClick={() => { const phones = (phoneText ?? data?.phones?.join("\n") ?? "").split(/[\n,]/).map((phone) => phone.trim()).filter(Boolean); save.mutate(phones); }} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{save.isPending ? "در حال ذخیره..." : "ذخیره شماره‌ها"}</button>{message && <span role="status" className="text-sm text-textSecondary">{message}</span>}</div>
      </>}
    </div>}
  </section>;
}
