import Link from "next/link";
import { cn } from "@/lib/utils";

/** Segmented links: the range lives in the URL so it survives reloads and back. */
export function RangeSelect<T extends string>({
  options,
  value,
  href,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  href: (v: T) => string;
  label: string;
}) {
  return (
    <nav aria-label={label} className="inline-flex overflow-hidden rounded-[2px] border border-strong">
      {options.map((o, i) => (
        <Link
          key={o.value}
          href={href(o.value)}
          scroll={false}
          aria-current={o.value === value ? "true" : undefined}
          className={cn(
            "px-3 py-1.5 text-xs font-semibold transition-colors",
            i > 0 && "border-l border-strong",
            o.value === value ? "bg-text text-ground" : "text-muted-text hover:text-text"
          )}
        >
          {o.label}
        </Link>
      ))}
    </nav>
  );
}
