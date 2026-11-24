import { db } from "@/lib/db";
import { Card } from "@/components/admin/AdminNav";
import { saveCampaignAction, saveStoryAction, saveCategoryAction } from "@/app/actions/admin";

export const metadata = { title: "Content" };

export default async function AdminContent() {
  const [campaigns, stories, cats] = await Promise.all([
    db.campaign.findMany({ orderBy: [{ placement: "asc" }, { sortOrder: "asc" }] }),
    db.editorialStory.findMany({ orderBy: { createdAt: "asc" } }),
    db.productCategory.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  const campaignForm = (c?: (typeof campaigns)[number]) => (
    <form action={saveCampaignAction} className="grid sm:grid-cols-4 gap-2 py-4 border-b border-line last:border-0">
      <input type="hidden" name="id" value={c?.id ?? ""} />
      <select name="placement" defaultValue={c?.placement ?? "ANNOUNCEMENT"} className="field-box bg-white">{["HERO", "BANNER", "ANNOUNCEMENT"].map((p) => <option key={p}>{p}</option>)}</select>
      <input name="title" defaultValue={c?.title} placeholder="Title / message" className="field-box bg-white sm:col-span-3" />
      <input name="subtitle" defaultValue={c?.subtitle ?? ""} placeholder="Eyebrow / subtitle" className="field-box bg-white" />
      <input name="body" defaultValue={c?.body ?? ""} placeholder="Body copy" className="field-box bg-white sm:col-span-3" />
      <input name="image" defaultValue={c?.image ?? ""} placeholder="Image URL" className="field-box bg-white sm:col-span-2" />
      <input name="ctaLabel" defaultValue={c?.ctaLabel ?? ""} placeholder="CTA label" className="field-box bg-white" />
      <input name="ctaHref" defaultValue={c?.ctaHref ?? ""} placeholder="CTA link" className="field-box bg-white" />
      <div className="flex items-center gap-4 sm:col-span-4 text-[13px]">
        <label className="flex items-center gap-2"><input type="checkbox" name="active" defaultChecked={c ? c.active : true} className="accent-ink" />Active</label>
        <label className="flex items-center gap-2">Order <input name="sortOrder" type="number" defaultValue={c?.sortOrder ?? 0} className="field-box h-8 w-20 bg-white" /></label>
        <button className="btn-dark h-9 px-4">{c ? "Save" : "Add"}</button>
        {c && <button name="op" value="delete" className="underline text-terracotta text-[12px]">Delete</button>}
      </div>
    </form>
  );
  const storyForm = (s?: (typeof stories)[number]) => (
    <form action={saveStoryAction} className="grid sm:grid-cols-4 gap-2 py-4 border-b border-line last:border-0">
      <input type="hidden" name="id" value={s?.id ?? ""} />
      <input name="title" defaultValue={s?.title} placeholder="Title" className="field-box bg-white sm:col-span-2" />
      <input name="author" defaultValue={s?.author} placeholder="Author" className="field-box bg-white" />
      <input name="readMins" type="number" defaultValue={s?.readMins ?? 4} className="field-box bg-white" aria-label="Read minutes" />
      <input name="excerpt" defaultValue={s?.excerpt} placeholder="Excerpt" className="field-box bg-white sm:col-span-2" />
      <input name="image" defaultValue={s?.image} placeholder="Image URL" className="field-box bg-white sm:col-span-2" />
      <textarea name="body" defaultValue={s?.body} rows={4} placeholder="Body (blank lines separate paragraphs)" className="field-box bg-white h-auto py-2 sm:col-span-4" />
      <div className="flex items-center gap-4 text-[13px]">
        <label className="flex items-center gap-2"><input type="checkbox" name="published" defaultChecked={s ? s.published : true} className="accent-ink" />Published</label>
        <button className="btn-dark h-9 px-4">{s ? "Save" : "Add story"}</button>
        {s && <button name="op" value="delete" className="underline text-terracotta text-[12px]">Delete</button>}
      </div>
    </form>
  );
  return (
    <div className="max-w-5xl space-y-6">
      <h1 className="font-serif text-4xl">Content</h1>
      <Card title="Homepage hero, banners & announcements">{campaigns.map((c) => <div key={c.id}>{campaignForm(c)}</div>)}<p className="label mt-4">New</p>{campaignForm()}</Card>
      <Card title="Navigation categories">
        {cats.map((c) => (
          <form key={c.id} action={saveCategoryAction} className="grid sm:grid-cols-[1fr_2fr_2fr_80px_auto] gap-2 py-2">
            <input type="hidden" name="id" value={c.id} />
            <input name="name" defaultValue={c.name} className="field-box bg-white" aria-label="Name" />
            <input name="description" defaultValue={c.description ?? ""} className="field-box bg-white" aria-label="Description" />
            <input name="image" defaultValue={c.image ?? ""} className="field-box bg-white" aria-label="Image URL" />
            <input name="sortOrder" type="number" defaultValue={c.sortOrder} className="field-box bg-white" aria-label="Order" />
            <button className="btn-outline h-11 px-4">Save</button>
          </form>
        ))}
      </Card>
      <Card title="Editorial stories">{stories.map((s) => <div key={s.id}>{storyForm(s)}</div>)}<p className="label mt-4">New story</p>{storyForm()}</Card>
    </div>
  );
}
