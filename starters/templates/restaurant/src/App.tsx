import { useMemo, useState } from "react";
import { Clock, MapPin, Phone, Plus, ShoppingBag, Star } from "lucide-react";

import { Checkout, type CartLine } from "./components/Checkout";
import { CATEGORIES, DIETS, MENU } from "./components/menu";
import { usePersistentState } from "./lib/usePersistentState";

export default function App() {
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("Starters");
  const [diet, setDiet] = useState<(typeof DIETS)[number] | null>(null);
  const [cart, setCart] = usePersistentState<CartLine[]>("restaurant.cart", []);
  const [open, setOpen] = useState(false);

  const dishes = useMemo(
    () => MENU.filter((dish) => dish.category === category && (!diet || dish.tags.includes(diet))),
    [category, diet],
  );
  const count = cart.reduce((sum, line) => sum + line.qty, 0);

  function add(id: string) {
    setCart((current) => {
      const line = current.find((l) => l.id === id);
      return line ? current.map((l) => (l.id === id ? { ...l, qty: l.qty + 1 } : l)) : [...current, { id, qty: 1 }];
    });
  }

  function setQty(id: string, qty: number) {
    setCart((current) => (qty <= 0 ? current.filter((l) => l.id !== id) : current.map((l) => (l.id === id ? { ...l, qty } : l))));
  }

  return (
    <div className="min-h-screen bg-[#fbf7f2] text-stone-900">
      <nav className="sticky top-0 z-20 border-b border-stone-200/70 bg-[#fbf7f2]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="font-serif text-2xl font-semibold tracking-tight">Ember &amp; Olive</span>
          <div className="hidden gap-8 text-sm text-stone-600 md:flex"><a href="#menu">Menu</a><a href="#visit">Visit</a></div>
          <button onClick={() => setOpen(true)} className="relative flex items-center gap-2 rounded-full bg-stone-900 px-4 py-2 text-sm text-white">
            <ShoppingBag className="h-4 w-4" /> Order
            {count > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1 text-xs">{count}</span>}
          </button>
        </div>
      </nav>

      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,#fdba74_0%,transparent_45%),radial-gradient(circle_at_10%_90%,#fca5a5_0%,transparent_40%)] opacity-60" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-6 py-20 md:grid-cols-2">
          <div>
            <p className="flex items-center gap-1 text-sm font-medium text-orange-700"><Star className="h-4 w-4 fill-orange-500 text-orange-500" /> 4.9 · 1,200+ reviews</p>
            <h1 className="mt-4 font-serif text-5xl font-semibold leading-tight md:text-6xl">Wood-fired, seasonal, made to share.</h1>
            <p className="mt-4 max-w-md text-lg text-stone-600">Neighborhood Mediterranean kitchen. Order for pickup or delivery in minutes.</p>
            <a href="#menu" className="mt-8 inline-flex rounded-full bg-orange-600 px-6 py-3 font-medium text-white hover:bg-orange-500">Order online</a>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {["🍕", "🥗", "🍝", "🍷"].map((emoji, index) => (
              <div key={emoji} className={`flex aspect-square items-center justify-center rounded-3xl text-6xl shadow-sm ${index % 3 === 0 ? "bg-orange-200" : "bg-white"}`}>{emoji}</div>
            ))}
          </div>
        </div>
      </header>

      <main id="menu" className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="font-serif text-4xl font-semibold">Menu</h2>
        <div className="mt-6 flex flex-wrap gap-2">
          {CATEGORIES.map((name) => (
            <button key={name} onClick={() => setCategory(name)} className={`rounded-full px-4 py-2 text-sm ${category === name ? "bg-stone-900 text-white" : "bg-white text-stone-700 ring-1 ring-stone-200"}`}>{name}</button>
          ))}
          <span className="mx-2 hidden w-px bg-stone-300 sm:block" />
          {DIETS.map((name) => (
            <button key={name} onClick={() => setDiet(diet === name ? null : name)} className={`rounded-full px-3 py-2 text-xs ${diet === name ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-800"}`}>{name}</button>
          ))}
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {dishes.map((dish) => (
            <article key={dish.id} className="flex flex-col overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-stone-200/70">
              <div className={`flex h-40 items-center justify-center bg-gradient-to-br text-6xl ${dish.tint}`}>{dish.emoji}</div>
              <div className="flex flex-1 flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold">{dish.name}</h3>
                  <span className="font-semibold text-orange-700">${dish.price}</span>
                </div>
                <p className="mt-1 flex-1 text-sm text-stone-600">{dish.description}</p>
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex gap-1">{dish.tags.map((tag) => <span key={tag} className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] text-stone-600">{tag}</span>)}</div>
                  <button onClick={() => add(dish.id)} className="flex items-center gap-1 rounded-full bg-stone-900 px-3 py-1.5 text-sm text-white hover:bg-orange-600" aria-label={`Add ${dish.name}`}>
                    <Plus className="h-4 w-4" /> Add
                  </button>
                </div>
              </div>
            </article>
          ))}
          {!dishes.length && <p className="col-span-full py-10 text-center text-stone-500">Nothing in {category} matches that filter.</p>}
        </div>
      </main>

      <footer id="visit" className="bg-stone-900 py-14 text-stone-300">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 md:grid-cols-3">
          <p className="flex gap-2"><MapPin className="h-5 w-5 text-orange-400" /> 214 Harbor Street, Portside</p>
          <p className="flex gap-2"><Clock className="h-5 w-5 text-orange-400" /> Tue–Sun · 11:30am – 10pm</p>
          <p className="flex gap-2"><Phone className="h-5 w-5 text-orange-400" /> (555) 014-2290</p>
        </div>
      </footer>

      {open && <Checkout cart={cart} onQty={setQty} onClose={() => setOpen(false)} onPlaced={() => setCart([])} />}
    </div>
  );
}
