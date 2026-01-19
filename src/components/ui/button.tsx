import * as React from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon" | "icon-sm";
}

const variantStyles = {
  default: "bg-primary text-primary-foreground hover:bg-primary/90",
  destructive: "bg-destructive text-white hover:bg-destructive/90",
  outline: "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  ghost: "hover:bg-accent hover:text-accent-foreground",
  link: "text-primary underline-offset-4 hover:underline",
};

const sizeStyles = {
  default: "h-9 px-4 py-2",
  sm: "h-8 rounded-md gap-1.5 px-3 text-xs",
  lg: "h-10 rounded-md px-6",
  icon: "h-9 w-9",
  "icon-sm": "h-8 w-8",
};

function Button({ className, variant = "default", size = "default", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "focus-visible:ring-ring inline-flex shrink-0 items-center justify-center gap-1 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    />
  );
}

export { Button };
