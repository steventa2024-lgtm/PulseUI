import { X } from "lucide-react";

import type { Product } from "./ProductCard";

type Props = { open: boolean; items: Product[]; onClose: () => void; onRemove: (index: number) => void };

export function CartDrawer({ open, items, onClose, onRemove }: Props) {
  const subtotal = items.reduce((sum, item) => sum + item.price, 0);
  return (
    <div className={`fixed inset-0 z-20 ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
      <div onClick={onClose} className={`absolute inset-0 bg-black/30 transition ${open ? "opacity-100" : "opacity-0"}`} />
      <aside className={`absolute right-0 top-0 flex h-full w-full max-w-sm flex-col bg-white p-6 transition ${open ? "translate-x-0" : "translate-x-full"}`}>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Your cart</h2>
          <button onClick={onClose} aria-label="Close cart"><X className="h-5 w-5" /></button>
        </div>
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
          <div className="mb-4 flex justify-between font-medium"><span>Subtotal</span><span>${subtotal}</span></div>
          <button disabled={!items.length} className="w-full rounded-full bg-stone-900 py-3 text-white disabled:opacity-40">Checkout</button>
        </div>
      </aside>
    </div>
  );
}
