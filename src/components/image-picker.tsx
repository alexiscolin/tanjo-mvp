'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Loader2, Search, Image as ImageIcon, Check, X, ExternalLink, RefreshCw } from 'lucide-react'

interface ImagePickerProps {
  value: string
  onChange: (url: string) => void
}

export function ImagePicker({ value, onChange }: ImagePickerProps) {
  const [inputUrl, setInputUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [showInput, setShowInput] = useState(false)
  const [scrapedImages, setScrapedImages] = useState<string[]>([])
  const [pageUrl, setPageUrl] = useState('')
  const [error, setError] = useState('')

  const handleFetchImages = async () => {
    if (!inputUrl.trim()) return
    
    setIsLoading(true)
    setError('')
    setScrapedImages([])
    
    try {
      const response = await fetch('/api/scrape-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: inputUrl.trim() }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        setError(data.error || 'Erreur lors du chargement')
        return
      }
      
      if (data.isDirectImage) {
        // Direct image URL - use it immediately
        onChange(data.imageUrl)
        setInputUrl('')
        setShowInput(false)
      } else {
        // Page with multiple images - show picker
        if (data.images && data.images.length > 0) {
          setScrapedImages(data.images)
          setPageUrl(data.pageUrl)
          setShowPicker(true)
        } else {
          setError('Aucune image trouvée sur cette page')
        }
      }
    } catch (err) {
      console.error('Error fetching images:', err)
      setError('Connection error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectImage = (imageUrl: string) => {
    onChange(imageUrl)
    setShowPicker(false)
    setInputUrl('')
    setScrapedImages([])
    setShowInput(false)
  }

  const handleClearImage = () => {
    onChange('')
    setInputUrl('')
    setError('')
    setShowInput(false)
  }

  return (
    <div className="space-y-3">
      <Label>Image</Label>
      
      {/* Current image preview */}
      {value && (
        <div className="relative group">
          <div className="aspect-video rounded-lg overflow-hidden bg-muted border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={value} 
              alt="Preview" 
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect fill="%23f1f5f9" width="100" height="100"/><text x="50" y="50" dominant-baseline="middle" text-anchor="middle" fill="%2394a3b8" font-size="12">Erreur</text></svg>'
              }}
            />
          </div>
          <Button
            type="button"
            variant="destructive"
            size="icon-sm"
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={handleClearImage}
          >
            <X className="h-4 w-4" />
          </Button>
          <p className="text-xs text-muted-foreground mt-1 truncate">{value}</p>
        </div>
      )}
      
      {/* URL input or Change button */}
      {!value || showInput ? (
        <>
          <div className="flex gap-2">
            <Input
              value={inputUrl}
              onChange={(e) => {
                setInputUrl(e.target.value)
                setError('')
              }}
              placeholder="URL d'une image ou d'une page produit..."
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleFetchImages()
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
                  setShowInput(false)
                  setInputUrl('')
                  setError('')
                }}
              >
                Annuler
              </Button>
            )}
          </div>
          
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          
          <p className="text-xs text-muted-foreground">
            💡 Collez l&apos;URL d&apos;une image directe ou d&apos;une page web (Amazon, Rakuten...). 
            Les images de la page seront extraites automatiquement.
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
      <Dialog open={showPicker} onOpenChange={setShowPicker}>
        <DialogContent 
          onClose={() => setShowPicker(false)}
          className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
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
                className="inline-flex items-center gap-1 text-rose-500 hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                Voir la page
              </a>
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto -mx-6 px-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 py-4">
              {scrapedImages.map((imageUrl, index) => (
                <button
                  key={index}
                  type="button"
                  className="group relative aspect-square rounded-lg overflow-hidden bg-muted border-2 border-transparent hover:border-rose-500 transition-colors focus:outline-none focus:border-rose-500"
                  onClick={() => handleSelectImage(imageUrl)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl}
                    alt={`Image ${index + 1}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      // Hide broken images
                      (e.target as HTMLImageElement).parentElement!.style.display = 'none'
                    }}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full bg-rose-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Check className="h-5 w-5" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => setShowPicker(false)}>
              Annuler
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
