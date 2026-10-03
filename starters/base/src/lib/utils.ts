import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes, letting later ones win (`cn("px-2", cond && "px-4")`). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
