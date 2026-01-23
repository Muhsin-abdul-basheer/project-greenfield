"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function ResetPasswordForm() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (!token) {
      setError("Invalid reset link. Request a new one.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword, confirmPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Reset failed");
        return;
      }
      setDone(true);
      setTimeout(() => router.replace("/login"), 2000);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="auth-card max-w-md w-full p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
        </div>
        <h1 className="text-xl font-semibold text-stone-900 mb-2">Password updated</h1>
        <p className="text-stone-600 text-sm">Redirecting to sign in…</p>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="auth-card max-w-md w-full p-8 text-center">
        <p className="text-stone-600 mb-4">Invalid or missing reset token.</p>
        <Link href="/forgot-password" className="text-indigo-600 hover:underline">Request a new reset link</Link>
      </div>
    );
  }

  return (
    <div className="auth-card max-w-md w-full p-8">
      <h1 className="text-2xl font-bold text-stone-900 mb-1">Set new password</h1>
      <p className="text-stone-500 text-sm mb-6">Choose a password of at least 6 characters.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">New password</label>
          <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="input" minLength={6} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Confirm password</label>
          <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="input" required />
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary w-full">Update password</button>
      </form>
      <p className="mt-5 text-center text-stone-500 text-sm">
        <Link href="/login" className="text-indigo-600 hover:underline">Back to sign in</Link>
      </p>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
      <Suspense fallback={<div className="auth-card max-w-md w-full p-8"><p className="text-stone-500">Loading…</p></div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
