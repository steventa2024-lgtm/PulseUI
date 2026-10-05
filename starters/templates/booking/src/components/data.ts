export type Service = { id: string; name: string; minutes: number; price: number; emoji: string };
export type Staff = { id: string; name: string; role: string; initials: string; color: string };
export type Booking = { id: string; serviceId: string; staffId: string; date: string; time: string; name: string; email: string };

export const SERVICES: Service[] = [
  { id: "cut", name: "Signature Haircut", minutes: 45, price: 55, emoji: "✂️" },
  { id: "color", name: "Color & Gloss", minutes: 90, price: 120, emoji: "🎨" },
  { id: "blowout", name: "Blowout & Style", minutes: 30, price: 40, emoji: "💨" },
  { id: "beard", name: "Beard Trim", minutes: 20, price: 25, emoji: "🧔" },
];

export const STAFF: Staff[] = [
  { id: "maya", name: "Maya Lin", role: "Senior stylist", initials: "ML", color: "bg-rose-200 text-rose-800" },
  { id: "jonah", name: "Jonah Reed", role: "Color specialist", initials: "JR", color: "bg-amber-200 text-amber-800" },
  { id: "priya", name: "Priya Shah", role: "Stylist", initials: "PS", color: "bg-teal-200 text-teal-800" },
];

export const TIMES = ["09:00", "09:45", "10:30", "11:15", "12:00", "13:30", "14:15", "15:00", "15:45", "16:30", "17:15"];

export const dayKey = (date: Date) => date.toISOString().slice(0, 10);

export function nextDays(count: number): Date[] {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + index);
    return date;
  });
}

/** Deterministic "already booked" slots so the calendar looks lived-in. */
export function isTakenByOthers(staffId: string, date: string, time: string): boolean {
  let hash = 0;
  for (const char of `${staffId}${date}${time}`) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return Math.abs(hash) % 4 === 0;
}
