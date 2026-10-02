import { Bath, BedDouble, Heart, Ruler } from "lucide-react";
import { usePersistentState } from "../lib/usePersistentState";

export type Listing = { id: number; title: string; city: string; price: number; beds: number; baths: number; sqft: number; tint: string };

export const LISTINGS: Listing[] = [
  { id: 1, title: "Modern cliffside villa", city: "Seacliff", price: 1_480_000, beds: 4, baths: 3, sqft: 3200, tint: "from-sky-300 to-indigo-400" },
  { id: 2, title: "Sunlit garden bungalow", city: "Maple Grove", price: 685_000, beds: 3, baths: 2, sqft: 1850, tint: "from-amber-200 to-orange-300" },
  { id: 3, title: "Harborview loft", city: "Harbor District", price: 920_000, beds: 2, baths: 2, sqft: 1400, tint: "from-teal-200 to-emerald-400" },
  { id: 4, title: "Family craftsman home", city: "Maple Grove", price: 845_000, beds: 4, baths: 3, sqft: 2600, tint: "from-rose-200 to-pink-300" },
  { id: 5, title: "Minimal beach house", city: "Seacliff", price: 1_150_000, beds: 3, baths: 2, sqft: 2100, tint: "from-cyan-200 to-sky-400" },
  { id: 6, title: "Downtown studio", city: "Harbor District", price: 410_000, beds: 1, baths: 1, sqft: 620, tint: "from-violet-200 to-purple-300" },
];

export function ListingCard({ listing }: { listing: Listing }) {
  const [saved, setSaved] = usePersistentState(`realestate.saved.${listing.id}`, false);
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 transition hover:shadow-xl">
      <div className={`relative h-48 bg-gradient-to-br ${listing.tint}`}>
        <div className="absolute bottom-0 left-6 h-24 w-40 rounded-t-lg bg-white/50" />
        <div className="absolute bottom-0 left-14 h-12 w-8 rounded-t bg-white/80" />
        <button onClick={() => setSaved(!saved)} className="absolute right-3 top-3 rounded-full bg-white/90 p-2" aria-label="Save listing">
          <Heart className={`h-4 w-4 ${saved ? "fill-rose-500 text-rose-500" : "text-slate-600"}`} />
        </button>
        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-medium">For sale</span>
      </div>
      <div className="p-5">
        <p className="text-xl font-semibold">${listing.price.toLocaleString()}</p>
        <h3 className="mt-1 font-medium">{listing.title}</h3>
        <p className="text-sm text-slate-500">{listing.city}</p>
        <div className="mt-4 flex gap-4 border-t border-slate-100 pt-4 text-sm text-slate-600">
          <span className="flex items-center gap-1"><BedDouble className="h-4 w-4" /> {listing.beds}</span>
          <span className="flex items-center gap-1"><Bath className="h-4 w-4" /> {listing.baths}</span>
          <span className="flex items-center gap-1"><Ruler className="h-4 w-4" /> {listing.sqft.toLocaleString()} ft²</span>
        </div>
      </div>
    </article>
  );
}
