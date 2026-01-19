"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="bg-surface flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <AlertTriangle className="text-accent-red mx-auto mb-4 h-16 w-16" />
        <h1 className="mb-2 text-2xl font-bold">Une erreur est survenue</h1>
        <p className="text-muted-foreground mb-6">
          {error.message ?? "Quelque chose s'est mal passé. Veuillez réessayer."}
        </p>
        <Button onClick={reset} className="bg-accent-red hover:bg-accent-red/90">
          <RefreshCw className="mr-2 h-4 w-4" />
          Réessayer
        </Button>
      </div>
    </div>
  );
}
