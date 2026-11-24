"use client";
import { useActionState } from "react";
import { updateProfileAction, saveMeasurementsAction } from "@/app/actions/account";

const SIZES = ["", "XS", "S", "M", "L", "XL", "XXL"];
const STYLES = ["Minimal", "Classic", "Romantic", "Contemporary", "Street", "Boho", "Traditional"];

type P = { name: string; phone: string; preferredTopSize: string; preferredBottomSize: string; preferredDressSize: string; fitPreference: string; favouriteCategories: string[]; stylePreferences: string[] };

export function ProfileForm({ initial, categories }: { initial: P; categories: { slug: string; name: string }[] }) {
  const [state, action, pending] = useActionState(updateProfileAction, undefined);
  return (
    <form action={action} className="mt-8 space-y-8">
      <div className="grid sm:grid-cols-2 gap-6">
        <div><label className="label" htmlFor="name">Name</label><input id="name" name="name" defaultValue={initial.name} required className="field" /></div>
        <div><label className="label" htmlFor="phone">Mobile</label><input id="phone" name="phone" defaultValue={initial.phone} inputMode="numeric" className="field" /></div>
      </div>
      <fieldset>
        <legend className="label">Preferred sizes</legend>
        <div className="grid grid-cols-3 gap-4 mt-2">
          {([["preferredTopSize", "Tops"], ["preferredBottomSize", "Bottoms"], ["preferredDressSize", "Dresses"]] as const).map(([k, l]) => (
            <label key={k} className="text-[13px]">{l}<select name={k} defaultValue={initial[k]} className="field-box mt-1">{SIZES.map((s) => <option key={s} value={s}>{s || "–"}</option>)}</select></label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="label">Fit preference</legend>
        <div className="flex gap-2 mt-2">
          {["SLIM", "REGULAR", "RELAXED"].map((f) => (
            <label key={f} className="cursor-pointer"><input type="radio" name="fitPreference" value={f} defaultChecked={initial.fitPreference === f} className="peer sr-only" /><span className="block px-4 h-10 leading-10 border border-ink/15 text-[13px] peer-checked:bg-ink peer-checked:text-paper capitalize">{f.toLowerCase()}</span></label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="label">Favourite categories</legend>
        <div className="flex flex-wrap gap-2 mt-2">
          {categories.map((c) => (
            <label key={c.slug} className="cursor-pointer"><input type="checkbox" name="favouriteCategories" value={c.slug} defaultChecked={initial.favouriteCategories.includes(c.slug)} className="peer sr-only" /><span className="block px-4 h-9 leading-9 border border-ink/15 text-[13px] peer-checked:bg-ink peer-checked:text-paper">{c.name}</span></label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="label">Style preferences</legend>
        <div className="flex flex-wrap gap-2 mt-2">
          {STYLES.map((s) => (
            <label key={s} className="cursor-pointer"><input type="checkbox" name="stylePreferences" value={s} defaultChecked={initial.stylePreferences.includes(s)} className="peer sr-only" /><span className="block px-4 h-9 leading-9 border border-ink/15 text-[13px] peer-checked:bg-ink peer-checked:text-paper">{s}</span></label>
          ))}
        </div>
      </fieldset>
      <div className="flex items-center gap-4">
        <button disabled={pending} className="btn-dark">{pending ? "Saving…" : "Save profile"}</button>
        {state?.message && <p className="text-[13px] text-stone" role="status">{state.message}</p>}
        {state?.error && <p className="text-[13px] text-terracotta" role="alert">{state.error}</p>}
      </div>
    </form>
  );
}

const FIELDS = [["heightCm", "Height", 120, 220], ["bustCm", "Bust", 60, 160], ["waistCm", "Waist", 45, 160], ["hipCm", "Hip", 65, 180], ["shoulderCm", "Shoulder width", 28, 60]] as const;

export function MeasurementsForm({ initial }: { initial: Record<string, number> | null }) {
  const [state, action, pending] = useActionState(saveMeasurementsAction, undefined);
  return (
    <form action={action} className="mt-8">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-5">
        {FIELDS.map(([k, l, min, max]) => (
          <div key={k}><label className="label" htmlFor={k}>{l} (cm)</label><input id={k} name={k} type="number" step="0.5" min={min} max={max} required defaultValue={initial?.[k] ?? ""} className="field" /></div>
        ))}
      </div>
      <div className="flex items-center gap-4 mt-8">
        <button disabled={pending} className="btn-dark">{pending ? "Saving…" : "Save measurements"}</button>
        {state?.message && <p className="text-[13px] text-stone" role="status">{state.message}</p>}
        {state?.error && <p className="text-[13px] text-terracotta" role="alert">{state.error}</p>}
      </div>
    </form>
  );
}
