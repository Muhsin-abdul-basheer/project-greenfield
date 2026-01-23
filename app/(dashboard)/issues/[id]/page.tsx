"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type Issue = {
  id: string;
  vesselId: string;
  vessel: { name: string; id: string };
  category: string;
  description: string;
  priority: string;
  status: string;
  recommendation: string | null;
  createdAt: string;
};

export default function IssueDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [issue, setIssue] = useState<Issue | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editStatus, setEditStatus] = useState(issue?.status || "Open");
  const [editRec, setEditRec] = useState(issue?.recommendation || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/issues/${id}`, { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error("Issue not found");
        return r.json();
      })
      .then((d) => {
        setIssue(d);
        setEditStatus(d.status);
        setEditRec(d.recommendation || "");
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    fetch("/api/me", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((u) => setRole(u?.role || null));
  }, []);

  async function handleAdminUpdate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await fetch(`/api/issues/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: editStatus, recommendation: editRec || null }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) { setError(data.error || "Update failed"); return; }
      setIssue((i) => (i ? { ...i, status: editStatus, recommendation: editRec || null } : null));
    } catch { setError("Network error"); }
    finally { setSaving(false); }
  }

  if (loading) return <p className="text-slate-500">Loading…</p>;
  if (error || !issue) return <p className="text-red-600">{error || "Not found"}</p>;

  const fmt = (s: string) => new Date(s).toLocaleString();
  const isAdmin = role === "FLEET_ADMIN";

  return (
    <div>
      <Link href="/issues" className="text-indigo-600 hover:underline text-sm mb-4 inline-block">← My Issues</Link>
      <div className="card p-6 max-w-2xl">
        <div className="flex flex-wrap gap-2 mb-4">
          <span className={`badge badge-${issue.priority.toLowerCase()}`}>{issue.priority}</span>
          <span className={`badge ${issue.status === "Open" ? "badge-open" : "badge-resolved"}`}>
            {issue.status}
          </span>
          <span className="text-stone-500 text-sm">{issue.category}</span>
        </div>
        <h1 className="text-xl font-bold text-stone-900">Issue on {issue.vessel?.name}</h1>
        <p className="text-stone-500 text-sm mt-1">Reported {fmt(issue.createdAt)}</p>
        <p className="text-stone-700 mt-4">{issue.description}</p>
        {issue.recommendation && (
          <div className="mt-6 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
            <h2 className="font-semibold text-emerald-900 mb-1">Recommendation</h2>
            <p className="text-emerald-800">{issue.recommendation}</p>
          </div>
        )}
        {!issue.recommendation && !isAdmin && (
          <p className="text-stone-400 text-sm mt-6">No recommendation yet. An admin will review this issue.</p>
        )}

        {isAdmin && (
          <form onSubmit={handleAdminUpdate} className="mt-6 p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-4">
            <h2 className="font-semibold text-stone-800">Update issue</h2>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Status</label>
              <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} className="input">
                <option value="Open">Open</option>
                <option value="Resolved">Resolved</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Recommendation</label>
              <textarea value={editRec} onChange={(e) => setEditRec(e.target.value)} className="input min-h-[80px]" />
            </div>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? "Saving…" : "Save"}</button>
          </form>
        )}

        <Link href={`/vessels/${issue.vesselId}`} className="btn-secondary mt-6 inline-block">
          View vessel
        </Link>
      </div>
    </div>
  );
}
