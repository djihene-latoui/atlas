"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { AddressData } from "@/lib/checkout";

interface AddressStepProps {
  initial?: AddressData | null;
  onNext: (data: AddressData) => void;
}

const EMPTY: AddressData = {
  firstName: "",
  lastName: "",
  address: "",
  postalCode: "",
  city: "",
  phone: "",
};

export function AddressStep({ initial, onNext }: AddressStepProps) {
  const [form, setForm] = useState<AddressData>(initial ?? EMPTY);
  const [errors, setErrors] = useState<Partial<AddressData>>({});

  const update = (field: keyof AddressData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validate = (): boolean => {
    const newErrors: Partial<AddressData> = {};
    if (!form.firstName.trim()) newErrors.firstName = "Requis";
    if (!form.lastName.trim()) newErrors.lastName = "Requis";
    if (!form.address.trim()) newErrors.address = "Requis";
    if (!form.postalCode.trim()) newErrors.postalCode = "Requis";
    if (!form.city.trim()) newErrors.city = "Requis";
    if (!form.phone.trim()) newErrors.phone = "Requis";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) onNext(form);
  };

  return (
    <div
      className="bg-white rounded-2xl p-8"
      style={{ border: "1px solid var(--border-section)", boxShadow: "var(--shadow-elevated)" }}
    >
      <h2 className="text-xl font-bold text-slate-900 mb-6">Adresse de livraison</h2>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Prénom" error={errors.firstName}>
            <Input
              placeholder="Jean"
              value={form.firstName}
              onChange={(e) => update("firstName", e.target.value)}
              className={errors.firstName ? "border-red-400" : ""}
            />
          </Field>
          <Field label="Nom" error={errors.lastName}>
            <Input
              placeholder="Dupont"
              value={form.lastName}
              onChange={(e) => update("lastName", e.target.value)}
              className={errors.lastName ? "border-red-400" : ""}
            />
          </Field>
        </div>

        <Field label="Adresse" error={errors.address}>
          <Input
            placeholder="123 Rue de la Paix"
            value={form.address}
            onChange={(e) => update("address", e.target.value)}
            className={errors.address ? "border-red-400" : ""}
          />
        </Field>

        <div className="grid grid-cols-3 gap-4">
          <Field label="Code postal" error={errors.postalCode}>
            <Input
              placeholder="75001"
              value={form.postalCode}
              onChange={(e) => update("postalCode", e.target.value)}
              className={errors.postalCode ? "border-red-400" : ""}
            />
          </Field>
          <div className="col-span-2">
            <Field label="Ville" error={errors.city}>
              <Input
                placeholder="Paris"
                value={form.city}
                onChange={(e) => update("city", e.target.value)}
                className={errors.city ? "border-red-400" : ""}
              />
            </Field>
          </div>
        </div>

        <Field label="Téléphone" error={errors.phone}>
          <Input
            type="tel"
            placeholder="+33 6 12 34 56 78"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            className={errors.phone ? "border-red-400" : ""}
          />
        </Field>

        <button
          onClick={handleSubmit}
          className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold py-3.5 rounded-xl transition-all mt-2"
        >
          Continuer vers la livraison →
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
