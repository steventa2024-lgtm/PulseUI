export type Stage = "Lead" | "Qualified" | "Proposal" | "Won" | "Lost";

export type Contact = {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  value: number;
  stage: Stage;
  notes: string;
  updated: string;
};

export const STAGES: Stage[] = ["Lead", "Qualified", "Proposal", "Won", "Lost"];

export const STAGE_STYLES: Record<Stage, string> = {
  Lead: "bg-slate-100 text-slate-700",
  Qualified: "bg-sky-100 text-sky-700",
  Proposal: "bg-amber-100 text-amber-800",
  Won: "bg-emerald-100 text-emerald-700",
  Lost: "bg-rose-100 text-rose-700",
};

const today = new Date().toISOString().slice(0, 10);

export const SEED: Contact[] = [
  { id: "1", name: "Hannah Brooks", company: "Greenleaf Landscaping", email: "hannah@greenleaf.co", phone: "(555) 201-3311", value: 12000, stage: "Proposal", notes: "Wants quarterly maintenance plan.", updated: today },
  { id: "2", name: "Marco Ruiz", company: "Ruiz Property Group", email: "marco@ruizpg.com", phone: "(555) 448-1020", value: 34000, stage: "Qualified", notes: "Five properties, needs bundled quote.", updated: today },
  { id: "3", name: "Aisha Khan", company: "Oakridge HOA", email: "board@oakridgehoa.org", phone: "(555) 330-7781", value: 21000, stage: "Won", notes: "Signed annual contract.", updated: today },
  { id: "4", name: "Tom Walsh", company: "Walsh Dental", email: "tom@walshdental.com", phone: "(555) 902-1188", value: 4800, stage: "Lead", notes: "Inbound from website form.", updated: today },
  { id: "5", name: "Lena Fischer", company: "Brightside Cafe", email: "lena@brightside.cafe", phone: "(555) 610-4402", value: 6200, stage: "Lead", notes: "Patio redesign this spring.", updated: today },
  { id: "6", name: "Derek Owens", company: "Summit Offices", email: "derek@summitoffices.com", phone: "(555) 775-0090", value: 15500, stage: "Lost", notes: "Went with incumbent vendor.", updated: today },
];

export const money = (value: number) =>
  value.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
