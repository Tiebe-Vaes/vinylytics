import { redirect } from "next/navigation";
import { isOwner } from "@/lib/owner";
import { DemoBanner } from "@/components/shell/demo-banner";
import { ImportDock } from "@/components/music/import-dock";
import { TabBar } from "@/components/shell/tab-bar";
import { TopBar } from "@/components/shell/top-bar";
import { ToastProvider } from "@/components/toaster";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  if (!(await isOwner())) redirect("/login");
  return (
    <ToastProvider>
      <DemoBanner />
      <TopBar />
      {/* pb clears the phone tab bar (h-16) plus the home indicator. */}
      <main className="mx-auto max-w-5xl px-4 pt-4 pb-28 md:pb-16">{children}</main>
      <ImportDock />
      <TabBar />
    </ToastProvider>
  );
}
