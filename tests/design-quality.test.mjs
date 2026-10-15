import test from "node:test";
import assert from "node:assert/strict";

import {
  DESIGN_RECIPES,
  RECIPE_IDS,
  selectDesignRecipe,
  inferInteractionContracts,
  buildDesignAndUxBrief,
} from "../src/lib/design-quality.ts";
import { auditComponentSource } from "../src/lib/quality/audit-component.ts";

test("all six design recipes have distinct and complete definitions", () => {
  assert.equal(RECIPE_IDS.length, 6);
  assert.equal(new Set(RECIPE_IDS).size, 6);
  for (const id of RECIPE_IDS) {
    const recipe = DESIGN_RECIPES[id];
    assert.equal(recipe.id, id);
    for (const key of ["title", "palette", "typography", "composition", "components", "constraints"]) {
      assert.ok(recipe[key].length > 20, id + " missing " + key);
    }
  }
});

test("user-specified recipe overrides semantic inference", () => {
  const recipe = selectDesignRecipe("CRM analytics app; recipe: creative-studio");
  assert.equal(recipe.id, "creative-studio");
});

test("domain-sensitive recipe defaults", () => {
  assert.equal(selectDesignRecipe("SaaS CRM for leads").id, "precision-saas");
  assert.equal(selectDesignRecipe("Financial metrics analytics dashboard").id, "data-enterprise");
  assert.equal(selectDesignRecipe("A product storefront with shopping cart").id, "commerce");
  assert.equal(selectDesignRecipe("An editorial magazine layout").id, "editorial-premium");
  assert.equal(selectDesignRecipe("Developer code editor").id, "minimal-developer");
  assert.equal(selectDesignRecipe("Creative agency portfolio").id, "creative-studio");
});

test("interaction contracts include baseline, auth and form requirements", () => {
  const contracts = inferInteractionContracts("Build a sign up form with pricing");
  const ids = contracts.map((item) => item.id);
  for (const id of ["controls", "responsive", "authentication", "forms", "billing-controls"]) {
    assert.ok(ids.includes(id), "missing " + id);
  }
  assert.ok(contracts.every((contract) => contract.verification.length > 10));
});

test("commerce interactions request stateful cart calculations", () => {
  const ids = inferInteractionContracts("E-commerce shopping cart").map((contract) => contract.id);
  assert.ok(ids.includes("cart-controls"));
});

test("design brief includes modifiers and anti-fake UX requirements", () => {
  const result = buildDesignAndUxBrief("Make a CRM with customer search", ["light"]);
  assert.match(result, /Precision SaaS/);
  assert.match(result, /light/);
  assert.match(result, /working React state/);
  assert.match(result, /Search\/filter\/tabs/);
  assert.match(result, /explicit user colors/);
});

test("source review ignores empty code", () => {
  assert.deepEqual(auditComponentSource("   "), []);
});

test("source review reports inert buttons and placeholder links", () => {
  const src = '<a href="#">Open</a><button type="button">Save</button>';
  const ids = auditComponentSource(src).map((diagnostic) => diagnostic.id);
  assert.ok(ids.includes("placeholder-link"));
  assert.ok(ids.includes("inert-button"));
});

test("source review accepts stateful buttons and handled forms", () => {
  const src = '<form onSubmit={submit}><button type="submit">Save</button><button onClick={cancel}>Cancel</button></form>';
  assert.deepEqual(auditComponentSource(src), []);
});

test("source review warns on unhandled form", () => {
  const warnings = auditComponentSource('<form><button type="submit">Send</button></form>');
  assert.ok(warnings.some((warning) => warning.id === "form-submit"));
  assert.ok(!warnings.some((warning) => warning.id === "inert-button"));
});

test("source review catches javascript URLs as errors", () => {
  const warnings = auditComponentSource('<a href="javascript:alert(1)">Bad link</a>');
  assert.equal(warnings.find((warning) => warning.id === "unsafe-link")?.severity, "error");
});

test("source review discloses unfinished placeholder copy", () => {
  const warnings = auditComponentSource('<div>Coming soon</div>');
  assert.ok(warnings.some((warning) => warning.id === "placeholder-copy"));
});
