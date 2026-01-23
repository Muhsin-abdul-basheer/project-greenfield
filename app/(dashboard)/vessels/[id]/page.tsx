"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
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

type Issue = {
  id: string;
  category: string;
  description: string;
  priority: string;
  status: string;
  recommendation: string | null;
  createdAt: string;
};

export default function VesselDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [vessel, setVessel] = useState<Vessel | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch(`/api/vessels/${id}`, { credentials: "include" }).then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/issues?vesselId=${id}`, { credentials: "include" }).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([v, i]) => {
        setVessel(v);
        setIssues(i || []);
        if (!v) setError("Vessel not found");
      })
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="text-stone-500">Loading…</p>;
  if (error || !vessel) return <p className="text-red-600">{error || "Not found"}</p>;

  const fmt = (s: string | null) => (s ? new Date(s).toLocaleDateString() : "—");

  return (
    <div>
      <Link href="/vessels" className="text-indigo-600 hover:underline text-sm mb-4 inline-block">← Vessels</Link>
      <div className="card p-6 mb-6">
        <div className="flex justify-between items-start flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-stone-900">{vessel.name}</h1>
            <p className="text-stone-500">{vessel.imo} · {vessel.flag}</p>
            <p className="text-stone-600 mt-1">{vessel.type}</p>
          </div>
          <span className={`badge ${vessel.status === "Active" ? "bg-emerald-100 text-emerald-800" : vessel.status === "Under Maintenance" ? "bg-amber-100 text-amber-800" : "bg-stone-100 text-stone-700"}`}>
            {vessel.status}
          </span>
        </div>
        <p className="text-sm text-stone-500 mt-4">Last inspection: {fmt(vessel.lastInspectionDate)}</p>
        <Link href={`/report?vesselId=${vessel.id}`} className="btn-primary mt-4 inline-block">Report issue</Link>
      </div>

      <h2 className="text-lg font-semibold text-stone-900 mb-3">Issues</h2>
      <div className="space-y-2">
        {issues.map((i) => (
          <Link key={i.id} href={`/issues/${i.id}`} className="card p-4 block hover:shadow-md hover:border-stone-300/80 transition-all">
            <div className="flex justify-between items-start gap-2">
              <div>
                <span className="font-medium text-stone-800">{i.category}</span>
                <span className={`badge badge-${i.priority.toLowerCase()} ml-2`}>{i.priority}</span>
                <span className={i.status === "Open" ? "badge-open ml-2" : "badge-resolved ml-2"}>{i.status}</span>
              </div>
              <span className="text-stone-400 text-sm">{fmt(i.createdAt)}</span>
            </div>
            <p className="text-stone-600 text-sm mt-2 line-clamp-2">{i.description}</p>
            {i.recommendation && <p className="text-emerald-700 text-sm mt-2">Recommendation: {i.recommendation}</p>}
          </Link>
        ))}
      </div>
      {issues.length === 0 && <p className="text-stone-500">No issues for this vessel.</p>}
    </div>
  );
}
