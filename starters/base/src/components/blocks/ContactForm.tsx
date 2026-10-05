import { Loader2, Send, type LucideIcon } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Section, SectionHeading } from "./Section";

export type ContactFormProps = {
  id?: string;
  eyebrow?: string;
  title: string;
  description?: string;
  /** Options for the "topic" select. */
  topics?: string[];
  /** Contact details shown beside the form. */
  details?: { icon: LucideIcon; label: string; value: string }[];
  /** Receives the submitted values; defaults to a success toast. */
  onSubmit?: (values: ContactValues) => void | Promise<void>;
};

export type ContactValues = { name: string; email: string; topic: string; message: string };

const EMPTY: ContactValues = { name: "", email: "", topic: "", message: "" };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(values: ContactValues, topics: string[]) {
  const errors: Partial<Record<keyof ContactValues, string>> = {};
  if (values.name.trim().length < 2) errors.name = "Please enter your name.";
  if (!EMAIL.test(values.email)) errors.email = "Enter a valid email address.";
  if (topics.length && !values.topic) errors.topic = "Choose a topic.";
  if (values.message.trim().length < 10) errors.message = "Tell us a bit more (10+ characters).";
  return errors;
}

/** Validated contact form with loading state, toast and reset. */
export function ContactForm({
  id = "contact",
  eyebrow,
  title,
  description,
  topics = ["Sales", "Support", "Partnerships", "Other"],
  details = [],
  onSubmit,
}: ContactFormProps) {
  const [values, setValues] = useState<ContactValues>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof ContactValues, string>>>({});
  const [sending, setSending] = useState(false);

  const set = (field: keyof ContactValues) => (value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const found = validate(values, topics);
    setErrors(found);
    if (Object.keys(found).length) return;
    setSending(true);
    try {
      if (onSubmit) await onSubmit(values);
      else await new Promise((resolve) => setTimeout(resolve, 700));
      toast.success("Message sent", { description: `Thanks ${values.name.split(" ")[0]}, we'll reply within one business day.` });
      setValues(EMPTY);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const field = (name: keyof ContactValues) =>
    errors[name] ? <p className="text-xs font-medium text-destructive">{errors[name]}</p> : null;

  return (
    <Section id={id}>
      <div className="grid gap-12 lg:grid-cols-[1fr_1.3fr]">
        <div>
          <SectionHeading eyebrow={eyebrow} title={title} description={description} align="left" />
          <div className="mt-10 space-y-4">
            {details.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-4 rounded-xl border bg-card p-4">
                <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </span>
                <span>
                  <span className="block text-sm text-muted-foreground">{label}</span>
                  <span className="block font-medium">{value}</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={submit} noValidate className="space-y-5 rounded-2xl border bg-card p-6 shadow-sm md:p-8">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="contact-name">Name</Label>
              <Input id="contact-name" value={values.name} onChange={(e) => set("name")(e.target.value)} aria-invalid={Boolean(errors.name)} placeholder="Jane Cooper" />
              {field("name")}
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-email">Work email</Label>
              <Input id="contact-email" type="email" value={values.email} onChange={(e) => set("email")(e.target.value)} aria-invalid={Boolean(errors.email)} placeholder="jane@company.com" />
              {field("email")}
            </div>
          </div>
          {topics.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="contact-topic">Topic</Label>
              <Select value={values.topic} onValueChange={set("topic")}>
                <SelectTrigger id="contact-topic" className="w-full" aria-invalid={Boolean(errors.topic)}>
                  <SelectValue placeholder="What can we help with?" />
                </SelectTrigger>
                <SelectContent>
                  {topics.map((topic) => (
                    <SelectItem key={topic} value={topic}>
                      {topic}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {field("topic")}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="contact-message">Message</Label>
            <Textarea id="contact-message" rows={5} value={values.message} onChange={(e) => set("message")(e.target.value)} aria-invalid={Boolean(errors.message)} placeholder="Tell us about your team and what you need…" />
            {field("message")}
          </div>
          <Button type="submit" size="lg" disabled={sending} className="w-full bg-gradient-primary shadow-elegant">
            {sending ? <Loader2 className="animate-spin" /> : <Send />}
            {sending ? "Sending…" : "Send message"}
          </Button>
        </form>
      </div>
    </Section>
  );
}
