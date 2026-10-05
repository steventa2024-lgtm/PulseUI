import { Sparkles } from "lucide-react";

export default function Index() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-subtle px-6">
      <div className="max-w-xl text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="mx-auto mb-6 flex size-14 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow">
          <Sparkles className="size-7" aria-hidden />
        </div>
        <h1 className="text-4xl font-bold tracking-tight">
          Your app <span className="text-gradient">starts here</span>
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Describe what you want to build and Pulse will turn this starter into it.
        </p>
      </div>
    </main>
  );
}
