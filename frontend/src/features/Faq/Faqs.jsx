import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchFaqItems, createFaqItem, updateFaqItem } from "../../services/api/faqApi";
import { Card } from "../../components/ui";

const blank = { category: "عمومی", questionFa: "", questionEn: "", answerFa: "", answerEn: "", sortOrder: 0, isActive: true };
const fields = [
  ["category", "دسته‌بندی"], ["questionFa", "پرسش فارسی"], ["questionEn", "Question (English)"],
  ["answerFa", "پاسخ فارسی"], ["answerEn", "Answer (English)"],
];

export default function Faqs() {
  const queryClient = useQueryClient();
  const { data: items = [], isLoading, isError } = useQuery({ queryKey: ["admin-faq"], queryFn: fetchFaqItems });
  const [form, setForm] = useState(blank);
  const [editingId, setEditingId] = useState("");
  const [feedback, setFeedback] = useState("");
  const write = useMutation({
    mutationFn: ({ id, data }) => id ? updateFaqItem(id, data) : createFaqItem(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-faq"] }); setForm(blank); setEditingId(""); setFeedback("تغییر ذخیره شد."); },
    onError: (error) => setFeedback(error?.message || "ذخیره‌ی پرسش ناموفق بود."),
  });

  function startEdit(item) {
    setEditingId(item.id);
    setForm({ category: item.category, questionFa: item.questionFa, questionEn: item.questionEn, answerFa: item.answerFa, answerEn: item.answerEn, sortOrder: item.sortOrder, isActive: item.isActive });
    setFeedback("");
  }

  function submit(event) {
    event.preventDefault();
    setFeedback("");
    write.mutate({ id: editingId || undefined, data: form });
  }

  return <section className="mx-auto max-w-6xl space-y-5" aria-labelledby="faq-admin-title">
    <div><h1 id="faq-admin-title" className="text-2xl font-bold">مدیریت پرسش‌های متداول</h1><p className="mt-1 text-sm text-textSecondary">محتوای فعال در سایت فارسی و انگلیسی نمایش داده می‌شود.</p></div>
    <Card className="p-5"><form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      {fields.map(([key, label]) => <label key={key} className={`grid gap-1 text-sm font-medium ${key.startsWith("answer") ? "sm:col-span-2" : ""}`}>{label}{key.startsWith("answer") ? <textarea value={form[key]} required minLength={5} maxLength={5000} rows={4} onChange={(event) => setForm({ ...form, [key]: event.target.value })} className="rounded-lg border border-Border bg-Surface px-3 py-2" /> : <input value={form[key]} required minLength={5} maxLength={240} onChange={(event) => setForm({ ...form, [key]: event.target.value })} className="rounded-lg border border-Border bg-Surface px-3 py-2" />}</label>)}
      <label className="grid gap-1 text-sm font-medium">ترتیب نمایش<input type="number" min="0" max="10000" value={form.sortOrder} onChange={(event) => setForm({ ...form, sortOrder: Number(event.target.value) })} className="rounded-lg border border-Border bg-Surface px-3 py-2" /></label>
      <label className="flex items-center gap-2 self-end text-sm"><input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} />فعال در سایت</label>
      <div className="flex flex-wrap gap-2 sm:col-span-2"><button type="submit" disabled={write.isPending} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{write.isPending ? "در حال ذخیره..." : editingId ? "ذخیره ویرایش" : "افزودن پرسش"}</button>{editingId && <button type="button" onClick={() => { setEditingId(""); setForm(blank); }} className="rounded-lg border border-Border px-4 py-2 text-sm">لغو ویرایش</button>}{feedback && <p role="status" className="self-center text-sm text-textSecondary">{feedback}</p>}</div>
    </form></Card>
    <Card className="overflow-x-auto" data-lenis-prevent><table className="w-full min-w-[760px] text-sm"><thead><tr className="border-b border-Border text-start text-textSecondary"><th className="p-3">دسته</th><th className="p-3">پرسش فارسی</th><th className="p-3">ترتیب</th><th className="p-3">وضعیت</th><th className="p-3">اقدام</th></tr></thead><tbody>{isLoading ? <tr><td colSpan={5} className="p-6 text-center">در حال بارگذاری...</td></tr> : isError ? <tr><td colSpan={5} className="p-6 text-center text-Danger">خواندن پرسش‌ها ناموفق بود.</td></tr> : items.map((item) => <tr key={item.id} className="border-b border-Border"><td className="p-3">{item.category}</td><td className="max-w-md truncate p-3">{item.questionFa}</td><td className="p-3">{item.sortOrder.toLocaleString("fa-IR")}</td><td className="p-3">{item.isActive ? "فعال" : "غیرفعال"}</td><td className="p-3"><div className="flex gap-3"><button type="button" onClick={() => startEdit(item)} className="text-primary hover:underline">ویرایش</button><button type="button" disabled={write.isPending} onClick={() => write.mutate({ id: item.id, data: { category: item.category, questionFa: item.questionFa, questionEn: item.questionEn, answerFa: item.answerFa, answerEn: item.answerEn, sortOrder: item.sortOrder, isActive: !item.isActive } })} className="text-textSecondary hover:underline">{item.isActive ? "غیرفعال‌کردن" : "فعال‌کردن"}</button></div></td></tr>)}</tbody></table></Card>
  </section>;
}
