"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { Loader2, XCircle, CheckCircle, AlertTriangle, ArrowLeft, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ContributionInfo {
  id: string;
  giftId: string;
  giftTitle: string;
  name: string;
  amount: number;
  createdAt: string;
}

export default function CancelContributionPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);

  const [contribution, setContribution] = useState<ContributionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isCancelled, setIsCancelled] = useState(false);
  const [feedback, setFeedback] = useState("");

  const formatPrice = (jpy: number) =>
    new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY" }).format(jpy);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);

    return new Intl.DateTimeFormat("fr-FR", {
      dateStyle: "long",
      timeStyle: "short",
    }).format(date);
  };

  // Fetch contribution info on mount
  useEffect(() => {
    const fetchContribution = async () => {
      try {
        const response = await fetch(`/api/cancel/${token}`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.error ?? "Contribution introuvable");

          return;
        }

        setContribution(data.contribution);
      } catch {
        setError("Erreur lors du chargement");
      } finally {
        setIsLoading(false);
      }
    };

    fetchContribution();
  }, [token]);

  const handleCancel = async () => {
    if (!contribution) return;

    setIsCancelling(true);
    setError(null);

    try {
      const response = await fetch(`/api/cancel/${token}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback: feedback ?? undefined }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Erreur lors de l'annulation");
      }

      setIsCancelled(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'annulation");
    } finally {
      setIsCancelling(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="from-accent-red/10 flex min-h-screen items-center justify-center bg-linear-to-b to-white p-4">
        <div className="text-center">
          <Loader2 className="text-accent-red mx-auto mb-4 h-12 w-12 animate-spin" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  // Error state (contribution not found)
  if (error && !contribution) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-linear-to-b from-rose-50 to-white p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-lg">
          <AlertTriangle className="mx-auto mb-4 h-16 w-16 text-amber-500" />
          <h1 className="mb-2 text-2xl font-bold">Lien invalide</h1>
          <p className="text-muted-foreground mb-6">
            Ce lien d&apos;annulation n&apos;est plus valide ou la contribution a déjà été annulée.
          </p>
          <Link href="/">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour à la liste
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Success state (cancelled)
  if (isCancelled) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-linear-to-b from-green-50 to-white p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-lg">
          <CheckCircle className="mx-auto mb-4 h-16 w-16 text-green-500" />
          <h1 className="mb-2 text-2xl font-bold">Annulation confirmée</h1>
          <p className="text-muted-foreground mb-6">
            Votre participation a bien été annulée. Un email de confirmation vous a été envoyé.
          </p>
          <Link href="/">
            <Button>
              <Gift className="mr-2 h-4 w-4" />
              Voir la liste de naissance
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Main cancellation form
  return (
    <div className="from-accent-red/10 flex min-h-screen items-center justify-center bg-linear-to-b to-white p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-lg">
        {/* Header */}
        <div className="from-accent-red to-accent-red/80 bg-linear-to-r p-6 text-center text-white">
          <XCircle className="mx-auto mb-3 h-12 w-12 opacity-90" />
          <h1 className="text-xl font-bold">Annuler ma participation</h1>
        </div>

        {/* Content */}
        <div className="p-6">
          {contribution && (
            <>
              {/* Contribution summary */}
              <div className="bg-accent-red/10 mb-6 rounded-xl p-4">
                <h2 className="mb-2 text-lg font-semibold">{contribution.giftTitle}</h2>
                <div className="text-muted-foreground space-y-1 text-sm">
                  <p>
                    <span className="text-accent-red font-medium">
                      {formatPrice(contribution.amount)}
                    </span>{" "}
                    par {contribution.name}
                  </p>
                  <p>Le {formatDate(contribution.createdAt)}</p>
                </div>
              </div>

              {/* Warning */}
              <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                  <div className="text-sm text-amber-800">
                    <p className="mb-1 font-medium">Attention</p>
                    <p>
                      Cette action est irréversible. Votre participation sera supprimée de la liste.
                    </p>
                  </div>
                </div>
              </div>

              {/* Feedback */}
              <div className="mb-6">
                <Label htmlFor="feedback" className="text-sm">
                  Raison de l&apos;annulation (optionnel)
                </Label>
                <Textarea
                  id="feedback"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Si vous rencontrez un souci, on vous aidera."
                  rows={3}
                  className="mt-1.5"
                />
              </div>

              {/* Error display */}
              {error && (
                <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-3">
                <Button
                  onClick={handleCancel}
                  disabled={isCancelling}
                  variant="destructive"
                  className="w-full"
                >
                  {isCancelling ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Annulation en cours...
                    </>
                  ) : (
                    <>
                      <XCircle className="mr-2 h-4 w-4" />
                      Confirmer l&apos;annulation
                    </>
                  )}
                </Button>

                <Link href="/" className="w-full">
                  <Button variant="outline" className="w-full">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Non, maintenir ma participation
                  </Button>
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
