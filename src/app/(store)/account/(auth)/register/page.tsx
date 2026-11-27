import type { Metadata } from "next";
import { AuthShell, RegisterForm } from "@/components/account/AuthForms";
import { GoogleButton } from "@/components/account/GoogleButton";

export const metadata: Metadata = { title: "Create account" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <AuthShell title="Join VANAIVU" sub="Save avatars and outfits, track orders and check out faster." image="https://images.unsplash.com/photo-1534528741775-53994a69daeb">
      <GoogleButton next={next} />
      <RegisterForm next={next} />
    </AuthShell>
  );
}
