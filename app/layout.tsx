import type { Metadata } from "next";
import "./globals.css";
import { staatliches } from "./fonts";
import { lexendDeca } from './fonts';

export const metadata: Metadata = {
  title: "XIT_Building",
  description: "XIT MUSEUM",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${lexendDeca.variable} ${staatliches.variable} `}>
      <body className="!w-screen !h-screen">
        {children}
      </body>
    </html>
  );
}
