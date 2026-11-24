export type Body = { heightCm: number; bustCm: number; waistCm: number; hipCm: number; shoulderCm: number };
export type GarmentSizes = Record<string, { bust: number; waist: number; hip: number; length: number }>;

const ORDER = ["XS", "S", "M", "L", "XL", "XXL"];

/**
 * Indicative size suggestion: the smallest size whose garment measurements leave
 * at least 2 cm of ease over the body at bust, waist and hip.
 * This is guidance from tabulated garment measurements, not a physical fit simulation.
 */
export function suggestSize(body: Body, sizes: GarmentSizes, fit: string) {
  const keys = ORDER.filter((s) => sizes[s]);
  if (!keys.length) return null;
  const minEase = 2;
  const rows = keys.map((s) => {
    const g = sizes[s];
    return { size: s, bust: g.bust - body.bustCm, waist: g.waist - body.waistCm, hip: g.hip - body.hipCm };
  });
  const ok = rows.find((r) => r.bust >= minEase && r.waist >= minEase && r.hip >= minEase) ?? rows[rows.length - 1];
  const tight = Math.min(ok.bust, ok.waist, ok.hip);
  const where = ok.bust === tight ? "bust" : ok.waist === tight ? "waist" : "hip";
  const note =
    tight < minEase ? `may feel snug at the ${where} even in our largest size`
    : tight < 5 ? `close fit at the ${where}${fit === "Slim" ? ", as designed" : ""}`
    : tight > 14 ? `${fit.toLowerCase()} cut gives a roomy fit`
    : `${fit.toLowerCase()} fit with comfortable ease`;
  return { size: ok.size, note, ease: rows };
}
