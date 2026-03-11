import { cn } from "@/lib/utils";

interface GradientCardProps {
  children: React.ReactNode;
  variant?: "primary" | "accent" | "success";
  className?: string;
}

export default function GradientCard({ children, variant = "primary", className }: GradientCardProps) {
  const gradients = {
    primary: "gradient-primary",
    accent: "gradient-gold",
    success: "gradient-green",
  };

  return (
    <div
      className={cn(
        gradients[variant],
        "rounded-2xl p-6 shadow-lg transition-shadow duration-200 hover:shadow-xl",
        variant === "primary" && "text-primary-foreground",
        variant === "accent" && "text-accent-foreground",
        variant === "success" && "text-success-foreground",
        className
      )}
    >
      {children}
    </div>
  );
}
