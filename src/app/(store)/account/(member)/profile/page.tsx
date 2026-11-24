import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseJSON } from "@/lib/format";
import { ProfileForm, MeasurementsForm } from "@/components/account/ProfileForms";

export const metadata: Metadata = { title: "Profile & measurements" };

export default async function ProfilePage() {
  const s = await requireUser();
  const [user, cats, m] = await Promise.all([
    db.user.findUnique({ where: { id: s.userId }, include: { profile: true } }),
    db.productCategory.findMany({ orderBy: { sortOrder: "asc" } }),
    db.customerMeasurement.findFirst({ where: { userId: s.userId }, orderBy: { createdAt: "desc" } }),
  ]);
  const p = user?.profile;
  return (
    <div className="space-y-16 max-w-3xl">
      <section>
        <h1 className="font-serif text-4xl lg:text-5xl">Profile</h1>
        <p className="text-stone text-[14px] mt-2">{user?.email}</p>
        <ProfileForm
          initial={{
            name: user?.name ?? "", phone: p?.phone ?? "", preferredTopSize: p?.preferredTopSize ?? "", preferredBottomSize: p?.preferredBottomSize ?? "",
            preferredDressSize: p?.preferredDressSize ?? "", fitPreference: p?.fitPreference ?? "",
            favouriteCategories: parseJSON<string[]>(p?.favouriteCategories, []), stylePreferences: parseJSON<string[]>(p?.stylePreferences, []),
          }}
          categories={cats.map((c) => ({ slug: c.slug, name: c.name }))}
        />
      </section>
      <section id="measurements" className="scroll-mt-40">
        <h2 className="font-serif text-3xl">Body measurements</h2>
        <p className="text-stone text-[14px] mt-2 max-w-xl">Used for size suggestions and to shape your Studio avatar. Measurements are private to your account. Size suggestions are guidance, not a guarantee of fit.</p>
        <MeasurementsForm initial={m ? { heightCm: m.heightCm, bustCm: m.bustCm, waistCm: m.waistCm, hipCm: m.hipCm, shoulderCm: m.shoulderCm } : null} />
      </section>
    </div>
  );
}
