import { Playfair_Display, DM_Sans, Hina_Mincho } from "next/font/google";
import type { Metadata } from "next";
import "./globals.css";

const serif = Playfair_Display({
  variable: "--font-serif",
  subsets: ["latin"],
  display: "swap",
  preload: true,
  adjustFontFallback: true,
});

const sans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
  preload: true,
  adjustFontFallback: true,
});

const japanese = Hina_Mincho({
  variable: "--font-japanese",
  subsets: ["latin", "latin-ext"],
  weight: "400",
  display: "swap",
  preload: true,
  adjustFontFallback: false, // Japanese fonts don't have reliable fallbacks
});

export const metadata: Metadata = {
  title: "Nathalie x Camille x Alexis : La Liste",
  description:
    "Camille verra bientôt le jour sous le soleil d'Okinawa. Découvrez son petit monde d'ici à votre rencontre !",
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
      <body
        className={`${serif.variable} ${sans.variable} ${japanese.variable} bg-surface font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
