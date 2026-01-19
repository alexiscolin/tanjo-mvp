"use client";

import type { RefObject } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ScrollToTopButtonProps {
  targetRef: RefObject<HTMLElement | null>;
}

export function ScrollToTopButton({ targetRef }: ScrollToTopButtonProps) {
  const scrollToTiles = () => {
    if (targetRef.current) {
      targetRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="fixed right-6 bottom-6 z-50 lg:hidden">
      <Button
        onClick={scrollToTiles}
        size="icon"
        className="bg-accent-red hover:bg-accent-red/90 h-12 w-12 cursor-pointer rounded-full text-white shadow-lg"
        aria-label="Retour en haut de la page"
      >
        <ArrowUp className="h-5 w-5" />
      </Button>
    </div>
  );
}
