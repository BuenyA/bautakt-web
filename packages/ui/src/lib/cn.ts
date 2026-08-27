import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Klassen zusammenfuehren; spaetere Tailwind-Klassen gewinnen gegen fruehere. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
