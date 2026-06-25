import { registerAction } from "@/app/actions/auth";
import { AuthForm } from "@/app/ui/auth-form";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function RegisterPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/");
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <p className="eyebrow">AI Prompt Saver</p>
        <h1>Create account</h1>
        <AuthForm
          action={registerAction}
          buttonLabel="Create account"
          footerLabel="Already have an account?"
          footerHref="/login"
          footerLink="Log in"
        />
      </section>
    </main>
  );
}
