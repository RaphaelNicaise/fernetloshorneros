"use client"

import { useState, useEffect } from "react"
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

export function ImageCarousel({ images, autoPlayInterval = 5000, transitionDurationMs = 700 }: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [prevIndex, setPrevIndex] = useState<number | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      goToNext()
    }, autoPlayInterval)

    return () => clearInterval(interval)
  }, [images.length, autoPlayInterval])

  const changeSlide = (toIndex: number) => {
    setPrevIndex(currentIndex)
    setCurrentIndex(toIndex)
    setIsAnimating(true)
    // Limpia el frame anterior después de la transición
    window.setTimeout(() => {
      setPrevIndex(null)
      setIsAnimating(false)
    }, transitionDurationMs)
  }

  const goToPrevious = () => {
    const next = (currentIndex - 1 + images.length) % images.length
    changeSlide(next)
  }

  const goToNext = () => {
    const next = (currentIndex + 1) % images.length
    changeSlide(next)
  }

  return (
    <div className="relative w-full h-full group">
      {/* Main Image with smooth crossfade */}
      <div className="relative w-full h-full overflow-hidden rounded-lg bg-accent">
        {/* Current image */}
        <img
          key={currentIndex}
          src={images[currentIndex].src || "/placeholder.svg"}
          alt={images[currentIndex].alt}
          className="relative w-full h-full object-cover select-none"
          style={{
            opacity: 1,
            transition: `opacity ${transitionDurationMs}ms ease`,
          }}
        />
        {/* Previous image fading out */}
        {prevIndex !== null && (
          <img
            key={`prev-${prevIndex}`}
            src={images[prevIndex].src || "/placeholder.svg"}
            alt={images[prevIndex].alt}
            className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
            style={{
              opacity: isAnimating ? 0 : 1,
              transition: `opacity ${transitionDurationMs}ms ease`,
            }}
          />)
        }
        {images[currentIndex].caption && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-primary/80 to-transparent p-6">
            <p className="text-white text-sm sm:text-base">{images[currentIndex].caption}</p>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <button
        onClick={goToPrevious}
        className="absolute left-2 top-1/2 -translate-y-1/2 bg-primary/80 hover:bg-primary text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer transform-gpu active:scale-95"
        aria-label="Previous image"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button
        onClick={goToNext}
        className="absolute right-2 top-1/2 -translate-y-1/2 bg-primary/80 hover:bg-primary text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer transform-gpu active:scale-95"
        aria-label="Next image"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Dots Indicator */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        {images.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`w-2 h-2 rounded-full transition-all ${
              index === currentIndex ? "bg-white w-6" : "bg-white/50 hover:bg-white/75"
            }`}
            aria-label={`Go to image ${index + 1}`}
          />
        ))}
      </div>
    </div>
  )
}
