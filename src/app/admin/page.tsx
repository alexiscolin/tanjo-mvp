'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { Gift, GiftCategory } from '@/types'
import { categoryLabels } from '@/types'
import { 
  Plus, 
  Trash2, 
  Pencil, 
  Lock, 
  LogOut, 
  Gift as GiftIcon,
  Loader2,
  Home,
  Users
} from 'lucide-react'
import Link from 'next/link'
import { ImagePicker } from '@/components/image-picker'

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [storedPassword, setStoredPassword] = useState('')
  const [gifts, setGifts] = useState<Gift[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [editingGift, setEditingGift] = useState<Gift | null>(null)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [potThreshold, setPotThreshold] = useState(18000)

  // Form state
  const [form, setForm] = useState({
    title: '',
    description: '',
    price: '',
    imageUrl: '',
    category: 'autre' as GiftCategory,
    externalUrl: '',
  })

  const fetchConfig = useCallback(async () => {
    try {
      const response = await fetch('/api/config')
      const data = await response.json()
      if (data.potThresholdJpy) {
        setPotThreshold(data.potThresholdJpy)
      }
    } catch (error) {
      console.error('Error fetching config:', error)
    }
  }, [])

  const fetchGifts = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/gifts')
      const data = await response.json()
      setGifts(data.gifts || [])
    } catch (error) {
      console.error('Error fetching gifts:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    // Check if already authenticated (session storage)
    const saved = sessionStorage.getItem('adminPassword')
    if (saved) {
      setStoredPassword(saved)
      setIsAuthenticated(true)
      fetchGifts()
      fetchConfig()
    }
  }, [fetchGifts, fetchConfig])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    sessionStorage.setItem('adminPassword', password)
    setStoredPassword(password)
    setIsAuthenticated(true)
    fetchGifts()
    fetchConfig()
  }

  const handleLogout = () => {
    sessionStorage.removeItem('adminPassword')
    setIsAuthenticated(false)
    setStoredPassword('')
    setPassword('')
  }

  const resetForm = () => {
    setForm({
      title: '',
      description: '',
      price: '',
      imageUrl: '',
      category: 'autre',
      externalUrl: '',
    })
  }

  const handleAddGift = async () => {
    setIsLoading(true)
    try {
      const priceJpy = Math.round(parseFloat(form.price))
      const response = await fetch('/api/gifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: storedPassword,
          gift: {
            ...form,
            price: priceJpy,
            isPot: priceJpy >= potThreshold, // Auto-enable pot mode if above threshold
          },
        }),
      })

      if (response.ok) {
        resetForm()
        setShowAddDialog(false)
        fetchGifts()
      } else {
        const data = await response.json()
        alert(data.error || 'Error adding gift')
      }
    } catch (error) {
      console.error('Error adding gift:', error)
      alert('Error adding gift')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateGift = async () => {
    if (!editingGift) return
    
    setIsLoading(true)
    try {
      const priceJpy = Math.round(parseFloat(form.price))
      const response = await fetch(`/api/gifts/${editingGift.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: storedPassword,
          updates: {
            ...form,
            price: priceJpy,
            isPot: priceJpy >= potThreshold, // Auto-enable pot mode if above threshold
          },
        }),
      })

      if (response.ok) {
        resetForm()
        setEditingGift(null)
        fetchGifts()
      } else {
        const data = await response.json()
        alert(data.error || 'Error updating gift')
      }
    } catch (error) {
      console.error('Error updating gift:', error)
      alert('Error updating gift')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteGift = async (gift: Gift) => {
    if (!confirm(`Supprimer "${gift.title}" ?`)) return
    
    setIsLoading(true)
    try {
      const response = await fetch(`/api/gifts/${gift.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: storedPassword }),
      })

      if (response.ok) {
        fetchGifts()
      } else {
        const data = await response.json()
        alert(data.error || 'Error deleting gift')
      }
    } catch (error) {
      console.error('Error deleting gift:', error)
      alert('Error deleting gift')
    } finally {
      setIsLoading(false)
    }
  }

  const openEditDialog = (gift: Gift) => {
    setForm({
      title: gift.title,
      description: gift.description,
      price: String(gift.price), // Already in JPY, no conversion needed
      imageUrl: gift.imageUrl,
      category: gift.category,
      externalUrl: gift.externalUrl || '',
    })
    setEditingGift(gift)
  }

  const formatPrice = (jpy: number) => `¥${jpy.toLocaleString('ja-JP')}`

  // Login screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mb-4">
              <Lock className="h-6 w-6 text-rose-500" />
            </div>
            <CardTitle>Administration</CardTitle>
            <CardDescription>
              Entrez le mot de passe pour accéder au backoffice
            </CardDescription>
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
              <Button type="submit" className="w-full bg-rose-500 hover:bg-rose-600">
                Connexion
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Admin dashboard
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="font-semibold text-lg">Administration</h1>
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
      <main className="container mx-auto px-4 md:px-6 py-8">
        {/* Add button */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Mes cadeaux</h2>
          <Button onClick={() => { resetForm(); setShowAddDialog(true); }} className="bg-rose-500 hover:bg-rose-600">
            <Plus className="mr-2 h-4 w-4" />
            Ajouter un cadeau
          </Button>
        </div>

        {/* Gifts list */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
          </div>
        ) : gifts.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <GiftIcon className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground mb-4">Aucun cadeau pour le moment</p>
              <Button onClick={() => setShowAddDialog(true)} className="bg-rose-500 hover:bg-rose-600">
                <Plus className="mr-2 h-4 w-4" />
                Ajouter votre premier cadeau
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {gifts.map((gift) => (
              <Card key={gift.id} className="overflow-hidden">
                <div className="aspect-video bg-muted relative">
                  {gift.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={gift.imageUrl} alt={gift.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <GiftIcon className="h-8 w-8 text-muted-foreground/30" />
                    </div>
                  )}
                  {gift.isReserved && (
                    <Badge className="absolute top-2 right-2 bg-green-500">Réservé</Badge>
                  )}
                  {gift.isPot && (
                    <Badge className="absolute top-2 left-2 bg-amber-500">Cagnotte</Badge>
                  )}
                </div>
                <CardContent className="p-4">
                  <h3 className="font-medium mb-1 line-clamp-1">{gift.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{gift.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-rose-500">{formatPrice(gift.price)}</span>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => openEditDialog(gift)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => handleDeleteGift(gift)} className="text-destructive hover:text-destructive">
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
        open={showAddDialog || !!editingGift} 
        onOpenChange={(open) => {
          if (!open) {
            setShowAddDialog(false)
            setEditingGift(null)
            resetForm()
          }
        }}
      >
        <DialogContent 
          onClose={() => {
            setShowAddDialog(false)
            setEditingGift(null)
            resetForm()
          }}
          className="sm:max-w-lg max-h-[90vh] overflow-y-auto"
        >
          <DialogHeader>
            <DialogTitle>
              {editingGift ? 'Modifier le cadeau' : 'Ajouter un cadeau'}
            </DialogTitle>
            <DialogDescription>
              {editingGift ? 'Modifiez les informations du cadeau.' : 'Remplissez les informations du nouveau cadeau.'}
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
                  className="mt-1.5 w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {Object.entries(categoryLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            <ImagePicker
              value={form.imageUrl}
              onChange={(url) => setForm({ ...form, imageUrl: url })}
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

            {form.price && parseFloat(form.price) >= potThreshold && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                <p className="text-xs text-amber-700">
                  🎯 <strong>Mode cagnotte activé automatiquement</strong> : Ce cadeau coûte plus de {potThreshold.toLocaleString()}¥, plusieurs personnes pourront contribuer partiellement.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setShowAddDialog(false)
                setEditingGift(null)
                resetForm()
              }}
            >
              Annuler
            </Button>
            <Button
              onClick={editingGift ? handleUpdateGift : handleAddGift}
              disabled={!form.title || !form.price || isLoading}
              className="bg-rose-500 hover:bg-rose-600"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {editingGift ? 'Enregistrer' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
