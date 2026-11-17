import Link from "next/link";
import { ViewTransition } from "react";
import { cn } from "@/lib/utils";
import { tileSurfaceClasses } from "@/lib/tile-surface";

/* ---------------------------------------------------------------------------
 * Shape language: translucent tiles over the moving background. No border:
 * a soft shadow and a 1px highlight on the top edge set each tile apart.
 * ------------------------------------------------------------------------- */

/** The shared tile surface: see DESIGN.md and the --tile-* tokens in globals.css. */
export const tileSurface = tileSurfaceClasses;

export function Card({
  className,
  children,
  ...props
}: React.ComponentProps<"section">) {
  return (
    <section className={cn("overflow-hidden", tileSurface, className)} {...props}>
      {children}
    </section>
  );
}

/**
 * Small bento tile: one label, one figure, one detail line. With `href` the
 * whole tile is a link and gets a small spring on hover and press.
 */
/** One shared name per page title, e.g. "page-training". */
export const pageTransitionName = (title: string) => `page-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

/**
 * Small bento tile without a title: the content says what it is. `label` is
 * the accessible name only; `caption` is the one visible line, for tiles whose
 * content alone is ambiguous (tomorrow, a Moodle deadline, an old import).
 */
export function Tile({
  label,
  icon,
  caption,
  href,
  morphInto,
  className,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  caption?: React.ReactNode;
  href?: string;
  /** Title of the page `href` opens: the tile morphs into that page's header. */
  morphInto?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const body = (
    <>
      {(icon || caption) && (
        <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
          {icon}
          {caption && <span className="truncate">{caption}</span>}
        </div>
      )}
      <div className="mt-auto flex min-w-0 flex-col pt-3">{children}</div>
    </>
  );
  const shape = cn("flex min-h-28 min-w-0 flex-col self-stretch p-4", tileSurface, className);
  if (!href) return <section aria-label={label} className={shape}>{body}</section>;
  const external = href.startsWith("http");
  const link = (
    <Link
      href={href}
      aria-label={label}
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
      className={cn(
        shape,
        "transition-[translate,box-shadow] duration-[var(--dur)] ease-[var(--ease)] hover:-translate-y-px hover:shadow-[inset_0_1px_0_var(--tile-highlight),var(--tile-shadow),0_16px_36px_-18px_rgb(0_0_0/0.45)] active:translate-y-0 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
      )}
    >
      {body}
    </Link>
  );
  return morphInto ? <ViewTransition name={pageTransitionName(morphInto)}>{link}</ViewTransition> : link;
}

/** Page title row: title, optional description, actions on the right. */
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
        {/* Named after the page, so a Today tile that links here morphs into it. */}
        {typeof title === "string" ? (
          <ViewTransition name={pageTransitionName(title)}>
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          </ViewTransition>
        ) : (
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        )}
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
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
    <div
      className={cn("flex items-start justify-between gap-4 px-5 pt-4", className)}
    >
      <div className="min-w-0">
        <h2 className="text-sm font-semibold">{title}</h2>
        {subtitle && (
          <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}

/** Panel header row above a list. */
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
    <div
      className={cn(
        "flex min-h-12 items-center justify-between gap-3 border-b border-border px-5 py-2.5",
        className
      )}
    >
      <h2 className="text-sm font-semibold">{children}</h2>
      {action}
    </div>
  );
}

export function SeeAll({ href, children = "See all" }: { href: string; children?: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
    >
      {children}
    </Link>
  );
}

/** Identity mark beside a list row: a small dot in the source's colour. */
export function IconTile({
  color,
  label,
  className,
}: {
  /** Any CSS color, e.g. the calendar's own colour. */
  color?: string;
  label: string;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <span
      className={cn("flex size-4 shrink-0 items-center justify-center", className)}
      title={label}
      aria-hidden
    >
      <span
        className="size-2 rounded-full"
        style={{ background: color || "var(--faint)" }}
      />
    </span>
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
    neutral: "border-border bg-muted text-muted-foreground",
    muted: "border-border bg-transparent text-faint",
    // Emphasis without colour: blue is kept for links, focus and selection.
    accent: "border-strong bg-background text-foreground",
    good: "border-transparent bg-good/10 text-good",
    warn: "border-transparent bg-warn/10 text-warn",
    bad: "border-transparent bg-bad/10 text-bad",
  }[tone];

  return (
    <span
      className={cn(
        "nums inline-flex h-5 items-center rounded-md border px-1.5 text-xs font-medium whitespace-nowrap",
        tones,
        className
      )}
    >
      {children}
    </span>
  );
}

export function IconButton({
  className,
  children,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/** One prominent figure with its label. */
export function BigStat({
  value,
  label,
  delta,
  tone = "default",
  className,
}: {
  value: string;
  label?: React.ReactNode;
  delta?: string;
  tone?: "default" | "accent" | "good" | "warn" | "bad";
  className?: string;
}) {
  const toneClass = {
    default: "text-foreground",
    accent: "text-brand",
    good: "text-good",
    warn: "text-warn",
    bad: "text-bad",
  }[tone];

  return (
    <div className={className}>
      <div className={cn("nums text-3xl leading-none font-semibold tracking-tight", toneClass)}>
        {value}
      </div>
      {(label || delta) && (
        <div className="mt-1.5 text-sm leading-snug text-muted-foreground">
          {delta && <span className="font-medium text-foreground">{delta}</span>}
          {delta && label ? " " : null}
          {label}
        </div>
      )}
    </div>
  );
}

/** Compact metric used in grouped stat strips. */
export function Metric({
  label,
  value,
  tone = "default",
  className,
}: {
  label: string;
  value: string;
  tone?: "default" | "accent" | "good" | "warn" | "bad";
  className?: string;
}) {
  const toneClass = {
    default: "text-foreground",
    accent: "text-brand",
    good: "text-good",
    warn: "text-warn",
    bad: "text-bad",
  }[tone];

  return (
    <div className={className}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn("nums mt-1 text-xl font-semibold tracking-tight", toneClass)}>
        {value}
      </div>
    </div>
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
    <div
      className={cn(
        "flex items-center gap-3 border-t border-border px-5 py-2.5 first:border-t-0",
        className
      )}
    >
      {leading}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{left}</div>
        {sub && <div className="mt-0.5 truncate text-xs text-muted-foreground">{sub}</div>}
      </div>
      {right && (
        <div className="nums shrink-0 text-xs whitespace-nowrap text-muted-foreground">
          {right}
        </div>
      )}
      {trailing}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-5 py-8 text-center text-sm text-muted-foreground">{children}</div>
  );
}

/** Footer row of a panel, for its link out. */
export function PanelFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-end border-t border-border px-5 py-2.5">
      {children}
    </div>
  );
}
