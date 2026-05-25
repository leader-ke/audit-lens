import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AuditLens: AI Audit Intelligence for Kenyan Auditors",
  description:
    "Generate ISA-compliant working papers, risk assessments, and audit reports in minutes. Built for ICPAK members.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className={`${inter.className} min-h-full`}>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
