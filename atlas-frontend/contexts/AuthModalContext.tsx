"use client";

import { createContext, useContext, useState } from "react";

type ModalView = "login" | "register" | null;
type UserType = "buyer" | "seller";

interface AuthModalContextType {
  modalView: ModalView;
  registerType: UserType;
  openLogin: () => void;
  openRegister: (type?: UserType) => void;
  closeModal: () => void;
}

const AuthModalContext = createContext<AuthModalContextType>({
  modalView: null,
  registerType: "buyer",
  openLogin: () => {},
  openRegister: () => {},
  closeModal: () => {},
});

export function AuthModalProvider({ children }: { children: React.ReactNode }) {
  const [modalView, setModalView] = useState<ModalView>(null);
  const [registerType, setRegisterType] = useState<UserType>("buyer");

  return (
    <AuthModalContext.Provider
      value={{
        modalView,
        registerType,
        openLogin: () => setModalView("login"),
        openRegister: (type: UserType = "buyer") => {
          setRegisterType(type);
          setModalView("register");
        },
        closeModal: () => setModalView(null),
      }}
    >
      {children}
    </AuthModalContext.Provider>
  );
}

export function useAuthModal() {
  return useContext(AuthModalContext);
}