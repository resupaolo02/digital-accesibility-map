// Usage: npx tsx --env-file=.env.local scripts/seed-research.ts
// Desk research only (OSM, SM Prime, CMC, Wikipedia). Nothing here is field-verified,
// so every place stays `needs_assessment`. Idempotent: matches on name.
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

const CHECK = "On-site check (BP 344): ramp slope ≤1:12 and ≥1.2 m wide with handrails; step-free entrance; accessible toilet; PWD parking; tactile/curb-ramp path from the street.";

// [name, category, lat, lng, known facts (sourced), recommendations]
const places = [
  ["Calamba City Hall Complex", "government", 14.1940522, 121.1596881,
    "New City Hall Complex, Chipeco Ave. Ext. / Bacnotan Rd. Lists 3 floors and 4 lifts (Wikipedia, unverified). Next to The Plaza and the Rizal Monument.",
    `Confirm lifts are usable and signed. ${CHECK}`],
  ["Rizal Monument (Chipeco Ave. Ext.)", "tourist", 14.195874, 121.1597906,
    "The Plaza, a public park in front of City Hall (opened 2011, managed by the city). No accessibility info found online.",
    `Check park paths, surface and benches for wheelchair users. ${CHECK}`],
  ["Real Elementary School", "school", 14.1985631, 121.1490689,
    "National Highway, Brgy. Real. No facility or inclusion info found online.",
    `Ask the Schools Division Office about SPED/inclusion services. ${CHECK}`],
  ["Calamba Medical Center", "health", 14.2064252, 121.152536,
    "Private hospital on National Highway. Emergency room is in Tower 2, ground floor, open 24 hours (cmc.ph). Ramps and lifts not confirmed online.",
    `Confirm step-free route from drop-off to ER. ${CHECK}`],
  ["SM City Calamba", "tourist", 14.2030913, 121.1549949,
    "Mall on SM City Calamba Bypass Rd. SM Prime lists 335 car slots, a jeepney terminal and a bus terminal beside the mall. Number of PWD slots not listed. OSM marks Starbucks and 7-Eleven here as wheelchair-accessible.",
    `Count PWD parking slots and test the route from the terminals. ${CHECK}`],
  ["SM City Calamba Transport Terminal", "transport", 14.20295, 121.15715,
    "Bus and jeepney terminal beside SM City Calamba (OpenStreetMap, SM Prime).",
    `Check loading-area kerbs, shelter and a step-free path to the mall. ${CHECK}`],
  ["CityMall Calamba", "tourist", 14.19868, 121.1603,
    "Mall near Calamba City Hall (OpenStreetMap). No accessibility info found online.",
    CHECK],
  ["268 Mall", "tourist", 14.20451, 121.15384,
    "Mall on Real Road (OpenStreetMap, Wikipedia). No accessibility info found online.",
    CHECK],
  ["Calamba Trade Center", "public_space", 14.20771, 121.15639,
    "Public market area near the bus terminals (OpenStreetMap). No accessibility info found online.",
    `Check aisle width, floor surface and entrance steps. ${CHECK}`],
  ["Calamba Central Terminal", "transport", 14.20565, 121.15264,
    "Bus terminal on National Highway near Calamba Medical Center (OpenStreetMap).",
    `Check boarding height, waiting-area access and crossing to the hospital. ${CHECK}`],
] as const;

async function main() {
  for (const [name, category, lat, lng, existing, recommendations] of places) {
    const [row] = await sql`SELECT id FROM locations WHERE name = ${name}`;
    if (row) await sql`UPDATE locations SET existing = ${existing}, recommendations = ${recommendations}, source = '' WHERE id = ${row.id}`;
    else await sql`INSERT INTO locations (name, category, lat, lng, existing, recommendations, source)
      VALUES (${name}, ${category}, ${lat}, ${lng}, ${existing}, ${recommendations}, '')`;
    console.log(row ? "updated" : "added", name);
  }
}
main();
