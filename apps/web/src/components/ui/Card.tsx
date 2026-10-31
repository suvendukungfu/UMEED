"use client";

import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  elevation?: "none" | "subtle" | "card" | "elevated" | "sm" | "md";
  padding?: "none" | "sm" | "md" | "lg";
  className?: string;
}

export function Card({
  children,
  elevation = "card",
  padding = "md",
  className = "",
  ...props
}: CardProps) {
  const elevationStyles = {
    none: "border border-warm-grey-200 bg-white",
    subtle: "border border-warm-grey-200 bg-white shadow-subtle",
    sm: "border border-warm-grey-200 bg-white shadow-subtle",
    card: "border border-warm-grey-200 bg-white shadow-card",
    md: "border border-warm-grey-200 bg-white shadow-card",
    elevated: "border border-forest-800/10 bg-white shadow-elevated",
  };

  const paddingStyles = {
    none: "p-0",
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
  };

  return (
    <div
      className={`rounded-2xl transition-all ${elevationStyles[elevation]} ${paddingStyles[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export interface MetricCardProps {
  label: string;
  elevation?: "none" | "subtle" | "card" | "elevated";
  value: string | number;
  subtext?: string;
  icon?: React.ComponentType<{ className?: string }>;
  trend?: string;
  badge?: string;
  className?: string;
}

export function MetricCard({
  label,
  value,
  subtext,
  icon: Icon,
  trend,
  badge,
  elevation = "subtle",
  className = "",
}: MetricCardProps) {
  return (
    <Card elevation={elevation} padding="sm" className={`flex flex-col justify-between ${className}`}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-forest-700/80">
          {label}
        </span>
        {Icon && (
          <div className="h-8 w-8 rounded-lg bg-forest-50 border border-forest-100 flex items-center justify-center text-forest-800">
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>

      <div className="my-1">
        <div className="text-2xl md:text-3xl font-extrabold text-forest-800 tabular-metrics">
          {value}
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-forest-700/70 pt-2 border-t border-warm-grey-100 mt-2">
        <span>{subtext || "Live platform status"}</span>
        {badge && (
          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-warm-grey-100 text-forest-800">
            {badge}
          </span>
        )}
        {trend && <span className="font-semibold text-forest-800">{trend}</span>}
      </div>
    </Card>
  );
}
