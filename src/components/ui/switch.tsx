"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SwitchProps {
  id?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ id, checked, onCheckedChange, disabled, className, ...props }, ref) => {
    return (
      <button
        id={id}
        ref={ref}
        role="switch"
        type="button"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onCheckedChange(!checked)}
        className={cn(
          "peer focus-visible:ring-ring focus-visible:ring-offset-background inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
          checked ? "bg-accent-red" : "bg-input",
          className
        )}
        {...props}
      >
        <span
          className={cn(
            "bg-background pointer-events-none block h-4 w-4 rounded-full shadow-lg ring-0 transition-transform",
            checked ? "translate-x-4" : "translate-x-0"
          )}
        />
      </button>
    );
  }
);

Switch.displayName = "Switch";

export { Switch };
