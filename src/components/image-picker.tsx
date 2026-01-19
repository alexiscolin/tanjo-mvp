"use client";

import { useState } from "react";
import {
  Loader2,
  Search,
  Image as ImageIcon,
  Check,
  X,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ImagePickerProps {
  value: string;
  onChange: (url: string) => void;
}

export function ImagePicker({ value, onChange }: ImagePickerProps) {
  const [inputUrl, setInputUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [scrapedImages, setScrapedImages] = useState<string[]>([]);
  const [pageUrl, setPageUrl] = useState("");
  const [error, setError] = useState("");

  const handleFetchImages = async () => {
    if (!inputUrl.trim()) return;

    setIsLoading(true);
    setError("");
    setScrapedImages([]);

    try {
      const response = await fetch("/api/scrape-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: inputUrl.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Erreur lors du chargement");

        return;
      }

      if (data.isDirectImage) {
        // Direct image URL - use it immediately
        onChange(data.imageUrl);
        setInputUrl("");
        setShowInput(false);
      } else {
        // Page with multiple images - show picker
        if (data.images && data.images.length > 0) {
          setScrapedImages(data.images);
          setPageUrl(data.pageUrl);
          setShowPicker(true);
        } else {
          setError("Aucune image trouvée sur cette page");
        }
      }
    } catch (err) {
      console.error("Error fetching images:", err);
      setError("Connection error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectImage = (imageUrl: string) => {
    onChange(imageUrl);
    setShowPicker(false);
    setInputUrl("");
    setScrapedImages([]);
    setShowInput(false);
  };

  const handleClearImage = () => {
    onChange("");
    setInputUrl("");
    setError("");
    setShowInput(false);
  };

  return (
    <div className="space-y-3">
      <Label>Image</Label>

      {/* Current image preview */}
      {value && (
        <div className="group relative">
          <div className="bg-muted aspect-video overflow-hidden rounded-lg border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt="Preview"
              className="h-full w-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect fill="%23f1f5f9" width="100" height="100"/><text x="50" y="50" dominant-baseline="middle" text-anchor="middle" fill="%2394a3b8" font-size="12">Erreur</text></svg>';
              }}
            />
          </div>
          <Button
            type="button"
            variant="destructive"
            size="icon-sm"
            className="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100"
            onClick={handleClearImage}
          >
            <X className="h-4 w-4" />
          </Button>
          <p className="text-muted-foreground mt-1 truncate text-xs">{value}</p>
        </div>
      )}

      {/* URL input or Change button */}
      {!value || showInput ? (
        <>
          <div className="flex gap-2">
            <Input
              value={inputUrl}
              onChange={(e) => {
                setInputUrl(e.target.value);
                setError("");
              }}
              placeholder="URL d'une image ou d'une page produit..."
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleFetchImages();
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleFetchImages}
              disabled={isLoading || !inputUrl.trim()}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
            {value && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setShowInput(false);
                  setInputUrl("");
                  setError("");
                }}
              >
                Annuler
              </Button>
            )}
          </div>

          {error && <p className="text-destructive text-sm">{error}</p>}

          <p className="text-muted-foreground text-xs">
            💡 Collez l&apos;URL d&apos;une image directe ou d&apos;une page web (Amazon,
            Rakuten...). Les images de la page seront extraites automatiquement.
          </p>
        </>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowInput(true)}
          className="w-full"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Changer l&apos;image
        </Button>
      )}

      {/* Image picker dialog */}
      <Dialog isOpen={showPicker} onOpenChange={setShowPicker}>
        <DialogContent
          onClose={() => setShowPicker(false)}
          className="flex max-h-[90vh] max-w-4xl flex-col overflow-hidden"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Choisir une image
            </DialogTitle>
            <DialogDescription className="flex items-center gap-2">
              {scrapedImages.length} images trouvées sur la page
              <a
                href={pageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent-red inline-flex items-center gap-1 hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                Voir la page
              </a>
            </DialogDescription>
          </DialogHeader>

          <div className="-mx-6 flex-1 overflow-y-auto px-6">
            <div className="grid grid-cols-2 gap-3 py-4 sm:grid-cols-3 md:grid-cols-4">
              {scrapedImages.map((imageUrl, index) => (
                <button
                  key={imageUrl}
                  type="button"
                  className="group bg-muted hover:border-accent-red focus:border-accent-red relative aspect-square overflow-hidden rounded-lg border-2 border-transparent transition-colors focus:outline-none"
                  onClick={() => handleSelectImage(imageUrl)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl}
                    alt={`Image ${index + 1}`}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      // Hide broken images
                      (e.target as HTMLImageElement).parentElement!.style.display = "none";
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
                    <div className="bg-accent-red flex h-8 w-8 items-center justify-center rounded-full text-white opacity-0 transition-opacity group-hover:opacity-100">
                      <Check className="h-5 w-5" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end border-t pt-4">
            <Button variant="outline" onClick={() => setShowPicker(false)}>
              Annuler
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
