/**
 * Typed template registry. Each entry is backed by a real starter project in
 * `starters/templates/<id>` that is layered on top of `starters/base`. The
 * preview images in `public/templates` are screenshots of those starters.
 *
 * To add a template: create the starter directory, add an entry here, and run
 * `bun run templates:screenshots` to capture its card image.
 */

export type TemplateCategory =
  "Dashboard" | "AI" | "Commerce" | "Marketing" | "Personal" | "Productivity" | "Business";

export type TemplateDefinition = {
  id: string;
  name: string;
  category: TemplateCategory;
  description: string;
  image: string;
  /** Starter text shown in the composer after the project opens. */
  suggestion: string;
  popular: boolean;
};

export const TEMPLATES: TemplateDefinition[] = [
  {
    id: "analytics-dashboard",
    name: "Analytics Dashboard",
    category: "Dashboard",
    description: "Revenue KPIs, traffic chart, top channels and a live activity feed.",
    image: "/templates/analytics-dashboard.jpg",
    suggestion: "Add a date-range filter that updates the KPIs and chart.",
    popular: true,
  },
  {
    id: "ai-chat",
    name: "AI Chat Interface",
    category: "AI",
    description: "Conversation sidebar, streaming-style message thread and prompt composer.",
    image: "/templates/ai-chat.jpg",
    suggestion: "Add a model picker and a 'regenerate response' button.",
    popular: true,
  },
  {
    id: "ecommerce-store",
    name: "E-commerce Store",
    category: "Commerce",
    description: "Product grid with category filters, cart drawer and checkout summary.",
    image: "/templates/ecommerce-store.jpg",
    suggestion: "Add a product detail modal with size selection.",
    popular: true,
  },
  {
    id: "real-estate",
    name: "Real Estate Site",
    category: "Marketing",
    description: "Property search hero, filterable listings and agent contact section.",
    image: "/templates/real-estate.jpg",
    suggestion: "Add a map-style split view next to the listings.",
    popular: true,
  },
  {
    id: "stream-dashboard",
    name: "Twitch Dashboard",
    category: "Dashboard",
    description:
      "Twitch-style creator dashboard: live viewer graph, chat feed, follower stats and stream controls.",
    image: "/templates/stream-dashboard.jpg",
    suggestion: "Add a scheduled streams calendar panel.",
    popular: true,
  },
  {
    id: "saas-dashboard",
    name: "SaaS Dashboard",
    category: "Dashboard",
    description: "Collapsible sidebar, MRR metrics, customers table and plan breakdown.",
    image: "/templates/saas-dashboard.jpg",
    suggestion: "Add a customer detail drawer with invoices.",
    popular: false,
  },
  {
    id: "portfolio",
    name: "Portfolio",
    category: "Personal",
    description: "Personal hero, selected work grid, experience timeline and contact.",
    image: "/templates/portfolio.jpg",
    suggestion: "Add a case study page for the first project.",
    popular: false,
  },
  {
    id: "admin-dashboard",
    name: "Admin Dashboard",
    category: "Dashboard",
    description: "User management table with search, roles, status and bulk actions.",
    image: "/templates/admin-dashboard.jpg",
    suggestion: "Add an audit log page that records role changes.",
    popular: false,
  },
  {
    id: "landing-page",
    name: "Landing Page",
    category: "Marketing",
    description: "Product hero, feature grid, pricing tiers, testimonials and FAQ.",
    image: "/templates/landing-page.jpg",
    suggestion: "Add a customer logos strip under the hero.",
    popular: false,
  },
  {
    id: "kanban-board",
    name: "Kanban Task Board",
    category: "Productivity",
    description:
      "Drag-and-drop columns, task editor with tags and priorities, progress bar, saved locally.",
    image: "/templates/kanban-board.jpg",
    suggestion: "Add due dates with an overdue highlight.",
    popular: false,
  },
  {
    id: "crm",
    name: "Small Business CRM",
    category: "Business",
    description:
      "Contacts, deal pipeline by stage, revenue and win-rate KPIs, add/edit/delete, saved locally.",
    image: "/templates/crm.jpg",
    suggestion: "Add a tasks list per contact with reminders.",
    popular: false,
  },
  {
    id: "restaurant",
    name: "Restaurant & Ordering",
    category: "Commerce",
    description:
      "Menu with categories and dietary filters, cart, pickup/delivery checkout and confirmation.",
    image: "/templates/restaurant.jpg",
    suggestion: "Add a table reservation form with party size.",
    popular: false,
  },
  {
    id: "booking",
    name: "Appointment Booking",
    category: "Business",
    description:
      "Services, staff, two-week calendar with live availability, booking confirmation and cancel.",
    image: "/templates/booking.jpg",
    suggestion: "Add an admin view listing all bookings by day.",
    popular: false,
  },
  {
    id: "fitness-tracker",
    name: "Fitness Tracker",
    category: "Personal",
    description: "Log workouts, weekly goal, activity chart, streaks and history, saved locally.",
    image: "/templates/fitness-tracker.jpg",
    suggestion: "Add personal records per workout type.",
    popular: false,
  },
  {
    id: "budget-tracker",
    name: "Budget Tracker",
    category: "Personal",
    description:
      "Income and expenses, category budgets with a donut chart, month filter and CSV export.",
    image: "/templates/budget-tracker.jpg",
    suggestion: "Add recurring transactions.",
    popular: false,
  },
];

export function getTemplate(id: string): TemplateDefinition | undefined {
  return TEMPLATES.find((template) => template.id === id);
}
