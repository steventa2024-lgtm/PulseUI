import { Quote, Star } from "lucide-react";

import { Section, SectionHeading, initials } from "./Section";

export type Testimonial = { quote: string; name: string; role: string; rating?: number };

export type TestimonialsProps = {
  id?: string;
  eyebrow?: string;
  title: string;
  description?: string;
  items: Testimonial[];
};

const AVATAR_TINTS = [
  "from-primary to-chart-2",
  "from-chart-2 to-chart-3",
  "from-chart-5 to-primary",
  "from-chart-4 to-chart-5",
];

/** Quote cards with star ratings and initials avatars. */
export function Testimonials({ id = "testimonials", eyebrow, title, description, items }: TestimonialsProps) {
  return (
    <Section id={id} className="bg-muted/30">
      <SectionHeading eyebrow={eyebrow} title={title} description={description} />
      <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {items.map((item, index) => (
          <figure
            key={item.name}
            className="relative flex flex-col rounded-2xl border bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-elegant"
          >
            <Quote className="absolute top-5 right-5 size-8 text-primary/10" aria-hidden />
            <div className="flex gap-0.5" aria-label={`${item.rating ?? 5} out of 5 stars`}>
              {Array.from({ length: 5 }, (_, star) => (
                <Star
                  key={star}
                  className={star < (item.rating ?? 5) ? "size-4 fill-amber-400 text-amber-400" : "size-4 text-muted"}
                />
              ))}
            </div>
            <blockquote className="mt-4 flex-1 leading-relaxed text-pretty">“{item.quote}”</blockquote>
            <figcaption className="mt-6 flex items-center gap-3">
              <span
                className={`flex size-10 items-center justify-center rounded-full bg-gradient-to-br ${AVATAR_TINTS[index % AVATAR_TINTS.length]} text-sm font-semibold text-white`}
              >
                {initials(item.name)}
              </span>
              <span>
                <span className="block text-sm font-semibold">{item.name}</span>
                <span className="block text-sm text-muted-foreground">{item.role}</span>
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </Section>
  );
}
