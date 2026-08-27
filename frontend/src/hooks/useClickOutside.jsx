import { useEffect } from "react";

function useClickOutside(ref, handler) {
  useEffect(() => {
    const listener = (event) => {
      if (!ref.current) return;
      if (!ref.current.contains(event.target)) {
        handler();
      }
    };
    document.addEventListener("mousedown", listener);

    //  unMounting
    return () => {
      document.removeEventListener("mousedown", listener);
    };
  }, [ref, handler]);
}

export default useClickOutside;
