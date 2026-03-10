# Ibex Sports Complex — Website Overview

Use this doc to explain the site in words: design system, concept, all on-page text, and links (socials, maps, booking).

---

## 1. Concept & Story

The site is a **storytelling landing page**: one long scroll that takes the visitor through the “journey” of Ibex — from hero and location, to facilities, cafe, lifestyle, membership, and contact. It’s **mobile-first**: base styles are for small screens; larger breakpoints only add or refine.

- **Flow:** Hero → Marquee ticker → Facilities → Hive Cafe (amenities) → Lifestyle gallery → Membership plans → Get in Touch (map + contact).
- **Theming:** Sections alternate between slightly different backgrounds (e.g. `#050505` vs `#0a0a0a` in dark mode) so the page doesn’t feel one flat block. The navbar can switch to light/dark based on which section is in view.
- **Motion:** Scroll-driven parallax on hero and lifestyle, scroll-reveal on sections, and a horizontal marquee ticker. All tuned for performance and optional reduced-motion.

---

## 2. Design System

### 2.1 Colour

- **Primary brand accent:** Teal `#2DD4BF` (Tailwind `teal-400`). Used for:
  - Main CTAs (Book Court, Book Now)
  - Section labels (small uppercase teal text above headings)
  - Gradient on main headings (`.gradient-text`)
  - Highlights (e.g. “Most Popular” on Gold plan, discount banner, icons)
- **Heading gradient:** `.gradient-text` = linear gradient `#2dd4bf → #5eead4 → #2dd4bf`, animated (background-clip: text). Used for all main section titles and hero “IBEX SPORTS COMPLEX”.
- **Backgrounds (dark mode):**
  - Base: `#050505`
  - Alternate sections: `#0a0a0a`
  - Lifestyle (dark chapter): black
- **Backgrounds (light mode):** White and `zinc-50` alternating by section.
- **Text:** Black/white for primary; `zinc-500` / `zinc-400` for secondary; `zinc-600` / `zinc-400` for body.
- **Borders:** `zinc-200` / `zinc-800` (light/dark); `white/10` for dark UI elements.

### 2.2 Typography

- **Section labels:** `font-mono`, `text-xs`, `uppercase`, `tracking-[0.25em]`, colour `#2DD4BF`.
- **Section headings (H2):** Bold, `tracking-tight`, `.gradient-text`. Scale: mobile `text-3xl` → `sm:text-4xl` → `md:text-6xl`.
- **Hero title:** Same gradient, very heavy weight, tight tracking; scale from `text-5xl` up to `xl:text-9xl`.
- **Body / sublines:** `text-base` → `sm:text-lg` → `md:text-xl`, `leading-relaxed`, `text-zinc-600` / `dark:text-zinc-400`.
- **Cards / small headings:** `text-lg`–`text-xl` (mobile) up to `text-2xl`–`text-3xl` on desktop.

### 2.3 Spacing & layout

- **Sections:** Vertical padding `py-16` → `sm:py-20` → `md:py-28` → `lg:py-40`; horizontal `px-4` → `sm:px-6`.
- **Content width:** `max-w-7xl` (1280px) for main content; hero content `max-w-5xl`.
- **Header blocks:** Margin below section headers `mb-14` → `sm:mb-20` → `md:mb-28`.
- **Gaps:** Tighter on mobile (e.g. `gap-4`, `space-y-14`) and increase at `sm`/`md`/`lg`.

### 2.4 Components & patterns

- **Buttons:** Primary = teal `#2DD4BF`, dark text `#0F172A`, rounded-full (hero) or rounded-lg (navbar). Min height ~48px on mobile for touch.
- **Cards:** Rounded-2xl/3xl, borders, optional subtle shadow; membership “Gold” card has teal border and “Most Popular” strip.
- **Marquee:** Full-width teal strip, skewed, bold uppercase text (e.g. “Paddle · Pickleball · Futsal”), horizontal scroll animation.
- **Lifestyle gallery:** Masonry-style grid (2 cols mobile, 3 cols desktop), images with light border and aspect mix (tall/wide).
- **Navbar:** Fixed, blur; logo + “IBEX” + nav links + Admin + Book Now; on mobile: Book Now + hamburger and slide-down menu.

---

## 3. On-page text (copy)

Use this when you need to “read” the site to someone or document exact wording.

### Hero

- **Location badge:** “Islamabad, Pakistan”
- **Title:** “IBEX” / “SPORTS” / “COMPLEX” (three lines, gradient)
- **Subline:** “Where peak performance meets premium leisure. Experience the finest paddle, pickleball, and futsal in the heart of the capital.”
- **CTA:** “Book Court” (primary button)
- **Hours line:** “Open Daily” / “12 PM — 4 AM”
- **Scroll hint:** “Scroll”

### Marquee (ticker)

- **Text:** “Paddle · Pickleball · Futsal” (repeated in scrolling strip)

### Facilities — “Our Facilities”

- **Label:** “Choose Your Arena”
- **Heading:** “Our Facilities”
- **Intro:** “Whether you're a seasoned pro or picking up a racket for the first time, our world-class facilities are designed to elevate your game.”
- **Cards:**
  - **Paddle Tennis** (tag: “Trending”): “Fast-paced, social, and addictive. Our panoramic courts offer the best playing experience in Islamabad.”
  - **Pickleball** (tag: “New”): “The fastest growing sport in the world has found its home at Ibex. Perfect for all ages and skill levels.”
  - **Futsal** (tag: “Classic”): “High-intensity action on professional-grade turf. Bring your team and dominate the pitch.”

### Amenities — “Hive Cafe”

- **Label:** “The Social Hub”
- **Heading:** “Hive Cafe”
- **Intro:** “More than just a coffee shop. Hive is where the community gathers post-match. We serve specialist grade coffee, roasted to perfection, and a curated menu of healthy snacks and refreshing drinks.”
- **Feature 1 — “Specialist Grade”:** “Ethically sourced beans, expertly brewed by our master baristas.”
- **Feature 2 — “Post-Match Recovery”:** “Fresh juices and protein shakes to refuel your body after a session.”
- **Image caption (on image):** “Hive Cafe”

### Lifestyle

- **Label:** “Life at Ibex”
- **Heading:** “Lifestyle”
- **Gallery image titles (for reference):** Paddle Courts at Dusk, Sunset on the Pitch, The Social Scene, The Complex at Night, Courtside, Through the Net

### Membership — “Join the Ibex Community”

- **Label:** “Membership”
- **Heading:** “Join the Ibex Community”
- **Intro:** “Choose the way you play. From flexible hourly bookings to comprehensive monthly memberships.”
- **Plans:**

| Plan     | Price (PKR) | Hours/mo | Features (short) |
|----------|-------------|----------|-------------------|
| Bronze   | 52,500      | 15       | 15 court hours, Weekday access, Basic booking |
| Silver   | 76,800      | 24       | 24 court hours, Full week access, Priority booking |
| Gold     | 96,000      | 32       | 32 court hours, Full week access, Priority booking, Guest passes — **Most Popular** |
| Platinum | 112,000     | 40       | 40 court hours, Full week access, Priority booking, Guest passes, Hive Cafe perks |

- **CTA on cards:** “Get Started”
- **Terms heading:** “Terms & conditions”
- **Terms list:**
  - Valid for one month from date of purchase.
  - Slot booking must be confirmed at least 2 hours in advance on weekdays.
  - Slot booking must be confirmed at least 1 day in advance on weekends.
  - Unused hours carry forward upon membership renewal or extension.

### Get in Touch

- **Label:** “Contact”
- **Heading:** “Get In Touch”
- **Map card:** “Open in Google Maps”, “Main Entrance” + full address (see Links below)
- **Contact card:** “Book a Session” — “Ready to play? Give us a call or book online.” + phone + email
- **Hours card:** “Opening Hours” — Mon–Fri / Saturday / Sunday: “12:00 PM - 4:00 AM”
- **Social card:** “Follow the Action” — “Stay updated with tournaments and events.” + Instagram + Facebook

### Footer

- **Logo text:** “Ibex sports Complex”
- **Link:** “Sitemap” (to `/sitemap.xml`)
- **Copyright:** “© [year] Ibex sports Complex.”

### Navbar

- **Logo:** “IBEX”
- **Nav:** “Home”
- **Buttons:** “Admin”, “Book Now”

---

## 4. Links (socials, maps, booking)

Use these when you need to spell out URLs or hand them off.

### Primary actions

- **Book a court / Booking:** `/booking` (relative) — e.g. `https://yourdomain.com/booking`
- **Admin:** `/admin` (relative)

### Contact & location

- **Phone:** +923255429429  
- **Email:** ibexsportscomplex@gmail.com  
- **Address (full):** Ibex Sports Complex, Toot Stop Near Orchid Marquee, Wild Life Park Road, Main Islamabad Expy, Islamabad, 42700  

### Maps

- **Open in Google Maps (short):**  
  `https://maps.app.goo.gl/4SJSmPKZHhHhF3tMA?g_st=ic`
- **Embed (iframe):**  
  `https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3323.7842767507145!2d73.1439709!3d33.5849499!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x38dfed0d4fd052a7%3A0x36114e312659cf3a!2sIbex%20Sports%20Complex!5e0!3m2!1sen!2s!4v1768089209428!5m2!1sen!2s`

### Social

- **Instagram:**  
  `https://www.instagram.com/ibexsportscomplex?igsh=MXRhYnRhdGw0ZjlrcA==`
- **Facebook:**  
  `https://www.facebook.com/share/1E1fH2mPGT/?mibextid=wwXIfr`

### Other

- **Sitemap:** `/sitemap.xml` (relative)

---

## 5. How to use this for a “visual” explanation

- **Design system:** Use Section 2 to describe colours, type scale, spacing, and key components (buttons, cards, navbar, marquee, gallery).
- **Concept:** Use Section 1 to describe the one-page story, section order, alternating backgrounds, and mobile-first approach.
- **Copy:** Use Section 3 to read out or document every heading, label, paragraph, and button text in order.
- **Links:** Use Section 4 when you need to share phone, email, address, map links, social URLs, or booking/admin paths.

You can paste sections of this doc into briefs, handoffs, or scripts for demos and stakeholder walkthroughs.
