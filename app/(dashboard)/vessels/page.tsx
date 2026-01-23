"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Vessel = {
  id: string;
  name: string;
  imo: string;
  flag: string;
  type: string;
  status: string;
  lastInspectionDate: string | null;
  openIssueCount: number;
};

export default function VesselsPage() {
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/vessels", { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load vessels");
        return r.json();
      })
      .then(setVessels)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-stone-500">Loading…</p>;
  if (error) return <p className="text-red-600">{error}</p>;

  return (
    <div>
      <h1 className="page-title mb-1">Vessels</h1>
      <p className="muted mb-6">Crew: only vessels assigned to you. Report issues only for these.</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {vessels.map((v) => (
          <Link
            key={v.id}
            href={`/vessels/${v.id}`}
            className="card p-5 block hover:shadow-md hover:border-stone-300/80 transition-all"
          >
            <div className="flex justify-between items-start">
              <h2 className="font-semibold text-stone-900">{v.name}</h2>
              <span
                className={`badge ${
                  v.status === "Active"
                    ? "bg-emerald-100 text-emerald-800"
                    : v.status === "Under Maintenance"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-stone-100 text-stone-700"
                }`}
              >
                {v.status}
              </span>
            </div>
            <p className="text-sm text-stone-500 mt-1">{v.imo} · {v.flag}</p>
            <p className="text-sm text-stone-600 mt-2">{v.type}</p>
            <div className="mt-3 flex items-center gap-2">
              <span className={v.openIssueCount > 0 ? "badge-open" : "badge-resolved"}>
                {v.openIssueCount} open {v.openIssueCount === 1 ? "issue" : "issues"}
              </span>
            </div>
          </Link>
        ))}
      </div>
      {vessels.length === 0 && (
        <p className="text-stone-500">No vessels assigned. Ask your admin to assign you to vessels.</p>
      )}
    </div>
  );
}
