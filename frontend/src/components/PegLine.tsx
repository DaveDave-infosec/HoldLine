import { useEffect, useRef, useState } from "react";
import { pegStatus } from "../lib/constants";

type Mode = "mini" | "live" | "frozen";
type Status = "holding" | "strained" | "broken";

interface PegLineProps {
  price: number;
  mode?: Mode;
  annotation?: string;
  forceStatus?: Status;
}

const COLORS: Record<Status, string> = {
  holding: "var(--peg-holding)",
  strained: "var(--peg-strained)",
  broken: "var(--peg-broken)",
};

function priceToOffset(price: number, halfHeight: number): number {
  const deviation = 1.0 - price;
  const scaled = deviation / 0.15;
  const clamped = Math.max(-1, Math.min(1, scaled));
  return clamped * halfHeight;
}

const BUFFER_N = 48;

export default function PegLine({ price, mode = "live", annotation, forceStatus }: PegLineProps) {
  const dims =
    mode === "mini"
      ? { w: 120, h: 56 }
      : mode === "frozen"
      ? { w: 720, h: 220 }
      : { w: 720, h: 200 };

  const status: Status = forceStatus || (pegStatus(price) as Status);
  const color = COLORS[status];

  const centerY = dims.h / 2;
  const halfH = dims.h / 2 - (mode === "mini" ? 10 : 28);
  const targetY = centerY + priceToOffset(price, halfH);

  const [buffer, setBuffer] = useState<number[]>(() => Array(BUFFER_N).fill(price));
  const seeded = useRef(true);
  useEffect(() => {
    if (seeded.current) {
      seeded.current = false;
      return;
    }
    setBuffer((b) => [...b.slice(1), price]);
  }, [price]);

  const [dotY, setDotY] = useState(targetY);
  useEffect(() => {
    const id = requestAnimationFrame(() => setDotY(targetY));
    return () => cancelAnimationFrame(id);
  }, [targetY]);

  const dotX =
    mode === "mini" ? dims.w - 8 : mode === "frozen" ? dims.w * 0.62 : dims.w - 6;
  const dotR = mode === "mini" ? 4 : 6;
  const showLabels = mode !== "mini";
  const priceText = price.toFixed(4);

  const cols: number[] = [];
  if (mode !== "mini") {
    for (let x = dims.w / 6; x < dims.w; x += dims.w / 6) cols.push(x);
  }

  const traceSegs: { x1: number; y1: number; x2: number; y2: number; c: string }[] = [];
  if (mode === "live") {
    for (let i = 1; i < buffer.length; i++) {
      const x1 = ((i - 1) / (BUFFER_N - 1)) * dims.w;
      const x2 = (i / (BUFFER_N - 1)) * dims.w;
      const y1 = centerY + priceToOffset(buffer[i - 1], halfH);
      const y2 = centerY + priceToOffset(buffer[i], halfH);
      traceSegs.push({ x1, y1, x2, y2, c: COLORS[pegStatus(buffer[i]) as Status] });
    }
  }

  const breakX = dotX * 0.55;

  return (
    <svg
      viewBox={"0 0 " + dims.w + " " + dims.h}
      width="100%"
      style={{ display: "block", maxWidth: dims.w, height: "auto" }}
      role="img"
      aria-label={"Peg line, price " + priceText + ", status " + status}
    >
      <rect x="0" y="0" width={dims.w} height={dims.h} fill="none" stroke="var(--gridline)" strokeWidth="1" />

      {cols.map((x) => (
        <line key={"c" + x} x1={x} y1="6" x2={x} y2={dims.h - 6} stroke="var(--gridline)" strokeWidth="1" strokeOpacity="0.4" />
      ))}

      <line x1="0" y1={centerY} x2={dims.w} y2={centerY} stroke="var(--gridline)" strokeWidth="1" strokeDasharray="3 4" strokeOpacity="0.9" />
      {showLabels && (
        <text x="8" y={centerY - 8} fill="var(--text-muted)" fontFamily="var(--font-mono)" fontSize="11">
          $1.0000 PEG
        </text>
      )}

      {mode === "live" &&
        traceSegs.map((s, i) => (
          <line key={"s" + i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={s.c} strokeWidth="2" strokeLinecap="round" />
        ))}

      {mode === "frozen" && (
        <g>
          <line x1="0" y1={centerY} x2={breakX} y2={centerY} stroke={COLORS.holding} strokeWidth="2" strokeLinecap="round" />
          <line x1={breakX} y1={centerY} x2={dotX} y2={dotY} stroke={color} strokeWidth="2" strokeLinecap="round" />
        </g>
      )}

      {mode === "mini" && (
        <line x1="0" y1={dotY} x2={dotX} y2={dotY} stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      )}

      <circle cx={dotX} cy={dotY} r={dotR + 2.5} fill="none" stroke={color} strokeWidth="1" strokeOpacity="0.45" style={{ transition: "cy 600ms cubic-bezier(0.22, 1, 0.36, 1)" }} />
      <circle cx={dotX} cy={dotY} r={dotR} fill={color} style={{ transition: "cy 600ms cubic-bezier(0.22, 1, 0.36, 1)" }} />

      {mode === "live" && (
        <text x={dims.w - 8} y="20" textAnchor="end" fill={color} fontFamily="var(--font-mono)" fontSize="11" fontWeight="500" letterSpacing="1">
          {status.toUpperCase()}
        </text>
      )}
      {showLabels && (
        <text x={dotX - 12} y={dotY - 12} textAnchor="end" fill={color} fontFamily="var(--font-mono)" fontSize="15" fontWeight="500">
          {"$" + priceText}
        </text>
      )}

      {mode === "frozen" && annotation && (
        <g>
          <line x1={dotX} y1={dotY} x2={dotX - 180} y2={dotY} stroke={color} strokeWidth="1" strokeDasharray="3 3" strokeOpacity="0.7" />
          <text x={dotX - 188} y={dotY + 4} textAnchor="end" fill={color} fontFamily="var(--font-display)" fontSize="13" fontWeight="600">
            {annotation}
          </text>
        </g>
      )}
    </svg>
  );
}