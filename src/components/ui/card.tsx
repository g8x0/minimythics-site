import React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "glass";
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-[2rem] p-6 relative overflow-hidden",
          variant === "default" && "bg-white border-4 border-amber-100 shadow-xl shadow-amber-900/10",
          variant === "glass" && "bg-white/60 backdrop-blur-md border border-white/50 shadow-lg",
          className
        )}
        {...props}
      >
        {/* Decorative top stitch/line */}
        {variant === "default" && (
          <div className="absolute top-3 left-6 right-6 h-0.5 bg-amber-100/50 dashed-line"></div>
        )}
        {children}
      </div>
    );
  }
);
Card.displayName = "Card";
