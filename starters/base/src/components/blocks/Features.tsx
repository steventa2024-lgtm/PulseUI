import type { LucideIcon } from "lucide-react";

import { Section, SectionHeading } from "./Section";

export type FeatureItem = { icon: LucideIcon; title: string; description: string };

export type FeaturesProps = {
  id?: string;
  eyebrow?: string;
  title: string;
  description?: string;
  items: FeatureItem[];
  columns?: 2 | 3 | 4;
};

const COLUMNS = { 2: "md:grid-cols-2", 3: "md:grid-cols-2 lg:grid-cols-3", 4: "md:grid-cols-2 lg:grid-cols-4" };

/** Grid of icon cards with hover lift. */
export function Features({ id = "features", eyebrow, title, description, items, columns = 3 }: FeaturesProps) {
  return (
    <Section id={id}>
      <SectionHeading eyebrow={eyebrow} title={title} description={description} />
      <div className={`mt-14 grid gap-6 ${COLUMNS[columns]}`}>
        {items.map(({ icon: Icon, title: itemTitle, description: text }) => (
          <div
            key={itemTitle}
            className="group relative rounded-2xl border bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-elegant"
          >
            <div className="mb-5 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-gradient-primary group-hover:text-primary-foreground">
              <Icon className="size-6" />
            </div>
            <h3 className="text-lg font-semibold">{itemTitle}</h3>
            <p className="mt-2 leading-relaxed text-muted-foreground">{text}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}
