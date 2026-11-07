export const CATEGORIES = {
  tourist: "Tourist spot / establishment",
  ramp: "PWD ramp",
  sidewalk: "Sidewalk",
  crossing: "Pedestrian crossing",
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

export const STATUSES = {
  existing: { label: "Existing accessibility feature", color: "#15803d", glyph: "✓", radius: "50%" },
  needs_improvement: { label: "Needs improvement", color: "#c2410c", glyph: "!", radius: "50% 50% 50% 0" },
  proposed: { label: "Proposed infrastructure", color: "#1d4ed8", glyph: "+", radius: "4px" },
  needs_assessment: { label: "Needs further assessment", color: "#4b5563", glyph: "?", radius: "50% 0 50% 0" },
} as const;

export type Category = keyof typeof CATEGORIES;
export type Status = keyof typeof STATUSES;
export type Photo = { url: string; caption?: string };

export type Loc = {
  id: number;
  name: string;
  category: Category;
  status: Status;
  lat: number;
  lng: number;
  existing: string;
  barriers: string;
  recommendations: string;
  source: string;
  photos: Photo[];
  updated_by: string | null;
  updated_at: string;
};
