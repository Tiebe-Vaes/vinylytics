import type { Metadata, Viewport } from "next";
import { Archivo, Big_Shoulders } from "next/font/google";
import { Queries } from "@/components/query-provider";
import "./globals.css";

const archivo = Archivo({ variable: "--font-ui", subsets: ["latin"], weight: ["400", "600"] });
// Variable with the optical-size axis: at display sizes it draws the poster cut.
const bigShoulders = Big_Shoulders({
  variable: "--font-big-shoulders",
  subsets: ["latin"],
  weight: "variable",
  axes: ["opsz"],
});

export const metadata: Metadata = {
  title: "Vinylytics",
  description: "Your Spotify listening history, pressed as records.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#0f0f10", colorScheme: "dark" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`dark ${archivo.variable} ${bigShoulders.variable} h-full`}>
      <body className="min-h-full">
        <Queries>{children}</Queries>
      </body>
    </html>
  );
}
