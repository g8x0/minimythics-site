import React from "react";
// import { cn } from "@/lib/utils";
// Actually, standard bun-react-template usually doesn't have @/lib/utils by default unless set up.
// Looking at package.json, it has `clsx` and `tailwind-merge` but maybe not the helper.
// I'll define a quick helper or just use clsx directly here to be safe.

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "accent" | "ghost";
  size?: "sm" | "md" | "lg";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", children, ...props }, ref) => {

    const variants = {
      primary: "bg-[var(--color-primary)] text-white border-b-4 border-[var(--color-primary-dark)] active:border-b-0 active:translate-y-1 hover:brightness-110",
      secondary: "bg-[var(--color-secondary)] text-white border-b-4 border-[var(--color-secondary-dark)] active:border-b-0 active:translate-y-1 hover:brightness-110",
      accent: "bg-[var(--color-accent)] text-white border-b-4 border-[var(--color-accent-dark)] active:border-b-0 active:translate-y-1 hover:brightness-110",
      ghost: "bg-transparent hover:bg-black/5 text-current border-none shadow-none",
    };

    const sizes = {
      sm: "h-8 px-3 text-sm rounded-xl",
      md: "h-12 px-6 text-base rounded-2xl",
      lg: "h-16 px-8 text-xl rounded-3xl",
    };

    return (
      <button
        ref={ref}
        className={cn(
          "font-heading font-bold transition-all duration-100 flex items-center justify-center gap-2 outline-none",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
