"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface CarouselImage {
  src: string
  alt: string
  caption?: string
}

interface ImageCarouselProps {
  images: CarouselImage[]
  autoPlayInterval?: number
  transitionDurationMs?: number
}

export function ImageCarousel({
  images,
  autoPlayInterval = 5000,
  transitionDurationMs = 500,
}: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)
  const resumeTimer = useRef<number | null>(null)

  const clearResumeTimer = () => {
    if (resumeTimer.current) {
      window.clearTimeout(resumeTimer.current)
      resumeTimer.current = null
    }
  }

  const pauseAndResume = useCallback((delay = 8000) => {
    setIsAutoPlaying(false)
    clearResumeTimer()
    resumeTimer.current = window.setTimeout(() => setIsAutoPlaying(true), delay)
  }, [])

  useEffect(() => {
    if (!isAutoPlaying || images.length <= 1) return
    const interval = window.setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length)
    }, autoPlayInterval)
    return () => window.clearInterval(interval)
  }, [images.length, isAutoPlaying, autoPlayInterval])

  useEffect(() => () => clearResumeTimer(), [])

  const goToSlide = (index: number) => {
    setCurrentIndex(index)
    pauseAndResume()
  }

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))
    pauseAndResume()
  }

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length)
    pauseAndResume()
  }

  if (!images || images.length === 0) {
    return null
  }

  return (
    <div
      className="relative w-full h-full group"
      onMouseEnter={() => setIsAutoPlaying(false)}
      onMouseLeave={() => setIsAutoPlaying(true)}
    >
      {/* Carousel Container */}
      <div className="relative w-full h-full overflow-hidden rounded-lg bg-accent">
        {/* Track */}
        <div
          className="flex h-full transition-transform ease-in-out"
          style={{
            width: `${images.length * 100}%`,
            transform: `translateX(-${currentIndex * (100 / images.length)}%)`,
            transitionDuration: `${transitionDurationMs}ms`,
          }}
        >
          {images.map((image, index) => (
            <div key={index} className="w-full h-full flex-shrink-0 relative" style={{ width: `${100 / images.length}%` }}>
              <img
                src={image.src || "/placeholder.svg"}
                alt={image.alt}
                className="w-full h-full object-cover select-none"
                loading="lazy"
                draggable={false}
              />
              {image.caption && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none">
                  <div className="absolute bottom-4 left-4 text-white">
                    <h5 className="font-medium text-sm sm:text-base">{image.caption}</h5>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-all duration-200 hover:scale-110 cursor-pointer"
              aria-label="Imagen anterior"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              onClick={goToNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-all duration-200 hover:scale-110 cursor-pointer"
              aria-label="Imagen siguiente"
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </>
        )}

        {/* Dots Navigation */}
        {images.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`transition-all duration-300 rounded-2xl ${
                  currentIndex === index ? "w-8 h-1 bg-white" : "w-4 h-1 bg-white/50 hover:bg-white/70"
                }`}
                aria-label={`Ir a imagen ${index + 1}`}
              />
            ))}
          </div>
        )}

        {/* Play/Pause Button removed per request */}
      </div>
    </div>
  )
}
