"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * TanStack Query, for client data that changes while the page is open
 * (polling, live status). Pages still load through server components.
 * One client per browser tab; useState keeps it across re-renders.
 */
export function Queries({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } })
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
