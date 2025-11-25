'use client'

import { useEffect, useRef, useState } from 'react'

interface ApolloListContainerProps {
  children: React.ReactNode
}

export default function ApolloListContainer({ children }: ApolloListContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    // Fade in animation
    setIsVisible(true)

    // Mouse tracking for parallax effect
    const handleMouseMove = (e: MouseEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        const x = ((e.clientX - rect.left) / rect.width) * 100
        const y = ((e.clientY - rect.top) / rect.height) * 100
        setMousePosition({ x, y })
      }
    }

    const container = containerRef.current
    if (container) {
      container.addEventListener('mousemove', handleMouseMove)
    }

    return () => {
      if (container) {
        container.removeEventListener('mousemove', handleMouseMove)
      }
    }
  }, [])

  // Create floating particles
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    delay: Math.random() * 5,
    duration: 10 + Math.random() * 10,
    size: 2 + Math.random() * 4,
    x: Math.random() * 100
  }))

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes apollo-float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }
        
        @keyframes apollo-pulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.1); }
        }

        @keyframes apollo-shimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }

        .apollo-list-container {
          position: relative;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .apollo-list-container:hover {
          transform: translateY(-2px);
        }

        .apollo-particle {
          position: absolute;
          border-radius: 50%;
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.3), rgba(139, 92, 246, 0.3));
          animation: apollo-float linear infinite;
          pointer-events: none;
        }

        .apollo-glow-effect {
          position: absolute;
          width: 200px;
          height: 200px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(99, 102, 241, 0.2), transparent);
          filter: blur(40px);
          pointer-events: none;
          transition: all 0.3s ease;
        }

        .apollo-shimmer-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255, 255, 255, 0.1) 50%,
            transparent 100%
          );
          background-size: 1000px 100%;
          animation: apollo-shimmer 3s infinite;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .apollo-list-container:hover .apollo-shimmer-overlay {
          opacity: 1;
        }
      `}} />
      <div
        ref={containerRef}
        id="main-container-column-2"
        className="apollo-list-container"
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: 'transparent',
          overflow: 'hidden'
        }}
      >
        {/* Nested div structure matching Apollo.io */}
        <div
          className="zp_QhGKA zp_zKiae zp_KMo2v"
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(249, 250, 251, 0.95) 100%)',
            borderRadius: '12px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08), 0 1px 4px rgba(0, 0, 0, 0.04)',
            border: '1px solid rgba(226, 232, 240, 0.8)',
            backdropFilter: 'blur(10px)',
            overflow: 'hidden',
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 0.6s ease, transform 0.6s ease'
          }}
        >
          {/* Floating Particles */}
          {particles.map((particle) => (
            <div
              key={particle.id}
              className="apollo-particle"
              style={{
                position: 'absolute',
                left: `${particle.x}%`,
                top: `${-10 + Math.random() * 10}%`,
                width: `${particle.size}px`,
                height: `${particle.size}px`,
                animationDelay: `${particle.delay}s`,
                animationDuration: `${particle.duration}s`,
                pointerEvents: 'none',
                zIndex: 0
              }}
            />
          ))}

          {/* Mouse-following glow effect */}
          <div
            className="apollo-glow-effect"
            style={{
              position: 'absolute',
              left: `${mousePosition.x - 10}%`,
              top: `${mousePosition.y - 10}%`,
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
              zIndex: 0
            }}
          />

          {/* Shimmer overlay */}
          <div 
            className="apollo-shimmer-overlay"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              pointerEvents: 'none',
              zIndex: 1
            }}
          />

          {/* Content wrapper matching Apollo structure */}
          <div
            style={{
              position: 'relative',
              zIndex: 2,
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              overflow: 'hidden'
            }}
          >

            {/* Main content */}
            <div
              style={{
                position: 'relative',
                zIndex: 2,
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'auto'
              }}
            >
              {children}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

