import { Bell } from "lucide-react";
function NotificationButton({ count }) {
  return (
    <div
      className="
relative flex justify-center items-center rounded-full size-12 cursor-pointer transition-all duration-300 ease-out
            backdrop-blur-sm hover:bg-primary/20
            hover:border-primary/50
           shadow-lg hover:shadow-amber-500/20
           group-hover:scale-105 active:scale-95
"
      aria-label="اعلانات"
    >
      <Bell size={22} />

      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex   h-3.5 w-3.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
          <span className=" inline-flex  justify-center items-center rounded-full h-full w-full bg-red-600 text-white text-[11px]">
            {count}
          </span>
        </span>
      )}
    </div>
  );
}

export default NotificationButton;
