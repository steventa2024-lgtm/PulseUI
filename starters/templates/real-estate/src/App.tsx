import { useMemo, useState } from "react";
import { Home, MapPin, Search } from "lucide-react";

import { AgentContact } from "./components/AgentContact";
import { LISTINGS, ListingCard } from "./components/ListingCard";

export default function App() {
  const [city, setCity] = useState("");
  const [beds, setBeds] = useState(0);
  const [maxPrice, setMaxPrice] = useState(2_000_000);

  const results = useMemo(
    () =>
      LISTINGS.filter(
        (listing) =>
          listing.city.toLowerCase().includes(city.toLowerCase()) && listing.beds >= beds && listing.price <= maxPrice,
      ),
    [city, beds, maxPrice],
  );

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="absolute inset-x-0 top-0 z-10">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5 text-white">
          <span className="flex items-center gap-2 text-lg font-semibold"><Home className="h-5 w-5" /> Harbor Homes</span>
          <div className="hidden gap-8 text-sm text-white/80 sm:flex">
            <a href="#listings">Buy</a><a href="#listings">Rent</a><a href="#contact">Sell</a><a href="#contact">Agents</a>
          </div>
        </nav>
      </header>

      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-teal-900 to-emerald-800 px-6 pb-20 pt-36 text-white">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="relative mx-auto max-w-6xl">
          <h1 className="max-w-2xl text-5xl font-semibold leading-tight">Find a home that fits the way you live.</h1>
          <p className="mt-4 max-w-xl text-lg text-white/70">Curated listings across the coast, with local agents who know every street.</p>
          <div className="mt-10 grid gap-3 rounded-2xl bg-white p-3 text-slate-900 shadow-2xl sm:grid-cols-[1fr_auto_auto_auto]">
            <label className="flex items-center gap-2 rounded-xl px-3">
              <MapPin className="h-4 w-4 text-teal-600" />
              <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City or neighborhood" className="w-full py-3 outline-none" />
            </label>
            <select value={beds} onChange={(e) => setBeds(Number(e.target.value))} className="rounded-xl border border-slate-200 px-3 py-3 text-sm">
              <option value={0}>Any beds</option><option value={2}>2+ beds</option><option value={3}>3+ beds</option><option value={4}>4+ beds</option>
            </select>
            <select value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} className="rounded-xl border border-slate-200 px-3 py-3 text-sm">
              <option value={2_000_000}>Any price</option><option value={750_000}>Up to $750k</option><option value={1_000_000}>Up to $1M</option>
            </select>
            <button className="flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-6 py-3 font-medium text-white"><Search className="h-4 w-4" /> Search</button>
          </div>
        </div>
      </section>

      <main id="listings" className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-3xl font-semibold">Featured listings</h2>
            <p className="mt-1 text-slate-500">{results.length} homes available</p>
          </div>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((listing) => <ListingCard key={listing.id} listing={listing} />)}
        </div>
      </main>
      <AgentContact />
    </div>
  );
}
