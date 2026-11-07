# Barangay Real Access – Digital Accessibility Map

Web app mapping accessibility (ramps, sidewalks, crossings, restrooms, entrances, signage, transport, health, schools, government) in Brgy. Real, Calamba City, Laguna, PH, for physically disabled travelers. Requirements: client PDF "DIGITAL ACCESSIBILITY MAP" (Oct 27, 2026).

## Stack
- Next.js (App Router, TypeScript), Tailwind, Leaflet + OpenStreetMap (no API key)
- Neon Postgres (`@neondatabase/serverless`, plain SQL, no ORM), Vercel Blob for photos
- Auth: named editor accounts, hashed passwords in DB, signed httpOnly cookie (`jose`); public read, authenticated write
- Deploy: Vercel Hobby (free tier). Keep within Hobby limits.

## Domain
- Status (marker color AND shape/icon, never color alone): `existing` green, `needs_improvement` orange, `proposed` blue, `needs_assessment` gray
- Location fields: name, category, lat/lng, photos, existing features, barriers/missing facilities, recommended improvements, source
- Researched seed pins start as `needs_assessment` with a `source` note until fieldwork verifies them

## Conventions
- Use ponytail and caveman skills: reuse native platform/stdlib features, minimal dependencies, terse output.
- Mobile-first; must work at 375px and desktop. Provide a list view alternative to the map. Keyboard + screen-reader friendly (WCAG 2.1 AA).
- All write endpoints must verify session; never commit secrets or credentials (use Vercel env vars / `.env.local`).
