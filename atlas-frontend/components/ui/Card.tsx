import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`bg-white rounded-xl overflow-hidden ${className}`}
      style={{
        border: "1px solid var(--border-section)",
        boxShadow: "var(--shadow-elevated)",
      }}
    >
      {children}
    </div>
  );
}
