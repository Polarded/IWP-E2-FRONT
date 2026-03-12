import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hawk Solutions — Gestión de viajes corporativos",
  description: "Hawk Solutions: sistema corporativo de gestión de viajes",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
