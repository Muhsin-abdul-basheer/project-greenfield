"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Issue = {
  id: string;
  vesselId: string;
  vessel: { name: string };
  category: string;
  description: string;
  priority: string;
  status: string;
  recommendation: string | null;
  createdAt: string;
};

export default function MyIssuesPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/issues", { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load issues");
        return r.json();
      })
      .then(setIssues)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-stone-500">Loading…</p>;
  if (error) return <p className="text-red-600">{error}</p>;

  const fmt = (s: string) => new Date(s).toLocaleDateString();

  return (
    <div>
      <h1 className="page-title mb-1">My issues</h1>
      <p className="muted mb-6">Crew: only issues you reported. Admin: all issues.</p>
      <div className="space-y-3">
        {issues.map((i) => (
          <Link key={i.id} href={`/issues/${i.id}`} className="card p-4 block hover:shadow-md hover:border-stone-300/80 transition-all">
            <div className="flex justify-between items-start gap-2 flex-wrap">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-stone-800">{i.category}</span>
                <span className="text-stone-500">on {i.vessel?.name}</span>
                <span className={`badge badge-${i.priority.toLowerCase()}`}>{i.priority}</span>
                <span className={i.status === "Open" ? "badge-open" : "badge-resolved"}>{i.status}</span>
              </div>
              <span className="text-stone-400 text-sm">{fmt(i.createdAt)}</span>
            </div>
            <p className="text-stone-600 text-sm mt-2 line-clamp-2">{i.description}</p>
            {i.recommendation ? (
              <p className="text-emerald-700 text-sm mt-2">Recommendation: {i.recommendation}</p>
            ) : (
              <p className="text-stone-400 text-sm mt-2">No recommendation yet</p>
            )}
          </Link>
        ))}
      </div>
      {issues.length === 0 && <p className="text-stone-500">No issues yet.</p>}
    </div>
  );
}
