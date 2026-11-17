import Link from "next/link";
import { redirect } from "next/navigation";
import { isOwner } from "@/lib/owner";

const NAV = [
  { href: "/", label: "Stats" },
  { href: "/eras", label: "Eras" },
  { href: "/insights", label: "Insights" },
  { href: "/import", label: "Import" },
  { href: "/settings", label: "Settings" },
] as const;

// shortcut: plain shell until plan 3's sleeve redesign replaces it.
export default async function AppLayout({ children }: LayoutProps<"/">) {
  if (!(await isOwner())) redirect("/login");
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6">
      <nav className="flex gap-4 text-sm font-medium text-muted-foreground">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className="hover:text-foreground">
            {n.label}
          </Link>
        ))}
      </nav>
      <main>{children}</main>
    </div>
  );
}
