import { useCallback, useEffect, useState } from "react";
import { Search, RefreshCw } from "lucide-react";
import api from "../../services/axios";
import { formatPrice } from "../../utils/formatPrice.js";

export default function ClubMembers() {
  const [data, setData] = useState({ items: [], pagination: {} });
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [consent, setConsent] = useState("");
  const [tier, setTier] = useState("");
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setBusy(true); setError("");
    try { const { data: result } = await api.get("/club-admin/members", { params: { page, pageSize: 20, ...(search ? { search } : {}), ...(consent ? { consent } : {}), ...(tier ? { tier } : {}) } }); setData(result); }
    catch (e) { setError(e?.response?.data?.message || "دریافت اعضا ناموفق بود"); }
    finally { setBusy(false); }
  }, [page, consent, tier, search]);
  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 250); return () => window.clearTimeout(timer); }, [load]);
  async function view(id) { try { setSelected((await api.get(`/club-admin/members/${id}`)).data); } catch (e) { setError(e?.response?.data?.message || "دریافت جزئیات ناموفق بود"); } }
  async function adjust(member) {
    const delta = Number(window.prompt("مقدار تغییر امتیاز (مثبت یا منفی):"));
    if (!Number.isInteger(delta) || !delta) return;
    const reason = window.prompt("دلیل تغییر:"); if (!reason?.trim()) return;
    try { await api.post(`/club-admin/members/${member.id}/points`, { delta, reason }); await load(); if (selected?.id === member.id) await view(member.id); }
    catch (e) { setError(e?.response?.data?.message || "تغییر امتیاز ناموفق بود"); }
  }
  async function exportXlsx() {
    try { const response = await api.get("/club-admin/members/export.xlsx", { params: { ...(search ? { search } : {}), ...(consent ? { consent } : {}), ...(tier ? { tier } : {}) }, responseType: "blob" }); const url = URL.createObjectURL(response.data); const link = document.createElement("a"); link.href = url; link.download = "club-members.xlsx"; link.click(); URL.revokeObjectURL(url); }
    catch (e) { setError(e?.response?.data?.message || "Export failed"); }
  }
  async function issueCoupon(member) {
    const discountType = window.prompt("نوع تخفیف: PERCENTAGE یا FIXED_AMOUNT", "PERCENTAGE");
    if (!['PERCENTAGE', 'FIXED_AMOUNT'].includes(discountType)) return;
    const discountValue = Number(window.prompt("مقدار تخفیف:")); if (!(discountValue > 0)) return;
    const maxDiscountAmount = Number(window.prompt("سقف تخفیف (تومان؛ خالی/۰ یعنی بدون سقف):") || 0);
    const expiresAt = window.prompt("انقضا (ISO، نمونه: 2026-12-31T23:59:59Z):"); if (!expiresAt || Number.isNaN(Date.parse(expiresAt))) return;
    const reason = window.prompt("دلیل صدور:"); if (!reason?.trim()) return;
    try { const { data: coupon } = await api.post(`/club-admin/members/${member.id}/coupons`, { discountType, discountValue, ...(maxDiscountAmount > 0 ? { maxDiscountAmount } : {}), expiresAt, reason }); window.alert(`کد عضو: ${coupon.code}`); }
    catch (e) { setError(e?.response?.data?.message || "صدور کد تخفیف ناموفق بود"); }
  }
  async function updateConsent(member, allowed) {
    try { await api.patch(`/club-admin/members/${member.id}/consent`, { allowed }); await load(); await view(member.id); }
    catch (e) { setError(e?.response?.data?.message || "به‌روزرسانی رضایت ناموفق بود"); }
  }
  async function sendSms() {
    if (!selectedIds.length) return;
    const message = window.prompt("متن پیام تبلیغاتی:"); if (!message?.trim()) return;
    try { await api.post("/club-admin/sms", { memberIds: selectedIds, message: message.trim(), idempotencyKey: crypto.randomUUID() }); setSelectedIds([]); window.alert("پیام در صف ارسال قرار گرفت."); }
    catch (e) { setError(e?.response?.data?.message || "ارسال پیام ناموفق بود"); }
  }
  return <main className="space-y-5 p-4 md:p-6" dir="rtl">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">باشگاه مشتریان</h1><p className="text-sm text-textMuted">اعضا، امتیازها، خریدها و رضایت پیام تبلیغاتی</p></div><button className="rounded-lg border p-2" onClick={load} aria-label="به‌روزرسانی"><RefreshCw size={18}/></button></header>
    <section className="flex flex-wrap gap-3 rounded-xl border bg-white p-4">
      <form className="flex min-w-60 flex-1 gap-2" onSubmit={e=>{e.preventDefault();setPage(1);load();}}><input className="w-full rounded-lg border px-3 py-2" placeholder="نام یا شماره موبایل" value={search} onChange={e=>setSearch(e.target.value)}/><button className="rounded-lg bg-primary px-4 text-white"><Search size={18}/></button></form>
      <select className="rounded-lg border px-3" value={consent} onChange={e=>setConsent(e.target.value)}><option value="">همه رضایت‌ها</option><option value="true">دارای رضایت</option><option value="false">بدون رضایت</option></select><select className="rounded-lg border px-3" value={tier} onChange={e=>setTier(e.target.value)}><option value="">همه سطح‌ها</option><option value="bronze">برنزی</option><option value="silver">نقره‌ای</option><option value="gold">طلایی</option></select>
    </section>
    <div className="flex justify-end gap-2"><button className="rounded-lg border px-3 py-2" onClick={exportXlsx}>خروجی Excel</button><button className="rounded-lg bg-primary px-3 py-2 text-white disabled:opacity-50" disabled={!selectedIds.length} onClick={sendSms}>ارسال پیام ({selectedIds.length})</button></div>
    {error && <p className="rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
    <section className="overflow-x-auto rounded-xl border bg-white"><table className="w-full min-w-[1050px] text-sm"><thead><tr className="border-b text-right"><th className="px-3 py-3">انتخاب</th>{["نام و موبایل","عضویت","سطح","امتیاز کسب/مصرف/مانده","خرید (تعداد/مبلغ)","آخرین سفارش","سبد رهاشده","تبلیغات","عملیات"].map(x=><th className="px-3 py-3" key={x}>{x}</th>)}</tr></thead><tbody>{busy?<tr><td className="p-6 text-center" colSpan="10">در حال دریافت…</td></tr>:data.items.map(m=><tr className="border-b last:border-0" key={m.id}><td className="px-3 py-3"><input type="checkbox" checked={selectedIds.includes(m.id)} disabled={!m.marketingConsent||!m.isActive} onChange={e=>setSelectedIds(ids=>e.target.checked?[...ids,m.id]:ids.filter(id=>id!==m.id))}/></td><td className="px-3 py-3"><div>{m.name}</div>{m.birthDate&&<div className="text-xs text-textMuted">تولد: {new Date(m.birthDate).toLocaleDateString("fa-IR")}</div>}<div dir="ltr" className="text-left text-textMuted">{m.phone}</div></td><td className="px-3 py-3">{new Date(m.joinedAt).toLocaleDateString("fa-IR")}</td><td className="px-3 py-3">{m.tier}</td><td className="px-3 py-3">{m.pointsEarned} / {m.pointsSpent} / {m.pointsBalance}</td><td className="px-3 py-3">{m.purchaseCount} / {formatPrice(m.purchaseValue)}</td><td className="px-3 py-3">{m.latestOrderAt?new Date(m.latestOrderAt).toLocaleDateString("fa-IR"):"—"}</td><td className="px-3 py-3">{m.abandonedCartCount} / {formatPrice(m.abandonedCartValue)}</td><td className="px-3 py-3">{m.marketingConsent?"مجاز":"ندارد"}</td><td className="px-3 py-3"><div className="flex gap-2"><button className="text-primary" onClick={()=>view(m.id)}>جزئیات</button><button className="text-primary" onClick={()=>adjust(m)}>امتیاز</button></div></td></tr>)}</tbody></table>
      <footer className="flex items-center justify-between p-3"><span>تعداد: {data.pagination.total||0}</span><div className="flex gap-2"><button className="rounded border px-3 py-1 disabled:opacity-40" disabled={page<=1} onClick={()=>setPage(page-1)}>قبلی</button><span>{page} / {data.pagination.totalPages||1}</span><button className="rounded border px-3 py-1 disabled:opacity-40" disabled={page>=(data.pagination.totalPages||1)} onClick={()=>setPage(page+1)}>بعدی</button></div></footer></section>
    {selected&&<div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={()=>setSelected(null)}><aside className="h-full w-full max-w-2xl overflow-y-auto bg-white p-5" onClick={e=>e.stopPropagation()}><div className="flex justify-between"><h2 className="text-xl font-bold">{selected.name} · جزئیات عضو</h2><button onClick={()=>setSelected(null)}>بستن</button></div><p className="my-2" dir="ltr">{selected.phone}</p><div className="flex flex-wrap gap-2"><button className="rounded border px-3 py-2" onClick={()=>issueCoupon(selected)}>صدور کوپن اختصاصی</button>{selected.marketingConsent&&<button className="rounded border px-3 py-2" onClick={()=>updateConsent(selected,false)}>لغو رضایت تبلیغاتی</button>}</div><h3 className="mt-5 font-semibold">سفارش‌ها</h3>{selected.orders?.map(o=><div className="flex justify-between border-b py-2" key={o.id}><span>{o.orderNumber} · {o.status}</span><span>{formatPrice(o.totalAmount)}</span></div>)}<h3 className="mt-5 font-semibold">تاریخچه امتیاز</h3>{selected.transactions?.map(t=><div className="flex justify-between border-b py-2" key={t.id}><span>{t.description||t.source}</span><span>{t.points} · {new Date(t.createdAt).toLocaleDateString("fa-IR")}</span></div>)}<h3 className="mt-5 font-semibold">سبدهای رهاشده</h3>{selected.carts?.map(c=><div className="border-b py-2" key={c.id}>{formatPrice(c.totalAmount)} · {new Date(c.lastActivity).toLocaleString("fa-IR")}</div>)}</aside></div>}
  </main>;
}
