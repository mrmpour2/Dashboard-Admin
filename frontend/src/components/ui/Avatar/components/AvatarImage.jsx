import clsx from "clsx";

function AvatarImage({ src, className = "", alt, onError, ...props }) {
  return (
    <img
      src={src}
      alt={alt}
      onError={onError}
      className={clsx(
        "size-full rounded-full object-cover border-2 border-white",
        className,
      )}
      {...props}
    />
  );
}

export default AvatarImage;
