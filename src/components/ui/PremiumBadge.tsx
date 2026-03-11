import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";

interface PremiumBadgeProps {
  text?: string;
  size?: "sm" | "md";
  variant?: "solid" | "outline";
  icon?: React.ReactNode;
  className?: string;
}

export default function PremiumBadge({
  text = "Premium",
  size = "md",
  variant = "solid",
  icon,
  className,
}: PremiumBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-semibold",
        size === "sm" ? "px-3 py-1 text-xs" : "px-4 py-1.5 text-sm",
        variant === "solid"
          ? "gradient-gold text-accent-foreground"
          : "border border-accent text-accent bg-accent/10",
        className
      )}
    >
      {icon || <Crown className={size === "sm" ? "h-3 w-3" : "h-4 w-4"} />}
      {text}
    </span>
  );
}
