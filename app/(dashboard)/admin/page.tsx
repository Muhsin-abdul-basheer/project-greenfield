"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Vessel = {
  id: string;
  name: string;
  imo: string;
  flag: string;
  type: string;
  status: string;
  lastInspectionDate: string | null;
  openIssueCount?: number;
};

type Crew = { id: string; email: string };

const emptyVessel = (): Partial<Vessel> => ({
  name: "",
  imo: "",
  flag: "",
  type: "",
  status: "Active",
  lastInspectionDate: null,
});

export default function AdminPage() {
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [crew, setCrew] = useState<Crew[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{ vesselsDueForInspection?: { name: string; imo: string }[] } | null>(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Vessel | null>(null);
  const [form, setForm] = useState<Partial<Vessel> & { assignedCrewIds?: string[] }>(emptyVessel());
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const router = useRouter();

  function load() {
    Promise.all([
      fetch("/api/vessels", { credentials: "include" }).then((r) => (r.ok ? r.json() : [])),
      fetch("/api/users", { credentials: "include" }).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([v, c]) => {
        setVessels(v);
        setCrew(c);
      })
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetch("/api/me", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((u) => {
        if (u?.role !== "FLEET_ADMIN") {
          router.replace("/vessels");
          return;
        }
        load();
      })
      .catch(() => router.replace("/vessels"));
  }, [router]);

  async function loadVesselForEdit(v: Vessel) {
    const r = await fetch(`/api/vessels/${v.id}`, { credentials: "include" });
    if (!r.ok) return;
    const data = await r.json();
    setForm({
      name: data.name,
      imo: data.imo,
      flag: data.flag,
      type: data.type,
      status: data.status,
      lastInspectionDate: data.lastInspectionDate,
      assignedCrewIds: data.assignedCrewIds || [],
    });
    setEditing(v);
    setShowForm(true);
  }

  function startAdd() {
    setForm({ ...emptyVessel(), assignedCrewIds: [] });
    setEditing(null);
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setEditing(null);
    setForm(emptyVessel());
  }

  async function saveForm(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const url = editing ? `/api/vessels/${editing.id}` : "/api/vessels";
    const method = editing ? "PATCH" : "POST";
    const body: Record<string, unknown> = {
      name: form.name,
      imo: form.imo,
      flag: form.flag,
      type: form.type,
      status: form.status,
      lastInspectionDate: form.lastInspectionDate || null,
    };
    if (editing && form.assignedCrewIds) body.assignedCrewIds = form.assignedCrewIds;
    try {
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(data.error || "Save failed");
        return;
      }
      cancelForm();
      load();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function deleteVessel(id: string) {
    if (!confirm("Delete this vessel? This will remove all related issues and assignments.")) return;
    setDeleting(id);
    setError("");
    try {
      const r = await fetch(`/api/vessels/${id}`, { method: "DELETE", credentials: "include" });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(data.error || "Delete failed");
        return;
      }
      load();
    } catch {
      setError("Network error");
    } finally {
      setDeleting(null);
    }
  }

  async function runMaintenanceScan() {
    setScanning(true);
    setScanResult(null);
    setError("");
    try {
      const r = await fetch("/api/maintenance-scan", { method: "POST", credentials: "include" });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(data.error || "Scan failed");
        return;
      }
      setScanResult(data);
    } catch {
      setError("Network error");
    } finally {
      setScanning(false);
    }
  }

  const toggleCrew = (cid: string) => {
    const cur = form.assignedCrewIds || [];
    setForm({
      ...form,
      assignedCrewIds: cur.includes(cid) ? cur.filter((x) => x !== cid) : [...cur, cid],
    });
  };

  if (loading) return <p className="text-stone-500">Loading…</p>;

  return (
    <div>
      <h1 className="page-title mb-1">Admin</h1>
      <p className="muted mb-6">Assign each vessel to crew. Crew only see and report issues for assigned vessels.</p>

      <div className="card p-4 mb-6">
        <h2 className="font-semibold text-stone-800 mb-2">Crew</h2>
        <p className="text-stone-500 text-sm mb-3">New crew: share the <a href="/register" className="text-indigo-600 hover:underline">Register</a> page. Then assign them to vessels via Edit vessel → Assigned crew.</p>
        {crew.length > 0 ? (
          <ul className="text-stone-600 text-sm">
            {crew.map((c) => (
              <li key={c.id}>{c.email}</li>
            ))}
          </ul>
        ) : (
          <p className="text-stone-400 text-sm">No crew yet.</p>
        )}
      </div>

      <div className="mb-6 flex flex-wrap gap-4 items-center">
        <button
          onClick={runMaintenanceScan}
          disabled={scanning}
          className="btn-primary"
        >
          {scanning ? "Running…" : "Maintenance Scan"}
        </button>
        {scanResult && (
          <div className="card px-4 py-2">
            <span className="text-emerald-700 font-medium">Maintenance scan completed.</span>
            {scanResult.vesselsDueForInspection && scanResult.vesselsDueForInspection.length > 0 && (
              <span className="text-amber-700 ml-2">
                {scanResult.vesselsDueForInspection.length} vessel(s) due for inspection.
              </span>
            )}
          </div>
        )}
      </div>

      {scanResult?.vesselsDueForInspection && scanResult.vesselsDueForInspection.length > 0 && (
        <div className="card p-4 mb-6">
          <h2 className="font-semibold text-stone-800 mb-2">Vessels due for inspection</h2>
          <ul className="list-disc list-inside text-stone-600">
            {scanResult.vesselsDueForInspection.map((v) => (
              <li key={v.imo}>{v.name} ({v.imo})</li>
            ))}
          </ul>
        </div>
      )}

      {error && <p className="text-red-600 mb-4">{error}</p>}

      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <h2 className="text-lg font-semibold text-stone-800">Vessels</h2>
        <div className="flex gap-2">
          <a href="/issues" className="btn-secondary">All issues</a>
          <button onClick={startAdd} className="btn-primary">Add vessel</button>
        </div>
      </div>

      {showForm && (
        <div className="card p-6 mb-6">
          <h3 className="font-semibold text-slate-900 mb-4">{editing ? "Edit vessel" : "New vessel"}</h3>
          <form onSubmit={saveForm} className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
              <input
                value={form.name || ""}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">IMO</label>
              <input
                value={form.imo || ""}
                onChange={(e) => setForm({ ...form, imo: e.target.value })}
                className="input"
                required
                readOnly={!!editing}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Flag</label>
              <input
                value={form.flag || ""}
                onChange={(e) => setForm({ ...form, flag: e.target.value })}
                className="input"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Type</label>
              <input
                value={form.type || ""}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="input"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Status</label>
              <select
                value={form.status || "Active"}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="input"
              >
                <option value="Active">Active</option>
                <option value="In Port">In Port</option>
                <option value="Under Maintenance">Under Maintenance</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Last inspection (YYYY-MM-DD)</label>
              <input
                type="date"
                value={form.lastInspectionDate ? String(form.lastInspectionDate).slice(0, 10) : ""}
                onChange={(e) => setForm({ ...form, lastInspectionDate: e.target.value || null })}
                className="input"
              />
            </div>
            {editing && (
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Assigned crew</label>
                {crew.length > 0 ? (
                  <div className="space-y-2">
                    {crew.map((c) => (
                      <label key={c.id} className="flex items-center gap-2">
                        <input type="checkbox" checked={(form.assignedCrewIds || []).includes(c.id)} onChange={() => toggleCrew(c.id)} />
                        <span className="text-sm">{c.email}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-stone-400 text-sm">No crew. Share the <a href="/register" className="text-indigo-600 hover:underline">Register</a> page first.</p>
                )}
              </div>
            )}
            <div className="flex gap-3">
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? "Saving…" : editing ? "Update" : "Create"}
              </button>
              <button type="button" onClick={cancelForm} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-stone-100">
            <tr>
              <th className="text-left px-4 py-2 font-medium text-stone-700">Name</th>
              <th className="text-left px-4 py-2 font-medium text-stone-700">IMO</th>
              <th className="text-left px-4 py-2 font-medium text-stone-700">Flag</th>
              <th className="text-left px-4 py-2 font-medium text-stone-700">Status</th>
              <th className="text-left px-4 py-2 font-medium text-stone-700">Open</th>
              <th className="text-left px-4 py-2 font-medium text-stone-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {vessels.map((v) => (
              <tr key={v.id} className="border-t border-stone-200">
                <td className="px-4 py-3">{v.name}</td>
                <td className="px-4 py-3 text-stone-600">{v.imo}</td>
                <td className="px-4 py-3 text-stone-600">{v.flag}</td>
                <td className="px-4 py-3">
                  <span className={`badge ${v.status === "Active" ? "bg-emerald-100 text-emerald-800" : v.status === "Under Maintenance" ? "bg-amber-100 text-amber-800" : "bg-stone-100 text-stone-700"}`}>{v.status}</span>
                </td>
                <td className="px-4 py-3">{v.openIssueCount ?? 0}</td>
                <td className="px-4 py-3 flex gap-2">
                  <button onClick={() => loadVesselForEdit(v)} className="text-indigo-600 hover:underline text-sm">Edit</button>
                  <button onClick={() => deleteVessel(v.id)} disabled={deleting === v.id} className="text-red-600 hover:underline text-sm disabled:opacity-50">{deleting === v.id ? "…" : "Delete"}</button>
                  <a href={`/vessels/${v.id}`} className="text-indigo-600 hover:underline text-sm">View</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {vessels.length === 0 && !showForm && <p className="text-stone-500 mt-4">No vessels. Add one to get started.</p>}
    </div>
  );
}
