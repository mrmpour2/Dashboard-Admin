import { Link, useParams } from "react-router";
import { ArrowRight, MessageCircle } from "lucide-react";
import { Badge, Card } from "../../components/ui";
import { useTicket } from "../../hooks/api/useTickets";

function TicketDetail() {
  const { ticketID } = useParams();
  const { data: ticket, isLoading, isError, refetch } = useTicket(ticketID);
  if (isLoading) return <Card className="p-8 text-center text-textSecondary">در حال دریافت تیکت...</Card>;
  if (isError) return <Card className="p-8 text-center text-textSecondary"><p>دریافت تیکت ناموفق بود.</p><button className="mt-3 text-primary hover:underline" onClick={() => refetch()}>تلاش مجدد</button></Card>;
  if (!ticket) return <Card className="p-8 text-center"><h1 className="font-bold text-textPrimary">تیکت پیدا نشد</h1><Link className="mt-3 inline-block text-primary" to="/tickets">بازگشت به تیکت‌ها</Link></Card>;
  const messages = ticket.comments?.map((m) => ({ id: m.id, author: m.author?.name ?? m.author ?? "کاربر", role: m.role ?? "کاربر", time: m.createdAt ? new Date(m.createdAt).toLocaleString("fa-IR") : m.time, text: m.content ?? m.text })) ?? [];
  return <section className="space-y-5" aria-labelledby="ticket-title"><Link to="/tickets" className="inline-flex items-center gap-2 text-sm text-textSecondary hover:text-primary"><ArrowRight className="size-4" />بازگشت به تیکت‌ها</Link><Card className="p-5 text-right"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs text-textMuted" dir="ltr">{ticket.id}</p><h1 id="ticket-title" className="mt-1 text-xl font-bold text-textPrimary">{ticket.subject}</h1><p className="mt-1 text-sm text-textSecondary">{ticket.customer} · {ticket.createdAt}</p></div><div className="flex gap-2"><Badge variant="warning">{ticket.priority}</Badge><Badge variant={ticket.status === "باز" ? "danger" : ticket.status === "بسته" ? "success" : "warning"}>{ticket.status}</Badge></div></div></Card><Card className="p-5 text-right"><div className="mb-5 flex items-center gap-2"><MessageCircle className="size-5 text-primary" /><h2 className="font-bold text-textPrimary">گفت‌وگو</h2></div><div className="space-y-4">{messages.map(m=><article key={m.id} className="rounded-xl border border-Border bg-SurfaceMuted p-4"><div className="flex items-center justify-between gap-3"><div><span className="font-medium text-textPrimary">{m.author}</span><span className="mr-2 text-xs text-textMuted">{m.role}</span></div><time className="text-xs text-textMuted">{m.time}</time></div><p className="mt-2 text-sm leading-7 text-textSecondary">{m.text}</p></article>)}</div></Card></section>;
}
export default TicketDetail;
