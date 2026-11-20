// Browser build: the same root layout (fonts, query client, global styles),
// plus the web app manifest and service worker that make it installable.
import type { Metadata } from "next";
import RootLayout, { metadata as base } from "./layout";
import { RegisterServiceWorker } from "@/browser/install";

export { viewport } from "./layout";

export const metadata: Metadata = {
  ...base,
  manifest: "/app/app.webmanifest",
  appleWebApp: { capable: true, title: "Vinylytics", statusBarStyle: "black-translucent" },
};

export default function BrowserLayout(props: LayoutProps<"/">) {
  return (
    <RootLayout {...props}>
      <RegisterServiceWorker />
      {props.children}
    </RootLayout>
  );
}
