import { useEffect, useState } from "react";
import { pegStatus } from "../lib/constants";

type Mode = "mini" | "live" | "frozen";

interface PegLineProps {
  price: number;
  mode?: Mode;
  annotation?: string;
  forceStatus?: "holding" | "strained" | "broken";
}

const COLORS = {
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

export default function PegLine({ price, mode = "live", annotation, forceStatus }: PegLineProps) {
  const dims =
    mode === "mini"
      ? { w: 120, h: 56 }
      : mode === "frozen"
      ? { w: 720, h: 220 }
      : { w: 720, h: 200 };

  const status = forceStatus || pegStatus(price);
  const color = COLORS[status];

  const cx = dims.w * (mode === "mini" ? 0.72 : 0.62);
  const centerY = dims.h / 2;
  const halfH = dims.h / 2 - (mode === "mini" ? 10 : 28);

  const targetY = centerY + priceToOffset(price, halfH);
  const [dotY, setDotY] = useState(targetY);
  useEffect(() => {
    const id = requestAnimationFrame(() => setDotY(targetY));
    return () => cancelAnimationFrame(id);
  }, [targetY]);

  const glow = status === "broken" ? 6 : status === "strained" ? 3.5 : 2.5;
  const showLabel = mode !== "mini";
  const priceText = price.toFixed(4);

  return (
    <svg
      viewBox={"0 0 " + dims.w + " " + dims.h}
      width="100%"
      style={{ display: "block", maxWidth: dims.w, height: "auto" }}
      role="img"
      aria-label={"Peg line, price " + priceText + ", status " + status}
    >
      <defs>
        <filter id={"pegglow-" + status} x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur stdDeviation={glow} result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect x="0" y="0" width={dims.w} height={dims.h} fill="none" stroke="var(--gridline)" strokeWidth="1" />

      <line
        x1="0"
        y1={centerY}
        x2={dims.w}
        y2={centerY}
        stroke={color}
        strokeWidth={mode === "mini" ? 1.5 : 2}
        strokeOpacity="0.5"
        filter={"url(#pegglow-" + status + ")"}
      />

      {showLabel && (
        <text x="8" y={centerY - 8} fill="var(--text-muted)" fontFamily="var(--font-mono)" fontSize="11">
          $1.0000
        </text>
      )}

      <circle
        cx={cx}
        cy={dotY}
        r={mode === "mini" ? 4 : 6}
        fill={color}
        filter={"url(#pegglow-" + status + ")"}
        style={{ transition: "cy 600ms cubic-bezier(0.22, 1, 0.36, 1)" }}
      />

      {showLabel && (
        <text
          x={cx + 14}
          y={dotY + 4}
          fill={color}
          fontFamily="var(--font-mono)"
          fontSize="15"
          fontWeight="500"
        >
          {"$" + priceText}
        </text>
      )}

      {mode === "frozen" && annotation && (
        <g>
          <line
            x1={cx}
            y1={dotY}
            x2={cx - 180}
            y2={dotY}
            stroke={color}
            strokeWidth="1"
            strokeDasharray="3 3"
            strokeOpacity="0.7"
          />
          <text
            x={cx - 188}
            y={dotY + 4}
            textAnchor="end"
            fill={color}
            fontFamily="var(--font-display)"
            fontSize="13"
            fontWeight="600"
          >
            {annotation}
          </text>
        </g>
      )}
    </svg>
  );
}