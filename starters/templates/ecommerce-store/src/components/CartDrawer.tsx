import { useState, type FormEvent } from "react";
import { CheckCircle2, X } from "lucide-react";

import type { Product } from "./ProductCard";

type Props = { open: boolean; items: Product[]; onClose: () => void; onRemove: (index: number) => void; onCheckout: () => void };

export function CartDrawer({ open, items, onClose, onRemove, onCheckout }: Props) {
  const [step, setStep] = useState<"cart" | "details" | "done">("cart");
  const subtotal = items.reduce((sum, item) => sum + item.price, 0);
  const shipping = subtotal >= 75 || subtotal === 0 ? 0 : 6;

  function place(event: FormEvent) {
    event.preventDefault();
    onCheckout();
    setStep("done");
  }

  function close() {
    onClose();
    if (step === "done") setStep("cart");
  }
  return (
    <div className={`fixed inset-0 z-20 ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
      <div onClick={close} className={`absolute inset-0 bg-black/30 transition ${open ? "opacity-100" : "opacity-0"}`} />
      <aside className={`absolute right-0 top-0 flex h-full w-full max-w-sm flex-col bg-white p-6 transition ${open ? "translate-x-0" : "translate-x-full"}`}>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{step === "details" ? "Checkout" : "Your cart"}</h2>
          <button onClick={close} aria-label="Close cart"><X className="h-5 w-5" /></button>
        </div>
        {step === "done" ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <CheckCircle2 className="h-14 w-14 text-emerald-600" />
            <p className="mt-4 text-xl font-semibold">Order placed</p>
            <p className="mt-1 text-sm text-stone-500">A receipt is on its way to your inbox.</p>
            <button onClick={close} className="mt-6 rounded-full bg-stone-900 px-6 py-2.5 text-sm text-white">Keep shopping</button>
          </div>
        ) : step === "details" ? (
          <form onSubmit={place} className="flex flex-1 flex-col gap-3">
            <input required placeholder="Full name" className="rounded-xl border border-stone-200 px-4 py-3" />
            <input required type="email" placeholder="Email" className="rounded-xl border border-stone-200 px-4 py-3" />
            <input required placeholder="Shipping address" className="rounded-xl border border-stone-200 px-4 py-3" />
            <div className="grid grid-cols-2 gap-3">
              <input required placeholder="City" className="rounded-xl border border-stone-200 px-4 py-3" />
              <input required placeholder="Postal code" className="rounded-xl border border-stone-200 px-4 py-3" />
            </div>
            <p className="rounded-xl bg-stone-100 p-3 text-xs text-stone-500">Demo checkout — no payment is taken. Ask Pulse to connect Stripe for real payments.</p>
            <div className="mt-auto space-y-1 border-t border-stone-200 pt-4 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>${subtotal}</span></div>
              <div className="flex justify-between"><span>Shipping</span><span>{shipping ? `$${shipping}` : "Free"}</span></div>
              <div className="flex justify-between text-base font-semibold"><span>Total</span><span>${subtotal + shipping}</span></div>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setStep("cart")} className="flex-1 rounded-full border border-stone-300 py-3">Back</button>
              <button className="flex-[2] rounded-full bg-stone-900 py-3 text-white">Place order</button>
            </div>
          </form>
        ) : (
          <>
            <ul className="flex-1 space-y-3 overflow-y-auto">
              {items.map((item, index) => (
                <li key={`${item.id}-${index}`} className="flex items-center justify-between rounded-xl border border-stone-200 p-3 text-sm">
                  <span>{item.name}</span>
                  <span className="flex items-center gap-3">
                    ${item.price}
                    <button onClick={() => onRemove(index)} className="text-stone-400 hover:text-stone-900" aria-label={`Remove ${item.name}`}>
                      <X className="h-4 w-4" />
                    </button>
                  </span>
                </li>
              ))}
              {!items.length && <p className="text-sm text-stone-500">Your cart is empty.</p>}
            </ul>
            <div className="border-t border-stone-200 pt-4">
              <div className="mb-1 flex justify-between text-sm"><span>Shipping</span><span>{shipping ? `$${shipping}` : "Free"}</span></div>
              <div className="mb-4 flex justify-between font-medium"><span>Subtotal</span><span>${subtotal}</span></div>
              <button disabled={!items.length} onClick={() => setStep("details")} className="w-full rounded-full bg-stone-900 py-3 text-white disabled:opacity-40">Checkout</button>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
