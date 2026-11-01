import { cn } from "@/utils/cn";
import { brandDisplayClass } from "./font";
import type { MascotCycle } from "./mascotFrames";

/**
 * The Agent Gen AI logo mark:
 * Modern, executive generative AI icon featuring a radiant neural core
 * and 4-point generative spark on a glassmorphism gradient tile.
 */

export const ICON_RADIUS = "22%";

export type Walk = { walk?: MascotCycle; walkOn?: "always" | "hover" };

/**
 * Pure SVG modern AI Neural Spark Logo Mark
 */
export function AiGenLogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("size-full select-none", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="aiSparkGrad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="45%" stopColor="#F0F5FF" />
          <stop offset="100%" stopColor="#C7D2FE" />
        </linearGradient>
        <linearGradient id="aiOrbGrad" x1="8" y1="8" x2="16" y2="16" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#818CF8" />
          <stop offset="100%" stopColor="#4F46E5" />
        </linearGradient>
        <filter id="coreGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="0.8" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Radiant Diamond / Neural Spark Core */}
      <path
        d="M12 2C12 7.52 7.52 12 2 12C7.52 12 12 16.48 12 22C12 16.48 16.48 12 22 12C16.48 12 12 7.52 12 2Z"
        fill="url(#aiSparkGrad)"
        filter="drop-shadow(0 1px 2px rgba(15, 23, 42, 0.45))"
      />

      {/* Central Intelligent Core */}
      <circle cx="12" cy="12" r="3" fill="url(#aiOrbGrad)" filter="url(#coreGlow)" />
      <circle cx="12" cy="12" r="1.4" fill="#FFFFFF" />

      {/* 4 Agent Orchestration Nodes */}
      <circle cx="12" cy="4.2" r="1" fill="#FFFFFF" fillOpacity="0.95" />
      <circle cx="19.8" cy="12" r="1" fill="#FFFFFF" fillOpacity="0.95" />
      <circle cx="12" cy="19.8" r="1" fill="#FFFFFF" fillOpacity="0.95" />
      <circle cx="4.2" cy="12" r="1" fill="#FFFFFF" fillOpacity="0.95" />
    </svg>
  );
}

/**
 * Premium glassmorphism app tile containing the AI symbol.
 */
export function AppIcon({
  className,
  small = false,
}: { className?: string; small?: boolean } & Walk) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden transition-transform duration-200 group-hover:scale-105",
        "bg-gradient-to-tr from-[#2563eb] via-[#4f46e5] to-[#7c3aed]",
        small
          ? "shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_2px_8px_-1px_rgba(79,70,229,0.55)] ring-1 ring-white/20"
          : "shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_8px_24px_-4px_rgba(79,70,229,0.7)] ring-1 ring-white/25",
        className,
      )}
      style={{ borderRadius: ICON_RADIUS }}
    >
      {/* Specular glass reflection layer */}
      <span className="absolute inset-0 bg-gradient-to-b from-white/25 via-transparent to-black/15 pointer-events-none" />
      
      {/* Subtle high-tech grid accent */}
      <span className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:33%_33%]" />

      {/* Centered AI Neural Spark Symbol */}
      <span className="relative size-[68%] flex items-center justify-center">
        <AiGenLogoMark />
      </span>
    </span>
  );
}

/** Standalone mark */
export function AgentMark({ className }: { className?: string }) {
  return <AiGenLogoMark className={className} />;
}

/**
 * Tile and Brand Name combined:
 * Renders the sleek app tile followed by "Agent Gen AI" with modern typography.
 */
export function Logo({
  className,
  iconClassName = "size-7",
  textClassName = "text-[18px]",
  label = "Agent Gen AI",
  walk,
  walkOn,
}: {
  className?: string;
  iconClassName?: string;
  textClassName?: string;
  label?: string;
} & Walk) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <AppIcon small className={iconClassName} walk={walk} walkOn={walkOn} />
      <span className={cn(brandDisplayClass, "font-bold tracking-tight leading-none text-text-strong-950", textClassName)}>
        {label}
      </span>
    </span>
  );
}
