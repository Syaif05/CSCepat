import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PesanRapi — Template Pesan Customer Service",
  description:
    "Susun pesan customer service profesional, cepat, konsisten, dan aman tanpa mengetik ulang format pesan yang sama.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="antialiased min-h-screen bg-background text-text-main">
        {children}
      </body>
    </html>
  );
}
