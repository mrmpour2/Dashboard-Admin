import { useCallback, useEffect, useState } from "react";
import { Search, RefreshCw } from "lucide-react";
import api from "../../services/axios";
import { formatPrice } from "../../utils/formatPrice.js";

export default function NonMembers() {
  const [data, setData] = useState({ items: [], pagination: {} });
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [consent, setConsent] = useState("");
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try { const { data: result } = await api.get("/club-admin/nonmembers", { params: { page, pageSize: 25, ...(search ? { search } : {}), ...(consent ? { consent } : {}) } }); setData(result); setError(""); }
    catch (e) { setError(e?.response?.data?.message || "دریافت مشتریان ناموفق بود"); }
  }, [page, consent, search]);
  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 250); return () => window.clearTimeout(timer); }, [load]);
  async function exportXlsx() {
    try { const response = await api.get("/club-admin/nonmembers/export.xlsx", { params: { ...(search ? { search } : {}), ...(consent ? { consent } : {}) }, responseType: "blob" }); const url = URL.createObjectURL(response.data); const link = document.createElement("a"); link.href = url; link.download = "club-nonmembers.xlsx"; link.click(); URL.revokeObjectURL(url); }
    catch (e) { setError(e?.response?.data?.message || "خروجی ناموفق بود"); }
  }
  return <main className="space-y-5 p-4 md:p-6" dir="rtl"><header className="flex items-center justify-between"><div><h1 className="text-2xl font-bold">مشتریان غیرعضو</h1><p className="text-sm text-textMuted">تجمیع سفارش‌ها بر اساس شمارهٔ نرمال‌شده و رضایت ثبت‌شده</p></div><button onClick={load} className="rounded-lg border p-2"><RefreshCw size={18}/></button></header>
    <section className="flex flex-wrap gap-3 rounded-xl border bg-white p-4"><form className="flex min-w-60 flex-1 gap-2" onSubmit={e=>{e.preventDefault();setPage(1);load();}}><input className="w-full rounded-lg border px-3 py-2" value={search} onChange={e=>setSearch(e.target.value)} placeholder="نام یا موبایل"/><button className="rounded-lg bg-primary px-4 text-white"><Search size={18}/></button></form><select className="rounded-lg border px-3" value={consent} onChange={e=>setConsent(e.target.value)}><option value="">همه رضایت‌ها</option><option value="true">دارای رضایت</option><option value="false">بدون رضایت</option></select><button className="rounded-lg border px-3 py-2" onClick={exportXlsx}>خروجی Excel</button></section>
    {error&&<p className="rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
    <section className="overflow-x-auto rounded-xl border bg-white"><table className="w-full min-w-[750px] text-sm"><thead><tr className="border-b text-right">{["نام و موبایل","تعداد سفارش","ارزش سفارش‌ها","آخرین سفارش","رضایت تبلیغاتی"].map(x=><th key={x} className="px-3 py-3">{x}</th>)}</tr></thead><tbody>{data.items.map(x=><tr key={x.phoneHash} className="border-b"><td className="px-3 py-3">{x.name}<div dir="ltr" className="text-left text-textMuted">{x.phone}</div></td><td className="px-3 py-3">{x.orderCount}</td><td className="px-3 py-3">{formatPrice(x.orderValue)}</td><td className="px-3 py-3">{x.latestOrderAt?new Date(x.latestOrderAt).toLocaleDateString("fa-IR"):"—"}</td><td className="px-3 py-3">{x.marketingConsent?"مجاز":"ندارد"}</td></tr>)}</tbody></table><footer className="flex items-center justify-between p-3"><span>تعداد: {data.pagination.total||0}</span><div className="flex gap-2"><button className="rounded border px-3 py-1" disabled={page<=1} onClick={()=>setPage(page-1)}>قبلی</button><span>{page} / {data.pagination.totalPages||1}</span><button className="rounded border px-3 py-1" disabled={page>=(data.pagination.totalPages||1)} onClick={()=>setPage(page+1)}>بعدی</button></div></footer></section>
  </main>;
}
