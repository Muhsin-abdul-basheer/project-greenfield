"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Nav from "@/components/Nav";

type User = { id: string; email: string; role: string } | null;

export default function DashboardLayout({
  children,
}: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    fetch("/api/me", { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error("Unauthorized");
        return r.json();
      })
      .then((data) => setUser({ id: data.id, email: data.email, role: data.role }))
      .catch(() => {
        router.replace("/login?from=" + encodeURIComponent(pathname || "/"));
      })
      .finally(() => setLoading(false));
  }, [router, pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-stone-500">Loading…</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <Nav user={user} />
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
