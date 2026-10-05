import { useState, type FormEvent } from "react";

export function AgentContact() {
  const [sent, setSent] = useState(false);
  function submit(event: FormEvent) {
    event.preventDefault();
    setSent(true);
  }
  return (
    <section id="contact" className="bg-slate-50 px-6 py-16">
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-2">
        <div>
          <h2 className="text-3xl font-semibold">Talk to a local agent</h2>
          <p className="mt-3 text-slate-600">Tell us what you're looking for and an agent will reach out within one business day.</p>
        </div>
        <form onSubmit={submit} className="space-y-3 rounded-2xl bg-white p-6 shadow-sm">
          {sent ? (
            <p className="py-10 text-center text-teal-700">Thanks! An agent will be in touch soon.</p>
          ) : (
            <>
              <input required placeholder="Full name" className="w-full rounded-xl border border-slate-200 px-4 py-3" />
              <input required type="email" placeholder="Email" className="w-full rounded-xl border border-slate-200 px-4 py-3" />
              <textarea placeholder="What are you looking for?" rows={3} className="w-full rounded-xl border border-slate-200 px-4 py-3" />
              <button className="w-full rounded-xl bg-teal-600 py-3 font-medium text-white">Request a call</button>
            </>
          )}
        </form>
      </div>
    </section>
  );
}
