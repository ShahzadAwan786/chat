import React, { useEffect } from "react";

export default function useOutSideClick(ref, callback) {
  useEffect(() => {
    const handleoutsideclick = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        callback();
      }
    };
    document.addEventListener("mousedown", handleoutsideclick);

    return () => {
      document.removeEventListener("mousedown", handleoutsideclick);
    };
  }, [ref, callback]);
}
