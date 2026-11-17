import { cn } from "@/lib/utils";

/* ---------------------------------------------------------------------------
 * Sleeve world shape language: flat sections on the ink-black ground, split
 * by hairline rules. No tiles, no shadows, no glass: colour belongs to the
 * eras' inks, not to containers.
 * ------------------------------------------------------------------------- */

/** A flat section with a hairline rule on top. */
export function Card({ className, children, ...props }: React.ComponentProps<"section">) {
  return (
    <section className={cn("border-t border-rule", className)} {...props}>
      {children}
    </section>
  );
}

/** Same as Card, for new code: a titled section of a page. */
export function Panel({
  title,
  subtitle,
  action,
  className,
  children,
}: {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className={cn("pt-4", className)}>
      {title && <CardHeader title={title} subtitle={subtitle} action={action} className="px-0 pt-0 pb-3" />}
      {children}
    </Card>
  );
}

/** Page title: the sleeve voice, big. */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 pb-6">
      <div className="min-w-0">
        <h1 className="display text-5xl md:text-6xl">{title}</h1>
        {description && <p className="mt-2 max-w-prose text-sm text-muted-text">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4 pt-1 pb-3", className)}>
      <div className="min-w-0">
        <h2 className="display text-2xl">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-muted-text">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/** Header row above a list. */
export function SectionLabel({
  children,
  action,
  className,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-h-12 items-center justify-between gap-3 border-b border-rule py-2.5", className)}>
      <h2 className="display text-2xl">{children}</h2>
      {action}
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "accent" | "good" | "warn" | "bad" | "muted";
  className?: string;
}) {
  const tones = {
    neutral: "border-rule text-muted-text",
    muted: "border-rule text-faint",
    accent: "border-text text-text",
    good: "border-good/50 text-good",
    warn: "border-warn/50 text-warn",
    bad: "border-bad/50 text-bad",
  }[tone];

  return (
    <span
      className={cn(
        "nums inline-flex h-5 items-center rounded-[2px] border px-1.5 text-xs font-semibold whitespace-nowrap",
        tones,
        className
      )}
    >
      {children}
    </span>
  );
}

export function Row({
  left,
  right,
  sub,
  leading,
  trailing,
  className,
}: {
  left: React.ReactNode;
  right?: React.ReactNode;
  sub?: React.ReactNode;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3 border-t border-rule py-2.5 first:border-t-0", className)}>
      {leading}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{left}</div>
        {sub && <div className="mt-0.5 truncate text-xs text-muted-text">{sub}</div>}
      </div>
      {right && <div className="nums shrink-0 text-xs whitespace-nowrap text-muted-text">{right}</div>}
      {trailing}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="py-8 text-sm text-muted-text">{children}</div>;
}
