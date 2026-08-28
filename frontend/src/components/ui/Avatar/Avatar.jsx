import { useState } from "react";
import AvatarFallback from "./components/AvatarFallback";
import AvatarImage from "./components/AvatarImage";
import clsx from "clsx";
function Avatar({ src, name, username, size, className = "", ...props }) {
  const [imageError, setImageError] = useState(false);
  const sizeClasses = {
    sm: "size-8",
    md: "size-12",
    lg: "size-16",
    xl: "size-20",
  };
  const handleImageError = () => {
    setImageError(true);
  };
  return (
    <div className="relative shrink-0 ">
      <div
        className={clsx(
          "flex justify-center items-center size-12 rounded-full p-0.5 bg-linear-to-r from-primary to-blue-500",
          sizeClasses[size],
          className,
        )}
        {...props}
      >
        {!imageError ? (
          <AvatarImage
            src={src}
            alt={name}
            onError={handleImageError}
            size={size}
          />
        ) : (
          <AvatarFallback username={username} />
        )}
      </div>
    </div>
  );
}

export default Avatar;
