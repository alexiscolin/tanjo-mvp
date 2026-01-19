'use client'

import { ArrowUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RefObject } from 'react'

interface ScrollToTopButtonProps {
  targetRef: RefObject<HTMLElement | null>
}

export function ScrollToTopButton({ targetRef }: ScrollToTopButtonProps) {
  const scrollToTiles = () => {
    if (targetRef.current) {
      targetRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 lg:hidden">
      <Button
        onClick={scrollToTiles}
        size="icon"
        className="rounded-full shadow-lg bg-accent-red hover:bg-accent-red/90 text-white h-12 w-12 cursor-pointer"
        aria-label="Retour en haut de la page"
      >
        <ArrowUp className="h-5 w-5" />
      </Button>
    </div>
  )
}
