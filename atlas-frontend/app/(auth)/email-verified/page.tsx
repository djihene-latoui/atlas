"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

export default function EmailVerifiedPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 py-12 px-4 relative overflow-hidden font-sans w-full">
      <main className="w-full max-w-[480px] z-10">
        <div className="bg-white rounded-2xl w-full px-10 py-12 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-zinc-100 animate-slideUp flex flex-col items-center text-center">
          
          <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-sm">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          
          <h1 className="text-[30px] font-extrabold text-zinc-900 mb-3 tracking-tight">
            Email vérifié !
          </h1>
          
          <p className="text-zinc-500 mb-8 leading-relaxed">
            Votre adresse email a été vérifiée avec succès. Vous pouvez maintenant accéder à toutes les fonctionnalités d'Atlas.
          </p>
          
          <Link
            href="/login"
            className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-500/20 text-[15px] flex justify-center items-center"
          >
            Se connecter / Accéder à mon espace
          </Link>
          
        </div>
      </main>
    </div>
  );
}
