import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { randomBytes } from "crypto";

/**
 * Photo try-on provider abstraction. Jobs are asynchronous: start() returns a job id,
 * poll() reports progress and finally an image URL or data. Add providers by implementing TryOnProvider.
 */
export interface TryOnProvider {
  id: string;
  label: string;
  start(input: { personImage: string; garmentImageUrl: string; category: "tops" | "bottoms" | "one-pieces" }): Promise<{ jobId: string }>;
  poll(jobId: string): Promise<{ status: "processing" | "succeeded" | "failed"; imageUrl?: string; error?: string }>;
}

/** FASHN virtual try-on API (https://fashn.ai). Requires TRYON_API_KEY. */
class FashnProvider implements TryOnProvider {
  id = "fashn";
  label = "FASHN";
  private base = process.env.TRYON_API_URL ?? "https://api.fashn.ai/v1";
  constructor(private key: string) {}
  private headers() { return { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" }; }
  async start({ personImage, garmentImageUrl, category }: { personImage: string; garmentImageUrl: string; category: string }) {
    const res = await fetch(`${this.base}/run`, {
      method: "POST", headers: this.headers(),
      body: JSON.stringify({ model_name: process.env.TRYON_MODEL ?? "tryon-v1.6", inputs: { model_image: personImage, garment_image: garmentImageUrl, category } }),
    });
    const json = (await res.json().catch(() => ({}))) as { id?: string; error?: string | { message?: string } };
    if (!res.ok || !json.id) throw new Error(typeof json.error === "string" ? json.error : json.error?.message ?? `Provider error (${res.status})`);
    return { jobId: json.id };
  }
  async poll(jobId: string) {
    const res = await fetch(`${this.base}/status/${encodeURIComponent(jobId)}`, { headers: this.headers() });
    const json = (await res.json().catch(() => ({}))) as { status?: string; output?: string[]; error?: string | { message?: string } | null };
    if (!res.ok) return { status: "failed" as const, error: `Provider error (${res.status})` };
    if (json.status === "completed" && json.output?.[0]) return { status: "succeeded" as const, imageUrl: json.output[0] };
    if (json.status === "failed" || json.status === "canceled") return { status: "failed" as const, error: typeof json.error === "string" ? json.error : json.error?.message ?? "Generation failed" };
    return { status: "processing" as const };
  }
}

export function getTryOnProvider(): TryOnProvider | null {
  const key = process.env.TRYON_API_KEY;
  const name = (process.env.TRYON_PROVIDER || "fashn").toLowerCase();
  if (!key) return null;
  if (name === "fashn") return new FashnProvider(key);
  return null;
}

// ── private storage (outside /public; served only through authenticated routes) ──
const ROOT = path.join(process.cwd(), "storage", "tryon");

export async function savePrivate(buf: Buffer, ext: "jpg" | "png" | "webp") {
  await fs.mkdir(ROOT, { recursive: true });
  const key = `${randomBytes(16).toString("hex")}.${ext}`;
  await fs.writeFile(path.join(ROOT, key), buf);
  return key;
}
export async function readPrivate(key: string) {
  if (!/^[a-f0-9]{32}\.(jpg|png|webp)$/.test(key)) throw new Error("bad key");
  return fs.readFile(path.join(ROOT, key));
}
export async function deletePrivate(key: string) {
  if (!/^[a-f0-9]{32}\.(jpg|png|webp)$/.test(key)) return;
  await fs.rm(path.join(ROOT, key), { force: true });
}
export const categoryFor = (garmentType: string) =>
  garmentType === "JEANS" || garmentType === "TROUSERS" || garmentType === "SKIRT" ? "bottoms" as const
  : garmentType === "DRESS" || garmentType === "COORD" || garmentType === "ETHNIC" || garmentType === "ACTIVE" ? "one-pieces" as const : "tops" as const;
