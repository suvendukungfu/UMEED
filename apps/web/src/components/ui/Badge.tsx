"use client";

import React from "react";
import { CheckCircle2, Clock, AlertTriangle, XCircle, ShieldAlert } from "lucide-react";

export type BadgeVariant =
  | "success"
  | "warning"
  | "critical"
  | "info"
  | "neutral"
  | "coral"
  | "demo";

export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: "sm" | "md";
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
}

export function Badge({
  children,
  variant = "neutral",
  size = "md",
  icon: Icon,
  className = "",
}: BadgeProps) {
  const variantStyles: Record<BadgeVariant, string> = {
    success: "bg-forest-100 text-forest-800 border-forest-300 font-medium",
    warning: "bg-amber-50 text-amber-900 border-amber-300 font-medium",
    critical: "bg-red-50 text-red-900 border-red-300 font-medium",
    info: "bg-sky-50 text-sky-900 border-sky-200 font-medium",
    neutral: "bg-warm-grey-100 text-forest-800 border-warm-grey-300 font-medium",
    coral: "bg-coral-50 text-coral-800 border-coral-200 font-semibold",
    demo: "bg-amber-100/80 text-amber-900 border-amber-300 font-mono tracking-wider font-bold",
  };

  const sizeStyles = {
    sm: "text-[10px] px-2 py-0.5 gap-1",
    md: "text-xs px-2.5 py-1 gap-1.5",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border shadow-2xs ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {Icon && <Icon className={size === "sm" ? "h-2.5 w-2.5" : "h-3.5 w-3.5"} />}
      <span>{children}</span>
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  switch (status.toUpperCase()) {
    case "RESOLVED":
    case "COMPLETED":
    case "VERIFIED":
      return (
        <Badge variant="success" icon={CheckCircle2}>
          {status}
        </Badge>
      );
    case "REPORTED":
    case "PENDING":
    case "IN_PROGRESS":
    case "ACTIVE":
      return (
        <Badge variant="info" icon={Clock}>
          {status}
        </Badge>
      );
    case "TRIAGED":
    case "ASSIGNED":
      return (
        <Badge variant="coral">
          {status}
        </Badge>
      );
    case "BLOCKED":
    case "CRITICAL":
      return (
        <Badge variant="critical" icon={AlertTriangle}>
          {status}
        </Badge>
      );
    case "REOPENED":
      return (
        <Badge variant="warning" icon={ShieldAlert}>
          {status}
        </Badge>
      );
    default:
      return <Badge variant="neutral">{status}</Badge>;
  }
}
