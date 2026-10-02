import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/lib/genlayer/Providers";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Settleit — let the jury settle it",
  description: "Two sides. One dispute. A GenLayer jury settles it. Social adjudication on GenLayer StudioNet.",
  manifest: "/site.webmanifest",
  icons: { icon: "/favicon.svg" },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#07040D" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="skip" href="#main">Skip to content</a>
        <Providers>
          <Header />
          <main id="main" className="wrap">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
