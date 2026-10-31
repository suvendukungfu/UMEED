"use client";

import React from "react";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "destructive";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
  iconPosition?: "left" | "right";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = "primary",
      size = "md",
      loading = false,
      disabled = false,
      icon: Icon,
      iconPosition = "left",
      className = "",
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-semibold rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-800 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none";

    const variantStyles = {
      primary:
        "bg-coral-500 hover:bg-coral-600 text-white shadow-sm hover:shadow active:bg-coral-700",
      secondary:
        "bg-forest-800 hover:bg-forest-900 text-white shadow-sm hover:shadow active:bg-forest-950",
      outline:
        "border border-forest-800/30 hover:border-forest-800 text-forest-800 bg-transparent hover:bg-forest-50 active:bg-forest-100",
      ghost:
        "text-forest-800 hover:bg-forest-100/60 active:bg-forest-100",
      danger:
        "bg-red-600 hover:bg-red-700 text-white shadow-sm active:bg-red-800",
      destructive:
        "bg-red-600 hover:bg-red-700 text-white shadow-sm active:bg-red-800",
    };

    const sizeStyles = {
      sm: "text-xs px-3 py-1.5 min-h-[36px] gap-1.5",
      md: "text-sm px-4 py-2 min-h-[44px] gap-2",
      lg: "text-base px-6 py-3 min-h-[48px] gap-2.5",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin shrink-0" />}
        {!loading && Icon && iconPosition === "left" && (
          <Icon className="h-4 w-4 shrink-0" />
        )}
        <span>{children}</span>
        {!loading && Icon && iconPosition === "right" && (
          <Icon className="h-4 w-4 shrink-0" />
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
