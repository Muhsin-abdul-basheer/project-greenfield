"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

type Vessel = { id: string; name: string; imo: string };

export default function ReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedVesselId = searchParams.get("vesselId");
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [vesselId, setVesselId] = useState(preselectedVesselId || "");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"Low" | "Med" | "High">("Med");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/vessels", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => {
        setVessels(list);
        if (preselectedVesselId && !vesselId) setVesselId(preselectedVesselId);
      })
      .finally(() => setLoaded(true));
  }, [preselectedVesselId, vesselId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!vesselId || !category.trim() || !description.trim()) {
      setError("Vessel, category, and description are required.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          vesselId,
          category: category.trim(),
          description: description.trim(),
          priority,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Failed to submit");
        return;
      }
      router.push("/issues");
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  const categories = ["Engine", "Safety", "Navigation", "Hull", "Electrical", "Other"];

  if (!loaded) return <p className="text-stone-500">Loading…</p>;

  return (
    <div>
      <h1 className="page-title mb-1">Report issue</h1>
      <p className="muted mb-6">Only for vessels you are assigned to. You can only report and view your own issues.</p>
      <div className="card p-6 max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Vessel *</label>
            <select value={vesselId} onChange={(e) => setVesselId(e.target.value)} className="input" required>
              <option value="">Select vessel</option>
              {vessels.map((v) => (
                <option key={v.id} value={v.id}>{v.name} ({v.imo})</option>
              ))}
            </select>
            <p className="text-stone-400 text-xs mt-0.5">Only vessels assigned to you</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Category *</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="input" required>
              <option value="">Select category</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Priority</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value as "Low" | "Med" | "High")} className="input">
              <option value="Low">Low</option>
              <option value="Med">Med</option>
              <option value="High">High</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Description *</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input min-h-[120px]" placeholder="Describe the issue..." required />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="flex gap-3">
            <button type="submit" disabled={loading} className="btn-primary">Submit</button>
            <Link href="/vessels" className="btn-secondary">Cancel</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
