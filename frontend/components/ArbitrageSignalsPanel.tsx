"use client";

import { ArbitrageSignalRow } from "@/types";
import Badge from "./ui/Badge";

type ArbitrageSignalsPanelProps = {
  rows: ArbitrageSignalRow[];
  asOf?: string;
  methodVersion?: string;
  disclaimer?: string;
};

function riskVariant(level: string): "success" | "warning" | "destructive" {
  if (level === "low") return "success";
  if (level === "medium") return "warning";
  return "destructive";
}

export default function ArbitrageSignalsPanel({ rows, asOf, methodVersion, disclaimer }: ArbitrageSignalsPanelProps) {
  return (
    <div className="card">
      <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h3 className="font-semibold">Arbitrage Playbook Signals</h3>
          <p className="text-xs text-muted-foreground mt-0.5">按策略卡片展示建议动作与风控结构</p>
        </div>
        <Badge variant="muted">{rows.length} signals</Badge>
      </div>

      <div className="p-4 border-b border-border bg-muted/20 text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
        <span>方法版本: <strong className="text-foreground">{methodVersion || "-"}</strong></span>
        <span>as_of: <strong className="text-foreground">{asOf || "-"}</strong></span>
        <span>{disclaimer || "DERIVED 信号，非投资建议，仅供研究。"}</span>
      </div>

      <div className="p-4 space-y-4 max-h-[520px] overflow-auto">
        {rows.length === 0 && (
          <div className="text-sm text-muted-foreground">No arbitrage signals matched current filters.</div>
        )}

        {rows.map((row, idx) => (
          <div key={`${row.market_id}-${row.related_market_id || "na"}-${idx}`} className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="info">{row.signal_type}</Badge>
              <Badge variant="muted">{row.setup_type}</Badge>
              <Badge variant={riskVariant(row.risk_flags?.data_freshness_risk)}>freshness: {row.risk_flags?.data_freshness_risk}</Badge>
              <Badge variant={riskVariant(row.risk_flags?.liquidity_risk)}>liquidity: {row.risk_flags?.liquidity_risk}</Badge>
              <Badge variant={riskVariant(row.risk_flags?.slippage_risk)}>slippage: {row.risk_flags?.slippage_risk}</Badge>
              <Badge variant={row.risk_flags?.confidence >= 0.7 ? "success" : row.risk_flags?.confidence >= 0.5 ? "warning" : "destructive"}>
                confidence: {(row.risk_flags?.confidence ?? 0).toFixed(2)}
              </Badge>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Thesis:</span> {row.thesis}</div>
              <div><span className="text-muted-foreground">Entry Rule:</span> {row.entry_rule}</div>
              <div><span className="text-muted-foreground">Exit Rule:</span> {row.exit_rule}</div>
              <div><span className="text-muted-foreground">Invalid Rule:</span> {row.invalid_rule}</div>
              <div className="lg:col-span-2"><span className="text-muted-foreground">Position Sizing:</span> {row.position_sizing_hint}</div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs font-mono text-muted-foreground">
              <div>raw_gap: {Number(row.raw_gap || 0).toFixed(4)}</div>
              <div>edge: {Number(row.liquidity_adjusted_edge || 0).toFixed(4)}</div>
              <div>feasibility: {Number(row.execution_feasibility_score || 0).toFixed(4)}</div>
              <div>score: {Number(row.score || 0).toFixed(4)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
