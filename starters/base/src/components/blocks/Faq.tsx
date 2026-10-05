import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Section, SectionHeading } from "./Section";

export type FaqProps = {
  id?: string;
  eyebrow?: string;
  title: string;
  description?: string;
  items: { question: string; answer: string }[];
};

/** Heading on the left, accordion on the right (stacked on mobile). */
export function Faq({ id = "faq", eyebrow = "FAQ", title, description, items }: FaqProps) {
  return (
    <Section id={id}>
      <div className="grid gap-10 lg:grid-cols-[1fr_1.5fr] lg:gap-16">
        <SectionHeading eyebrow={eyebrow} title={title} description={description} align="left" />
        <Accordion type="single" collapsible className="w-full">
          {items.map((item, index) => (
            <AccordionItem key={item.question} value={`item-${index}`}>
              <AccordionTrigger className="text-left text-base font-semibold hover:no-underline">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="text-base leading-relaxed text-muted-foreground">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </Section>
  );
}
