import { useEffect } from "react";

function useEscapeKey(callBack, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        callBack();
      }
    };
    document.addEventListener("keydown", handleKeyDown);

    //  unMounting
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [callBack, enabled]);
}

export default useEscapeKey;
