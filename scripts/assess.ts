// Usage: npx tsx --env-file=.env.local scripts/assess.ts
// Desk assessment of the seeded places. Inputs: OpenStreetMap objects within 130 m
// (crossings, footways, sidewalk tags, steps, ramps, kerbs, entrances, parking, shelters)
// plus a few public pages. Absence in OSM is reported as "not recorded", never as "absent".
// Status rule: `existing` = approach route AND building access documented; otherwise
// `needs_improvement` = something needed for step-free use is undocumented or missing.
// Everything must still be confirmed on site (docs/FIELDWORK.md).
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);
type S = "existing" | "needs_improvement";
type F = { type: string; status: S; note: string };
type A = { status: S; features: F[]; existing: string; barriers: string; recommendations: string };

const NOTE = "Desk assessment from OpenStreetMap and public pages; confirm on site.";
const GAP = "No ramp, lowered kerb or tactile paving is recorded in OpenStreetMap for this area.";
const ok = (type: string, note: string): F => ({ type, status: "existing", note });
const bad = (type: string, note: string): F => ({ type, status: "needs_improvement", note });
const cross = (n: number) => ok("crossing", `${n} marked pedestrian crossing${n > 1 ? "s" : ""} within 130 m. Kerb ramps and tactile paving not recorded.`);
const walk = (note: string) => ok("sidewalk", note);

const BUS: Pick<A, "barriers" | "recommendations"> = {
  barriers: `No shelter, bench, tactile paving or boarding-height data recorded. ${GAP}`,
  recommendations: "Add a shelter and bench, a lowered kerb or raised boarding area, tactile paving and a PWD-width clear path to the stop.",
};
const WC: Pick<A, "barriers" | "recommendations"> = {
  barriers: `No wheelchair-accessibility tag for this toilet. Door width, turning space and grab bars unknown. ${GAP}`,
  recommendations: "Provide an accessible cubicle (0.8 m door, 1.5 m turning circle, grab bars) and a step-free route with signage.",
};

const data: Record<string, A> = {
  "Calamba City Hall Complex": {
    status: "existing",
    features: [cross(12), walk("18 footway segments and a sidewalk-tagged road within 130 m."), ok("other", "4 lifts across 3 floors (Wikipedia).")],
    existing: `3-storey hall with 4 lifts. 12 marked crossings and 18 footway segments around the complex and The Plaza. ${NOTE}`,
    barriers: `Ramp slope, entrance steps, accessible toilets and PWD parking are not recorded. ${GAP}`,
    recommendations: "Check lift access from the main entrance, PWD parking next to the entrance, accessible toilets on each floor, and tactile guidance to the information desk.",
  },
  "Rizal Monument (Chipeco Ave. Ext.)": {
    status: "existing",
    features: [cross(3), walk("2 footways and a sidewalk-tagged road next to The Plaza.")],
    existing: `Public park in front of City Hall with 3 marked crossings and footways on its edge. ${NOTE}`,
    barriers: `Path surface, slope to the monument and seating are not recorded. ${GAP}`,
    recommendations: "Check that park paths are firm and at least 1.2 m wide, add rest benches with wheelchair space, and add curb ramps at each crossing.",
  },
  "Real Elementary School": {
    status: "needs_improvement",
    features: [cross(1), bad("sidewalk", "No sidewalk or footway recorded within 130 m of the school.")],
    existing: `1 marked crossing within 130 m on National Highway. ${NOTE}`,
    barriers: `No sidewalk or footway recorded near the school. Gate, classroom access and toilets unknown. ${GAP}`,
    recommendations: "Add a continuous sidewalk with curb ramps to the gate, an accessible entrance ramp, and an accessible toilet. Ask the Schools Division Office about inclusive-education services.",
  },
  "Calamba Medical Center": {
    status: "needs_improvement",
    features: [bad("crossing", "No marked crossing recorded within 130 m of the hospital."), bad("sidewalk", "No sidewalk or footway recorded within 130 m.")],
    existing: `Two towers (12 and 9 storeys), emergency room in Tower 2 ground floor, open 24 hours. 2 parking areas. ${NOTE}`,
    barriers: `No crossing, sidewalk or footway recorded around the hospital on National Highway. PWD parking and ER ramp unknown. ${GAP}`,
    recommendations: "Add a marked crossing and sidewalk with curb ramps on National Highway, PWD drop-off and parking at the ER, and confirm lifts in both towers.",
  },
  "SM City Calamba": {
    status: "existing",
    features: [cross(1), ok("entrance", "3 public entrances and 1 service entrance mapped. A cafe inside is tagged wheelchair-accessible.")],
    existing: `Mall with 3 public entrances and 4 parking areas. A cafe inside is tagged wheelchair-accessible (OpenStreetMap). Beside the SM bus and jeepney terminal. ${NOTE}`,
    barriers: `Number and location of PWD parking slots not listed by SM Prime. Ramps and tactile paving not recorded. ${GAP}`,
    recommendations: "Count PWD parking slots near each entrance, check the route from the terminals, and confirm accessible toilets on each level.",
  },
  "SM City Calamba Transport Terminal": {
    status: "needs_improvement",
    features: [walk("Sidewalk-tagged roads on both sides within 130 m."), bad("crossing", "No marked crossing recorded between the terminal and the mall.")],
    existing: `Bus and jeepney terminal beside SM City Calamba with 3 parking areas. ${NOTE}`,
    barriers: `No marked crossing recorded between the terminal and the mall. Boarding height and shelter unknown. ${GAP}`,
    recommendations: "Add a marked crossing with curb ramps between the terminal and the mall, level boarding, and a sheltered waiting area with wheelchair space.",
  },
  "CityMall Calamba": {
    status: "needs_improvement",
    features: [walk("A sidewalk-tagged road passes the mall."), bad("crossing", "No marked crossing recorded within 130 m.")],
    existing: `Mall with 1 parking area and a sidewalk-tagged road alongside. ${NOTE}`,
    barriers: `No marked crossing or footway recorded within 130 m. Entrances, PWD parking and toilets unknown. ${GAP}`,
    recommendations: "Check entrance ramps and PWD parking, and add a marked crossing with curb ramps on the approach road.",
  },
  "268 Mall": {
    status: "needs_improvement",
    features: [cross(2), walk("9 footways and sidewalk-tagged roads nearby."), bad("ramp", "5 steps mapped within 130 m and no ramp recorded.")],
    existing: `Mall on Real Road with 2 entrances (one tagged wheelchair-accessible), 4 parking areas, 2 marked crossings and 9 footways nearby. ${NOTE}`,
    barriers: `5 sets of steps are mapped within 130 m and no ramp is recorded beside them. PWD parking unknown. ${GAP}`,
    recommendations: "Add a ramp (1:12, handrails) beside every set of steps on the main approach, PWD parking at the entrance, and curb ramps at the crossings.",
  },
  "Calamba Trade Center": {
    status: "needs_improvement",
    features: [walk("A sidewalk-tagged road and 1 footway nearby."), bad("crossing", "No marked crossing recorded within 130 m.")],
    existing: `Public market with 3 entrances and 4 parking areas. ${NOTE}`,
    barriers: `No marked crossing recorded. Aisle width, floor surface and entrance steps unknown. ${GAP}`,
    recommendations: "Check entrance steps, keep aisles at least 0.9 m clear, add an accessible toilet and a marked crossing with curb ramps.",
  },
  "Calamba Central Terminal": {
    status: "needs_improvement",
    features: [bad("crossing", "No marked crossing recorded within 130 m."), bad("sidewalk", "No sidewalk or footway recorded within 130 m.")],
    existing: `Bus terminal on National Highway with 2 parking areas. ${NOTE}`,
    barriers: `No crossing, sidewalk or footway recorded around the terminal. Boarding height and waiting area unknown. ${GAP}`,
    recommendations: "Add a sidewalk and marked crossing with curb ramps, level boarding, and a sheltered waiting area with wheelchair space.",
  },
  "Toilet near 268 Mall": {
    status: "needs_improvement",
    features: [walk("8 footways and sidewalk-tagged roads nearby."), bad("ramp", "2 steps mapped nearby and no ramp recorded.")],
    existing: `Public toilet point. Sidewalks and footways run beside it. ${NOTE}`, ...WC,
  },
  "Toilet near SM City Calamba": {
    status: "needs_improvement",
    features: [cross(2), bad("ramp", "6 steps mapped within 130 m and no ramp recorded.")],
    existing: `Public toilet point with 2 marked crossings and 11 footways nearby. ${NOTE}`, ...WC,
  },
  "Toilet inside SM City Calamba (level 2)": {
    status: "needs_improvement",
    features: [bad("restroom", "Mall toilet on level 2; lift or ramp access is not recorded.")],
    existing: `Toilet on level 2 of SM City Calamba. ${NOTE}`, ...WC,
  },
  "Toilet on Chipeco Avenue": {
    status: "needs_improvement",
    features: [bad("crossing", "No marked crossing recorded within 130 m."), bad("sidewalk", "No sidewalk or footway recorded within 130 m.")],
    existing: `Public toilet point on Chipeco Avenue with 1 parking area nearby. ${NOTE}`, ...WC,
  },
  "Toilet near City Hall Plaza": {
    status: "needs_improvement",
    features: [cross(3), walk("3 footways and sidewalk-tagged roads nearby.")],
    existing: `Public toilet point with 3 marked crossings and 3 footways nearby. ${NOTE}`, ...WC,
  },
  "Bus stop: SM City Calamba": { status: "needs_improvement", features: [cross(3), bad("ramp", "1 set of steps mapped nearby and no ramp recorded.")], existing: `Bus stop with 3 marked crossings and 4 footways within 130 m. ${NOTE}`, ...BUS },
  "Bus stop: Rizal College of Laguna": { status: "needs_improvement", features: [cross(2), bad("sidewalk", "No sidewalk or footway recorded within 130 m.")], existing: `Bus stop with 2 marked crossings within 130 m. ${NOTE}`, ...BUS },
  "Bus stop: Lawa": { status: "needs_improvement", features: [cross(1), walk("Sidewalk-tagged road on both sides.")], existing: `Bus stop with 1 marked crossing and sidewalks on both sides. ${NOTE}`, ...BUS },
  "Bus stop: St. John and Paul Colleges": { status: "needs_improvement", features: [walk("Sidewalk-tagged roads on both sides."), bad("crossing", "No marked crossing recorded within 130 m.")], existing: `Bus stop with sidewalks on both sides. A building nearby has a wheelchair-accessible entrance (OpenStreetMap). ${NOTE}`, ...BUS },
  "Bus stop: CityMall Calamba": { status: "needs_improvement", features: [walk("Sidewalk-tagged road on both sides."), bad("crossing", "No marked crossing recorded within 130 m.")], existing: `PUV stop by CityMall with sidewalks on both sides. ${NOTE}`, ...BUS },
  "Bus stop: Chipeco Avenue": { status: "needs_improvement", features: [walk("Sidewalk-tagged roads on both sides."), bad("crossing", "No marked crossing recorded within 130 m.")], existing: `Bus stop with sidewalks on both sides and a wheelchair-accessible building entrance nearby (OpenStreetMap). ${NOTE}`, ...BUS },
  "Bus stop: Letran Calamba": { status: "needs_improvement", features: [cross(3), walk("Sidewalk-tagged roads and 1 footway nearby.")], existing: `Bus stop with 3 marked crossings, sidewalks and a footway within 130 m. ${NOTE}`, ...BUS },
};

async function main() {
  for (const [name, a] of Object.entries(data)) {
    const r = await sql`UPDATE locations SET status = ${a.status}, features = ${JSON.stringify(a.features)}::jsonb,
      existing = ${a.existing}, barriers = ${a.barriers}, recommendations = ${a.recommendations}, source = '', updated_by = 'desk-assessment', updated_at = now()
      WHERE name = ${name} RETURNING id`;
    console.log(r.length ? "ok" : "MISSING", name);
  }
}
main();
