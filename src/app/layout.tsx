import type { Metadata } from "next";
import "./globals.css";
import "../styles/page.css";

export const metadata: Metadata = {
  title: "SEO Checker — Web Quality Audit Tool",
  description: "Analyze any website for SEO compliance, broken elements, visual consistency, and overall quality using advanced Puppeteer-powered scanning.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
