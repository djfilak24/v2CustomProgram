"use client"

import { useState, useEffect } from "react"

interface BackgroundSlideshowProps {
  isVisible: boolean
}

export default function BackgroundSlideshow({ isVisible }: BackgroundSlideshowProps) {
  const [currentSlide, setCurrentSlide] = useState(0)

  const slides = [
    {
      image: "/placeholder.svg?height=1080&width=1920",
      title: "Modern Workplace Design",
    },
    {
      image: "/placeholder.svg?height=1080&width=1920",
      title: "Collaborative Spaces",
    },
    {
      image: "/placeholder.svg?height=1080&width=1920",
      title: "Flexible Work Environment",
    },
    {
      image: "/placeholder.svg?height=1080&width=1920",
      title: "Employee Amenities",
    },
  ]

  useEffect(() => {
    if (!isVisible) return

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length)
    }, 4000)

    return () => clearInterval(interval)
  }, [isVisible, slides.length])

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 z-0">
      {slides.map((slide, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            index === currentSlide ? "opacity-100" : "opacity-0"
          }`}
        >
          <img src={slide.image || "/placeholder.svg"} alt={slide.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black bg-opacity-40" />
          <div className="absolute bottom-8 left-8 text-white">
            <h3 className="text-2xl font-bold mb-2">{slide.title}</h3>
            <div className="flex space-x-2">
              {slides.map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    i === currentSlide ? "bg-white" : "bg-white bg-opacity-50"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
