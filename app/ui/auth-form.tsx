"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { AuthActionState } from "@/app/actions/auth";

type AuthFormProps = {
  action: (
    state: AuthActionState,
    formData: FormData,
  ) => Promise<AuthActionState>;
  buttonLabel: string;
  footerLabel: string;
  footerHref: string;
  footerLink: string;
};

const initialState: AuthActionState = { message: "" };

export function AuthForm({
  action,
  buttonLabel,
  footerLabel,
  footerHref,
  footerLink,
}: AuthFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="auth-form">
      <label>
        Email
        <input name="email" type="email" autoComplete="email" required />
      </label>
      <label>
        Password
        <input name="password" type="password" minLength={8} required />
      </label>
      {state.message ? (
        <p className="form-error" role="alert">
          {state.message}
        </p>
      ) : null}
      <button type="submit" disabled={pending}>
        {pending ? "Working..." : buttonLabel}
      </button>
      <p className="auth-footer">
        {footerLabel} <Link href={footerHref}>{footerLink}</Link>
      </p>
    </form>
  );
}
