import { useState } from "react";
import AvatarFallback from "./components/AvatarFallback";
import AvatarImage from "./components/AvatarImage";
import clsx from "clsx";

function Avatar({ src, name, username, size = "md", className = "", ...props }) {
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

  // اگر src داده نشده، حتی تلاش برای بارگذاری عکس نمی‌کنیم
  // (چون <img src={undefined}> همیشه رویداد onError را صادر نمی‌کند)
  const shouldShowImage = Boolean(src) && !imageError;

  return (
    <div className="relative shrink-0">
      <div
        className={clsx(
          "flex justify-center items-center size-12 rounded-full p-0.5 bg-gradient-brand",
          sizeClasses[size],
          className,
        )}
        {...props}
      >
        {shouldShowImage ? (
          <AvatarImage
            src={src}
            alt={name}
            onError={handleImageError}
            size={size}
          />
        ) : (
          <AvatarFallback username={username || name} />
        )}
      </div>
    </div>
  );
}

export default Avatar;
