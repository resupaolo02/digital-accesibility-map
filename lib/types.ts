export const CATEGORIES = {
  tourist: "Tourist spot / establishment",
  street: "Street / road",
  sidewalk: "Sidewalk",
  crossing: "Pedestrian crossing",
  ramp: "PWD ramp",
  restroom: "Accessible restroom",
  entrance: "Accessible entrance",
  signage: "Signage",
  transport: "Public transport / stop",
  health: "Healthcare facility",
  school: "School",
  government: "Government facility",
  public_space: "Public space / infrastructure",
  other: "Other",
} as const;

// Categories drawn as lines on the map (editor clicks points along the route).
export const LINE_CATEGORIES: readonly string[] = ["street", "sidewalk", "crossing"];

// Accessibility features checked per location (a building can have several).
export const FEATURES = {
  ramp: "PWD ramp",
  entrance: "Accessible entrance",
  restroom: "Accessible restroom",
  sidewalk: "Sidewalk / curb ramp",
  crossing: "Pedestrian crossing",
  signage: "Signage",
  parking: "PWD parking",
  other: "Other feature",
} as const;

export const STATUSES = {
  existing: { label: "Existing accessibility feature", color: "#15803d", glyph: "✓", radius: "50%", dash: undefined },
  needs_improvement: { label: "Needs improvement", color: "#c2410c", glyph: "!", radius: "50% 50% 50% 8px", dash: "10 6" },
  proposed: { label: "Proposed infrastructure", color: "#1d4ed8", glyph: "+", radius: "8px", dash: "2 8" },
  needs_assessment: { label: "Needs further assessment", color: "#4b5563", glyph: "?", radius: "50% 8px 50% 8px", dash: "14 4 2 4" },
} as const;

export type Category = keyof typeof CATEGORIES;
export type FeatureType = keyof typeof FEATURES;
export type Status = keyof typeof STATUSES;
export type Photo = { url: string; caption?: string };
export type Feature = { type: FeatureType; status: Status; note: string };
export type LatLng = [number, number];

export type Loc = {
  id: number;
  name: string;
  category: Category;
  status: Status;
  lat: number;
  lng: number;
  path: LatLng[] | null;
  features: Feature[];
  existing: string;
  barriers: string;
  recommendations: string;
  source: string;
  photos: Photo[];
  updated_by: string | null;
  updated_at: string;
};
