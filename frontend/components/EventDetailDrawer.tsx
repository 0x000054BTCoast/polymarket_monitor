import { EventDetailResponse } from "@/types";

export default function EventDetailDrawer({
  open,
  detail,
  onClose
}: {
  open: boolean;
  detail: EventDetailResponse | null;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex justify-end z-30" onClick={onClose}>
      <div
        className="w-full max-w-lg h-full bg-[#090f1d] border-l border-[#22324f] p-4 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold tracking-wide">Event Detail</h3>
          <button onClick={onClose} className="text-[12px] muted hover:text-white">Close</button>
        </div>
        {!detail ? (
          <div className="text-[12px] muted">Loading...</div>
        ) : (
          <>
            <h4 className="text-sm font-semibold mb-1">{detail.event.title}</h4>
            <div className="text-[12px] muted mb-3">{detail.event.category || "uncategorized"}</div>
            <div className="space-y-1.5">
              {detail.markets.map((m) => (
                <div key={m.id} className="panel-2 px-2 py-1.5 text-[12px]">
                  <div className="font-medium leading-tight">{m.question}</div>
                  <div className="muted">Outcome: {m.outcome || "-"}</div>
                  <div className="muted">Asset: {m.asset_id || "-"}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
