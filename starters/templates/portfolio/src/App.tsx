import { ArrowUpRight, Github, Linkedin, Mail } from "lucide-react";

import { Timeline } from "./components/Timeline";

const WORK = [
  { title: "Fieldnotes", kind: "Product design · iOS", tint: "from-amber-300 to-rose-400" },
  { title: "Orbit Analytics", kind: "Web app · Design system", tint: "from-sky-300 to-indigo-500" },
  { title: "Kinfolk Bakery", kind: "Brand · E-commerce", tint: "from-lime-200 to-emerald-400" },
  { title: "Tidal Music", kind: "Interaction design", tint: "from-fuchsia-300 to-purple-500" },
];

export default function App() {
  return (
    <div className="min-h-screen bg-[#faf8f5] text-neutral-900">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6 text-sm">
        <span className="font-semibold">Jordan Reyes</span>
        <div className="flex gap-6 text-neutral-600"><a href="#work">Work</a><a href="#about">About</a><a href="#contact">Contact</a></div>
      </nav>
      <header className="mx-auto max-w-5xl px-6 pb-20 pt-16">
        <p className="mb-6 inline-flex rounded-full border border-neutral-300 px-3 py-1 text-xs text-neutral-600">Available for freelance — Q4</p>
        <h1 className="max-w-3xl text-5xl font-semibold leading-[1.1] tracking-tight sm:text-6xl">
          Product designer crafting calm, useful software.
        </h1>
        <p className="mt-6 max-w-xl text-lg text-neutral-600">Eight years designing products for startups and studios. Currently independent, based in Lisbon.</p>
      </header>
      <section id="work" className="mx-auto max-w-5xl px-6 pb-20">
        <h2 className="mb-6 text-sm font-medium uppercase tracking-widest text-neutral-500">Selected work</h2>
        <div className="grid gap-6 sm:grid-cols-2">
          {WORK.map((item) => (
            <a key={item.title} href="#" className="group">
              <div className={`aspect-[4/3] rounded-2xl bg-gradient-to-br ${item.tint} transition group-hover:scale-[1.01]`} />
              <div className="mt-3 flex items-center justify-between">
                <div><h3 className="font-medium">{item.title}</h3><p className="text-sm text-neutral-500">{item.kind}</p></div>
                <ArrowUpRight className="h-5 w-5 text-neutral-400 transition group-hover:text-neutral-900" />
              </div>
            </a>
          ))}
        </div>
      </section>
      <Timeline />
      <footer id="contact" className="border-t border-neutral-200 py-16">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-6 px-6">
          <h2 className="text-3xl font-semibold">Let's build something.</h2>
          <div className="flex gap-3">
            {[Mail, Github, Linkedin].map((Icon, i) => (
              <a key={i} href="#" className="rounded-full border border-neutral-300 p-3 hover:bg-neutral-900 hover:text-white" aria-label="Contact link"><Icon className="h-4 w-4" /></a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
