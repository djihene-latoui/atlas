"use client";

import { useAuth } from "@/contexts/AuthContext";
import { AlertTriangle, Home } from "lucide-react";
import Link from "next/link";

export default function VendorLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  
  // Pendant la vérification de la session, on affiche un loader minimaliste
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5c59f2]" />
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== "VENDEUR") {

    return (
      <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl shadow-indigo-100/40 border border-gray-100 max-w-md w-full text-center animate-in fade-in zoom-in duration-300">
          <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <AlertTriangle className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold text-[#0D1B3E] mb-3">Accès Refusé</h1>
          <p className="text-gray-500 mb-8 text-sm leading-relaxed">
            Cette page est un espace sécurisé strictement réservé aux vendeurs. Si vous possédez une boutique sur Atlas, veuillez vous connecter avec le bon compte.
          </p>
          <Link href="/">
            <button className="w-full bg-[#5c59f2] hover:bg-[#4a47d1] text-white py-3.5 px-4 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-indigo-100">
              <Home className="w-4 h-4" />
              Retourner à l'accueil
            </button>
          </Link>
        </div>
      </div>
    );
  }

  // L'utilisateur est autorisé, on rend le contenu de la page (dashboard, products, shop...)
  return <>{children}</>;
}
