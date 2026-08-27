import clsx from "clsx";
function AvatarFallback({ className = "", username, ...props }) {
  const wordSlice = username?.slice(0, 2);

  return (
    <span
      className={clsx(
        "flex size-full rounded-full font-extrabold text-2xl text-center text-white items-center justify-center font-Outfit border-2 border-white ",
        className,
      )}
      {...props}
    >
      {wordSlice}
    </span>
  );
}

export default AvatarFallback;
