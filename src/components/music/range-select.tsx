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
    <nav aria-label={label} className="inline-flex overflow-hidden rounded-md border border-border">
      {options.map((o, i) => (
        <Link
          key={o.value}
          href={href(o.value)}
          scroll={false}
          aria-current={o.value === value ? "true" : undefined}
          className={cn(
            "px-2.5 py-1 text-xs transition-colors",
            i > 0 && "border-l border-border",
            o.value === value ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:bg-muted"
          )}
        >
          {o.label}
        </Link>
      ))}
    </nav>
  );
}
