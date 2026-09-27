import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { activateSOS } from "@/lib/store";
import { useT } from "@/lib/i18n";

const HOLD_MS = 2000;

export function HoldSOS({ size = "lg" }: { size?: "lg" | "sm" }) {
  const t = useT();
  const nav = useNavigate();
  const [progress, setProgress] = useState(0);
  const start = useRef<number | null>(null);
  const raf = useRef<number | null>(null);
  const lastEnter = useRef(0);

  const fire = () => {
    stop();
    activateSOS();
    void nav({ to: "/sos" });
  };
  const tick = () => {
    if (start.current == null) return;
    const p = Math.min(1, (performance.now() - start.current) / HOLD_MS);
    setProgress(p);
    if (p >= 1) fire();
    else raf.current = requestAnimationFrame(tick);
  };
  const begin = () => {
    if (start.current != null) return;
    start.current = performance.now();
    raf.current = requestAnimationFrame(tick);
  };
  function stop() {
    start.current = null;
    if (raf.current) cancelAnimationFrame(raf.current);
    setProgress(0);
  }
  useEffect(() => () => { if (raf.current) cancelAnimationFrame(raf.current); }, []);

  const dim = size === "lg" ? "size-56" : "size-20";
  const r = 46, c = 2 * Math.PI * r;

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        aria-label={`${t("sos_hold")}. ${t("sos_kbd")}`}
        className={`sos-btn relative ${dim} select-none rounded-full touch-none`}
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); begin(); }}
        onPointerUp={stop}
        onPointerCancel={stop}
        onPointerLeave={stop}
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={(e) => {
          if (e.key === " ") { e.preventDefault(); begin(); }
          if (e.key === "Enter") {
            e.preventDefault();
            const now = Date.now();
            if (now - lastEnter.current < 600) fire();
            lastEnter.current = now;
          }
        }}
        onKeyUp={(e) => { if (e.key === " ") stop(); }}
      >
        <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90" aria-hidden>
          <circle cx="50" cy="50" r={r} fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
          <circle cx="50" cy="50" r={r} fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={c * (1 - progress)} />
        </svg>
        <span className={`relative font-display font-extrabold tracking-widest ${size === "lg" ? "text-5xl" : "text-lg"}`}>SOS</span>
      </button>
      {size === "lg" && (
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {progress > 0 ? t("sos_holding") : t("sos_hold_hint")}
        </p>
      )}
    </div>
  );
}
