import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Providers } from "@/components/providers";
import { CartProvider } from "@/contexts/CartContext";
import "./globals.css";
import { AuthModalProvider } from "@/contexts/AuthModalContext";
import { AuthModal } from "@/components/ui/AuthModal";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Atlas — La plateforme multi-vendeurs",
  description: "Atlas connecte des milliers de vendeurs indépendants avec des clients du monde entier.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${geistSans.variable} ${geistMono.variable} antialiased`} suppressHydrationWarning>
      <body className="min-h-screen flex flex-col antialiased" suppressHydrationWarning>
        <CartProvider>
          <Providers>
            <AuthModalProvider>
              <Header />
              <AuthModal />
              <main className="flex-1">{children}</main>
              <Footer />
            </AuthModalProvider>
          </Providers>
        </CartProvider>
      </body>
    </html>
  );
}