"use client";
import { useActionState, useState, useTransition } from "react";
import { addAddressAction, deleteAddressAction, setDefaultAddressAction } from "@/app/actions/account";

export function AddressBook({ addresses }: { addresses: { id: string; fullName: string; phone: string; text: string; isDefault: boolean }[] }) {
  const [adding, setAdding] = useState(addresses.length === 0);
  const [state, action, pending] = useActionState(addAddressAction, undefined);
  const [busy, start] = useTransition();
  return (
    <div className="mt-8">
      {addresses.length > 0 ? (
        <ul className={`grid sm:grid-cols-2 gap-4 ${busy ? "opacity-60" : ""}`}>
          {addresses.map((a) => (
            <li key={a.id} className={`p-5 border text-[14px] ${a.isDefault ? "border-ink" : "border-line"}`}>
              <p className="font-medium">{a.fullName} {a.isDefault && <span className="ml-1 text-[10px] uppercase tracking-wider text-stone">Default</span>}</p>
              <p className="text-stone mt-1">{a.text}</p><p className="text-stone">{a.phone}</p>
              <div className="flex gap-4 mt-4 text-[12px]">
                {!a.isDefault && <button onClick={() => start(() => setDefaultAddressAction(a.id))} className="link-u">Make default</button>}
                <button onClick={() => start(() => deleteAddressAction(a.id))} className="link-u text-stone">Delete</button>
              </div>
            </li>
          ))}
        </ul>
      ) : <p className="text-stone text-[14px]">No saved addresses yet.</p>}
      {!adding ? <button onClick={() => setAdding(true)} className="btn-outline mt-8">Add address</button> : (
        <form action={action} className="mt-10 grid sm:grid-cols-2 gap-6 max-w-2xl" key={state?.message}>
          {[["fullName", "Full name"], ["phone", "Mobile number"], ["line1", "Address"], ["line2", "Apartment, landmark (optional)"], ["city", "City"], ["state", "State"], ["pincode", "PIN code"]].map(([n, l]) => (
            <div key={n} className={n === "line1" || n === "line2" ? "sm:col-span-2" : ""}><label className="label" htmlFor={n}>{l}</label><input id={n} name={n} required={n !== "line2"} className="field" /></div>
          ))}
          <div className="sm:col-span-2 flex items-center gap-4">
            <button disabled={pending} className="btn-dark">Save address</button>
            {state?.error && <p className="text-[13px] text-terracotta">{state.error}</p>}
            {state?.message && <p className="text-[13px] text-stone">{state.message}</p>}
          </div>
        </form>
      )}
    </div>
  );
}
