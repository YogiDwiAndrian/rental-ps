'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Gamepad2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface GamesTooltipProps {
  games: string[]
  maxVisible?: number
  className?: string
}

export function GamesTooltip({ games, maxVisible = 3, className }: GamesTooltipProps) {
  const [isOpen, setIsOpen] = useState(false)
  
  if (!games || games.length === 0) return null

  const visibleGames = games.slice(0, maxVisible)
  const hiddenGames = games.slice(maxVisible)

  return (
    <div className={cn("relative", className)}>
      <div className="flex flex-wrap gap-1">
        {visibleGames.map((game, index) => (
          <Badge key={index} variant="secondary" className="text-xs bg-white/80">
            {game}
          </Badge>
        ))}
        
        {hiddenGames.length > 0 && (
          <div className="relative">
            <Badge 
              variant="secondary" 
              className="text-xs bg-blue-100 text-blue-800 hover:bg-blue-200 cursor-pointer transition-colors"
              onMouseEnter={() => setIsOpen(true)}
              onMouseLeave={() => setIsOpen(false)}
              onClick={() => setIsOpen(!isOpen)}
            >
              +{hiddenGames.length} more
            </Badge>
            
            {isOpen && (
              <Card className="absolute top-full left-0 mt-2 w-64 z-50 shadow-xl border-2 animate-in fade-in-0 zoom-in-95">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Gamepad2 className="w-4 h-4" />
                    All Available Games
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-1">
                    {games.map((game, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {game}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  )
}