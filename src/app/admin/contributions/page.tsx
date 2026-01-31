"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Search, Users, TrendingUp, DollarSign, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { formatJpy } from "@/lib/currency";

interface EnrichedContribution {
  id: string;
  giftId: string;
  giftTitle: string;
  name: string;
  email: string;
  amount: number;
  message: string;
  createdAt: string;
  paid?: boolean;
}

export default function ContributionsPage() {
  const [contributions, setContributions] = useState<EnrichedContribution[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGift, setSelectedGift] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [updatingPaidId, setUpdatingPaidId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/contributions", {
          credentials: "include", // Include session cookie
        });

        if (response.status === 401) {
          // Not authenticated, redirect to admin login
          window.location.href = "/admin";

          return;
        }

        const data = await response.json();

        setContributions(data.contributions ?? []);
      } catch (error) {
        console.error("Error fetching contributions:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filtered contributions
  const filteredContributions = useMemo(() => {
    let filtered = [...contributions];

    // Filter by gift
    if (selectedGift !== "all") {
      filtered = filtered.filter((c) => c.giftId === selectedGift);
    }

    // Filter by search term (name, email, or gift title)
    if (searchTerm) {
      const search = searchTerm.toLowerCase();

      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(search) ||
          c.email.toLowerCase().includes(search) ||
          c.giftTitle.toLowerCase().includes(search)
      );
    }

    return filtered;
  }, [searchTerm, selectedGift, contributions]);

  const setContributionPaid = async (id: string, paid: boolean) => {
    setUpdatingPaidId(id);
    try {
      const res = await fetch(`/api/contributions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ paid }),
      });

      if (!res.ok) throw new Error("Update failed");
      setContributions((prev) => prev.map((c) => (c.id === id ? { ...c, paid } : c)));
    } catch (err) {
      console.error("Error updating paid status:", err);
    } finally {
      setUpdatingPaidId(null);
    }
  };

  // Calculate statistics
  const totalAmount = contributions.reduce((sum, c) => sum + c.amount, 0);
  const uniqueContributors = new Set(contributions.map((c) => c.email)).size;
  const averageAmount = contributions.length > 0 ? totalAmount / contributions.length : 0;

  // Get unique gifts for filter
  const uniqueGifts = Array.from(
    new Set(contributions.map((c) => ({ id: c.giftId, title: c.giftTitle })))
  ).reduce(
    (acc, gift) => {
      if (!acc.find((g) => g.id === gift.id)) {
        acc.push(gift);
      }

      return acc;
    },
    [] as { id: string; title: string }[]
  );

  if (isLoading) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="text-accent-red mx-auto mb-4 h-8 w-8 animate-spin" />
          <p className="text-muted-foreground">Chargement des contributions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="from-accent-red/10 to-accent-red/5 min-h-screen bg-linear-to-br via-white px-4 py-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <Link href="/admin">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour à l&apos;admin
            </Button>
          </Link>
          <h1 className="mb-2 text-3xl font-bold">Contributions</h1>
          <p className="text-muted-foreground">
            Vue d&apos;ensemble de toutes les contributions reçues
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground mb-1 text-sm">Total collecté</p>
                <p className="text-accent-red text-2xl font-bold">{formatJpy(totalAmount)}</p>
              </div>
              <DollarSign className="text-accent-red h-8 w-8 opacity-50" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground mb-1 text-sm">Contributeurs</p>
                <p className="text-2xl font-bold text-blue-600">{uniqueContributors}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground mb-1 text-sm">Montant moyen</p>
                <p className="text-2xl font-bold text-green-600">{formatJpy(averageAmount)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6 p-4">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
              <Input
                placeholder="Rechercher par nom, email ou cadeau..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={selectedGift}
              onChange={(e) => setSelectedGift(e.target.value)}
              className="bg-background rounded-md border px-3 py-2"
            >
              <option value="all">Tous les cadeaux</option>
              {uniqueGifts.map((gift) => (
                <option key={gift.id} value={gift.id}>
                  {gift.title}
                </option>
              ))}
            </select>
          </div>
        </Card>

        {/* Contributions Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Contributeur</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Email</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Cadeau</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">Montant</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Message</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">Payé</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredContributions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-muted-foreground px-4 py-8 text-center">
                      {searchTerm || selectedGift !== "all"
                        ? "Aucune contribution trouvée avec ces filtres"
                        : "Aucune contribution pour le moment"}
                    </td>
                  </tr>
                ) : (
                  filteredContributions.map((contrib) => (
                    <tr key={contrib.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-sm">
                        {new Date(contrib.createdAt).toLocaleDateString("fr-FR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium">{contrib.name}</td>
                      <td className="text-muted-foreground px-4 py-3 text-sm">{contrib.email}</td>
                      <td className="px-4 py-3 text-sm">{contrib.giftTitle}</td>
                      <td className="text-accent-red px-4 py-3 text-right text-sm font-semibold">
                        {formatJpy(contrib.amount)}
                      </td>
                      <td className="text-muted-foreground max-w-xs truncate px-4 py-3 text-sm">
                        {contrib.message || "-"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {updatingPaidId === contrib.id ? (
                          <Loader2 className="text-muted-foreground mx-auto h-5 w-5 animate-spin" />
                        ) : (
                          <Switch
                            checked={contrib.paid ?? false}
                            onCheckedChange={(checked) => setContributionPaid(contrib.id, checked)}
                            aria-label={contrib.paid ? "Marquer non payé" : "Marquer payé"}
                          />
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Summary */}
        {filteredContributions.length > 0 && (
          <div className="text-muted-foreground mt-4 text-right text-sm">
            {filteredContributions.length} contribution{filteredContributions.length > 1 ? "s" : ""}
            {(searchTerm || selectedGift !== "all") && ` (sur ${contributions.length} au total)`}
          </div>
        )}
      </div>
    </div>
  );
}
