import { Inbox } from "lucide-react";

function TableEmpty({
  colSpan = 1,
  message = "داده‌ای برای نمایش وجود ندارد",
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-16 text-center">
        <div className="flex flex-col items-center gap-3">
          <span className="grid size-12 place-items-center rounded-2xl bg-SurfaceMuted/60 text-textMuted">
            <Inbox size={22} />
          </span>
          <p className="text-sm text-textMuted">{message}</p>
        </div>
      </td>
    </tr>
  );
}

export default TableEmpty;
