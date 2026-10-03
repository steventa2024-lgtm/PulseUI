# PulseUI app

Created with PulseUI. React 19 + TypeScript + Vite + Tailwind CSS v4 + shadcn/ui.

```bash
npm install   # or bun install
npm run dev
npm run build
```

- `src/index.css`: design tokens (colors, radius, gradients, shadows) for light and `.dark`.
- `src/components/ui`: shadcn/ui components (MIT, https://ui.shadcn.com), built on Radix.
- `src/pages`: routed pages (`react-router-dom`); routes live in `src/App.tsx`.
- `@/` imports resolve to `src/`.
