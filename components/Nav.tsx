"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

type User = { id: string; email: string; role: string } | null;

export default function Nav({ user }: { user: User }) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <nav className="bg-stone-900 text-stone-100 shadow-lg">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14">
        <div className="flex items-center gap-6">
          <Link href={user?.role === "FLEET_ADMIN" ? "/admin" : "/vessels"} className="font-semibold text-white hover:text-stone-200">
            Vessel IR
          </Link>
          {user?.role === "FLEET_ADMIN" && (
            <Link href="/admin" className="text-stone-300 hover:text-white">Admin</Link>
          )}
          <Link href="/vessels" className="text-stone-300 hover:text-white">
            {user?.role === "FLEET_ADMIN" ? "Vessels" : "My vessels"}
          </Link>
          {user?.role !== "FLEET_ADMIN" && (
            <Link href="/report" className="text-stone-300 hover:text-white">Report</Link>
          )}
          <Link href="/issues" className="text-stone-300 hover:text-white">
            {user?.role === "FLEET_ADMIN" ? "All issues" : "My issues"}
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-stone-400">{user?.email}</span>
          <span className="text-xs px-2 py-0.5 rounded-lg bg-stone-700 text-stone-200">
            {user?.role === "FLEET_ADMIN" ? "Admin" : "Crew"}
          </span>
          <button onClick={logout} className="text-stone-400 hover:text-white text-sm">Logout</button>
        </div>
      </div>
    </nav>
  );
}
