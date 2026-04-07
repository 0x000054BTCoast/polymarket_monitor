"use client";

import { useEffect, useMemo, useState } from "react";

import AlertsList from "@/components/AlertsList";
import ArbitrageSignalsPanel from "@/components/ArbitrageSignalsPanel";
import EventDrawer from "@/components/EventDrawer";
import FilterBar from "@/components/FilterBar";
import HeatRisersTable from "@/components/HeatRisersTable";
import HotEventsTable from "@/components/HotEventsTable";
import PriceMoversTable from "@/components/PriceMoversTable";
import SourceHealth from "@/components/SourceHealth";
import SummaryStats from "@/components/SummaryStats";
import AlertTimeline from "@/components/charts/AlertTimeline";
import CategoryDonut from "@/components/charts/CategoryDonut";
import CorrelationView from "@/components/charts/CorrelationView";
import HeatHistogram from "@/components/charts/HeatHistogram";
import HeatBarChart from "@/components/charts/HeatBarChart";
import MoveHeatScatter from "@/components/charts/MoveHeatScatter";
import TrendChart from "@/components/charts/TrendChart";
import Badge from "@/components/ui/Badge";
import { api } from "@/lib/api";
import { mockAlerts, mockHeat, mockHot, mockMovers, mockStatus } from "@/lib/mock";
import {
  AlertsResponse,
  ArbitrageSignalRow,
  EventDetailResponse,
  HotTrendSeries,
  RankRow,
  SystemStatus,
} from "@/types";

type TimeWindow = "15m" | "1h" | "4h" | "24h";

const WINDOW_OPTIONS: Array<{ key: TimeWindow; label: string; hours: number }> = [
  { key: "15m", label: "15m", hours: 0.25 },
  { key: "1h", label: "1h", hours: 1 },
  { key: "4h", label: "4h", hours: 4 },
  { key: "24h", label: "24h", hours: 24 },
];

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [degraded, setDegraded] = useState(false);
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [hot, setHot] = useState<RankRow[]>([]);
  const [hotTrend, setHotTrend] = useState<HotTrendSeries[]>([]);
  const [heat, setHeat] = useState<RankRow[]>([]);
  const [movers, setMovers] = useState<RankRow[]>([]);
  const [alerts, setAlerts] = useState<AlertsResponse | null>(null);
  const [arbitrage, setArbitrage] = useState<ArbitrageSignalRow[]>([]);
  const [arbitrageAsOf, setArbitrageAsOf] = useState("");
  const [arbitrageMethod, setArbitrageMethod] = useState("");
  const [arbitrageDisclaimer, setArbitrageDisclaimer] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [topK, setTopK] = useState(5);
  const [topN, setTopN] = useState(100);
  const [timelineSeverity, setTimelineSeverity] = useState("");
  const [signalTypeFilter, setSignalTypeFilter] = useState("");
  const [confidenceFilter, setConfidenceFilter] = useState(0);
  const [riskFilter, setRiskFilter] = useState("");
  const [timeWindow, setTimeWindow] = useState<TimeWindow>("24h");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detail, setDetail] = useState<EventDetailResponse | null>(null);

  const selectedWindow = useMemo(
    () => WINDOW_OPTIONS.find((w) => w.key === timeWindow) ?? WINDOW_OPTIONS[3],
    [timeWindow]
  );

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const load = async () => {
      try {
        const [s, h, ht, hr, pm, a, arb] = await Promise.all([
          api.system(),
          api.hotEvents(topN),
          api.hotTrend(selectedWindow.hours, topK),
          api.heatRisers(topN),
          api.priceMovers(topN),
          api.alerts(),
          api.arbitrageSignals(40),
        ]);
        setStatus(s);
        setHot(h.rows || []);
        setHotTrend(ht.rows || []);
        setHeat(hr.rows || []);
        setMovers(pm.rows || []);
        setAlerts(a);
        setArbitrage(arb.rows || []);
        setArbitrageAsOf(arb.as_of || "");
        setArbitrageMethod(arb.method_version || "");
        setArbitrageDisclaimer(arb.disclaimer || "");
        setDegraded(false);
      } catch {
        setDegraded(true);
        setStatus(mockStatus);
        setHot(mockHot);
        setHotTrend([]);
        setHeat(mockHeat);
        setMovers(mockMovers);
        setAlerts(mockAlerts);
        setArbitrage([]);
        setArbitrageAsOf("");
        setArbitrageMethod("");
        setArbitrageDisclaimer("DERIVED 信号，非投资建议，仅供研究。");
      } finally {
        setLoading(false);
      }

      if (autoRefresh) {
        timeout = setTimeout(load, 15000);
      }
    };

    load();

    return () => clearTimeout(timeout);
  }, [autoRefresh, topK, topN, selectedWindow.hours]);

  const filteredHot = useMemo(() => {
    return hot.filter((r) => {
      const title = String(r.title || "").toLowerCase();
      const rowCategory = String(r.category || "");
      return (
        title.includes(searchQuery.toLowerCase()) &&
        (!category || rowCategory === category)
      );
    });
  }, [hot, searchQuery, category]);

  const openDetailFromRow = async (row: RankRow) => {
    const eventId = String(row.event_id || "");
    if (!eventId) return;

    setDrawerOpen(true);
    setDetail(null);

    try {
      const result = await api.eventDetail(eventId);
      setDetail(result);
    } catch {
      setDetail({
        event: {
          id: eventId,
          title: "Demo Event",
          active: true,
          closed: false,
        },
        markets: [],
      });
    }
  };

  const signalTypeOptions = useMemo(
    () => Array.from(new Set(arbitrage.map((r) => r.signal_type))).filter(Boolean),
    [arbitrage]
  );

  const filteredArbitrage = useMemo(() => {
    return arbitrage.filter((row) => {
      const confidence = Number(row.risk_flags?.confidence || 0);
      const risks = [
        row.risk_flags?.data_freshness_risk,
        row.risk_flags?.liquidity_risk,
        row.risk_flags?.slippage_risk,
      ];
      const riskMatch = !riskFilter || risks.includes(riskFilter as "low" | "medium" | "high");
      return (
        (!signalTypeFilter || row.signal_type === signalTypeFilter) &&
        confidence >= confidenceFilter &&
        riskMatch
      );
    });
  }, [arbitrage, signalTypeFilter, confidenceFilter, riskFilter]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Real-time prediction market monitoring
            </p>
          </div>
          <div className="flex items-center gap-2">
            {degraded && <Badge variant="warning">Mock Mode</Badge>}
            {loading && <Badge variant="muted">Loading...</Badge>}
          </div>
        </div>

        {degraded && (
          <div className="card p-4 border-warning/30 bg-warning/5">
            <div className="flex items-center gap-3">
              <svg
                className="w-5 h-5 text-warning flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div>
                <p className="text-sm font-medium text-warning">Demo Mode Active</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Backend is unavailable. Displaying mock data for demonstration purposes.
                </p>
              </div>
            </div>
          </div>
        )}

        <SummaryStats status={status} />

        <FilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          category={category}
          onCategoryChange={setCategory}
          autoRefresh={autoRefresh}
          onAutoRefreshChange={setAutoRefresh}
        />

        <div className="card">
          <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="font-semibold">Analytics Overview</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Visualizations of market activity and trends
              </p>
            </div>
            <div className="flex items-center flex-wrap gap-2">
              <label className="text-sm text-muted-foreground">Window:</label>
              <select
                value={timeWindow}
                onChange={(e) => setTimeWindow(e.target.value as TimeWindow)}
                className="select"
              >
                {WINDOW_OPTIONS.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
              <label className="text-sm text-muted-foreground">Top K:</label>
              <select
                value={topK}
                onChange={(e) => setTopK(Number(e.target.value))}
                className="select"
              >
                <option value={3}>3</option>
                <option value={5}>5</option>
                <option value={8}>8</option>
                <option value={10}>10</option>
              </select>
              <label className="text-sm text-muted-foreground">Top N:</label>
              <select
                value={topN}
                onChange={(e) => setTopN(Number(e.target.value))}
                className="select"
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
            </div>
          </div>

          <div className="p-4 space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-medium">Hot Score Trend</h3>
                  <Badge variant="muted" size="sm">{selectedWindow.label}</Badge>
                </div>
                <div className="chart-container">
                  <TrendChart series={hotTrend} height={220} />
                </div>
              </div>
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-medium">Heat Distribution</h3>
                  <Badge variant="muted" size="sm">z-score</Badge>
                </div>
                <div className="chart-container">
                  <HeatBarChart rows={heat} threshold={2} maxItems={8} />
                </div>
              </div>
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-medium">Price-Heat Correlation</h3>
                <Badge variant="muted" size="sm">Top 6 Movers</Badge>
              </div>
              <div className="chart-container">
                <CorrelationView movers={movers} heat={heat} maxItems={6} />
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-medium">Heat Rise Histogram</h3>
                  <Badge variant="muted" size="sm">{selectedWindow.label}</Badge>
                </div>
                <div className="chart-container">
                  <HeatHistogram rows={heat} maxItems={40} windowKey={timeWindow} />
                </div>
              </div>
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-medium">Category Share</h3>
                  <Badge variant="muted" size="sm">/api/system/status</Badge>
                </div>
                <div className="chart-container">
                  <CategoryDonut categoryCounts={status?.category_counts} maxItems={8} />
                </div>
              </div>
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-medium">Move vs Heat Scatter</h3>
                  <Badge variant="muted" size="sm">Top N</Badge>
                </div>
                <div className="chart-container">
                  <MoveHeatScatter movers={movers} heat={heat} maxItems={30} windowKey={timeWindow} />
                </div>
              </div>
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-medium">Alert Timeline</h3>
                <select
                  value={timelineSeverity}
                  onChange={(e) => setTimelineSeverity(e.target.value)}
                  className="select text-xs h-8"
                >
                  <option value="">All Severities</option>
                  <option value="critical">Critical</option>
                  <option value="warning">Warning</option>
                  <option value="info">Info</option>
                </select>
              </div>
              <div className="chart-container">
                <AlertTimeline alerts={alerts} filter={timelineSeverity} maxItems={20} />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6 items-start">
          <div className="space-y-6">
            <HotEventsTable rows={filteredHot} onRowClick={openDetailFromRow} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <HeatRisersTable rows={heat} />
              <PriceMoversTable rows={movers} />
            </div>
          </div>

          <div className="space-y-6 xl:sticky xl:top-20">
            <AlertsList alerts={alerts} maxItems={15} />
            <SourceHealth status={status} />
          </div>
        </div>

        <div className="space-y-3">
          <div className="card p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div>
              <h2 className="font-semibold">Arbitrage Strategy Zone</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                按 signal_type / confidence / risk 过滤策略建议动作
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full lg:w-auto">
              <select value={signalTypeFilter} onChange={(e) => setSignalTypeFilter(e.target.value)} className="select text-xs h-8">
                <option value="">All signal_type</option>
                {signalTypeOptions.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <select value={confidenceFilter} onChange={(e) => setConfidenceFilter(Number(e.target.value))} className="select text-xs h-8">
                <option value={0}>confidence ≥ 0.0</option>
                <option value={0.5}>confidence ≥ 0.5</option>
                <option value={0.7}>confidence ≥ 0.7</option>
                <option value={0.85}>confidence ≥ 0.85</option>
              </select>
              <select value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)} className="select text-xs h-8">
                <option value="">All risk</option>
                <option value="low">risk: low</option>
                <option value="medium">risk: medium</option>
                <option value="high">risk: high</option>
              </select>
            </div>
          </div>

          <ArbitrageSignalsPanel
            rows={filteredArbitrage}
            asOf={arbitrageAsOf}
            methodVersion={arbitrageMethod}
            disclaimer={arbitrageDisclaimer}
          />
        </div>
      </div>

      <EventDrawer
        open={drawerOpen}
        detail={detail}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
}
