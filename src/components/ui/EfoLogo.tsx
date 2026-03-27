import { useState } from "react";
import { cn } from "@/lib/utils";
import logoSrc from "@/assets/logo-efo.png";

const SIZES = {
  xs: "h-6",
  sm: "h-10",
  md: "h-[60px]",
  lg: "h-[100px]",
  xl: "h-[140px]",
};

interface EfoLogoProps {
  size?: keyof typeof SIZES;
  variant?: "color" | "white" | "dark";
  showText?: boolean;
  className?: string;
}

export const EfoLogo = ({ size = "md", variant = "color", showText = false, className }: EfoLogoProps) => {
  const [error, setError] = useState(false);

  const filterClass = variant === "white"
    ? "brightness-0 invert"
    : variant === "dark"
      ? "brightness-0"
      : "";

  if (error) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <span className="font-bold text-primary" style={{ fontSize: size === "lg" || size === "xl" ? 24 : 14 }}>
          EFO/CCAA
        </span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <img
        src={logoSrc}
        alt="Logo de l'École de Formation en Aéronautique"
        className={cn(SIZES[size], "w-auto object-contain", filterClass)}
        onError={() => setError(true)}
      />
      {showText && (
        <span className={cn(
          "font-bold leading-tight",
          size === "xs" ? "text-xs" : size === "sm" ? "text-sm" : "text-base",
          variant === "white" ? "text-white" : "text-primary"
        )}>
          GestPTA-EFO
        </span>
      )}
    </div>
  );
};
