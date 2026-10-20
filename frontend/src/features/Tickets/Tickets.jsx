import { useMemo, useState } from "react";
import { Link } from "react-router";
import { Badge, Card, Table } from "../../components/ui";
import CreateTicketModal from "./CreateTicketModal";
import { useTickets } from "../../hooks/api/useTickets";

const variant = {
  باز: "danger",
  "در حال بررسی": "warning",
  بسته: "success",
  بالا: "danger",
  متوسط: "warning",
  پایین: "brand",
};

function Tickets() {
  const [filter, setFilter] = useState("");

  const filterKeys = useMemo(
    () => ["id", "subject", "customer", "priority", "status", "department"],
    [],
  );

  const { data, isLoading, isError, error, refetch } = useTickets({
    page: 1,
    pageSize: 100,
    search: filter,
  });

  const tickets = data?.items ?? [];

  if (isLoading) {
    return (
      <div className="rounded-xl border border-Border p-8 text-center text-textSecondary">
        در حال دریافت اطلاعات...
      </div>
    );
  }

  if (isError) {
    return (
      <div
        role="alert"
        className="rounded-xl border border-Border p-8 text-center text-textSecondary"
      >
        <p>{error?.message ?? "دریافت اطلاعات ناموفق بود."}</p>

        <button
          type="button"
          className="mt-3 text-primary hover:underline"
          onClick={() => refetch()}
        >
          تلاش مجدد
        </button>
      </div>
    );
  }

  const openTickets = tickets.filter(
    (ticket) => ticket.status === "باز",
  ).length;

  const pendingTickets = tickets.filter(
    (ticket) => ticket.status === "در حال بررسی",
  ).length;

  const totalMessages = tickets.reduce(
    (sum, ticket) => sum + Number(ticket.messages || 0),
    0,
  );

  return (
    <section className="space-y-5" aria-labelledby="tickets-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
        <h1 id="tickets-title" className="text-2xl font-bold text-textPrimary">
          تیکت‌های پشتیبانی
        </h1>

        <p className="mt-1 text-sm text-textSecondary">
          پیگیری درخواست‌های مشتریان و وضعیت پاسخ‌گویی تیم
        </p>
        </div>
        <CreateTicketModal />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-4 text-right">
          <p className="text-xs text-textMuted">باز</p>

          <p className="mt-2 text-2xl font-bold">
            {openTickets.toLocaleString("fa-IR")}
          </p>
        </Card>

        <Card className="p-4 text-right">
          <p className="text-xs text-textMuted">در حال بررسی</p>

          <p className="mt-2 text-2xl font-bold">
            {pendingTickets.toLocaleString("fa-IR")}
          </p>
        </Card>

        <Card className="p-4 text-right">
          <p className="text-xs text-textMuted">مجموع پیام‌ها</p>

          <p className="mt-2 text-2xl font-bold">
            {totalMessages.toLocaleString("fa-IR")}
          </p>
        </Card>
      </div>

      <Card className="overflow-hidden text-right">
        <div className="border-b border-Border p-4">
          <Table.Filter
            value={filter}
            onChange={setFilter}
            placeholder="جستجوی تیکت، مشتری یا موضوع..."
          />
        </div>

        <Table variant="striped">
          <Table.Header>
            <Table.HeaderCell sortKey="id">شناسه</Table.HeaderCell>

            <Table.HeaderCell sortKey="subject">موضوع</Table.HeaderCell>

            <Table.HeaderCell sortKey="customer">مشتری</Table.HeaderCell>

            <Table.HeaderCell sortKey="priority">اولویت</Table.HeaderCell>

            <Table.HeaderCell sortKey="status">وضعیت</Table.HeaderCell>

            <Table.HeaderCell sortKey="department">واحد</Table.HeaderCell>

            <Table.HeaderCell sortKey="messages">پیام</Table.HeaderCell>
          </Table.Header>

          <Table.Body filter={filter} filterKeys={filterKeys}>
            {tickets.map((ticket) => (
              <Table.Row key={ticket.id} rowId={ticket.id} data={ticket}>
                <Table.Cell dir="ltr">
                  <Link
                    to={`/tickets/${ticket.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {ticket.id}
                  </Link>
                </Table.Cell>

                <Table.Cell className="max-w-xs font-medium text-textPrimary">
                  {ticket.subject}
                </Table.Cell>

                <Table.Cell>{ticket.customer}</Table.Cell>

                <Table.Cell>
                  <Badge variant={variant[ticket.priority]}>
                    {ticket.priority}
                  </Badge>
                </Table.Cell>

                <Table.Cell>
                  <Badge variant={variant[ticket.status]}>
                    {ticket.status}
                  </Badge>
                </Table.Cell>

                <Table.Cell>{ticket.department}</Table.Cell>

                <Table.Cell>
                  {Number(ticket.messages || 0).toLocaleString("fa-IR")}
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </Card>
    </section>
  );
}

export default Tickets;
