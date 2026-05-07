"use client"
import { useState, useEffect } from "react"

const BackgroundSlideshow = () => {
  const [currentSlide, setCurrentSlide] = useState(0)

  const slides = [
    {
      title: "Flexible Work Environment",
      image: "/placeholder.svg?height=600&width=800",
    },
    {
      title: "Collaborative Spaces",
      image: "/placeholder.svg?height=600&width=800",
    },
    {
      title: "Focus Areas",
      image: "/placeholder.svg?height=600&width=800",
    },
    {
      title: "Wellness Zones",
      image: "/placeholder.svg?height=600&width=800",
    },
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length)
    }, 4000)

    return () => clearInterval(interval)
  }, [slides.length])

  return (
    <div className="absolute inset-0 overflow-hidden rounded-lg">
      {slides.map((slide, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            index === currentSlide ? "opacity-100" : "opacity-0"
          }`}
        >
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: `url(${slide.image})`,
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-900/80 via-blue-800/60 to-blue-700/40" />
          </div>
          <div className="absolute bottom-8 left-8 text-white">
            <h3 className="text-2xl font-bold mb-2">{slide.title}</h3>
            <div className="flex gap-2">
              {slides.map((_, dotIndex) => (
                <div
                  key={dotIndex}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    dotIndex === currentSlide ? "bg-white" : "bg-white/50"
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

export default BackgroundSlideshow
