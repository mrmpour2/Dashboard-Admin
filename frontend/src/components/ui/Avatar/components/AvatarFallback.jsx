import clsx from "clsx";

function AvatarFallback({ className = "", username, ...props }) {
  const initials = username?.trim().slice(0, 2);

  return (
    <span
      className={clsx(
        "flex size-full rounded-full text-sm font-extrabold leading-none text-center text-white items-center justify-center font-Outfit border-2 border-white/40 bg-primary-700/40",
        className,
      )}
      {...props}
    >
      {initials || "؟"}
    </span>
  );
}

export default AvatarFallback;
