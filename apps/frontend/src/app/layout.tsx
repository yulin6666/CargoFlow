import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CargoFlow - 物流自动化 Demo",
  description: "基于 n8n + AI 的物流自动化演示系统",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased bg-gray-50">
        {children}
      </body>
    </html>
  );
}
