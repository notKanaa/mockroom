import { useLayoutEffect, type RefObject } from "react";

/** Makes a textarea as tall as its text, up to the CSS `max-height`, past which it scrolls. */
export function useAutoGrow(ref: RefObject<HTMLTextAreaElement | null>, value: string) {
  useLayoutEffect(() => {
    const textarea = ref.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    const borders = textarea.offsetHeight - textarea.clientHeight;
    textarea.style.height = `${textarea.scrollHeight + borders}px`;
  }, [ref, value]);
}
