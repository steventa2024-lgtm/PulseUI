import { Check, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { Section, SectionHeading } from "./Section";

export type Plan = {
  name: string;
  description: string;
  /** Price per month; 0 shows "Free". */
  monthly: number;
  /** Price per month when billed yearly. */
  yearly: number;
  features: string[];
  cta: string;
  featured?: boolean;
};

export type PricingProps = {
  id?: string;
  eyebrow?: string;
  title: string;
  description?: string;
  plans: Plan[];
  currency?: string;
  /** Called with the plan and billing period; defaults to a confirmation toast. */
  onSelect?: (plan: Plan, yearly: boolean) => void;
};

/** Plan cards with a working monthly/yearly toggle and a highlighted plan. */
export function Pricing({ id = "pricing", eyebrow, title, description, plans, currency = "$", onSelect }: PricingProps) {
  const [yearly, setYearly] = useState(false);
  const best = Math.max(
    0,
    ...plans.filter((plan) => plan.monthly > 0).map((plan) => Math.round((1 - plan.yearly / plan.monthly) * 100)),
  );

  return (
    <Section id={id}>
      <SectionHeading eyebrow={eyebrow} title={title} description={description} />
      <div className="mt-10 flex items-center justify-center gap-3">
        <span className={cn("text-sm font-medium", !yearly ? "text-foreground" : "text-muted-foreground")}>Monthly</span>
        <Switch checked={yearly} onCheckedChange={setYearly} aria-label="Bill yearly" />
        <span className={cn("text-sm font-medium", yearly ? "text-foreground" : "text-muted-foreground")}>Yearly</span>
        {best > 0 && (
          <Badge variant="secondary" className="rounded-full bg-primary/10 text-primary">
            Save {best}%
          </Badge>
        )}
      </div>

      <div className={cn("mt-12 grid gap-6", plans.length >= 3 ? "lg:grid-cols-3" : "md:grid-cols-2", "mx-auto max-w-5xl")}>
        {plans.map((plan) => {
          const price = yearly ? plan.yearly : plan.monthly;
          return (
            <div
              key={plan.name}
              className={cn(
                "relative flex flex-col rounded-2xl border bg-card p-8 transition-all duration-300",
                plan.featured
                  ? "border-primary/50 shadow-elegant ring-1 ring-primary/30 lg:scale-105"
                  : "shadow-sm hover:-translate-y-1 hover:shadow-elegant",
              )}
            >
              {plan.featured && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-primary px-3 shadow-elegant">
                  <Sparkles /> Most popular
                </Badge>
              )}
              <h3 className="text-lg font-semibold">{plan.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
              <p className="mt-6 flex items-baseline gap-1">
                <span className="text-5xl font-extrabold tracking-tight">{price === 0 ? "Free" : `${currency}${price}`}</span>
                {price > 0 && <span className="text-muted-foreground">/mo</span>}
              </p>
              <p className="mt-1 h-5 text-xs text-muted-foreground">
                {price > 0 && (yearly ? `Billed ${currency}${price * 12} yearly` : "Billed monthly")}
              </p>
              <Button
                size="lg"
                variant={plan.featured ? "default" : "outline"}
                className={cn("mt-6 w-full", plan.featured && "bg-gradient-primary shadow-elegant")}
                onClick={() =>
                  onSelect
                    ? onSelect(plan, yearly)
                    : toast.success(`${plan.name} plan selected`, {
                        description: `${yearly ? "Yearly" : "Monthly"} billing. We'll email you the next steps.`,
                      })
                }
              >
                {plan.cta}
              </Button>
              <ul className="mt-8 space-y-3 text-sm">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </Section>
  );
}
