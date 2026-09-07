export type Preset = {
  id: string;
  label: string;
  prompt: string;
};

export const PRESETS: Preset[] = [
  {
    id: "hero",
    label: "Hero Section",
    prompt:
      "A bold SaaS hero section with an eyebrow badge, huge headline, supporting paragraph, two CTA buttons and a product screenshot placeholder.",
  },
  {
    id: "pricing",
    label: "Pricing Table",
    prompt:
      "A pricing table with three tiers (Starter, Pro, Scale), a working monthly/annual billing toggle, feature check lists and a highlighted recommended plan.",
  },
  {
    id: "features",
    label: "Feature Grid",
    prompt:
      "A responsive six-item feature grid with inline SVG icons, short titles and one-line descriptions, plus a section heading.",
  },
  {
    id: "testimonials",
    label: "Testimonial Slider",
    prompt:
      "A testimonial slider with prev/next buttons wired to React state, avatar, quote, name, role and dot indicators.",
  },
  {
    id: "dashboard",
    label: "Stats Dashboard",
    prompt:
      "A compact analytics dashboard card row with four KPI tiles, trend arrows, sparkline SVGs and a filter tab bar.",
  },
  {
    id: "auth",
    label: "Auth Card",
    prompt:
      "A centered sign-in card with email and password fields, a remember-me checkbox, primary submit button and a social sign-in row.",
  },
];

export type Modifier = { id: string; label: string };

export const MODIFIERS: Modifier[] = [
  { id: "glassmorphism", label: "Glassmorphism" },
  { id: "rounded-full", label: "Pill corners" },
  { id: "gradients", label: "Vibrant gradients" },
  { id: "brutalist", label: "Brutalist" },
  { id: "minimal", label: "Minimal" },
  { id: "animated", label: "Animated" },
  { id: "dark", label: "Dark surface" },
  { id: "light", label: "Light surface" },
];
