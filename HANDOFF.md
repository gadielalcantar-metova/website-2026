# Services Page Handoff — Metova Website 2026

## What's Done

The **Services page** (`services.html`) is built and polished. Here's where it stands:

### Structure (top to bottom)
1. **Nav** — Exact copy from homepage, `active` class on Services link
2. **Compact Hero** — "Our Services" pill, headline "Your Direct Line to Senior Engineering", subtitle. No stats row (removed per feedback)
3. **6 Service Detail Rows** — Editorial layout inspired by mcshannock.design/services. Text left, image right. Each row has:
   - Numbered label `(01)` through `(06)` in lime
   - Heading, description paragraph, 4 deliverable bullets
   - Dual CTAs: "Learn more" | "Start a project ->"
   - Image with gradient overlay + green blend
   - Services: AI Product Development, Custom Software Engineering, UX/UI Design, Digital Consulting & Strategy, Nearshore Talent Solutions, IoT & Emerging Tech
4. **Marquee Strip** — Scrolling text reads "Let's work together" (changed from "Services Thoughtfully-shaped")
5. **CTA Section** — "Let's Build Something Intelligent" with halo canvas (same as homepage)
6. **Footer** — Exact copy from homepage

### Design System
- Dark theme: `#0F0F0F` base, brand green `#8BAD41`, accent lime `#BAEB42`, navy `#001A33`
- Font: Anek Telugu (Google Fonts)
- Tailwind via CDN with custom config in `<script>` tag
- Reuses homepage CSS classes: `.fade-up`, `.card-hover`, `.nav-pill`, `.nav-pill-link`, `.svc-detail-link`, `.marquee-xl-track`, `.btn-glow`, `.btn-lime`
- Three.js halo canvas in CTA/footer area

### Files Modified
- `services.html` — the page itself
- `styles.css` — added `.nav-pill-link.active` and `.svc-detail-link:hover` styles
- `serve.mjs` — added route `/services` -> `services.html` (plus routes for all other planned pages)
- `index.html` — nav/footer links updated from anchors to real page URLs (`/services`, `/work`, `/about`, `/insights`, `/contact`)
- `second-hero.html` — nav/footer links updated to match

### Inspiration
- **mcshannock.design/services** — editorial text+image rows, dual CTAs, marquee CTA strip
- **Homepage service rows** — numbered pattern, lime accents, deliverable bullets

---

## What's Next

Per the plan (`~/.claude/plans/deep-nibbling-snowglobe.md`), the build order is:

1. ~~Services~~ (done)
2. **Work** (`work.html`) — case studies/portfolio page
3. **About** (`about.html`) — company story, team, values
4. **Contact** (`contact.html`) — form + office info
5. **Insights** (`insights.html`) — blog/content hub

### For each new page:
- Invoke `frontend-design` and `ui-ux-pro-max` skills before coding
- Use mcshannock.design as structural inspiration, Metova's dark theme for styling
- Copy nav (with correct `active` class) and footer exactly from homepage
- Include halo canvas in CTA/footer section
- Screenshot via `node screenshot.mjs http://localhost:3000/[page]` and verify
- Dev server: `node serve.mjs` (port 3000, routes already added)

### Key User Preferences
- Boss likes mcshannock.design — match its patterns (editorial rows, clean structure)
- AI messaging present but NOT dominant
- Content sourced from metova.com but rewritten, not copied
- One page at a time — nail it before moving on
- Nav and footer must be identical across all pages (copy from homepage)
- Always serve on localhost, never screenshot file:// URLs
