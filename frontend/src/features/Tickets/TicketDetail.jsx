import { useState } from "react";
import { ArrowRight, Download, MessageCircle } from "lucide-react";
import { Link, useParams } from "react-router";
import { Badge, Card } from "../../components/ui";
import { useTicket, useTicketAssignees, useUpdateTicket, useAddTicketComment } from "../../hooks/api/useTickets";
import { ticketsApi } from "../../services/api/tickets";

const statusLabels = { OPEN: "جدید", IN_PROGRESS: "در حال بررسی", RESOLVED: "پاسخ داده شد", CLOSED: "بسته" };
const priorityLabels = { LOW: "کم", MEDIUM: "معمولی", HIGH: "بالا", URGENT: "فوری" };
const date = new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" });

function TicketDetail() {
  const { ticketID } = useParams();
  const { data: ticket, isLoading, isError, refetch } = useTicket(ticketID);
  const { data: assignees = [] } = useTicketAssignees();
  const updateTicket = useUpdateTicket();
  const addReply = useAddTicketComment();
  const [replyDraft, setReplyDraft] = useState({ ticketId: ticketID, text: "" });
  const reply = replyDraft.ticketId === ticketID ? replyDraft.text : "";
  const [feedback, setFeedback] = useState("");
  const [attachmentBusy, setAttachmentBusy] = useState(false);

  async function update(payload) {
    try {
      await updateTicket.mutateAsync({ id: ticketID, payload });
      setFeedback("تغییر ذخیره شد.");
    } catch (error) {
      setFeedback(error?.message || "ذخیره‌ی تغییر ناموفق بود.");
    }
  }

  async function sendReply(event) {
    event.preventDefault();
    if (!reply.trim()) return;
    try {
      await addReply.mutateAsync({ id: ticketID, content: reply.trim() });
      setReplyDraft({ ticketId: ticketID, text: "" });
      setFeedback("پاسخ ثبت شد و برای مشتری در پیگیری نمایش داده می‌شود.");
    } catch (error) {
      setFeedback(error?.message || "ثبت پاسخ ناموفق بود.");
    }
  }

  async function downloadAttachment() {
    setAttachmentBusy(true);
    try {
      const blob = await ticketsApi.attachment(ticketID);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "ticket-attachment";
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setFeedback(error?.message || "دریافت پیوست ناموفق بود.");
    } finally {
      setAttachmentBusy(false);
    }
  }

  if (isLoading) return <Card className="p-8 text-center text-textSecondary">در حال دریافت تیکت...</Card>;
  if (isError) return <Card className="p-8 text-center text-textSecondary"><p>دریافت تیکت ناموفق بود.</p><button type="button" className="mt-3 text-primary hover:underline" onClick={() => refetch()}>تلاش مجدد</button></Card>;
  if (!ticket) return <Card className="p-8 text-center"><h1 className="font-bold text-textPrimary">تیکت پیدا نشد</h1><Link className="mt-3 inline-block text-primary" to="/tickets">بازگشت به تیکت‌ها</Link></Card>;

  const messages = ticket.messages?.length ? ticket.messages : (ticket.comments ?? []).map((item) => ({ ...item, sender: "STAFF" }));
  const initialMessageShown = messages.some((message) => message.content === ticket.description);

  return <section className="space-y-5" aria-labelledby="ticket-title">
    <Link to="/tickets" className="inline-flex items-center gap-2 text-sm text-textSecondary hover:text-primary"><ArrowRight className="size-4" />بازگشت به تیکت‌ها</Link>
    <Card className="space-y-4 p-5 text-right">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs text-textMuted" dir="ltr">{ticket.id}</p><h1 id="ticket-title" className="mt-1 text-xl font-bold text-textPrimary">{ticket.title}</h1><p className="mt-1 text-sm text-textSecondary">{ticket.customerName || ticket.assignee?.name || "مشتری"} · {ticket.createdAt}</p>{ticket.customerPhone && <p className="mt-1 text-sm text-textSecondary" dir="ltr">{ticket.customerPhone}</p>}</div><div className="flex flex-wrap gap-2"><Badge variant="warning">{priorityLabels[ticket.priority] || ticket.priority}</Badge><Badge variant={ticket.statusKey === "CLOSED" ? "success" : ticket.statusKey === "OPEN" ? "danger" : "warning"}>{statusLabels[ticket.statusKey] || ticket.status}</Badge></div></div>
      <div className="grid gap-3 border-t border-Border pt-4 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">وضعیت<select value={ticket.statusKey} onChange={(event) => void update({ status: event.target.value })} className="rounded-lg border border-Border bg-Surface px-3 py-2">{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="grid gap-1 text-sm">اولویت<select value={ticket.priority} onChange={(event) => void update({ priority: event.target.value })} className="rounded-lg border border-Border bg-Surface px-3 py-2">{Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="grid gap-1 text-sm">ارجاع به کارمند<select value={ticket.assignedTo || ""} onChange={(event) => void update({ assignedTo: event.target.value || null })} className="rounded-lg border border-Border bg-Surface px-3 py-2"><option value="">بدون ارجاع</option>{assignees.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label>
        <p className="self-end text-sm text-textSecondary">دسته‌بندی: {ticket.category || "سایر"}{ticket.orderNumber ? ` · سفارش ${ticket.orderNumber}` : ""}</p>
      </div>
      {!initialMessageShown && <p className="whitespace-pre-wrap rounded-lg bg-SurfaceMuted p-4 text-sm leading-7">{ticket.description}</p>}
      {ticket.attachmentAvailable && <button type="button" disabled={attachmentBusy} onClick={() => void downloadAttachment()} className="inline-flex items-center gap-2 rounded-lg border border-Border px-3 py-2 text-sm disabled:opacity-50"><Download size={16} />{attachmentBusy ? "در حال دریافت..." : "دریافت پیوست امن"}</button>}
    </Card>

    <Card className="p-5 text-right"><div className="mb-5 flex items-center gap-2"><MessageCircle className="size-5 text-primary" /><h2 className="font-bold text-textPrimary">گفت‌وگوی دوطرفه</h2></div>
      <div className="space-y-3" data-lenis-prevent>{messages.map((message) => <article key={message.id} className="rounded-xl border border-Border bg-SurfaceMuted p-4"><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-sm font-medium">{message.sender === "CUSTOMER" ? ticket.customerName || "مشتری" : message.author?.name || "پشتیبانی"}</span><time className="text-xs text-textMuted">{message.createdAt ? date.format(new Date(message.createdAt)) : ""}</time></div><p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-textSecondary">{message.content}</p></article>)}</div>
      <form onSubmit={sendReply} className="mt-5 space-y-3 border-t border-Border pt-5"><label htmlFor="ticket-reply" className="block text-sm font-medium">پاسخ به مشتری</label><textarea id="ticket-reply" value={reply} onChange={(event) => setReplyDraft({ ticketId: ticketID, text: event.target.value })} maxLength={2000} rows={4} required disabled={ticket.statusKey === "CLOSED"} className="w-full rounded-lg border border-Border bg-Surface px-3 py-2" placeholder={ticket.statusKey === "CLOSED" ? "برای پاسخ، ابتدا تیکت را باز کنید." : "متن پاسخ را بنویسید..."} /><button type="submit" disabled={addReply.isPending || !reply.trim() || ticket.statusKey === "CLOSED"} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{addReply.isPending ? "در حال ثبت..." : "ثبت پاسخ"}</button></form>
      {ticket.statusHistory?.length > 0 && <div className="mt-5 border-t border-Border pt-4"><h3 className="font-bold">تاریخچه‌ی وضعیت</h3><ul className="mt-2 space-y-2">{ticket.statusHistory.map((entry, index) => <li key={`${entry.createdAt}-${index}`} className="text-sm text-textSecondary">{statusLabels[entry.from] || entry.from} ← {statusLabels[entry.to] || entry.to} · {date.format(new Date(entry.createdAt))}</li>)}</ul></div>}
      {feedback && <p role="status" className="mt-3 text-sm text-textSecondary">{feedback}</p>}
    </Card>
  </section>;
}

export default TicketDetail;
