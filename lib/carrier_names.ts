export const CARRIER_NAMES: Record<string, string> = {
  ural: "Ural",
  abt: "ABT",
  atc: "ATC",
  cel: "CEL",
  guoo: "Guoo",
  iml: "IML",
  leader: "Leader",
  oyx: "OYX",
  rets: "Rets",
  tanais: "Tanais",
  uni: "UNI",
  xy: "XY",
  zto: "ZTO",
  chinapost: "China Post",
};

export function carrierName(id: string): string {
  if (!id) return "";
  const k = String(id).toLowerCase();
  return CARRIER_NAMES[k] || id.toUpperCase();
}
