import type { Metadata } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import "./globals.css";
import { SITE_URL } from "@/lib/constants";
import MetaPixel from "@/components/analytics/MetaPixel";

const playfair = Cormorant_Garamond({
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const montserrat = Manrope({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Free AI Eye Rejuvenation Analysis · Harley Street Aesthetics",
  description:
    "A 60-second AI analysis of hollowing, dark circles, puffiness, fine lines and crow's feet — matched to the right Harley Street Aesthetics treatment. Doctor-led, London & Glasgow.",
  openGraph: {
    title: "Free AI Eye Rejuvenation Analysis · Harley Street Aesthetics",
    description:
      "Take the 60-second eye rejuvenation analysis and see which Harley Street Aesthetics treatment could suit you, before you book your consultation.",
    url: SITE_URL,
    siteName: "Harley Street Aesthetics",
    locale: "en_GB",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en-GB"
      className={`${playfair.variable} ${montserrat.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        {children}
        <MetaPixel />
      </body>
    </html>
  );
}
