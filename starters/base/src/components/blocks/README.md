# Blocks

Production-ready page sections built on shadcn/ui and the design tokens in
`src/index.css`. Compose pages from these first, fill them with real copy, then
restyle through the tokens and `className`. Edit a block file when a design
needs it; write new sections in `src/components` only when no block fits.
All props are typed; read a block's file for every option.

Marketing / website
- `Navbar` `{ brand, logo?: LucideIcon, links: Action[], cta?, secondaryCta? }`: sticky, blurred, Sheet mobile menu, active route styling.
- `Hero` `{ eyebrow?, title, highlight?, description, primaryCta?, secondaryCta?, note?, visual?, layout?: "centered" | "split" }`: glow + grid background, gradient highlight.
- `ProductMockup` `{ title?, nav?, stats?, tasks? }`: realistic app screenshot made of markup; great as `Hero` `visual`.
- `LogoCloud` `{ title?, logos: { name, icon? }[] }`
- `Features` `{ id?, eyebrow?, title, description?, items: { icon, title, description }[], columns?: 2|3|4 }`
- `FeatureSplit` `{ id?, items: { eyebrow?, title, description, bullets?, visual }[] }`: alternating rows.
- `Stats` `{ items: { value, label }[], variant?: "plain" | "band" }`
- `Testimonials` `{ id?, eyebrow?, title, description?, items: { quote, name, role, rating? }[] }`
- `Pricing` `{ id?, eyebrow?, title, description?, plans: { name, description, monthly, yearly, features, cta, featured? }[], currency?, onSelect? }`: working monthly/yearly switch.
- `Faq` `{ id?, eyebrow?, title, description?, items: { question, answer }[] }`
- `Cta` `{ title, description?, primaryCta, secondaryCta? }`: gradient banner.
- `ContactForm` `{ id?, eyebrow?, title, description?, topics?, details?: { icon, label, value }[], onSubmit? }`: validation, loading, toast, reset.
- `Footer` `{ brand, logo?, tagline, columns: { title, links: Action[] }[], newsletter? }`
- `PageLayout` `{ header?, footer?, children }`: wrap each page; scrolls to top / #hash on navigation.

App / dashboard
- `AppShell` `{ brand, logo?, nav: { label, href, icon, badge? }[], user?, title?, search?, actions?, children }`
- `StatCard` `{ label, value, delta?, hint?, icon? }`
- `EmptyState` `{ icon, title, description?, action? }`

Helpers (`./Section`): `Section`, `SectionHeading`, `ActionButton`, `initials()`.
`Action` = `{ label, href }`, where href is a route ("/pricing"), an anchor ("#faq") or a URL.

Example page:

```tsx
import { Zap, Users, Shield } from "lucide-react";
import { Navbar } from "@/components/blocks/Navbar";
import { Hero } from "@/components/blocks/Hero";
import { ProductMockup } from "@/components/blocks/ProductMockup";
import { Features } from "@/components/blocks/Features";
import { Footer } from "@/components/blocks/Footer";
import { PageLayout } from "@/components/blocks/PageLayout";

const links = [{ label: "Features", href: "#features" }, { label: "Pricing", href: "/pricing" }];

export default function Index() {
  return (
    <PageLayout
      header={<Navbar brand="Acme" logo={Zap} links={links} cta={{ label: "Start free", href: "/signup" }} />}
      footer={<Footer brand="Acme" logo={Zap} tagline="Ship faster." columns={[{ title: "Product", links }]} />}
    >
      <Hero eyebrow="New: AI triage" title="Work that" highlight="flows" description="…" primaryCta={{ label: "Start free", href: "/signup" }} visual={<ProductMockup title="app.acme.com" />} />
      <Features title="Everything your team needs" items={[{ icon: Users, title: "Shared boards", description: "…" }, { icon: Shield, title: "SSO", description: "…" }]} />
    </PageLayout>
  );
}
```

Share `Navbar`/`Footer` props across pages by defining them once (e.g. `src/components/site.tsx`).
