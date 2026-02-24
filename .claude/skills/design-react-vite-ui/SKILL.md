---
name: design-react-vite-ui
description: Design, implement, and iterate on UI components and pages for a React 18 + Vite 6 + Tailwind CSS 3 + Lucide React project using JavaScript (ESM/.jsx). Use this skill whenever the user asks to create, style, refactor, or debug UI in this stack — including building new components, laying out pages, adding responsive design, implementing animations or transitions, integrating Lucide icons, fixing Tailwind utility issues, or iterating on visual design. Also trigger when the user mentions Vite dev server issues related to HMR or component rendering, or asks about Tailwind class conflicts, PostCSS configuration, or Autoprefixer. Even if the user simply says "make this look better" or "add a button here" in a React+Tailwind context, use this skill.
---

# React + Vite + Tailwind UI Development

This skill accelerates UI design, implementation, and iteration in a specific modern frontend stack: **React 18.3.1 + Vite 6.0.5 + Tailwind CSS 3.4.17 + Lucide React**, all in JavaScript ESM (`.jsx` / `.js`).

The goal is to help the user move fast between design intent and working code, with consistent patterns that respect the stack's conventions and avoid common pitfalls.

## Stack at a Glance

| Layer | Tool | Version | Notes |
|-------|------|---------|-------|
| Framework | React | 18.3.1 | Functional Components + Hooks only |
| Build | Vite | 6.0.5 | ESM-native, fast HMR |
| Language | JavaScript | ESM | `.jsx` and `.js` files, no TypeScript |
| CSS | Tailwind CSS | 3.4.17 | Utility-first, JIT mode |
| PostCSS | PostCSS + Autoprefixer | — | Standard Tailwind pipeline |
| Icons | Lucide React | latest | Tree-shakeable SVG icons |

## Core Principles

1. **Components are functions.** No class components. Use `useState`, `useEffect`, `useRef`, `useMemo`, `useCallback`, and custom hooks. Keep components small and composable.

2. **Tailwind is the styling layer.** Apply styles via utility classes directly on JSX elements. Avoid writing custom CSS unless Tailwind genuinely cannot express the design (complex animations, specific pseudo-element tricks). When custom CSS is needed, use Tailwind's `@apply` directive sparingly — prefer inline utilities.

3. **Vite is fast — leverage it.** Components should be organized so HMR works cleanly. One component per file is the default. Side-effect-free modules reload fastest. If the user reports HMR not picking up changes, check for side effects at module scope or circular imports.

4. **Lucide icons are components.** Import them individually: `import { Menu, X, ChevronDown } from 'lucide-react'`. They accept `size`, `color`, `strokeWidth` props. Never import the entire library.

## Component Patterns

### File Structure Convention

```
src/
├── components/
│   ├── ui/           # Reusable primitives (Button, Card, Modal, Input)
│   ├── layout/       # Layout shells (Header, Sidebar, PageContainer)
│   └── features/     # Feature-specific composites (PlayerHud, InventoryGrid)
├── hooks/            # Custom hooks (useLocalStorage, useMediaQuery)
├── pages/            # Route-level page components
├── utils/            # Pure helper functions
└── constants/        # Shared constants, config values
```

Adapt this to the user's existing project structure — don't force a restructure unless they ask for it.

### Component Template

Every component follows this shape:

```jsx
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

export default function AccordionItem({ title, children, defaultOpen = false }) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="border-b border-gray-200">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between py-4 text-left text-sm font-medium text-gray-900 hover:text-gray-600 transition-colors"
      >
        {title}
        <ChevronDown
          size={16}
          className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      {isOpen && (
        <div className="pb-4 text-sm text-gray-600">
          {children}
        </div>
      )}
    </div>
  )
}
```

Key things to notice: default export, destructured props with defaults, Tailwind for all styling, Lucide icon as a component, transition utilities for micro-interactions.

### Props Design

- Use destructured props with sensible defaults.
- Expose a `className` prop on reusable components so the consumer can extend or override styles:
  ```jsx
  export default function Card({ children, className = '' }) {
    return (
      <div className={`rounded-lg bg-white p-6 shadow-sm ${className}`}>
        {children}
      </div>
    )
  }
  ```
- For variant-driven components (buttons, badges), use a simple lookup pattern instead of complex conditional strings:
  ```jsx
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  }

  export default function Button({ variant = 'primary', children, className = '', ...props }) {
    return (
      <button className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${variants[variant]} ${className}`} {...props}>
        {children}
      </button>
    )
  }
  ```

## Tailwind Patterns

### Class Organization

Order utility classes consistently for readability. A good convention:

**Layout → Sizing → Spacing → Typography → Colors → Borders → Effects → Transitions → Responsive**

Example: `flex items-center gap-3 w-full h-12 px-4 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:border-gray-400 transition-colors md:w-auto`

### Responsive Design

Tailwind uses mobile-first breakpoints. Build the mobile view with base classes, then layer desktop overrides:

```jsx
<div className="flex flex-col gap-4 p-4 md:flex-row md:gap-8 md:p-8 lg:max-w-6xl lg:mx-auto">
```

Standard breakpoints: `sm:640px`, `md:768px`, `lg:1024px`, `xl:1280px`, `2xl:1536px`.

### Dark Mode

If the project uses Tailwind's `dark:` variant, apply it consistently:

```jsx
<div className="bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100">
```

Always check whether the user's `tailwind.config.js` uses `darkMode: 'class'` or `'media'` before adding dark mode classes.

### Common Pitfalls

- **Dynamic class names don't work with JIT.** Tailwind can't detect `text-${color}-500`. Use complete class strings: `const colorMap = { red: 'text-red-500', blue: 'text-blue-500' }`.
- **Conflicting utilities.** If `p-4` and `px-6` coexist, `px-6` wins for horizontal padding. Be intentional. Use `tailwind-merge` if the project has it, otherwise order matters.
- **Purging in production.** Ensure `content` paths in `tailwind.config.js` cover all files containing Tailwind classes — including `.jsx` files in new directories.

## Animations & Transitions

Prefer Tailwind's built-in transition utilities for most interactions:

```jsx
className="transition-all duration-300 ease-in-out"
```

For enter/exit animations (modals, dropdowns, toasts), use a state + conditional class pattern:

```jsx
const [isVisible, setIsVisible] = useState(false)
const [isAnimating, setIsAnimating] = useState(false)

const open = () => {
  setIsVisible(true)
  requestAnimationFrame(() => setIsAnimating(true))
}

const close = () => {
  setIsAnimating(false)
  setTimeout(() => setIsVisible(false), 300) // match duration
}

// In JSX:
{isVisible && (
  <div className={`transition-opacity duration-300 ${isAnimating ? 'opacity-100' : 'opacity-0'}`}>
    {/* content */}
  </div>
)}
```

For more complex animations (staggered lists, scroll-triggered reveals), check if the project includes `framer-motion`. If not, CSS `@keyframes` in a small utility CSS file is preferable to adding a dependency.

## Hooks Guidance

Use hooks for reusable logic. Some patterns that come up often in UI work:

- **`useMediaQuery(query)`** — returns boolean, useful for responsive logic that can't be solved with Tailwind classes alone (conditional rendering of entire component trees).
- **`useClickOutside(ref, handler)`** — for closing dropdowns, modals, popovers.
- **`useLocalStorage(key, initialValue)`** — persistent UI state (sidebar collapsed, theme preference).
- **`useDebounce(value, delay)`** — for search inputs, resize handlers.

When writing a custom hook, keep it in `src/hooks/` and name it `use<Thing>.js`. The hook should return the minimum interface needed.

## Iteration Workflow

When iterating on UI with the user:

1. **Understand the intent first.** Is this a visual tweak, a layout restructure, or a behavior change? Ask if unclear.
2. **Show targeted changes.** When modifying an existing component, only change the relevant parts. Don't rewrite the whole file unless the structure needs to change.
3. **Explain visual trade-offs.** If a requested design is tricky (e.g., centering something that also needs to scroll), explain the constraint and offer two approaches.
4. **Respect existing conventions.** If the user's project uses a specific naming pattern, color palette, or component API — follow it. Don't introduce competing patterns.
5. **Think about states.** Every interactive UI element has states: default, hover, focus, active, disabled, loading, error, empty. Address the ones that matter for the component.

## Vite-Specific Tips

- **Import aliases:** If `vite.config.js` defines resolve aliases (e.g., `@/` → `src/`), use them consistently.
- **Environment variables:** Access via `import.meta.env.VITE_*`. Never use `process.env` in client code.
- **Static assets:** Files in `public/` are served at root. Files imported from `src/assets/` get hashed filenames in production.
- **HMR boundaries:** If a component's state resets unexpectedly on edit, check whether it's being re-exported through a barrel file (`index.js`). Direct imports preserve state better.

## Checklist Before Delivering

Before presenting a component or page to the user, mentally verify:

- [ ] Functional component with hooks (no class components)
- [ ] Tailwind utilities for styling (no inline styles, minimal custom CSS)
- [ ] Lucide icons imported individually
- [ ] Responsive consideration (at least mobile + desktop)
- [ ] Interactive states addressed (hover, focus, disabled as needed)
- [ ] Props have defaults, `className` passthrough on reusable components
- [ ] No dynamic Tailwind class construction (use lookup maps)
- [ ] ESM imports, default export
