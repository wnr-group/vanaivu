const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
export const formatINR = (n: number) => inr.format(n);
export const discountPct = (price: number, compare?: number | null) =>
  compare && compare > price ? Math.round(((compare - price) / compare) * 100) : 0;
export const parseJSON = <T,>(s: string | null | undefined, fallback: T): T => {
  try { return s ? (JSON.parse(s) as T) : fallback; } catch { return fallback; }
};
export const imgUrl = (url: string, w = 800) =>
  url.includes("images.unsplash.com") ? `${url}?w=${w}&q=75&auto=format&fit=crop` : url;
