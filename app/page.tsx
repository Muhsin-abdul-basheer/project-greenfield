"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    fetch("/api/me", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((user) => {
        if (user?.role === "FLEET_ADMIN") router.replace("/admin");
        else if (user) router.replace("/vessels");
        else router.replace("/login");
      })
      .catch(() => router.replace("/login"));
  }, [router]);
  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50">
      <p className="text-stone-500">Loading…</p>
    </div>
  );
}
