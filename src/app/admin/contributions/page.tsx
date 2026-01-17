'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Search, Users, TrendingUp, DollarSign } from 'lucide-react'
import Link from 'next/link'
import { formatJpy } from '@/lib/currency'

interface EnrichedContribution {
  id: string
  giftId: string
  giftTitle: string
  name: string
  email: string
  amount: number
  message: string
  createdAt: string
}

export default function ContributionsPage() {
  const [contributions, setContributions] = useState<EnrichedContribution[]>([])
  const [filteredContributions, setFilteredContributions] = useState<EnrichedContribution[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedGift, setSelectedGift] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    filterContributions()
  }, [searchTerm, selectedGift, contributions])

  const fetchData = async () => {
    try {
      const response = await fetch('/api/contributions')
      const data = await response.json()
      
      setContributions(data.contributions || [])
      setFilteredContributions(data.contributions || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const filterContributions = () => {
    let filtered = [...contributions]

    // Filter by gift
    if (selectedGift !== 'all') {
      filtered = filtered.filter(c => c.giftId === selectedGift)
    }

    // Filter by search term (name, email, or gift title)
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter(c => 
        c.name.toLowerCase().includes(search) ||
        c.email.toLowerCase().includes(search) ||
        c.giftTitle.toLowerCase().includes(search)
      )
    }

    setFilteredContributions(filtered)
  }

  // Calculate statistics
  const totalAmount = contributions.reduce((sum, c) => sum + c.amount, 0)
  const uniqueContributors = new Set(contributions.map(c => c.email)).size
  const averageAmount = contributions.length > 0 ? totalAmount / contributions.length : 0

  // Get unique gifts for filter
  const uniqueGifts = Array.from(new Set(contributions.map(c => ({ id: c.giftId, title: c.giftTitle }))))
    .reduce((acc, gift) => {
      if (!acc.find(g => g.id === gift.id)) {
        acc.push(gift)
      }
      return acc
    }, [] as { id: string; title: string }[])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-500 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement des contributions...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-pink-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/admin">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour à l'admin
            </Button>
          </Link>
          <h1 className="text-3xl font-bold mb-2">Contributions</h1>
          <p className="text-muted-foreground">Vue d'ensemble de toutes les contributions reçues</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total collecté</p>
                <p className="text-2xl font-bold text-rose-600">{formatJpy(totalAmount)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-rose-500 opacity-50" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Contributeurs</p>
                <p className="text-2xl font-bold text-blue-600">{uniqueContributors}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Montant moyen</p>
                <p className="text-2xl font-bold text-green-600">{formatJpy(averageAmount)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
              className="px-3 py-2 border rounded-md bg-background"
            >
              <option value="all">Tous les cadeaux</option>
              {uniqueGifts.map(gift => (
                <option key={gift.id} value={gift.id}>{gift.title}</option>
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
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredContributions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      {searchTerm || selectedGift !== 'all' 
                        ? 'Aucune contribution trouvée avec ces filtres' 
                        : 'Aucune contribution pour le moment'}
                    </td>
                  </tr>
                ) : (
                  filteredContributions.map((contrib) => (
                    <tr key={contrib.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-sm">
                        {new Date(contrib.createdAt).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium">{contrib.name}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{contrib.email}</td>
                      <td className="px-4 py-3 text-sm">{contrib.giftTitle}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-right text-rose-600">
                        {formatJpy(contrib.amount)}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground max-w-xs truncate">
                        {contrib.message || '-'}
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
          <div className="mt-4 text-sm text-muted-foreground text-right">
            {filteredContributions.length} contribution{filteredContributions.length > 1 ? 's' : ''} 
            {(searchTerm || selectedGift !== 'all') && ` (sur ${contributions.length} au total)`}
          </div>
        )}
      </div>
    </div>
  )
}
