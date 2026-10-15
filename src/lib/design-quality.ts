/**
 * Deterministic, provider-independent design direction and UX contracts.
 *
 * This deliberately does not depend on a paid AI model: it gives both local and
 * hosted coding models a concise, auditable design specification.
 */
export const RECIPE_IDS = [
  "precision-saas",
  "minimal-developer",
  "data-enterprise",
  "editorial-premium",
  "commerce",
  "creative-studio",
] as const;

export type RecipeId = (typeof RECIPE_IDS)[number];

export type DesignRecipe = {
  id: RecipeId;
  title: string;
  useFor: string;
  palette: string;
  typography: string;
  composition: string;
  components: string;
  constraints: string;
};

export const DESIGN_RECIPES: Record<RecipeId, DesignRecipe> = {
  "precision-saas": {
    id: "precision-saas",
    title: "Precision SaaS",
    useFor: "CRMs, internal tools, productivity and professional SaaS",
    palette: "Slate/ink with one purposeful brand accent, subtle semantic status colors",
    typography: "Modern sans, 3-level hierarchy, compact labels, tabular numerals",
    composition: "Information-first layout; collapsible navigation when needed, clear task hierarchy",
    components: "Dense but readable tables, toolbars, searchable lists, dialogs and empty states",
    constraints: "Avoid giant hero sections, ornamental bento grids and oversized KPI cards",
  },
  "minimal-developer": {
    id: "minimal-developer",
    title: "Minimal Developer",
    useFor: "Developer tools, API dashboards, coding products and technical documentation",
    palette: "Near-black or white neutral surfaces, hairline borders, one restrained highlight",
    typography: "Crisp sans body with selective monospace for data and code",
    composition: "Compact command surfaces, excellent navigation, high signal-to-noise",
    components: "Command inputs, file trees, inspectors, tabs, code panels, honest status indicators",
    constraints: "Prefer clarity over ambient gradients, glass effects and glowing outlines",
  },
  "data-enterprise": {
    id: "data-enterprise",
    title: "Data-Rich Enterprise",
    useFor: "Analytics, operations, finance and business intelligence",
    palette: "Neutral dashboard canvas with accessible chart and status colors",
    typography: "Readable data typography, clear row density, tabular numerals",
    composition: "Filters -> overview -> comparison -> drill-down, with aligned data regions",
    components: "Functional filters, sortable tables, charts with labels, legends and real states",
    constraints: "Do not simulate charts as arbitrary lines or imply fabricated data is real",
  },
  "editorial-premium": {
    id: "editorial-premium",
    title: "Editorial Premium",
    useFor: "Portfolios, brands, cultural products and content-rich landing pages",
    palette: "Soft natural light or ink-dark with disciplined accent colors",
    typography: "Expressive headings with tightly controlled readable body text",
    composition: "Typography-led narrative, generous negative space and asymmetry where useful",
    components: "Clear content sections, strong imagery, considered CTAs and editorial cards",
    constraints: "Avoid default feature-bento grids and decorative badges everywhere",
  },
  commerce: {
    id: "commerce",
    title: "Commerce",
    useFor: "Product stores, catalogs, checkout flows and merchandising",
    palette: "Product-led neutral backdrop; visual hierarchy prioritizes inventory",
    typography: "Product-first headings, clear prices, subdued specifications",
    composition: "Merchandising, filtering, responsive grids, product details and checkout progression",
    components: "Real cart state, options, quantity controls, filters and validation",
    constraints: "Never show a working purchase claim without an actual checkout implementation",
  },
  "creative-studio": {
    id: "creative-studio",
    title: "Creative Studio",
    useFor: "Agencies, media, design portfolios, expressive marketing",
    palette: "Intentional high-contrast palettes based on user-provided brand direction",
    typography: "Distinctive display hierarchy balanced with legible small text",
    composition: "Variable rhythm, asymmetric grids and purposeful visual storytelling",
    components: "Case studies, responsive media, storytelling transitions and meaningful CTAs",
    constraints: "Creativity must never compromise navigation, readability or accessibility",
  },
};

function includesAny(haystack: string, terms: readonly string[]): boolean {
  return terms.some((term) => haystack.includes(term));
}

/** Explicit recipe instructions take priority; otherwise selection is semantic. */
export function selectDesignRecipe(prompt: string): DesignRecipe {
  const text = prompt.toLowerCase();
  const explicit = text.match(/\b(?:design\s+recipe|recipe)\s*[:=]\s*([a-z-]+)/i);
  if (explicit?.[1] && RECIPE_IDS.includes(explicit[1] as RecipeId)) {
    return DESIGN_RECIPES[explicit[1] as RecipeId];
  }
  if (includesAny(text, ["editorial", "magazine", "typographic", "luxury portfolio"])) {
    return DESIGN_RECIPES["editorial-premium"];
  }
  if (includesAny(text, ["checkout", "shopping cart", "e-commerce", "ecommerce", "shop", "storefront", "product catalog"])) {
    return DESIGN_RECIPES.commerce;
  }
  if (includesAny(text, ["analytics", "business intelligence", "finance dashboard", "reporting", "financial metrics"])) {
    return DESIGN_RECIPES["data-enterprise"];
  }
  if (includesAny(text, ["developer", "terminal", "code editor", "api platform", "documentation", "ide"])) {
    return DESIGN_RECIPES["minimal-developer"];
  }
  if (includesAny(text, ["agency", "creative studio", "art direction", "creative portfolio", "motion design"])) {
    return DESIGN_RECIPES["creative-studio"];
  }
  return DESIGN_RECIPES["precision-saas"];
}

export type InteractionContract = {
  id: string;
  requirement: string;
  verification: string;
};

/**
 * Generate actionable expected behavior, not a promise that it was implemented.
 * Browser tests must verify these expectations before a project is marked ready.
 */
export function inferInteractionContracts(prompt: string): InteractionContract[] {
  const text = prompt.toLowerCase();
  const contracts: InteractionContract[] = [
    {
      id: "controls",
      requirement: "Every visible button or link must perform its labeled action, or be transparently unavailable.",
      verification: "Exercise each primary control and check the resulting state or route.",
    },
    {
      id: "responsive",
      requirement: "Content must remain usable without horizontal page overflow on mobile and desktop.",
      verification: "Check widths 390px, 768px and 1440px and keyboard focus order.",
    },
  ];
  if (includesAny(text, ["login", "log in", "sign in", "sign up", "register", "authentication"])) {
    contracts.push({
      id: "authentication",
      requirement: "Validate credentials and display informative error, loading and success states. Never fake a logged-in user or working OAuth connection.",
      verification: "Submit invalid and valid demo inputs; confirm the actual auth service if claimed.",
    });
  }
  if (includesAny(text, ["form", "contact", "create customer", "add customer", "checkout", "sign up", "register"])) {
    contracts.push({
      id: "forms",
      requirement: "Inputs need labels, required-field validation, visible feedback, and actual submission handling.",
      verification: "Submit empty/invalid forms and valid forms; verify real or explicitly local-demo persistence.",
    });
  }
  if (includesAny(text, ["dashboard", "crm", "analytics", "table", "search", "filter", "catalog"])) {
    contracts.push({
      id: "data-actions",
      requirement: "Search/filter/tabs must change displayed data. Charts and metrics must clearly identify sample data if simulated.",
      verification: "Interact with each visible data control and assert displayed content changes.",
    });
  }
  if (includesAny(text, ["pricing", "subscription", "billing"])) {
    contracts.push({
      id: "billing-controls",
      requirement: "Plan and billing toggles must update displayed prices and state. Do not pretend to process payments.",
      verification: "Toggle billing periods and verify price and accessible selected state.",
    });
  }
  if (includesAny(text, ["cart", "e-commerce", "ecommerce", "shop", "storefront"])) {
    contracts.push({
      id: "cart-controls",
      requirement: "Adding/removing products and updating quantity must update real local cart state and totals.",
      verification: "Add, update and remove an item and verify totals recalculate.",
    });
  }
  return contracts;
}

/** Inject a compact contract for the model without changing provider APIs. */
export function buildDesignAndUxBrief(prompt: string, modifiers: readonly string[], selectedRecipe?: RecipeId): string {
  const recipe = selectedRecipe ? DESIGN_RECIPES[selectedRecipe] : selectDesignRecipe(prompt);
  const contracts = inferInteractionContracts(prompt);
  const overrides = modifiers.length ? modifiers.join(", ") : "none";
  return [
    "DESIGN AND UX CONTRACT (developer specification; respect the user's explicit requests first):",
    "Selected recipe: " + recipe.title + " (" + recipe.id + ")",
    "Best suited for: " + recipe.useFor,
    "Palette: " + recipe.palette,
    "Typography: " + recipe.typography,
    "Composition: " + recipe.composition,
    "Components: " + recipe.components,
    "Avoid: " + recipe.constraints,
    "User-selected modifiers: " + overrides,
    "Treat these as defaults, NOT overrides of explicit user colors, fonts, themes or layout.",
    "Never invent active OAuth, payments, API data, deployment, or persistence. Mark demo functionality honestly.",
    "Avoid generic gradients, unnecessary glass cards, meaningless KPI grids, fake social proof, placeholder links and inert buttons.",
    "Every interactive element must use working React state or a documented real integration; otherwise use a disabled state with clear explanation.",
    "Implement responsive semantics, keyboard focus, labels, error handling and visible user feedback.",
    "UX acceptance criteria:",
    ...contracts.map((item) => "- [" + item.id + "] " + item.requirement),
    "Generated code must remain compatible with the current single-component sandbox constraints.",
  ].join("\n");
}
