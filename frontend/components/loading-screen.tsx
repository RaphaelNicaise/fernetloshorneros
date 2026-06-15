"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"

export function LoadingScreen() {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Verificar si ya se mostró en esta sesión para no molestar en cada recarga (opcional)
    const hasLoaded = sessionStorage.getItem("hasLoadedApp")
    if (hasLoaded) {
      setIsLoading(false)
      return
    }

    const timer = setTimeout(() => {
      setIsLoading(false)
      sessionStorage.setItem("hasLoadedApp", "true")
    }, 2000)

    return () => clearTimeout(timer)
  }, [])

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.8, ease: "easeInOut" } }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0b0a07]"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="relative"
          >
            {/* Círculo rotando de fondo */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              className="absolute -inset-4 rounded-full border border-t-[#AA6F3B] border-r-transparent border-b-transparent border-l-transparent"
            />
            
            <Image
              src="/logonuevo.webp"
              alt="Fernet Los Horneros"
              width={100}
              height={100}
              className="brightness-0 invert"
              priority
            />
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="mt-8 overflow-hidden"
          >
            <h2 className="font-serif text-[#AA6F3B] text-xl tracking-widest uppercase">
              Los Horneros
            </h2>
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: "0%" }}
              transition={{ duration: 1.5, ease: "circOut" }}
              className="h-0.5 bg-[#AA6F3B] mt-2 w-full"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
