"use client";
import Link from "next/link";
import { useActionState } from "react";
import { loginAction, registerAction, requestResetAction, resetPasswordAction } from "@/app/actions/auth";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(loginAction, undefined);
  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="next" value={next ?? ""} />
      <div><label className="label" htmlFor="email">Email</label><input id="email" name="email" type="email" required autoComplete="email" className="field" /></div>
      <div><label className="label" htmlFor="password">Password</label><input id="password" name="password" type="password" required autoComplete="current-password" className="field" /></div>
      {state?.error && <p className="text-[13px] text-terracotta" role="alert">{state.error}</p>}
      <button disabled={pending} className="btn-dark w-full">{pending ? "Signing in…" : "Sign in"}</button>
      <div className="flex justify-between text-[13px]">
        <Link href="/account/forgot" className="link-u">Forgot password?</Link>
        <Link href={`/account/register${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="link-u">Create an account</Link>
      </div>
    </form>
  );
}

export function RegisterForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(registerAction, undefined);
  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="next" value={next ?? ""} />
      <div><label className="label" htmlFor="name">Full name</label><input id="name" name="name" required autoComplete="name" className="field" /></div>
      <div><label className="label" htmlFor="email">Email</label><input id="email" name="email" type="email" required autoComplete="email" className="field" /></div>
      <div><label className="label" htmlFor="password">Password</label><input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" className="field" /><p className="text-[11px] text-stone mt-1.5">At least 8 characters.</p></div>
      <label className="flex gap-3 text-[13px] items-start"><input type="checkbox" name="newsletter" className="accent-ink mt-0.5" /> Send me new collections and styling notes. You can unsubscribe at any time.</label>
      {state?.error && <p className="text-[13px] text-terracotta" role="alert">{state.error}</p>}
      <button disabled={pending} className="btn-dark w-full">{pending ? "Creating account…" : "Create account"}</button>
      <p className="text-[13px] text-center">Already have an account? <Link href="/account/login" className="link-u">Sign in</Link></p>
    </form>
  );
}

export function ForgotForm() {
  const [state, action, pending] = useActionState(requestResetAction, undefined);
  return (
    <form action={action} className="space-y-6">
      <div><label className="label" htmlFor="email">Email</label><input id="email" name="email" type="email" required className="field" /></div>
      {state?.message && <p className="text-[13px] text-stone" role="status">{state.message.split("(Development: ").map((part, i) => i === 0 ? part : <span key={i}> (Development link: <Link className="link-u text-ink" href={part.replace(")", "")}>reset password</Link>)</span>)}</p>}
      <button disabled={pending} className="btn-dark w-full">Send reset link</button>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction, undefined);
  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="token" value={token} />
      <div><label className="label" htmlFor="password">New password</label><input id="password" name="password" type="password" minLength={8} required className="field" autoComplete="new-password" /></div>
      {state?.error && <p className="text-[13px] text-terracotta" role="alert">{state.error}</p>}
      <button disabled={pending} className="btn-dark w-full">Set new password</button>
    </form>
  );
}

export function AuthShell({ title, sub, children, image }: { title: string; sub: string; children: React.ReactNode; image: string }) {
  return (
    <div className="grid lg:grid-cols-2 min-h-[calc(100dvh-140px)]">
      <div className="hidden lg:block relative bg-mist" style={{ backgroundImage: `url(${image}?w=1400&q=75&auto=format&fit=crop)`, backgroundSize: "cover", backgroundPosition: "center" }} />
      <div className="flex items-center justify-center px-5 py-16">
        <div className="w-full max-w-sm">
          <h1 className="display text-[52px]">{title}</h1>
          <p className="text-stone mt-3 mb-10 text-[14px]">{sub}</p>
          {children}
        </div>
      </div>
    </div>
  );
}
