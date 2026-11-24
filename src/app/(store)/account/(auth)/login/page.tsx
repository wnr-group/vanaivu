import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AuthShell, LoginForm } from "@/components/account/AuthForms";
import { GoogleButton } from "@/components/account/GoogleButton";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  if (await getSession()) redirect(next ?? "/account");
  return (
    <AuthShell title="Welcome back" sub="Sign in to your wardrobe, saved looks and orders." image="https://images.unsplash.com/photo-1524504388940-b1c1722653e1">
      {error && <p className="text-[13px] text-terracotta mb-6" role="alert">Google sign-in could not be completed. Please try again.</p>}
      <GoogleButton next={next} />
      <LoginForm next={next} />
    </AuthShell>
  );
}
