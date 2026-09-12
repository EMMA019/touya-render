import type { Metadata } from "next";
import { Noto_Sans_JP, Shippori_Mincho } from "next/font/google";
import { AgeGateModal } from "@/components/age-gate-modal";
import { AnonBootstrap } from "@/components/anon-bootstrap";
import { ModeProvider } from "@/components/mode-provider";
import { META_DESCRIPTION, META_TITLE } from "@/lib/product-copy";
import "./globals.css";

const sans = Noto_Sans_JP({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const display = Shippori_Mincho({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "700"],
});

export const metadata: Metadata = {
  title: META_TITLE,
  description: META_DESCRIPTION,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ja"
      className={`${sans.variable} ${display.variable} dark h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <AnonBootstrap />
        <ModeProvider>
          {children}
          <AgeGateModal />
        </ModeProvider>
      </body>
    </html>
  );
}
