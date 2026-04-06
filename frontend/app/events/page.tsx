"use client";

import { useEffect, useMemo, useState } from "react";

import { api } from "@/lib/api";
import { mockEvents } from "@/lib/mock";
import { EventRow } from "@/types";

export default function EventsPage() {
  const [rows, setRows] = useState<EventRow[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [degraded, setDegraded] = useState(false);

  useEffect(() => {
    api.events()
      .then((d) => {
        setRows(d.rows || []);
        setDegraded(false);
      })
      .catch(() => {
        setRows(mockEvents);
        setDegraded(true);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () => rows.filter((r) => String(r.title || "").toLowerCase().includes(q.toLowerCase())),
    [rows, q]
  );

  return (
    <main className="max-w-[1480px] mx-auto px-4 py-3 space-y-2.5">
      <h1 className="text-sm font-semibold tracking-[0.08em] uppercase">Events Monitor</h1>
      {degraded ? <div className="panel-2 px-3 py-2 text-[12px] border-amber-700 text-amber-200">MOCK/DEMO mode: backend unavailable.</div> : null}
      <div className="panel p-2.5">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search events"
          className="w-full bg-[#101a2f] border border-[#22324f] rounded px-2 py-1.5 text-[12px]"
        />
      </div>
      {loading ? <div className="muted text-[12px]">Loading...</div> : null}
      {!loading && filtered.length === 0 ? <div className="muted text-[12px]">No events found.</div> : null}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-2">
        {filtered.map((r) => (
          <div key={r.id} className="panel p-2.5">
            <div className="text-[13px] font-medium leading-tight">{r.title}</div>
            <div className="text-[11px] muted mt-1">{r.category || "uncategorized"}</div>
          </div>
        ))}
      </div>
    </main>
  );
}
