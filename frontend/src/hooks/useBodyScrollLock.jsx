import { useEffect } from "react";

// جلوگیری از اسکرول پشت صفحه وقتی یک پنل روی آن باز است (منوی موبایل، Modal و...)
function useBodyScrollLock(isLocked) {
  useEffect(() => {
    if (!isLocked) return undefined;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isLocked]);
}

export default useBodyScrollLock;
