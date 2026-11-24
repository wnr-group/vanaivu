"use client";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { ChevronDown, Shuffle, RotateCcw } from "lucide-react";
import { useStudio } from "./store";
import {
  AVATAR_PRESETS, BODY_PRESETS, SKIN_TONES, HAIR_COLOURS, HAIR_STYLES, EYE_COLOURS, BROWS, DEFAULT_AVATAR, normalizeAvatar, type AvatarConfig,
} from "./engine/body";
import type { Measurements } from "./engine/human";
import { saveAvatarAction, deleteAvatarAction, type getStudioStateAction } from "@/app/actions/studio";
import { useUI } from "@/lib/ui-store";

type StudioData = Awaited<ReturnType<typeof getStudioStateAction>>;

const FEATURES: { name: string; mix: [number, number, number] }[] = [
  { name: "South Asian", mix: [0.15, 0.45, 0.4] }, { name: "East Asian", mix: [0, 1, 0] }, { name: "African", mix: [0.9, 0, 0.1] },
  { name: "European", mix: [0, 0, 1] }, { name: "Middle Eastern", mix: [0.1, 0.2, 0.7] }, { name: "Mixed", mix: [0.34, 0.33, 0.33] },
];

export function AvatarPanel({ data, refresh, measured }: { data: StudioData | null; refresh: () => void; measured: Measurements | null }) {
  const { avatar, setAvatar, loadAvatar, avatarId, avatarName } = useStudio();
  const [name, setName] = useState(avatarName);
  const [pending, start] = useTransition();
  const { toast } = useUI();
  useEffect(() => setName(avatarName), [avatarName]);
  const set = (p: Partial<AvatarConfig>) => setAvatar(p);

  return (
    <div className="pb-10">
      <Section title="Start from a model" open>
        <div className="grid grid-cols-3 gap-2">
          {AVATAR_PRESETS.map((p) => (
            <button key={p.name} onClick={() => loadAvatar(null, p.name, p.config)} className="group flex items-center gap-2 border border-ink/10 hover:border-ink px-2 py-2 text-left" aria-label={`Preset ${p.name}`}>
              <span className="w-7 h-7 rounded-full shrink-0" style={{ background: `radial-gradient(circle at 50% 42%, ${p.config.skinTone} 0 46%, ${p.config.hairColor} 48%)` }} />
              <span className="text-[12px] leading-tight">{p.name}<span className="block text-[10px] text-stone">{p.config.heightCm} cm</span></span>
            </button>
          ))}
        </div>
        <div className="flex gap-3 mt-3 text-[11px]">
          <button className="link-u flex items-center gap-1" onClick={() => loadAvatar(avatarId, name, randomAvatar())}><Shuffle size={12} /> Surprise me</button>
          <button className="link-u flex items-center gap-1 text-stone" onClick={() => loadAvatar(avatarId, name, DEFAULT_AVATAR)}><RotateCcw size={12} /> Reset</button>
        </div>
      </Section>

      <Section title="Skin tone" open>
        <div className="grid grid-cols-8 gap-2">
          {SKIN_TONES.map((t) => <Swatch key={t.hex} hex={t.hex} label={t.name} on={avatar.skinTone.toLowerCase() === t.hex.toLowerCase()} onClick={() => set({ skinTone: t.hex })} />)}
          <label className="w-8 h-8 rounded-full border border-dashed border-ink/40 flex items-center justify-center text-[10px] cursor-pointer relative overflow-hidden" title="Custom tone">
            +<input type="color" value={avatar.skinTone} onChange={(e) => set({ skinTone: e.target.value })} className="absolute inset-0 opacity-0 cursor-pointer" aria-label="Custom skin tone" />
          </label>
        </div>
        <p className="text-[11px] text-stone mt-2">Fair to deep, with any undertone. Pick <strong className="font-medium">+</strong> for an exact shade.</p>
      </Section>

      <Section title="Size & height" open>
        <p className="text-[11px] text-stone mb-3">Choose the size type closest to yours. Body shapes are fixed, natural proportions and can&apos;t be edited.</p>
        <div className="grid grid-cols-5 gap-1 mb-4">
          {(Object.keys(BODY_PRESETS) as AvatarConfig["bodyType"][]).map((b) => (
            <button key={b} onClick={() => set({ bodyType: b, ...BODY_PRESETS[b] })} aria-pressed={avatar.bodyType === b} className={`h-9 text-[11px] capitalize border ${avatar.bodyType === b ? "bg-ink text-paper border-ink" : "border-ink/15 hover:border-ink"}`}>{b === "PLUS" ? "Plus" : b.toLowerCase()}</button>
          ))}
        </div>
        <Slider label="Height" value={avatar.heightCm} min={145} max={190} step={1} fmt={(v) => `${v} cm`} onChange={(v) => set({ heightCm: v })} />
        {measured && (
          <p className="text-[11px] text-stone mt-1">Used for size suggestions: bust {Math.round(measured.bustCm)} · waist {Math.round(measured.waistCm)} · hip {Math.round(measured.hipCm)} cm</p>
        )}
      </Section>

      <Section title="Face & eyes">
        <p className="label">Features</p>
        <div className="grid grid-cols-3 gap-1 mb-4">
          {FEATURES.map((f) => <Chip key={f.name} on={Math.abs(avatar.african - f.mix[0]) < 0.01 && Math.abs(avatar.asian - f.mix[1]) < 0.01 && Math.abs(avatar.european - f.mix[2]) < 0.01} onClick={() => set({ african: f.mix[0], asian: f.mix[1], european: f.mix[2] })}>{f.name}</Chip>)}
        </div>
        <p className="label">Face shape</p>
        <div className="grid grid-cols-4 gap-1 mb-4">
          {(["oval", "round", "heart", "square"] as const).map((f) => <Chip key={f} on={avatar.headShape === f} onClick={() => set({ headShape: f })}>{f}</Chip>)}
        </div>
        <p className="label">Eye colour</p>
        <div className="flex flex-wrap gap-2">
          {EYE_COLOURS.map((e) => <Swatch key={e.key} hex={e.hex} label={e.key} on={avatar.eyeColor === e.key} onClick={() => set({ eyeColor: e.key })} small />)}
        </div>
      </Section>

      <Section title="Hair" open>
        <div className="grid grid-cols-3 gap-1">
          {HAIR_STYLES.map((h) => <Chip key={h.key} on={avatar.hairStyle === h.key} onClick={() => set({ hairStyle: h.key })}>{h.name}</Chip>)}
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          {HAIR_COLOURS.map((c) => <Swatch key={c.hex} hex={c.hex} label={c.name} on={avatar.hairColor.toLowerCase() === c.hex.toLowerCase()} onClick={() => set({ hairColor: c.hex })} small />)}
          <label className="w-7 h-7 rounded-full border border-dashed border-ink/40 flex items-center justify-center text-[10px] cursor-pointer relative overflow-hidden" title="Custom colour">
            +<input type="color" value={avatar.hairColor} onChange={(e) => set({ hairColor: e.target.value })} className="absolute inset-0 opacity-0 cursor-pointer" aria-label="Custom hair colour" />
          </label>
        </div>
      </Section>

      <Section title="Save to your account" open>
        {data?.signedIn ? (
          <>
            <div className="flex gap-2">
              <input value={name} onChange={(e) => setName(e.target.value)} className="field-box flex-1" aria-label="Avatar name" />
              <button disabled={pending} className="btn-dark px-4" onClick={() => start(async () => {
                const r = await saveAvatarAction({ id: avatarId ?? undefined, name, config: avatar });
                if (r.ok) { loadAvatar(r.id!, name, avatar); toast("Avatar saved"); refresh(); } else toast(r.error!, { tone: "error" });
              })}>Save</button>
            </div>
            {avatarId && <button className="text-[12px] link-u mt-2" onClick={() => loadAvatar(null, `${name} copy`, avatar)}>Save as a new avatar instead</button>}
            {data.avatars.length > 0 && (
              <ul className="mt-5 space-y-1">
                {data.avatars.map((a) => (
                  <li key={a.id} className={`flex items-center justify-between text-[13px] px-3 py-2 ${a.id === avatarId ? "bg-mist" : ""}`}>
                    <button onClick={() => loadAvatar(a.id, a.name, a.config as unknown as AvatarConfig)} className="flex items-center gap-2 text-left"><span className="w-4 h-4 rounded-full" style={{ background: a.config.skinTone }} />{a.name}{a.isPrimary && <span className="text-[10px] text-stone uppercase">Primary</span>}</button>
                    <span className="flex gap-3 text-[11px]">
                      {!a.isPrimary && <button className="link-u" onClick={() => start(async () => { await saveAvatarAction({ id: a.id, name: a.name, config: normalizeAvatar(a.config as unknown as AvatarConfig), primary: true }); refresh(); })}>Make primary</button>}
                      <button className="text-stone link-u" onClick={() => start(async () => { await deleteAvatarAction(a.id); if (a.id === avatarId) loadAvatar(null, "My avatar", avatar); refresh(); })}>Delete</button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : <p className="text-[13px] text-stone"><Link href="/account/login?next=/studio" className="link-u text-ink">Sign in</Link> to save avatars and looks. Your current avatar is kept on this device.</p>}
      </Section>
    </div>
  );
}

function randomAvatar(): AvatarConfig {
  const r = Math.random, pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  const types = Object.keys(BODY_PRESETS) as AvatarConfig["bodyType"][];
  const t = pick(types);
  const mix = [r(), r(), r()];
  return normalizeAvatar({
    ...DEFAULT_AVATAR, bodyType: t, ...BODY_PRESETS[t], heightCm: Math.round(152 + r() * 28),
    skinTone: pick(SKIN_TONES).hex, hairStyle: pick(HAIR_STYLES.slice(0, -1)).key, hairColor: pick(HAIR_COLOURS).hex,
    eyeColor: pick(EYE_COLOURS).key, eyebrows: pick(BROWS), african: mix[0], asian: mix[1], european: mix[2],
    headShape: pick(["oval", "round", "heart", "square"] as const), 
  });
}

function Section({ title, children, open = false }: { title: string; children: React.ReactNode; open?: boolean }) {
  const [o, setO] = useState(open);
  return (
    <div className="border-b border-line">
      <button onClick={() => setO(!o)} aria-expanded={o} className="w-full flex justify-between items-center px-6 py-4 text-[11px] uppercase tracking-[0.16em]">{title}<ChevronDown size={14} className={`transition-transform ${o ? "rotate-180" : ""}`} /></button>
      {o && <div className="px-6 pb-6">{children}</div>}
    </div>
  );
}

function Slider({ label, value, onChange, min = -1, max = 1, step = 0.01, left, right, fmt }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; left?: string; right?: string; fmt?: (v: number) => string }) {
  return (
    <label className="block mb-3">
      <span className="flex justify-between text-[12px]"><span>{label}</span><span className="tabular-nums text-stone">{fmt ? fmt(value) : `${Math.round(((value - min) / (max - min)) * 100)}%`}</span></span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-ink mt-1" />
      {(left || right) && <span className="flex justify-between text-[10px] text-stone -mt-0.5"><span>{left}</span><span>{right}</span></span>}
    </label>
  );
}

function Swatch({ hex, label, on, onClick, small }: { hex: string; label: string; on: boolean; onClick: () => void; small?: boolean }) {
  return <button onClick={onClick} title={label} aria-label={label} aria-pressed={on} className={`${small ? "w-7 h-7" : "w-8 h-8"} rounded-full ring-offset-2 ring-offset-paper transition-shadow ${on ? "ring-1 ring-ink" : "hover:ring-1 hover:ring-ink/30"}`} style={{ background: hex }} />;
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} aria-pressed={on} className={`h-9 px-2 text-[12px] capitalize border ${on ? "bg-ink text-paper border-ink" : "border-ink/15 hover:border-ink"}`}>{children}</button>;
}
