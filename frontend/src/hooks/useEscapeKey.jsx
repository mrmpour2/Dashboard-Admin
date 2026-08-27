import { useEffect } from "react";
function useEscapeKey(callBack) {
  useEffect(() => {
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
  }, [callBack]);
}

export default useEscapeKey;
