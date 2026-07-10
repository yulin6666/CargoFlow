import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CargoFlow - Logistics Automation Demo",
  description: "Logistics automation demo system powered by n8n + AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-gray-50">
        {children}
      </body>
    </html>
  );
}
