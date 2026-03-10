# IBEX Sports Complex — Design Guide

## Brand

- **Primary:** Teal `#2DD4BF` — CTAs, links, highlights, focus rings.
- **On primary:** Dark navy `#0F172A` — text on teal buttons.
- **Hover:** `#14B8A6`. **Light teal:** `#5eead4` for gradients.
- **Backgrounds:** White / `#050505` (dark). Sections use zinc (`zinc-50`, `zinc-950`, `#080808`) for contrast.
- **Typography:** Inter, single body font. Hero: very large, tight tracking; sections: bold headlines, light body.

## Landing page structure (storytelling)

1. **Hero** — Full viewport, bold wordmark, subline, Book CTA. Dark + teal orbs.
2. **Marquee** — Sports strip (Padel • Pickleball • Futsal).
3. **Facilities** — Court cards (Padel, Futsal, Pickleball, Cricket) with image + copy.
4. **Membership** — Monthly plans (Bronze / Silver / Gold / Platinum).
5. **Lifestyle** — Horizontal scroll gallery using `public/lifestyle/` images.
6. **Amenities** — Café + food, two columns.
7. **Get in touch** — Map, contact, hours, social.

## UI rules

- Use **shadcn** components only for interactive UI (Button, Input, Select, Card, Dialog, Tabs, Badge, etc.). No raw `<button>`, `<input>`, `<select>` in feature code.
- **Section-aware navbar:** On the homepage, the nav switches to a light style over light sections (facilities, membership, contact) and dark over dark sections (hero, lifestyle, amenities).
- **Motion:** Framer Motion for scroll-driven reveals, parallax, and transitions. Respect `prefers-reduced-motion` in CSS.

## Key files

- **Story copy & section themes:** `lib/landing-story.ts`
- **Section detection (navbar theme):** `contexts/SectionThemeContext.tsx`
- **Landing layout:** `components/landing/LandingPage.tsx`, `SectionWrapper.tsx`
- **Sections:** `components/sections/*` (Hero, Marquee, Facilities, Membership, Amenities, GetInTouch)
- **Reusable motion:** `components/ui/ParallaxSection.tsx`, `TextReveal.tsx`, `ScrollReveal.tsx`
- **Gallery:** `components/ui/InfiniteScroll.tsx` (InfiniteGallery), images from `types/index.ts` → `GALLERY_IMAGES`

## Responsive & a11y

- Tailwind breakpoints (sm, md, lg). Skip link to main content; focus rings use teal. Sufficient contrast for text on all backgrounds.
