import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Matcha - AI-Assisted Job Matching",
  description: "Create your profile and discover job matches without a traditional resume",
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

