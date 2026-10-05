import { useState, type FormEvent } from "react";
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock, Scissors, X } from "lucide-react";

import { SERVICES, STAFF, TIMES, dayKey, isTakenByOthers, nextDays, type Booking } from "./components/data";
import { uid, usePersistentState } from "./lib/usePersistentState";

const DAYS = nextDays(14);
const FIRST_OPEN = DAYS.find((day) => day.getDay() !== 0 && day.getDay() !== 1) ?? DAYS[0]!;

export default function App() {
  const [bookings, setBookings] = usePersistentState<Booking[]>("booking.bookings", []);
  const [serviceId, setServiceId] = useState(SERVICES[0]!.id);
  const [staffId, setStaffId] = useState(STAFF[0]!.id);
  const [weekStart, setWeekStart] = useState(0);
  const [date, setDate] = useState(dayKey(FIRST_OPEN));
  const [time, setTime] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<Booking | null>(null);

  const service = SERVICES.find((s) => s.id === serviceId)!;
  const staff = STAFF.find((s) => s.id === staffId)!;
  const visibleDays = DAYS.slice(weekStart, weekStart + 7);

  const taken = (t: string) =>
    isTakenByOthers(staffId, date, t) || bookings.some((b) => b.staffId === staffId && b.date === date && b.time === t);

  function book(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!time) return;
    const form = new FormData(event.currentTarget);
    const booking: Booking = {
      id: uid(),
      serviceId,
      staffId,
      date,
      time,
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? ""),
    };
    setBookings((current) => [...current, booking]);
    setConfirmed(booking);
    setTime(null);
  }

  const upcoming = [...bookings].sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));

  return (
    <div className="min-h-screen bg-[#f6f3ef] text-stone-900">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="flex items-center gap-2 text-xl font-semibold"><Scissors className="h-5 w-5 text-rose-500" /> Studio Nine</span>
        <span className="hidden text-sm text-stone-500 sm:block">Tue–Sat · 9am–6pm · 18 Mercer St</span>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-6 pb-16 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <section className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">1. Choose a service</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {SERVICES.map((option) => (
                <button key={option.id} onClick={() => setServiceId(option.id)} className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${serviceId === option.id ? "border-rose-400 bg-rose-50" : "border-stone-200 hover:border-stone-300"}`}>
                  <span className="text-2xl">{option.emoji}</span>
                  <span className="flex-1"><span className="block font-medium">{option.name}</span><span className="text-xs text-stone-500">{option.minutes} min</span></span>
                  <span className="font-semibold">${option.price}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">2. Pick your stylist</h2>
            <div className="flex flex-wrap gap-3">
              {STAFF.map((person) => (
                <button key={person.id} onClick={() => { setStaffId(person.id); setTime(null); }} className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition ${staffId === person.id ? "border-rose-400 bg-rose-50" : "border-stone-200 hover:border-stone-300"}`}>
                  <span className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${person.color}`}>{person.initials}</span>
                  <span className="text-left"><span className="block text-sm font-medium">{person.name}</span><span className="text-xs text-stone-500">{person.role}</span></span>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-3xl bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">3. Date &amp; time</h2>
              <div className="flex gap-1">
                <button disabled={weekStart === 0} onClick={() => setWeekStart(0)} className="rounded-full p-2 hover:bg-stone-100 disabled:opacity-30" aria-label="Previous week"><ChevronLeft className="h-4 w-4" /></button>
                <button disabled={weekStart === 7} onClick={() => setWeekStart(7)} className="rounded-full p-2 hover:bg-stone-100 disabled:opacity-30" aria-label="Next week"><ChevronRight className="h-4 w-4" /></button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {visibleDays.map((day) => {
                const key = dayKey(day);
                const closed = day.getDay() === 0 || day.getDay() === 1;
                return (
                  <button key={key} disabled={closed} onClick={() => { setDate(key); setTime(null); }} className={`rounded-2xl py-3 text-center text-sm transition disabled:opacity-30 ${date === key ? "bg-stone-900 text-white" : "bg-stone-50 hover:bg-stone-100"}`}>
                    <span className="block text-xs opacity-70">{day.toLocaleDateString(undefined, { weekday: "short" })}</span>
                    <span className="text-lg font-semibold">{day.getDate()}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
              {TIMES.map((slot) => {
                const unavailable = taken(slot);
                return (
                  <button key={slot} disabled={unavailable} onClick={() => setTime(slot)} className={`rounded-xl border py-2 text-sm transition ${time === slot ? "border-rose-500 bg-rose-500 text-white" : unavailable ? "border-stone-100 text-stone-300 line-through" : "border-stone-200 hover:border-rose-300"}`}>
                    {slot}
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <form onSubmit={book} className="sticky top-6 space-y-4 rounded-3xl bg-stone-900 p-6 text-white shadow-xl">
            <h2 className="text-lg font-semibold">Your appointment</h2>
            <div className="space-y-2 rounded-2xl bg-white/10 p-4 text-sm">
              <p className="flex justify-between"><span>{service.name}</span><span>${service.price}</span></p>
              <p className="flex items-center gap-2 text-stone-300"><CalendarDays className="h-4 w-4" />{new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p>
              <p className="flex items-center gap-2 text-stone-300"><Clock className="h-4 w-4" />{time ?? "Select a time"} · {service.minutes} min with {staff.name.split(" ")[0]}</p>
            </div>
            <input name="name" required placeholder="Your name" className="w-full rounded-xl bg-white/10 px-3 py-2.5 text-sm placeholder:text-stone-400 outline-none focus:ring-2 focus:ring-rose-400" />
            <input name="email" type="email" required placeholder="Email" className="w-full rounded-xl bg-white/10 px-3 py-2.5 text-sm placeholder:text-stone-400 outline-none focus:ring-2 focus:ring-rose-400" />
            <button disabled={!time} className="w-full rounded-xl bg-rose-500 py-3 font-medium hover:bg-rose-400 disabled:opacity-40">Confirm booking</button>
          </form>

          <section className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="mb-3 font-semibold">Your bookings</h2>
            <ul className="space-y-2">
              {upcoming.map((booking) => {
                const s = SERVICES.find((x) => x.id === booking.serviceId);
                const p = STAFF.find((x) => x.id === booking.staffId);
                return (
                  <li key={booking.id} className="flex items-center gap-3 rounded-2xl bg-stone-50 p-3 text-sm">
                    <span className="text-xl">{s?.emoji}</span>
                    <span className="flex-1"><span className="block font-medium">{s?.name}</span><span className="text-xs text-stone-500">{booking.date} · {booking.time} · {p?.name}</span></span>
                    <button onClick={() => setBookings((current) => current.filter((b) => b.id !== booking.id))} className="rounded-full p-1 text-stone-400 hover:bg-white hover:text-rose-500" aria-label="Cancel booking"><X className="h-4 w-4" /></button>
                  </li>
                );
              })}
              {!upcoming.length && <li className="text-sm text-stone-500">No bookings yet.</li>}
            </ul>
          </section>
        </aside>
      </main>

      {confirmed && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4" onClick={() => setConfirmed(null)}>
          <div className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl" role="dialog" aria-label="Booking confirmed">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
            <h3 className="mt-4 text-xl font-semibold">You're booked, {confirmed.name.split(" ")[0]}!</h3>
            <p className="mt-2 text-sm text-stone-600">{SERVICES.find((s) => s.id === confirmed.serviceId)?.name} on {confirmed.date} at {confirmed.time}. A confirmation goes to {confirmed.email}.</p>
            <button onClick={() => setConfirmed(null)} className="mt-6 rounded-full bg-stone-900 px-6 py-2.5 text-sm text-white">Done</button>
          </div>
        </div>
      )}
    </div>
  );
}
