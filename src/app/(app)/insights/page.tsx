import { redirect } from "next/navigation";
import { pageQuery } from "@/lib/spotify/chart-filters";

export default async function InsightsPage({searchParams}: {searchParams:Promise<Record<string,string | string[] | undefined>>}) {
  const query = pageQuery(await searchParams, ["year","albums","streaks"]);
  redirect(query.size ? `/recap?${query}` : "/recap");
}
