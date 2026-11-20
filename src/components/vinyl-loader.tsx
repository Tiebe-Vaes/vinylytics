import { cn } from "@/lib/utils";

/**
 * A record spinning while the tonearm swings onto it. Pure CSS; under reduced
 * motion it rests still with the arm down. `label` is visible and announced.
 * The box is the disc alone, so the disc is what gets centred; the arm hangs outside it.
 */
export function VinylLoader({ label, size = 72, className }: { label: string; size?: number; className?: string }) {
  return (
    <div role="status" className={cn("flex flex-col items-center gap-3", className)}>
      <div className="relative" style={{ width: size, height: size }} aria-hidden="true">
        <div className="absolute inset-0 rounded-full animate-[spin_1.8s_linear_infinite] motion-reduce:animate-none"
          style={{ background: "repeating-radial-gradient(circle, #0f0f10 0 2px, #2a2826 2px 3px)" }}>
          <div className="absolute inset-[34%] rounded-full bg-brand" />
          <div className="absolute inset-[47%] rounded-full bg-ground" />
        </div>
        <div className="absolute top-[4%] h-[78%] w-[3px] origin-top rounded bg-text animate-[tonearm_1.8s_ease-out_both] motion-reduce:animate-none"
          style={{ right: -size * 0.22, transform: "rotate(22deg)" }} />
      </div>
      <p className="text-sm text-muted-text">{label}</p>
    </div>
  );
}
