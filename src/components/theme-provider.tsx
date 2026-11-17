"use client";

import { ThemeProvider } from "next-themes";

export function Themes({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      // The colour tokens change instantly; a cross-fade on every surface
      // reads as lag rather than polish.
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  );
}
