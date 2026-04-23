"use client";
import { createContext, useContext, useState, useEffect, useCallback } from "react";

interface CartContextType {
  cartCount: number;
  refreshCart: () => void;
}

const CartContext = createContext<CartContextType>({ cartCount: 0, refreshCart: () => {} });

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cartCount, setCartCount] = useState(0);

  const refreshCart = useCallback(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/cart`, {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        const total = (data.articles || []).reduce(
          (acc: number, item: any) => acc + item.quantite, 0
        );
        setCartCount(total);
      })
      .catch(() => setCartCount(0));
  }, []);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  return (
    <CartContext.Provider value={{ cartCount, refreshCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}