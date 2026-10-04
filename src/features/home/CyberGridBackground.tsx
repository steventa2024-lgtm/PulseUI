/**
 * The home hero's "cyber grid": a fine technical grid, a perspective floor
 * plane, faint data particles, blue/cyan light on the left, magenta/red on the
 * right, and a few floating wireframe panels and cubes.
 *
 * CSS + inline SVG only. Every animation is slow, transform/opacity based, and
 * disabled under prefers-reduced-motion (see styles.css).
 */
import { memo, type CSSProperties } from "react";

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

type CubeProps = {
  size: number;
  /** Colour of the edges facing the viewer. */
  front: string;
  /** Colour of the top/side edges. */
  side: string;
  rotate: string;
  className?: string;
  style?: CSSProperties;
  dim?: boolean;
};

/** A translucent CSS 3D cube with neon edges. */
function NeonCube({ size, front, side, rotate, className, style, dim }: CubeProps) {
  const half = size / 2;
  const face = (color: string, transform: string, strength: number) => (
    <div
      className="absolute inset-0 rounded-[6px]"
      style={{
        transform,
        border: `3px solid ${color}`,
        background: `linear-gradient(135deg, color-mix(in oklab, ${color} ${26 * strength}%, #0a0f2a), color-mix(in oklab, #070b22 88%, transparent) 75%)`,
        boxShadow: `0 0 ${22 * strength}px ${color}, 0 0 ${6 * strength}px ${color}, inset 0 0 ${22 * strength}px color-mix(in oklab, ${color} 70%, transparent)`,
        backfaceVisibility: "visible",
      }}
    />
  );
  return (
    <div className={cn("absolute [perspective:900px]", className)} style={style}>
      <div className="animate-pulse-bob">
        <div
          className="relative"
          style={{
            width: size,
            height: size,
            transformStyle: "preserve-3d",
            transform: rotate,
            opacity: dim ? 0.55 : 1,
          }}
        >
          {face(side, `rotateY(180deg) translateZ(${half}px)`, 0.6)}
          {face(side, `rotateY(-90deg) translateZ(${half}px)`, 0.8)}
          {face(side, `rotateX(-90deg) translateZ(${half}px)`, 0.6)}
          {face(side, `rotateX(90deg) translateZ(${half}px)`, 1)}
          {face(side, `rotateY(90deg) translateZ(${half}px)`, 0.9)}
          {face(front, `translateZ(${half}px)`, 1.1)}
        </div>
      </div>
    </div>
  );
}

const PINK = "#ff2d8a";
const BLUE = "#2f7dff";
const CYAN = "#3aa8ff";

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

      {/* Floating neon cubes. */}
      <div className="absolute inset-0 hidden md:block">
        <NeonCube
          size={72}
          front={PINK}
          side={PINK}
          rotate="rotateX(-18deg) rotateY(28deg) rotateZ(-14deg)"
          className="left-[7%] top-[16%]"
          dim
        />
        <NeonCube
          size={124}
          front={PINK}
          side={BLUE}
          rotate="rotateX(-22deg) rotateY(32deg) rotateZ(-16deg)"
          className="left-[2%] top-[24%]"
        />
        <NeonCube
          size={50}
          front={CYAN}
          side={BLUE}
          rotate="rotateX(-20deg) rotateY(30deg) rotateZ(10deg)"
          className="left-[10%] top-[48%] hidden lg:block"
          style={{ animationDelay: "-3s" }}
        />
        <NeonCube
          size={56}
          front={BLUE}
          side={BLUE}
          rotate="rotateX(-20deg) rotateY(-30deg) rotateZ(12deg)"
          className="right-[9%] top-[17%]"
          dim
        />
        <NeonCube
          size={88}
          front={BLUE}
          side={CYAN}
          rotate="rotateX(-20deg) rotateY(-32deg) rotateZ(14deg)"
          className="right-[6%] top-[23%]"
        />
        <NeonCube
          size={112}
          front={PINK}
          side={BLUE}
          rotate="rotateX(-22deg) rotateY(-34deg) rotateZ(16deg)"
          className="right-[1%] top-[40%] hidden lg:block"
        />
      </div>

      {/* Bottom fade into the page. */}
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-pulse-bg" />
    </div>
  );
});
