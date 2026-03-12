import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ViajesApp — Gestión de viajes corporativos",
  description: "Sistema corporativo de gestión de viajes",
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
