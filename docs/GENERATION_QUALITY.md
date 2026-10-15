# PromptUI Generation Quality Engine (Phase 1)

This implementation improves the input constraints and static review of the existing single-component generator. It does **not** implement a full-stack coding agent, automated browser QA, or verified visual scoring.

## What's included

- Six original design recipes: Precision SaaS, Minimal Developer, Data-Rich Enterprise, Editorial Premium, Commerce, and Creative Studio.
- A **Design direction** selector in AI Studio: automatic selection or a specific recipe.
- The existing streaming API accepts an optional, validated recipeId. Without it, existing generation calls remain compatible.
- The updated generation prompt emphasizes stateful interactions, accessible layouts, honest demo data and avoidance of generic purple-glass output.
- Prompt-derived contracts describe expected behavior for forms, auth, dashboard controls, billing, carts, navigation and responsiveness.
- QualityReviewPanel surfaces **advisory static findings** for potential inert buttons, placeholder links, unhandled forms, unsafe link schemes and unfinished content.
- The old fictional stream-length-based activity steps were replaced with truthful output status.
- Fixed keyboard listener cleanup and strict TypeScript errors in the existing codebase.

## Use it

1. Open AI Studio.
2. Choose **Auto** or a named **Design direction** recipe.
3. Enter a request and generate with an available configured provider.
4. Expand **Static UX review** above the preview.
5. Manually test relevant interactions inside the sandbox.

Auto uses prompt keywords to choose a recipe. A prompt can also specify 'recipe: editorial-premium' as an advanced override. A chosen UI recipe supersedes automatic inference; explicit user color and typographic preferences remain authoritative.

## Checks

With Node.js 22 or newer:

    npm ci
    npm run test:quality
    npx tsc --noEmit
    npm run build

GitHub Actions runs the tests, TypeScript checking, and production build on the feature branch and pull requests.

## Limitations

- Source heuristics can report false positives and miss broken behavior. Zero static findings is **not** a verified application.
- The single-component iframe cannot prove real login, payments, databases, remote API actions, or persistence.
- The component preview currently uses React 18 plus CDN Tailwind utilities; the host application uses React 19 and Tailwind v4. Runtime alignment remains future work.
- The existing early multi-file builder has not been hardened into a persistent, isolated, non-destructive project agent. Do not expose unrestricted file-writing endpoints publicly.
- The initial design recipe picker does not guarantee superior design; objective browser checks and subjective human review remain necessary.

## Next phases

1. Harden project paths, workspaces, execution isolation, dependency mapping, incremental patches and rollback.
2. Add isolated full-project dev-server previews and Playwright tests derived from interaction contracts.
3. Add responsive screenshots, layout/contrast checks, and optional human or vision-assisted design review.
4. Implement stable DOM-to-source mapping and AST-based visual edits.
5. Publish a reproducible evaluation suite with prompts, expected flows, browser artifacts and design scoring.

Maintain compatibility with the existing component generator while building project generation as a separate pipeline.
