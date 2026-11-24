import type { Metadata } from "next";
import { AuthShell, ForgotForm } from "@/components/account/AuthForms";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPage() {
  return (
    <AuthShell title="Reset password" sub="Enter your email and we'll send you a link to choose a new password." image="https://images.unsplash.com/photo-1488426862026-3ee34a7d66df">
      <ForgotForm />
    </AuthShell>
  );
}
