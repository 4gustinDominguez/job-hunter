import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        <div className="text-center">
          <h1 className="text-xl font-semibold">Job Hunter</h1>
          <p className="mt-1 text-sm text-muted">Sign in to continue your hunt.</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
