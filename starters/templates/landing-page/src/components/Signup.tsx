import { useState, type FormEvent } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import { usePersistentState } from "../lib/usePersistentState";

export function Signup() {
  const [emails, setEmails] = usePersistentState<string[]>("landing.signups", []);
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!emails.includes(email)) setEmails([...emails, email]);
    setDone(true);
    setEmail("");
  }

  return (
    <section id="signup" className="mx-auto max-w-3xl px-6 pb-24 text-center">
      <div className="rounded-3xl border border-indigo-400/30 bg-gradient-to-br from-indigo-500/20 to-fuchsia-500/10 p-10">
        <h2 className="text-3xl font-semibold text-white">Start your free trial</h2>
        <p className="mt-2 text-slate-400">14 days of Pro, no credit card required.</p>
        {done ? (
          <p className="mt-6 flex items-center justify-center gap-2 text-emerald-300">
            <CheckCircle2 className="h-5 w-5" /> You're on the list — check your inbox.
          </p>
        ) : (
          <form onSubmit={submit} className="mx-auto mt-6 flex max-w-md gap-2">
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@company.com"
              className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-indigo-400"
              aria-label="Email address"
            />
            <button className="flex items-center gap-2 rounded-lg bg-indigo-500 px-5 text-sm font-medium text-white hover:bg-indigo-400">
              Get started <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        )}
        <p className="mt-4 text-xs text-slate-500">{emails.length} {emails.length === 1 ? "person has" : "people have"} signed up from this browser.</p>
      </div>
    </section>
  );
}
