import { loginAction } from "@/app/actions/auth";
import { AuthForm } from "@/app/ui/auth-form";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/");
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <p className="eyebrow">AI Prompt Saver</p>
        <h1>Log in</h1>
        <AuthForm
          action={loginAction}
          buttonLabel="Log in"
          footerLabel="New here?"
          footerHref="/register"
          footerLink="Create an account"
        />
      </section>
    </main>
  );
}
