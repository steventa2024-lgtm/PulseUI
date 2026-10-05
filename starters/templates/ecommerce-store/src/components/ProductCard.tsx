import { Plus } from "lucide-react";

export type Product = { id: number; name: string; price: number; category: string; tint: string };

export const PRODUCTS: Product[] = [
  { id: 1, name: "Arc Wireless Headphones", price: 189, category: "Audio", tint: "from-stone-300 to-stone-400" },
  { id: 2, name: "Pulse Smart Watch", price: 249, category: "Wearables", tint: "from-sky-200 to-sky-300" },
  { id: 3, name: "Ceramic Table Lamp", price: 96, category: "Home", tint: "from-amber-200 to-orange-300" },
  { id: 4, name: "Leather Card Sleeve", price: 42, category: "Accessories", tint: "from-rose-200 to-rose-300" },
  { id: 5, name: "Studio Speaker", price: 320, category: "Audio", tint: "from-emerald-200 to-teal-300" },
  { id: 6, name: "Linen Throw", price: 78, category: "Home", tint: "from-lime-100 to-lime-200" },
  { id: 7, name: "Fitness Band", price: 89, category: "Wearables", tint: "from-violet-200 to-violet-300" },
  { id: 8, name: "Canvas Tote", price: 54, category: "Accessories", tint: "from-yellow-100 to-amber-200" },
];

export function ProductCard({ product, onAdd }: { product: Product; onAdd: () => void }) {
  return (
    <article className="group">
      <div className={`relative aspect-square overflow-hidden rounded-2xl bg-gradient-to-br ${product.tint}`}>
        <div className="absolute inset-10 rounded-full bg-white/40 blur-2xl transition group-hover:scale-110" />
        <button
          onClick={onAdd}
          className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-sm font-medium shadow transition hover:bg-stone-900 hover:text-white"
        >
          <Plus className="h-4 w-4" /> Add
        </button>
      </div>
      <div className="mt-3 flex items-start justify-between">
        <div>
          <h3 className="text-sm font-medium">{product.name}</h3>
          <p className="text-xs text-stone-500">{product.category}</p>
        </div>
        <p className="text-sm font-semibold">${product.price}</p>
      </div>
    </article>
  );
}
