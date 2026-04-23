export type CheckoutStep = "address" | "shipping" | "payment" | "confirmation";

export interface AddressData {
  firstName: string;
  lastName: string;
  address: string;
  postalCode: string;
  city: string;
  phone: string;
}

export interface ShippingMethod {
  id: "standard" | "express" | "next-day";
  label: string;
  description: string;
  price: number;
}

export interface PaymentData {
  cardNumber: string;
  cardName: string;
  expiry: string;
  cvv: string;
}

export interface CheckoutState {
  address: AddressData | null;
  shipping: ShippingMethod | null;
  payment: PaymentData | null;
  orderNumber: string | null;
}

export const SHIPPING_METHODS: ShippingMethod[] = [
  {
    id: "standard",
    label: "Livraison Standard",
    description: "5-7 jours ouvrés",
    price: 0,
  },
  {
    id: "express",
    label: "Livraison Express",
    description: "2-3 jours ouvrés",
    price: 9.99,
  },
  {
    id: "next-day",
    label: "Livraison Lendemain",
    description: "Commandez avant 14h",
    price: 14.99,
  },
];