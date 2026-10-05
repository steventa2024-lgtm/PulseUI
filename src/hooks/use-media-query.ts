import { useEffect, useState } from "react";

/** Subscribe to a CSS media query. Returns `fallback` during SSR and the first client render. */
export function useMediaQuery(query: string, fallback = true): boolean {
  const [matches, setMatches] = useState(fallback);
  useEffect(() => {
    const list = window.matchMedia(query);
    const update = () => setMatches(list.matches);
    update();
    list.addEventListener("change", update);
    return () => list.removeEventListener("change", update);
  }, [query]);
  return matches;
}
