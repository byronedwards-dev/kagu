import { DM_Sans, Playfair_Display } from "next/font/google";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["400", "500", "600", "700"],
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  weight: ["700"],
});

export const metadata = {
  title: "Kagu Kids — Book Builder",
  description: "AI-powered personalized children's storybook creator",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${playfair.variable}`}>
      <body style={{ margin: 0, background: "#111114" }}>{children}</body>
    </html>
  );
}
