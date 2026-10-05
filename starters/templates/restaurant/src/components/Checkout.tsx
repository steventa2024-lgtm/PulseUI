import { useState, type FormEvent } from "react";
import { CheckCircle2, Minus, Plus, X } from "lucide-react";

import { MENU } from "./menu";

export type CartLine = { id: string; qty: number };

export function Checkout({
  cart,
  onQty,
  onClose,
  onPlaced,
}: {
  cart: CartLine[];
  onQty: (id: string, qty: number) => void;
  onClose: () => void;
  onPlaced: () => void;
}) {
  const [mode, setMode] = useState<"pickup" | "delivery">("pickup");
  const [placed, setPlaced] = useState<string | null>(null);
  const lines = cart.map((line) => ({ ...line, dish: MENU.find((dish) => dish.id === line.id)! })).filter((l) => l.dish);
  const subtotal = lines.reduce((sum, line) => sum + line.dish.price * line.qty, 0);
  const fee = mode === "delivery" && subtotal > 0 ? 4.99 : 0;
  const tax = subtotal * 0.0875;
  const total = subtotal + fee + tax;

  function submit(event: FormEvent) {
    event.preventDefault();
    setPlaced(`#${Math.floor(1000 + Math.random() * 9000)}`);
    onPlaced();
  }

  return (
    <div className="fixed inset-0 z-30 flex justify-end bg-black/40" onClick={onClose}>
      <aside onClick={(event) => event.stopPropagation()} className="flex h-full w-full max-w-md flex-col bg-white p-6 text-stone-900" aria-label="Your order">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Your order</h2>
          <button onClick={onClose} aria-label="Close"><X className="h-5 w-5" /></button>
        </div>
        {placed ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <CheckCircle2 className="h-14 w-14 text-emerald-600" />
            <h3 className="mt-4 text-2xl font-semibold">Order {placed} confirmed</h3>
            <p className="mt-2 text-stone-600">{mode === "pickup" ? "Ready for pickup in about 20 minutes." : "Arriving in about 40 minutes."}</p>
            <button onClick={onClose} className="mt-6 rounded-full bg-stone-900 px-6 py-2.5 text-white">Back to menu</button>
          </div>
        ) : (
          <>
            <ul className="flex-1 space-y-3 overflow-y-auto">
              {lines.map((line) => (
                <li key={line.id} className="flex items-center gap-3 rounded-xl border border-stone-200 p-3">
                  <span className="text-2xl">{line.dish.emoji}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{line.dish.name}</p>
                    <p className="text-xs text-stone-500">${line.dish.price.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => onQty(line.id, line.qty - 1)} className="rounded-full border p-1" aria-label="Decrease"><Minus className="h-3 w-3" /></button>
                    <span className="w-5 text-center text-sm">{line.qty}</span>
                    <button onClick={() => onQty(line.id, line.qty + 1)} className="rounded-full border p-1" aria-label="Increase"><Plus className="h-3 w-3" /></button>
                  </div>
                </li>
              ))}
              {!lines.length && <p className="py-16 text-center text-stone-500">Your cart is empty — add something tasty.</p>}
            </ul>
            {lines.length > 0 && (
              <form onSubmit={submit} className="space-y-3 border-t border-stone-200 pt-4">
                <div className="grid grid-cols-2 rounded-full bg-stone-100 p-1 text-sm">
                  {(["pickup", "delivery"] as const).map((option) => (
                    <button type="button" key={option} onClick={() => setMode(option)} className={`rounded-full py-1.5 capitalize ${mode === option ? "bg-white shadow" : "text-stone-500"}`}>{option}</button>
                  ))}
                </div>
                <input required placeholder="Name" className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm" />
                <input required type="tel" placeholder="Phone" className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm" />
                {mode === "delivery" && <input required placeholder="Delivery address" className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm" />}
                <dl className="space-y-1 text-sm">
                  <div className="flex justify-between"><dt>Subtotal</dt><dd>${subtotal.toFixed(2)}</dd></div>
                  {fee > 0 && <div className="flex justify-between"><dt>Delivery</dt><dd>${fee.toFixed(2)}</dd></div>}
                  <div className="flex justify-between text-stone-500"><dt>Tax</dt><dd>${tax.toFixed(2)}</dd></div>
                  <div className="flex justify-between text-base font-semibold"><dt>Total</dt><dd>${total.toFixed(2)}</dd></div>
                </dl>
                <button className="w-full rounded-full bg-orange-600 py-3 font-medium text-white hover:bg-orange-500">Place order · ${total.toFixed(2)}</button>
              </form>
            )}
          </>
        )}
      </aside>
    </div>
  );
}
