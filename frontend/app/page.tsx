"use client";

import { useEffect, useMemo, useState } from "react";

import AlertsPanel from "@/components/AlertsPanel";
import ControlsBar from "@/components/ControlsBar";
import EventDetailDrawer from "@/components/EventDetailDrawer";
import RankTable from "@/components/RankTable";
import SourceHealthPanel from "@/components/SourceHealthPanel";
import SummaryBar from "@/components/SummaryBar";
import { api } from "@/lib/api";
import { mockAlerts, mockHeat, mockHot, mockMovers, mockStatus } from "@/lib/mock";
import { AlertsResponse, EventDetailResponse, RankRow, SystemStatus } from "@/types";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [degraded, setDegraded] = useState(false);
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [hot, setHot] = useState<RankRow[]>([]);
  const [heat, setHeat] = useState<RankRow[]>([]);
  const [movers, setMovers] = useState<RankRow[]>([]);
  const [alerts, setAlerts] = useState<AlertsResponse | null>(null);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detail, setDetail] = useState<EventDetailResponse | null>(null);

  useEffect(() => {
    let t: NodeJS.Timeout;
    const load = async () => {
      try {
        const [s, h, hr, pm, a] = await Promise.all([
          api.system(), api.hotEvents(), api.heatRisers(), api.priceMovers(), api.alerts()
        ]);
        setStatus(s);
        setHot(h.rows || []);
        setHeat(hr.rows || []);
        setMovers(pm.rows || []);
        setAlerts(a);
        setDegraded(false);
      } catch {
        setDegraded(true);
        setStatus(mockStatus);
        setHot(mockHot);
        setHeat(mockHeat);
        setMovers(mockMovers);
        setAlerts(mockAlerts);
      } finally {
        setLoading(false);
      }
      if (autoRefresh) t = setTimeout(load, 15000);
    };
    load();
    return () => clearTimeout(t);
  }, [autoRefresh]);

  const filteredHot = useMemo(() => {
    return hot.filter((r) => {
      const title = String((r as any).title || "").toLowerCase();
      const rowCategory = String((r as any).category || "");
      return title.includes(q.toLowerCase()) && (!category || rowCategory === category);
    });
  }, [hot, q, category]);

  const openDetailFromRow = async (row: RankRow) => {
    const eventId = String((row as any).event_id || "");
    if (!eventId) return;
    setDrawerOpen(true);
    setDetail(null);
    try {
      const result = await api.eventDetail(eventId);
      setDetail(result);
    } catch {
      setDetail({
        event: { id: eventId, title: "MOCK/DEMO Event detail", active: true, closed: false },
        markets: []
      });
    }
  };

  return (
    <main className="max-w-[1480px] mx-auto px-4 py-3 space-y-2.5">
      <div className="flex items-center justify-between">
        <h1 className="text-sm font-semibold tracking-[0.08em] uppercase">Trading Monitor Dashboard</h1>
        <span className="text-[11px] muted">Desktop-first compact view</span>
      </div>

      {degraded && (
        <div className="panel-2 px-3 py-2 text-[12px] border-amber-700 text-amber-200">
          Degraded mode: using clearly labeled MOCK/DEMO data because backend is unavailable.
        </div>
      )}

      <SummaryBar status={status} />
      <ControlsBar q={q} setQ={setQ} category={category} setCategory={setCategory} autoRefresh={autoRefresh} setAutoRefresh={setAutoRefresh} />
      {loading ? <div className="muted text-[12px]">Loading...</div> : null}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-3 items-start">
        <div className="space-y-3 min-w-0">
          <RankTable title="Hot Events (DERIVED)" rows={filteredHot} onRowClick={openDetailFromRow} />
          <RankTable title="Minute Heat Risers (DERIVED)" rows={heat} />
          <RankTable title="Price Movers (DERIVED)" rows={movers} />
        </div>

        <aside className="space-y-3 xl:sticky xl:top-[54px]">
          <AlertsPanel alerts={alerts} />
          <SourceHealthPanel status={status} />
        </aside>
      </div>

      <EventDetailDrawer open={drawerOpen} detail={detail} onClose={() => setDrawerOpen(false)} />
    </main>
  );
}
