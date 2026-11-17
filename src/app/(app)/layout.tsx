import { redirect } from "next/navigation";
import { isOwner } from "@/lib/owner";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  if (!(await isOwner())) redirect("/login");
  return children;
}
