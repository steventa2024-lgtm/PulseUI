import { ArrowRight, Boxes, Gauge, Lock, Sparkles, Workflow, Zap } from "lucide-react";

import { Faq } from "./components/Faq";
import { Pricing } from "./components/Pricing";

const FEATURES = [
  { icon: Zap, title: "Instant sync", text: "Changes propagate to every device in under 100ms." },
  { icon: Lock, title: "Private by default", text: "End-to-end encryption for every workspace." },
  { icon: Workflow, title: "Automations", text: "Trigger workflows from any event, no code required." },
  { icon: Gauge, title: "Fast everywhere", text: "Edge-cached and optimized for slow networks." },
  { icon: Boxes, title: "Integrations", text: "Connect 80+ tools your team already uses." },
  { icon: Sparkles, title: "Smart suggestions", text: "Helpful nudges that learn from your workflow." },
];

export default function App() {
  return (
    <div className="min-h-screen bg-[#070910] text-slate-200">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <span className="font-semibold text-white">Nimbus</span>
        <div className="hidden gap-8 text-sm text-slate-400 md:flex"><a href="#features">Features</a><a href="#pricing">Pricing</a><a href="#faq">FAQ</a></div>
        <button className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-900">Get started</button>
      </nav>
      <header className="relative mx-auto max-w-6xl px-6 pb-24 pt-20 text-center">
        <div className="absolute left-1/2 top-10 -z-0 h-72 w-[40rem] -translate-x-1/2 rounded-full bg-indigo-600/25 blur-3xl" />
        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
            <Sparkles className="h-3 w-3 text-indigo-300" /> New: automations 2.0
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-5xl font-semibold leading-tight tracking-tight text-white sm:text-6xl">The workspace that keeps your team in flow.</h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-slate-400">Docs, tasks and automations in one fast, focused place.</p>
          <div className="mt-10 flex justify-center gap-3">
            <button className="flex items-center gap-2 rounded-lg bg-indigo-500 px-5 py-3 font-medium text-white">Start free <ArrowRight className="h-4 w-4" /></button>
            <button className="rounded-lg border border-white/10 px-5 py-3 font-medium">Book a demo</button>
          </div>
        </div>
      </header>
      <section id="features" className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl border border-white/5 bg-white/[0.03] p-6">
              <Icon className="h-5 w-5 text-indigo-300" />
              <h3 className="mt-4 font-medium text-white">{title}</h3>
              <p className="mt-2 text-sm text-slate-400">{text}</p>
            </div>
          ))}
        </div>
      </section>
      <Pricing />
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["“Nimbus replaced four tools for us.”", "Dana Kim, COO at Fieldwork"],
            ["“The automations alone save us hours a week.”", "Ravi Patel, Eng Manager"],
            ["“Fast, calm and beautifully designed.”", "Elena Rossi, Designer"],
          ].map(([quote, who]) => (
            <figure key={who} className="rounded-2xl border border-white/5 bg-white/[0.03] p-6">
              <blockquote className="text-slate-200">{quote}</blockquote>
              <figcaption className="mt-4 text-sm text-slate-500">{who}</figcaption>
            </figure>
          ))}
        </div>
      </section>
      <Faq />
    </div>
  );
}
