'use client'

import { useEffect, useRef } from 'react'

interface Globe3DProps {
  size?: number
  glowColor?: string
}

export default function Globe3D({ size = 160, glowColor = '#10B981' }: Globe3DProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const isDraggingRef = useRef(false)
  const lastMousePosRef = useRef({ x: 0, y: 0 })
  const rotationRef = useRef({ rotX: 0.3, rotY: 0 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    const radius = size * 0.4

    // 3D Point Projection Helper (Sphere coordinates)
    const project = (lat: number, lon: number, rotX: number, rotY: number) => {
      const radLat = (lat * Math.PI) / 180
      const radLon = (lon * Math.PI) / 180

      // Spherical 3D coordinates
      const x = radius * Math.cos(radLat) * Math.sin(radLon)
      const y = radius * Math.sin(radLat)
      const z = radius * Math.cos(radLat) * Math.cos(radLon)

      // Rotate around X axis (tilt)
      const cosX = Math.cos(rotX)
      const sinX = Math.sin(rotX)
      const y1 = y * cosX - z * sinX
      const z1 = y * sinX + z * cosX

      // Rotate around Y axis
      const cosY = Math.cos(rotY)
      const sinY = Math.sin(rotY)
      const x2 = x * cosY + z1 * sinY
      const z2 = -x * sinY + z1 * cosY

      const centerX = canvas.width / 2
      const centerY = canvas.height / 2

      return {
        x: centerX + x2,
        y: centerY + y1,
        z: z2,
        visible: z2 > -10, // Backface culling
      }
    }

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const centerX = canvas.width / 2
      const centerY = canvas.height / 2

      // Auto-rotation around Y and X axis when not dragging
      if (!isDraggingRef.current) {
        rotationRef.current.rotY += 0.015
        rotationRef.current.rotX = 0.3 + Math.sin(Date.now() * 0.001) * 0.1
      }

      const { rotX, rotY } = rotationRef.current

      // 1. Atmosphere 3D Glow
      const glowGrad = ctx.createRadialGradient(centerX, centerY, radius * 0.8, centerX, centerY, radius * 1.35)
      glowGrad.addColorStop(0, `${glowColor}40`)
      glowGrad.addColorStop(0.6, `${glowColor}15`)
      glowGrad.addColorStop(1, 'rgba(0,0,0,0)')

      ctx.fillStyle = glowGrad
      ctx.beginPath()
      ctx.arc(centerX, centerY, radius * 1.35, 0, Math.PI * 2)
      ctx.fill()

      // 2. Base Sphere Silhouette
      const sphereGrad = ctx.createRadialGradient(centerX - radius * 0.3, centerY - radius * 0.3, radius * 0.1, centerX, centerY, radius)
      sphereGrad.addColorStop(0, '#1A1C24')
      sphereGrad.addColorStop(0.8, '#0A0B0D')
      sphereGrad.addColorStop(1, '#050608')

      ctx.fillStyle = sphereGrad
      ctx.beginPath()
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = `${glowColor}80`
      ctx.lineWidth = 1.5
      ctx.stroke()

      // 3. Draw Latitude Parallels
      for (let lat = -60; lat <= 60; lat += 30) {
        ctx.beginPath()
        let started = false
        for (let lon = 0; lon <= 360; lon += 10) {
          const pt = project(lat, lon, rotX, rotY)
          if (pt.visible) {
            if (!started) {
              ctx.moveTo(pt.x, pt.y)
              started = true
            } else {
              ctx.lineTo(pt.x, pt.y)
            }
          } else {
            started = false
          }
        }
        ctx.strokeStyle = `${glowColor}30`
        ctx.lineWidth = 0.8
        ctx.stroke()
      }

      // 4. Draw Longitude Meridians
      for (let lon = 0; lon < 360; lon += 30) {
        ctx.beginPath()
        let started = false
        for (let lat = -90; lat <= 90; lat += 10) {
          const pt = project(lat, lon, rotX, rotY)
          if (pt.visible) {
            if (!started) {
              ctx.moveTo(pt.x, pt.y)
              started = true
            } else {
              ctx.lineTo(pt.x, pt.y)
            }
          } else {
            started = false
          }
        }
        ctx.strokeStyle = `${glowColor}30`
        ctx.lineWidth = 0.8
        ctx.stroke()
      }

      // 5. World Map Continent Dots & Nodes
      const continentPoints = [
        // North America
        { lat: 40, lon: -100 }, { lat: 35, lon: -90 }, { lat: 50, lon: -110 }, { lat: 25, lon: -80 },
        // South America
        { lat: -15, lon: -60 }, { lat: -25, lon: -55 }, { lat: 0, lon: -70 },
        // Europe
        { lat: 50, lon: 15 }, { lat: 45, lon: 5 }, { lat: 55, lon: 35 },
        // Africa
        { lat: 10, lon: 20 }, { lat: -10, lon: 25 }, { lat: 25, lon: 15 }, { lat: -30, lon: 20 },
        // Asia / India / East
        { lat: 20, lon: 78 }, { lat: 35, lon: 105 }, { lat: 60, lon: 100 }, { lat: 15, lon: 100 },
        // Australia
        { lat: -25, lon: 135 }, { lat: -30, lon: 145 },
      ]

      for (const pt of continentPoints) {
        const p = project(pt.lat, pt.lon, rotX, rotY)
        if (p.visible) {
          ctx.beginPath()
          ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2)
          ctx.fillStyle = glowColor
          ctx.shadowColor = glowColor
          ctx.shadowBlur = 8
          ctx.fill()
          ctx.shadowBlur = 0
        }
      }

      animId = requestAnimationFrame(render)
    }

    render()

    return () => cancelAnimationFrame(animId)
  }, [size, glowColor])

  // Drag Interaction handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true
    lastMousePosRef.current = { x: e.clientX, y: e.clientY }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return
    const dx = e.clientX - lastMousePosRef.current.x
    const dy = e.clientY - lastMousePosRef.current.y
    rotationRef.current.rotY += dx * 0.01
    rotationRef.current.rotX += dy * 0.01
    lastMousePosRef.current = { x: e.clientX, y: e.clientY }
  }

  const handleMouseUp = () => {
    isDraggingRef.current = false
  }

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', cursor: 'grab' }}>
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ width: size, height: size, touchAction: 'none' }}
      />
    </div>
  )
}
