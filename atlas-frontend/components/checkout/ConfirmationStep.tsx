import { CheckCircle2, Package } from "lucide-react";
import Link from "next/link";

interface ConfirmationStepProps {
  orderNumber: string;
}

export function ConfirmationStep({ orderNumber }: ConfirmationStepProps) {
  return (
    <div
      className="bg-white rounded-2xl p-10 text-center"
      style={{ border: "1px solid var(--border-section)", boxShadow: "var(--shadow-elevated)" }}
    >
      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-50 border-2 border-green-200 flex items-center justify-center">
        <CheckCircle2 className="h-10 w-10 text-green-500" />
      </div>

      <h2 className="text-2xl font-black text-slate-900 mb-2">Commande confirmée !</h2>
      <p className="text-slate-500 mb-1">
        Votre commande{" "}
        <span className="font-bold text-slate-900">#{orderNumber}</span> a été validée.
      </p>
      <p className="text-slate-400 text-sm mb-8">
        Vous recevrez un e-mail de confirmation dans quelques instants.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href="/orders"
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl transition-all text-sm"
        >
          <Package className="h-4 w-4" />
          Voir mes commandes
        </Link>
        <Link
          href="/catalogue"
          className="flex items-center justify-center border border-slate-200 hover:border-slate-300 text-slate-700 font-semibold px-6 py-3 rounded-xl transition-all text-sm"
        >
          Continuer mes achats
        </Link>
      </div>
    </div>
  );
}
