"use client";
import { useActionState } from "react";
import { subscribeAction } from "@/app/actions/account";

export function Newsletter() {
  const [state, action, pending] = useActionState(subscribeAction, undefined);
  return (
    <div>
      <form action={action} className="mt-8 flex border-b border-paper/40 focus-within:border-paper transition-colors">
        <label htmlFor="nl-email" className="sr-only">Email address</label>
        <input id="nl-email" name="email" type="email" required placeholder="Your email address" className="flex-1 min-w-0 h-12 outline-none text-[14px] placeholder:text-paper/40" />
        <button disabled={pending} className="eyebrow px-2 hover:text-mauve">{pending ? "…" : "Subscribe"}</button>
      </form>
      {state?.message && <p role="status" className="mt-3 text-[12px] text-mauve">{state.message}</p>}
    </div>
  );
}
