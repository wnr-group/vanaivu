import type { Metadata } from "next";
import { AuthShell, ResetForm } from "@/components/account/AuthForms";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <AuthShell title="New password" sub="Choose a new password for your VESTRA account." image="https://images.unsplash.com/photo-1488426862026-3ee34a7d66df">
      <ResetForm token={token} />
    </AuthShell>
  );
}
