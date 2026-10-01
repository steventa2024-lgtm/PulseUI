import { Sparkles } from "lucide-react";

export default function App() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-xl text-center">
        <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-400/10 text-cyan-300">
          <Sparkles className="h-6 w-6" aria-hidden />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-white">Your app starts here</h1>
        <p className="mt-3 text-slate-400">
          Describe what you want to build and Pulse will turn this starter into it.
        </p>
      </div>
    </main>
  );
}
