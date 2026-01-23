import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vessel Issue Reporting System",
  description: "Fleet management and issue reporting",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
