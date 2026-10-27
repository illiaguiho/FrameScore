export interface PartRequirement {
  text: string; // what the store page says
  score: number | null; // performance score we need to match, null if unknown
  matched: string[]; // names of parts we recognised in the text
  guessed: boolean; // true when the score came from a rough rule, not a known part
}

export interface Requirements {
  gpu: PartRequirement;
  cpu: PartRequirement;
  ramGb: number | null;
  vramGb: number | null;
  storageGb: number | null;
  ssd: "required" | "recommended" | null;
  os: string | null;
  lines: { label: string; value: string }[];
}

export interface GameDetails {
  appid: number;
  name: string;
  headerImage: string;
  shortDescription: string;
  genres: string[];
  releaseDate: string | null;
  platforms: { windows: boolean; mac: boolean; linux: boolean };
  minimum: Requirements | null;
  recommended: Requirements | null;
}

export interface GameSearchResult {
  appid: number;
  name: string;
  image: string;
}

export interface Rig {
  gpuId: string | null;
  cpuId: string | null;
  ramGb: number;
  ssd: boolean;
}
