"use client"

import { Navigation } from "@/components/navigation"
import { ImageCarousel } from "@/components/image-carousel"
import Image from "next/image"
import { fetchProducts, type Product } from "@/lib/api"
import { ProductCard } from "@/components/product-card"
import Link from "next/link"
import { Footer } from "@/components/footer"
import { SocialEmbedsWithLoading } from "@/components/social-embeds"
import { useEffect, useState } from "react"


const heroImages = [
  { src: "/fernet1.jpg", alt: "Fernet 1" },
  { src: "/fernet2.jpg", alt: "Fernet 2" },
  { src: "/fernet3.jpg", alt: "Fernet 3" },
  { src: "/fernet4.jpg", alt: "Fernet 4" },
]

export default function HomePage() {
  const [items, setItems] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchProducts()
        if (alive) setItems(data)
      } catch (e: any) {
        if (alive) setError(e?.message || "Error al cargar productos")
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])
  return (
    <div className="relative min-h-screen bg-primary overflow-hidden">
      <div className="relative z-10">
        <Navigation />

      {/* Hero Section */}
  <section className="relative pt-20 sm:pt-24 pb-16 sm:pb-20 px-4 bg-white overflow-hidden">
        {/* Fondo visible del hero */}
        <img
          src="/fontscreen.png"
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 w-full h-full object-cover opacity-40 md:opacity-25"
        />
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
            <div className="relative">
              <div className="relative inline-block mb-6">
                {/* Imagen de los horneros centrada justo detrás del logo */}
                <img
                  src="/horneros.png"
                  alt=""
                  aria-hidden
                  className="pointer-events-none select-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[46%] sm:w-[52%] md:w-[57%] lg:w-[63%] opacity-15 hidden md:block z-0"



                />
                <Image
                  src="/logo-fernet.png"
                  alt="Fernet Los Horneros"
                  width={520}
                  height={140}
                  className="relative z-10 h-24 sm:h-28 md:h-32 w-auto object-contain"
                  priority
                />
              </div>
                <p className="text-lg sm:text-xl text-muted-foreground mb-8 leading-relaxed">
                  El mejor Fernet Artesanal
                </p>
                <div className="flex flex-wrap gap-4 justify-center md:justify-start text-center md:text-left">
                  <Link
                    href="/productos"
                    className="inline-flex items-center justify-center px-6 sm:px-8 py-3 sm:py-4 bg-primary text-primary-foreground font-semibold rounded-lg transition-all duration-200 transform-gpu hover:bg-primary/90 hover:shadow-md hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  >
                    Ver Productos
                  </Link>
                  <Link
                    href="/lista-espera"
                    className="inline-flex items-center justify-center px-6 sm:px-8 py-3 sm:py-4 border-2 border-primary text-primary font-semibold rounded-lg transition-all duration-200 transform-gpu hover:bg-primary hover:text-primary-foreground hover:shadow-md hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  >
                    Únete a la Lista
                  </Link>
                </div>
              
            </div>
            <div className="relative h-[400px] sm:h-[500px] rounded-lg overflow-hidden">
              <ImageCarousel images={heroImages} autoPlayInterval={12000} />
            </div>
          </div>
        </div>
      </section>

      {/* Production Process Carousel */}
      <section className="py-16 sm:py-24 px-4 bg-secondary">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
              Nuestro Proceso Artesanal
            </h2>
            <p className="text-text text-lg max-w-2xl mx-auto">
              Seguinos en Redes Sociales y descubrí cómo elaboramos cada botella de Fernet Los Horneros con dedicación y pasión.
            </p>
          </div>
          {/* Instagram a la izquierda, TikTok a la derecha, con carga simulada */}
          <SocialEmbedsWithLoading />
          
        </div>
      </section>

      {/* Story Section */}
      <section className="py-16 sm:py-24 px-4 bg-primary">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
            <div className="order-2 md:order-1 relative h-[300px] sm:h-[400px] rounded-lg overflow-hidden">
              <img
                src="/imagen-12346.jpg"
                alt="Detalle del fernet"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="order-1 md:order-2">
              <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white mb-6">Fernet Los Horneros</h2>
              <div className="space-y-4 text-text leading-relaxed">
                <p>
                  Dicen que el hornero ama una sola vez, y que con ese amor construye su nido para siempre. Cada rama, cada pedacito de barro, es una muestra de su dedicación y su paciencia. Así también nace este fernet, fiel a sus raíces pampeanas, creado con respeto por la tierra y por las manos que lo elaboran.
                </p>
                <p>
                  Es un fernet hecho sin apuro, pensado para acompañar los momentos que dejan huella. Para compartir con quienes elegís cada día, esos vínculos que se construyen con el tiempo, con historias, risas y silencios.
                </p>
                <p>
                  Como el hornero, que levanta su casa mirando al horizonte, este fernet celebra lo nuestro: la perseverancia, la amistad y ese amor que no se suelta, porque cuando algo está hecho con alma, dura para siempre.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      
      {/* Products Preview */}
      <section className="relative py-16 sm:py-24 px-4 bg-accent overflow-hidden">
        {/* Fondo visible de productos */}
        <img
          src="/fontscreen.png"
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 w-full h-full object-cover opacity-40 md:opacity-25"
        />
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-foreground mb-4">Nuestros Productos</h2>
            <p className="text-text text-lg">Fernet artesanal y cristalería de calidad premium</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {loading ? (
              <p className="col-span-full text-center text-muted-foreground">Cargando…</p>
            ) : error ? (
              <p className="col-span-full text-center text-destructive">{error}</p>
            ) : items.length === 0 ? (
              <p className="col-span-full text-center text-muted-foreground">Pronto vas a ver nuestros productos aquí.</p>
            ) : (
              items.map((product) => <ProductCard key={product.id} product={product} />)
            )}
          </div>
          <div className="text-center mt-12">
            <Link
              href="/productos"
              className="inline-flex items-center justify-center px-8 py-4 bg-white text-primary font-semibold rounded-lg transition-all duration-200 transform-gpu hover:bg-text hover:shadow-md hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              Ver Todos los Productos
            </Link>
          </div>
        </div>
      </section>


        <Footer />
      </div>
    </div>
  )
}
