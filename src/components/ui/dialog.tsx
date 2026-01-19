"use client";

import * as React from "react";
import { XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface DialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  children: React.ReactNode;
}

function Dialog({ isOpen, onOpenChange, children }: DialogProps) {
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onOpenChange(false);
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onOpenChange]);

  if (!isOpen) return null;

  return <>{children}</>;
}

function DialogContent({
  className,
  children,
  onClose,
  ...props
}: {
  className?: string;
  children: React.ReactNode;
  onClose: () => void;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay - click here to close */}
      <div
        className="animate-in fade-in-0 fixed inset-0 bg-black/50"
        aria-hidden="true"
        onClick={onClose}
      />
      {/* Content */}
      <div
        {...props}
        className={cn(
          "bg-background animate-in fade-in-0 zoom-in-95 relative z-10 w-full max-w-lg rounded-xl border p-6 shadow-lg",
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
        <button
          onClick={onClose}
          className="focus:ring-ring absolute top-4 right-4 cursor-pointer rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:outline-none"
        >
          <XIcon className="h-5 w-5" />
          <span className="sr-only">Fermer</span>
        </button>
      </div>
    </div>
  );
}

function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex flex-col gap-2 text-center sm:text-left", className)} {...props} />
  );
}

function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
      {...props}
    />
  );
}

function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("text-lg leading-none font-semibold", className)} {...props} />;
}

function DialogDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-muted-foreground text-sm", className)} {...props} />;
}

export { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle };
