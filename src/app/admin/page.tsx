"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Plus,
  Trash2,
  Pencil,
  Lock,
  LogOut,
  Gift as GiftIcon,
  Loader2,
  Home,
  Users,
  Sparkles as SparklesIcon,
} from "lucide-react";
import { ImagePicker } from "@/components/image-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { formatJpy } from "@/lib/currency";
import { filterGifts } from "@/lib/utils";
import type { Gift, GiftCategory } from "@/types";
import { categoryLabels, allCategories, categoryIcons } from "@/types";

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [storedPassword, setStoredPassword] = useState("");
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingGift, setEditingGift] = useState<Gift | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [potThreshold, setPotThreshold] = useState(18000);
  const [selectedCategory, setSelectedCategory] = useState<GiftCategory | "all">("all");
  const [showOccasionOnly, setShowOccasionOnly] = useState(false);
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);

  // Form state
  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    imageUrl: "",
    imageRatio: undefined as number | undefined,
    category: "autre" as GiftCategory,
    externalUrl: "",
    isOccasion: false,
  });

  const fetchConfig = useCallback(async () => {
    try {
      const response = await fetch("/api/config");
      const data = await response.json();

      if (data.potThresholdJpy) {
        setPotThreshold(data.potThresholdJpy);
      }
    } catch (error) {
      console.error("Error fetching config:", error);
    }
  }, []);

  const fetchGifts = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/gifts");
      const data = await response.json();

      setGifts(data.gifts ?? []);
    } catch (error) {
      console.error("Error fetching gifts:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Check if already authenticated (session storage)
    const saved = sessionStorage.getItem("adminPassword");

    if (saved) {
      setStoredPassword(saved);
      setIsAuthenticated(true);
      fetchGifts();
      fetchConfig();
    }
  }, [fetchGifts, fetchConfig]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    sessionStorage.setItem("adminPassword", password);
    setStoredPassword(password);
    setIsAuthenticated(true);
    fetchGifts();
    fetchConfig();
  };

  const handleLogout = () => {
    sessionStorage.removeItem("adminPassword");
    setIsAuthenticated(false);
    setStoredPassword("");
    setPassword("");
  };

  const resetForm = () => {
    setForm({
      title: "",
      description: "",
      price: "",
      imageUrl: "",
      imageRatio: undefined,
      category: "autre",
      externalUrl: "",
      isOccasion: false,
    });
  };

  const handleAddGift = async () => {
    setIsLoading(true);
    try {
      const priceJpy = Math.round(parseFloat(form.price));
      const response = await fetch("/api/gifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: storedPassword,
          gift: {
            title: form.title,
            description: form.description,
            price: priceJpy,
            imageUrl: form.imageUrl,
            imageRatio: form.imageRatio,
            category: form.category,
            externalUrl: form.externalUrl,
            isOccasion: form.isOccasion,
            isPot: priceJpy >= potThreshold, // Auto-enable pot mode if above threshold
          },
        }),
      });

      if (response.ok) {
        resetForm();
        setShowAddDialog(false);
        fetchGifts();
      } else {
        const data = await response.json();

        alert(data.error ?? "Error adding gift");
      }
    } catch (error) {
      console.error("Error adding gift:", error);
      alert("Error adding gift");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateGift = async () => {
    if (!editingGift) return;

    setIsLoading(true);
    try {
      const priceJpy = Math.round(parseFloat(form.price));
      const response = await fetch(`/api/gifts/${editingGift.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: storedPassword,
          updates: {
            title: form.title,
            description: form.description,
            price: priceJpy,
            imageUrl: form.imageUrl,
            imageRatio: form.imageRatio,
            category: form.category,
            externalUrl: form.externalUrl,
            isOccasion: form.isOccasion,
            isPot: priceJpy >= potThreshold, // Auto-enable pot mode if above threshold
          },
        }),
      });

      if (response.ok) {
        resetForm();
        setEditingGift(null);
        fetchGifts();
      } else {
        const data = await response.json();

        alert(data.error ?? "Error updating gift");
      }
    } catch (error) {
      console.error("Error updating gift:", error);
      alert("Error updating gift");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteGift = async (gift: Gift) => {
    if (!confirm(`Supprimer "${gift.title}" ?`)) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/gifts/${gift.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: storedPassword }),
      });

      if (response.ok) {
        fetchGifts();
      } else {
        const data = await response.json();

        alert(data.error ?? "Error deleting gift");
      }
    } catch (error) {
      console.error("Error deleting gift:", error);
      alert("Error deleting gift");
    } finally {
      setIsLoading(false);
    }
  };

  const openEditDialog = (gift: Gift) => {
    setForm({
      title: gift.title,
      description: gift.description,
      price: String(gift.price),
      imageUrl: gift.imageUrl,
      imageRatio: gift.imageRatio,
      category: gift.category,
      externalUrl: gift.externalUrl ?? "",
      isOccasion: gift.isOccasion ?? false,
    });
    setEditingGift(gift);
  };

  // Filter gifts by category, occasion, and availability
  // Also hide POOL gift (special gift for free contributions)
  const filteredGifts = filterGifts(gifts, {
    category: selectedCategory,
    showOccasionOnly,
    showAvailableOnly,
    shouldExcludePool: true,
  });

  // Login screen
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-slate-50 to-slate-100">
        <Card className="mx-4 w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500">
              <Lock className="text-accent-red h-6 w-6" />
            </div>
            <CardTitle>Administration</CardTitle>
            <CardDescription>Entrez le mot de passe pour accéder au backoffice</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mt-1.5"
                  required
                />
              </div>
              <Button type="submit" className="bg-accent-red hover:bg-accent-red/90 w-full">
                Connexion
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Admin dashboard
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-white">
        <div className="container mx-auto flex items-center justify-between px-4 py-4 md:px-6">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold">Administration</h1>
            <Badge variant="secondary">{gifts.length} cadeaux</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant="outline" size="sm">
                <Home className="mr-2 h-4 w-4" />
                Voir le site
              </Button>
            </Link>
            <Link href="/admin/contributions">
              <Button variant="outline" size="sm">
                <Users className="mr-2 h-4 w-4" />
                Contributions
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Déconnexion
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto py-8">
        {/* Top section: title + add button */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Mes cadeaux</h2>
          <Button
            onClick={() => {
              resetForm();
              setShowAddDialog(true);
            }}
            className="bg-accent-red hover:bg-accent-red/90"
          >
            <Plus className="mr-2 h-4 w-4" />
            Ajouter un cadeau
          </Button>
        </div>

        {/* Category filters */}
        <div className="mb-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            {/* Category buttons */}
            <div className="flex-1 overflow-x-auto pb-2">
              <div className="flex min-w-max gap-2">
                {allCategories.map((category) => {
                  const Icon = category === "all" ? SparklesIcon : categoryIcons[category];

                  return (
                    <Button
                      key={category}
                      variant={selectedCategory === category ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedCategory(category)}
                      className={
                        selectedCategory === category
                          ? "bg-accent-red hover:bg-accent-red/90 flex items-center gap-1.5"
                          : "flex items-center gap-1.5"
                      }
                    >
                      <Icon className="h-4 w-4" />
                      {category === "all" ? "Tous" : categoryLabels[category]}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Toggles */}
            <div className="flex shrink-0 flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="occasion-toggle"
                  checked={showOccasionOnly}
                  onCheckedChange={setShowOccasionOnly}
                />
                <Label
                  htmlFor="occasion-toggle"
                  className="cursor-pointer text-sm whitespace-nowrap"
                >
                  Occasion uniquement
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="available-toggle"
                  checked={showAvailableOnly}
                  onCheckedChange={setShowAvailableOnly}
                />
                <Label
                  htmlFor="available-toggle"
                  className="cursor-pointer text-sm whitespace-nowrap"
                >
                  Disponibles uniquement
                </Label>
              </div>
            </div>
          </div>
        </div>

        {/* Gifts list */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="text-accent-red h-8 w-8 animate-spin" />
          </div>
        ) : gifts.length === 0 ? (
          <Card className="py-12 text-center">
            <CardContent>
              <GiftIcon className="text-muted-foreground/30 mx-auto mb-4 h-12 w-12" />
              <p className="text-muted-foreground mb-4">Aucun cadeau pour le moment</p>
              <Button
                onClick={() => setShowAddDialog(true)}
                className="bg-accent-red hover:bg-accent-red/90"
              >
                <Plus className="mr-2 h-4 w-4" />
                Ajouter votre premier cadeau
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="columns-1 gap-4 space-y-4 sm:columns-2 lg:columns-3 xl:columns-4">
            {filteredGifts.map((gift) => (
              <Card key={gift.id} className="mb-4 break-inside-avoid overflow-hidden">
                <div className="bg-muted relative">
                  {gift.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={gift.imageUrl}
                      alt={gift.title}
                      className="h-auto w-full object-cover"
                    />
                  ) : (
                    <div className="flex aspect-square w-full items-center justify-center">
                      <GiftIcon className="text-muted-foreground/30 h-12 w-12" />
                    </div>
                  )}
                  {gift.isReserved && (
                    <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
                      <Badge className="text-accent-red bg-white">Réservé</Badge>
                      {gift.reservedBy && (
                        <Badge variant="secondary" className="text-xs">
                          {gift.reservedBy}
                        </Badge>
                      )}
                    </div>
                  )}
                  {gift.isPot && (
                    <Badge className="absolute top-2 left-2 bg-amber-500">Cagnotte</Badge>
                  )}
                </div>
                <CardContent className="p-4">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <h3 className="line-clamp-1 flex-1 font-medium">{gift.title}</h3>
                    <Badge variant="secondary" className="shrink-0 text-xs">
                      {categoryLabels[gift.category]}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground mb-2 line-clamp-2 text-sm">
                    {gift.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-accent-red font-semibold">{formatJpy(gift.price)}</span>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => openEditDialog(gift)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDeleteGift(gift)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Add/Edit Dialog */}
      <Dialog
        isOpen={showAddDialog || !!editingGift}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddDialog(false);
            setEditingGift(null);
            resetForm();
          }
        }}
      >
        <DialogContent
          onClose={() => {
            setShowAddDialog(false);
            setEditingGift(null);
            resetForm();
          }}
          className="max-h-[90vh] overflow-y-auto sm:max-w-lg"
        >
          <DialogHeader>
            <DialogTitle>{editingGift ? "Modifier le cadeau" : "Ajouter un cadeau"}</DialogTitle>
            <DialogDescription>
              {editingGift
                ? "Modifiez les informations du cadeau."
                : "Remplissez les informations du nouveau cadeau."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Nom du cadeau *</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Poussette Yoyo..."
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Description du cadeau..."
                rows={3}
                className="mt-1.5"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="price">Prix (¥ JPY) *</Label>
                <Input
                  id="price"
                  type="number"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="16000"
                  min="0"
                  step="1"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="category">Catégorie</Label>
                <select
                  id="category"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value as GiftCategory })}
                  className="border-input bg-background mt-1.5 h-9 w-full rounded-md border px-3 text-sm"
                >
                  {Object.entries(categoryLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <ImagePicker
              value={form.imageUrl}
              onChange={(url, ratio) => setForm({ ...form, imageUrl: url, imageRatio: ratio })}
            />

            <div>
              <Label htmlFor="externalUrl">Lien produit (optionnel)</Label>
              <Input
                id="externalUrl"
                value={form.externalUrl}
                onChange={(e) => setForm({ ...form, externalUrl: e.target.value })}
                placeholder="https://..."
                className="mt-1.5"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isOccasion"
                checked={form.isOccasion}
                onChange={(e) => setForm({ ...form, isOccasion: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <Label htmlFor="isOccasion" className="cursor-pointer font-normal">
                ♻️ Article d&apos;occasion
              </Label>
            </div>

            {form.price && parseFloat(form.price) >= potThreshold && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs text-amber-700">
                  🎯 <strong>Mode cagnotte activé automatiquement</strong> : Ce cadeau coûte plus de{" "}
                  {potThreshold.toLocaleString()}¥, plusieurs personnes pourront contribuer
                  partiellement.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setShowAddDialog(false);
                setEditingGift(null);
                resetForm();
              }}
            >
              Annuler
            </Button>
            <Button
              onClick={editingGift ? handleUpdateGift : handleAddGift}
              disabled={!form.title || !form.price || isLoading}
              className="bg-accent-red hover:bg-accent-red/90"
            >
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {editingGift ? "Enregistrer" : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
