import type { Metadata } from "next";
import { Playfair_Display, DM_Sans, Hina_Mincho } from "next/font/google";
import "./globals.css";

const serif = Playfair_Display({
  variable: "--font-serif",
  subsets: ["latin"],
  display: "swap",
});

const sans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const japanese = Hina_Mincho({
  variable: "--font-japanese",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Notre Liste de Naissance",
  description: "Découvrez notre liste de naissance et offrez le cadeau parfait pour notre bébé !",
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={`${serif.variable} ${sans.variable} ${japanese.variable} font-sans antialiased bg-surface`}>
        {children}
      </body>
    </html>
  );
}
