import { redirect } from "next/navigation";
import { isOwner } from "@/lib/owner";
import { TabBar } from "@/components/shell/tab-bar";
import { TopBar } from "@/components/shell/top-bar";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  if (!(await isOwner())) redirect("/login");
  return (
    <>
      <TopBar />
      {/* pb clears the phone tab bar (h-16) plus the home indicator. */}
      <main className="mx-auto max-w-5xl px-4 pt-4 pb-28 md:pb-16">{children}</main>
      <TabBar />
    </>
  );
}
