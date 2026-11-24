import { requireUser } from "@/lib/auth";
import { AccountNav } from "@/components/account/AccountNav";

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const s = await requireUser();
  return (
    <div className="container-x pt-10 lg:pt-14 grid lg:grid-cols-[220px_1fr] gap-10 lg:gap-16">
      <aside>
        <p className="eyebrow text-stone">My Style</p>
        <p className="font-serif text-3xl mt-2 mb-8">{s.name?.split(" ")[0] ?? "Hello"}</p>
        <AccountNav isAdmin={s.role === "ADMIN"} />
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
