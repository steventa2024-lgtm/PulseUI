/**
 * The home hero's "cyber grid": a fine technical grid, a perspective floor
 * plane, faint data particles, blue/cyan light on the left, magenta/red on the
 * right, and a few floating wireframe panels and cubes.
 *
 * CSS + inline SVG only. Every animation is slow, transform/opacity based, and
 * disabled under prefers-reduced-motion (see styles.css).
 */
import { memo } from "react";

import { cn } from "@/lib/utils";

/** Deterministic pseudo-random so server and client render the same stars. */
function seeded(seed: number) {
  let value = seed;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

const STARS = (() => {
  const rand = seeded(7);
  return Array.from({ length: 70 }, (_, index) => ({
    x: rand() * 100,
    y: rand() * 62,
    r: rand() * 1.1 + 0.3,
    twinkle: index % 4 === 0,
    delay: rand() * 5,
    hue: rand() > 0.82 ? "var(--pulse-magenta)" : rand() > 0.5 ? "var(--pulse-cyan)" : "#c9dcff",
  }));
})();

function WireCube({ size, color }: { size: number; color: string }) {
  // Isometric wireframe cube.
  const s = size;
  const h = s / 2;
  const q = s / 4;
  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} fill="none" aria-hidden>
      <g stroke={color} strokeWidth="1" strokeOpacity="0.85">
        <path d={`M${h} ${1} L${s - 1} ${q} L${h} ${h} L1 ${q} Z`} />
        <path d={`M1 ${q} L1 ${s - q} L${h} ${s - 1} L${h} ${h}`} />
        <path d={`M${s - 1} ${q} L${s - 1} ${s - q} L${h} ${s - 1}`} />
      </g>
      <path d={`M${h} ${1} L${s - 1} ${q} L${h} ${h} L1 ${q} Z`} fill={color} fillOpacity="0.06" />
    </svg>
  );
}

function WirePanel({ className, accent }: { className?: string; accent: "cyan" | "magenta" }) {
  const color = accent === "cyan" ? "var(--pulse-cyan)" : "var(--pulse-magenta)";
  return (
    <div
      className={cn("absolute rounded-lg border", className)}
      style={{
        borderColor: `color-mix(in oklab, ${color} 45%, transparent)`,
        background: `linear-gradient(135deg, color-mix(in oklab, ${color} 10%, transparent), transparent 70%)`,
        boxShadow: `0 0 40px -12px ${color}, inset 0 0 24px -16px ${color}`,
        transformStyle: "preserve-3d",
      }}
    >
      <div
        className="absolute inset-x-3 top-3 h-1 rounded-full"
        style={{ background: `color-mix(in oklab, ${color} 35%, transparent)` }}
      />
      <div
        className="absolute inset-x-3 top-6 h-1 w-1/2 rounded-full"
        style={{ background: `color-mix(in oklab, ${color} 20%, transparent)` }}
      />
      <div
        className="absolute bottom-3 left-3 right-1/3 top-10 rounded border"
        style={{ borderColor: `color-mix(in oklab, ${color} 25%, transparent)` }}
      />
    </div>
  );
}

export const CyberGridBackground = memo(function CyberGridBackground({
  className,
}: {
  className?: string;
}) {
  return (
    <div
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
      aria-hidden
    >
      {/* Base illumination: blue/cyan left, magenta/signal red right. */}
      <div
        className="absolute inset-0"
        style={{
          background: [
            "radial-gradient(60% 55% at 6% 38%, rgb(36 124 255 / 0.30), transparent 70%)",
            "radial-gradient(40% 40% at 18% 70%, rgb(0 207 255 / 0.16), transparent 70%)",
            "radial-gradient(55% 55% at 96% 30%, rgb(199 44 255 / 0.26), transparent 70%)",
            "radial-gradient(42% 45% at 88% 78%, rgb(255 51 107 / 0.22), transparent 70%)",
            "radial-gradient(70% 50% at 50% 0%, rgb(0 207 255 / 0.10), transparent 70%)",
            "linear-gradient(180deg, var(--pulse-bg-deep), var(--pulse-bg) 60%, var(--pulse-bg-deep))",
          ].join(","),
        }}
      />

      {/* Fine technical grid, faded toward the edges. */}
      <div
        className="absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgb(80 140 255 / 0.07) 1px, transparent 1px), linear-gradient(to bottom, rgb(80 140 255 / 0.07) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage: "radial-gradient(75% 65% at 50% 38%, #000 25%, transparent 80%)",
          WebkitMaskImage: "radial-gradient(75% 65% at 50% 38%, #000 25%, transparent 80%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgb(0 207 255 / 0.10) 1px, transparent 1px), linear-gradient(to bottom, rgb(0 207 255 / 0.10) 1px, transparent 1px)",
          backgroundSize: "220px 220px",
          maskImage: "radial-gradient(60% 50% at 50% 40%, #000 10%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(60% 50% at 50% 40%, #000 10%, transparent 75%)",
        }}
      />

      {/* Stars / data particles. */}
      <svg
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
      >
        {STARS.map((star, index) => (
          <circle
            key={index}
            cx={star.x}
            cy={star.y}
            r={star.r * 0.12}
            fill={star.hue}
            className={star.twinkle ? "animate-pulse-twinkle" : undefined}
            style={{ opacity: star.twinkle ? undefined : 0.45, animationDelay: `${star.delay}s` }}
          />
        ))}
      </svg>

      {/* Perspective floor plane. */}
      <div className="absolute inset-x-[-25%] bottom-0 h-[46%] [perspective:520px]">
        <div
          className="absolute inset-0 origin-bottom animate-pulse-grid"
          style={{
            transform: "rotateX(68deg)",
            backgroundImage:
              "linear-gradient(to right, rgb(0 207 255 / 0.28) 1px, transparent 1px), linear-gradient(to bottom, rgb(36 124 255 / 0.28) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
            maskImage: "linear-gradient(to top, #000 15%, transparent 85%)",
            WebkitMaskImage: "linear-gradient(to top, #000 15%, transparent 85%)",
          }}
        />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-[radial-gradient(60%_80%_at_50%_100%,rgb(36_124_255/0.22),transparent_70%)]" />
      </div>
      {/* Horizon glow line. */}
      <div className="absolute inset-x-0 bottom-[46%] h-px bg-gradient-to-r from-transparent via-pulse-cyan/40 to-transparent" />

      {/* Floating wireframe geometry. */}
      <div className="absolute inset-0 [perspective:1200px]">
        <div
          className="absolute left-[4%] top-[20%] hidden animate-pulse-float md:block"
          style={{
            ["--rx" as string]: "48deg",
            ["--rz" as string]: "-24deg",
            ["--dy" as string]: "-14px",
          }}
        >
          <WirePanel accent="cyan" className="relative h-28 w-44" />
        </div>
        <div
          className="absolute left-[12%] top-[56%] hidden animate-pulse-float-slow lg:block"
          style={{
            ["--rx" as string]: "56deg",
            ["--rz" as string]: "-36deg",
            ["--dy" as string]: "-10px",
          }}
        >
          <WirePanel accent="cyan" className="relative h-20 w-32 opacity-70" />
        </div>
        <div
          className="absolute right-[5%] top-[16%] hidden animate-pulse-float-slow md:block"
          style={{
            ["--rx" as string]: "50deg",
            ["--rz" as string]: "26deg",
            ["--dy" as string]: "-16px",
          }}
        >
          <WirePanel accent="magenta" className="relative h-32 w-48" />
        </div>
        <div
          className="absolute right-[14%] top-[58%] hidden animate-pulse-float lg:block"
          style={{
            ["--rx" as string]: "0deg",
            ["--rz" as string]: "0deg",
            ["--dy" as string]: "-12px",
          }}
        >
          <WireCube size={64} color="var(--pulse-pink)" />
        </div>
        <div
          className="absolute left-[22%] top-[10%] hidden animate-pulse-float-slow xl:block"
          style={{
            ["--rx" as string]: "0deg",
            ["--rz" as string]: "0deg",
            ["--dy" as string]: "-8px",
          }}
        >
          <WireCube size={40} color="var(--pulse-cyan)" />
        </div>
        <div
          className="absolute right-[26%] top-[8%] hidden animate-pulse-float xl:block"
          style={{
            ["--rx" as string]: "0deg",
            ["--rz" as string]: "0deg",
            ["--dy" as string]: "-10px",
          }}
        >
          <WireCube size={32} color="var(--pulse-magenta)" />
        </div>
      </div>

      {/* Bottom fade into the page. */}
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-pulse-bg" />
    </div>
  );
});
