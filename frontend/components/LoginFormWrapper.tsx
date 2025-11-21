"use client";

import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";

export default function LoginFormWrapper() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
