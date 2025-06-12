'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface ConfettiProps {
  active: boolean
  duration?: number
  particleCount?: number
  spread?: number
  className?: string
}

interface Particle {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  angle: number
  angularVelocity: number
  color: string
  size: number
  timeLeft: number
}

const COLORS = [
  '#f44336',
  '#e91e63',
  '#9c27b0',
  '#673ab7',
  '#3f51b5',
  '#2196f3',
  '#03a9f4',
  '#00bcd4',
  '#009688',
  '#4caf50',
  '#8bc34a',
  '#cddc39',
  '#ffeb3b',
  '#ffc107',
  '#ff9800',
  '#ff5722',
]

export function Confetti({ 
  active, 
  duration = 3000, 
  particleCount = 100,
  spread = 50,
  className 
}: ConfettiProps) {
  const [particles, setParticles] = useState<Particle[]>([])

  useEffect(() => {
    if (!active) {
      setParticles([])
      return
    }

    // Create initial particles
    const newParticles: Particle[] = []
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount
      const velocity = 5 + Math.random() * 5
      newParticles.push({
        id: i,
        x: 50,
        y: 50,
        vx: Math.cos(angle) * velocity + (Math.random() - 0.5) * spread,
        vy: Math.sin(angle) * velocity - Math.random() * 10,
        angle: Math.random() * 360,
        angularVelocity: (Math.random() - 0.5) * 10,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: 5 + Math.random() * 5,
        timeLeft: duration,
      })
    }
    setParticles(newParticles)

    // Animation loop
    const startTime = Date.now()
    const animate = () => {
      const elapsed = Date.now() - startTime
      if (elapsed > duration) {
        setParticles([])
        return
      }

      setParticles(prev => 
        prev.map(p => ({
          ...p,
          x: p.x + p.vx * 0.1,
          y: p.y + p.vy * 0.1,
          vy: p.vy + 0.5, // gravity
          angle: p.angle + p.angularVelocity,
          timeLeft: duration - elapsed,
        })).filter(p => p.y < 150 && p.timeLeft > 0)
      )

      requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [active, duration, particleCount, spread])

  if (!active || particles.length === 0) return null

  return (
    <div 
      className={cn(
        "fixed inset-0 pointer-events-none z-50",
        className
      )}
      aria-hidden="true"
    >
      <svg className="w-full h-full">
        {particles.map(particle => (
          <rect
            key={particle.id}
            x={`${particle.x}%`}
            y={`${particle.y}%`}
            width={particle.size}
            height={particle.size}
            fill={particle.color}
            transform={`rotate(${particle.angle} ${particle.x} ${particle.y})`}
            opacity={particle.timeLeft / duration}
          />
        ))}
      </svg>
    </div>
  )
}