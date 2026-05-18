"use client";

import { cn } from "@/lib/utils";
import { ALL_ICONS } from "@/components/icon-picker";

interface CategoryIconProps {
  icon?: string | null;
  color?: string | null;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function CategoryIcon({ icon, color, className, size = "md" }: CategoryIconProps) {
  const IconComponent = icon ? ALL_ICONS[icon] : null;
  const sizeClasses = {
    sm: "h-4 w-4 p-0.5",
    md: "h-7 w-7 p-1.5",
    lg: "h-9 w-9 p-2",
  };
  const iconSizeClasses = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  if (!IconComponent) {
    return (
      <span
        className={cn("inline-block rounded-full", sizeClasses[size], className)}
        style={{ backgroundColor: color ?? "#94a3b8" }}
      />
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-lg shrink-0",
        sizeClasses[size],
        className
      )}
      style={{ backgroundColor: `${color ?? "#94a3b8"}20`, color: color ?? "#94a3b8" }}
    >
      <IconComponent className={iconSizeClasses[size]} />
    </span>
  );
}
