import NotificationItem from "./NotificationItem";

function NotificationDropdown({ notifications, count }) {
  return (
    <>
      <div
        className=" mt-3 w-96 
           bg-Surface/95 dark:bg-slate-900/95 
           backdrop-blur-xl
           rounded-2xl shadow-2xl 
           border border-white/20 dark:border-slate-700/50
           overflow-hidden
            
        "
      >
        {/* <!-- Header --> */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-Border">
          <div className="flex items-center gap-2 dark:text-textMuted">
            <span className="size-2 rounded-full bg-amber-500 animate-pulse " />

            <h3 className="font-bold text-base">اعلانات</h3>

            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-slate-900">
              {count} مورد جدید
            </span>
          </div>

          <button
            type="button"
            className="text-xs text-textMuted hover:text-red-500 transition"
          >
            حذف همه
          </button>
        </div>
        {/* <!-- Notification List --> */}
        <div className="max-h-96 overflow-y-auto divide-y divide-gray-100 dark:divide-slate-700/50 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-slate-600">
          {notifications.map((item) => (
            <NotificationItem key={item.id} item={item} />
          ))}
        </div>
      </div>
    </>
  );
}

export default NotificationDropdown;
