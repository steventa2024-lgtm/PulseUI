import { useMemo, useState } from "react";

import { usePersistentState } from "./lib/usePersistentState";
import { Search, ShoppingBag } from "lucide-react";

import { CartDrawer } from "./components/CartDrawer";
import { PRODUCTS, ProductCard, type Product } from "./components/ProductCard";

const CATEGORIES = ["All", "Audio", "Wearables", "Home", "Accessories"];

export default function App() {
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [cart, setCart] = usePersistentState<Product[]>("store.cart", []);
  const [open, setOpen] = useState(false);

  const visible = useMemo(
    () =>
      PRODUCTS.filter(
        (product) =>
          (category === "All" || product.category === category) &&
          product.name.toLowerCase().includes(query.toLowerCase()),
      ),
    [category, query],
  );

  return (
    <div className="min-h-screen bg-[#f7f5f2] text-stone-900">
      <header className="sticky top-0 z-10 border-b border-stone-200 bg-[#f7f5f2]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-xl font-semibold tracking-tight">Lumen&nbsp;Goods</span>
          <label className="hidden items-center gap-2 rounded-full border border-stone-300 bg-white px-4 py-2 text-sm sm:flex">
            <Search className="h-4 w-4 text-stone-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search products" className="w-56 outline-none" />
          </label>
          <button onClick={() => setOpen(true)} className="relative rounded-full bg-stone-900 p-2.5 text-white" aria-label="Open cart">
            <ShoppingBag className="h-5 w-5" />
            {cart.length > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-xs">
                {cart.length}
              </span>
            )}
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 pt-12">
        <div className="rounded-3xl bg-gradient-to-br from-orange-200 via-amber-100 to-rose-100 p-10">
          <p className="text-sm font-medium uppercase tracking-widest text-orange-700">Autumn collection</p>
          <h1 className="mt-3 max-w-lg text-4xl font-semibold leading-tight">Objects made to be used every day.</h1>
          <p className="mt-3 max-w-md text-stone-600">Thoughtful design, honest materials, free shipping over $75.</p>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-6 flex flex-wrap gap-2">
          {CATEGORIES.map((name) => (
            <button
              key={name}
              onClick={() => setCategory(name)}
              className={`rounded-full px-4 py-1.5 text-sm ${
                category === name ? "bg-stone-900 text-white" : "border border-stone-300 bg-white text-stone-700"
              }`}
            >
              {name}
            </button>
          ))}
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {visible.map((product) => (
            <ProductCard key={product.id} product={product} onAdd={() => setCart((c) => [...c, product])} />
          ))}
        </div>
        {!visible.length && <p className="py-16 text-center text-stone-500">No products match your search.</p>}
      </main>

      <CartDrawer open={open} items={cart} onClose={() => setOpen(false)} onRemove={(i) => setCart((c) => c.filter((_, idx) => idx !== i))} onCheckout={() => setCart([])} />
    </div>
  );
}
