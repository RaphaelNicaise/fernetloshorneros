"use client"

import { Navigation } from "@/components/navigation"
import { ImageCarousel } from "@/components/image-carousel"
import Image from "next/image"
import { fetchProducts, type Product } from "@/lib/api"
import { ProductCard } from "@/components/product-card"
import Link from "next/link"
import { Footer } from "@/components/footer"
import { useEffect, useState } from "react"


const heroImages = [  
  { src: "/fernet1.webp", alt: "Fernet 1" },
  { src: "/fernet2.webp", alt: "Fernet 2" },
  { src: "/fernet3.webp", alt: "Fernet 3" },
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
          loading="lazy"
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
                  loading="lazy"
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
          
          
          
        </div>
      </section>

      {/* Story Section */}
      <section className="relative py-20 sm:py-28 px-4 bg-primary overflow-hidden">
        {/* Decorative accent */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        <div className="container mx-auto max-w-6xl space-y-24">
          {/* Fernet Los Horneros — imagen izquierda, texto derecha */}
          <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
            <div className="relative group">
              <div className="absolute -inset-3 rounded-2xl bg-white/5 blur-xl group-hover:bg-white/10 transition-all duration-500" />
              <div className="relative h-[320px] sm:h-[420px] rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10">
                <img
                  src="/storyfernet.webp"
                  alt="Fernet Los Horneros"
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
              </div>
            </div>
            <div>
              <span className="inline-block text-xs font-semibold tracking-[0.25em] uppercase text-white/50 mb-3">Nuestra Esencia</span>
              <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
                Fernet Los Horneros
              </h2>
              <div className="w-16 h-0.5 bg-white/30 mb-6 rounded-full" />
              <div className="space-y-4 text-white/80 leading-relaxed text-base sm:text-lg">
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

          {/* Separador decorativo */}
          <div className="flex items-center gap-4 max-w-md mx-auto">
            <div className="flex-1 h-px bg-white/15" />
            <img src="/logo-fernet.png" alt="" aria-hidden className="w-10 h-10 object-contain opacity-20" />
            <div className="flex-1 h-px bg-white/15" />
          </div>

          {/* Familia Redruello — texto izquierda, imagen derecha */}
          <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
            <div className="order-2 md:order-1">
              <span className="inline-block text-xs font-semibold tracking-[0.25em] uppercase text-white/50 mb-3">Quiénes Somos</span>
              <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
                Familia Redruello
              </h2>
              <div className="w-16 h-0.5 bg-white/30 mb-6 rounded-full" />
              <div className="space-y-4 text-white/80 leading-relaxed text-base sm:text-lg">
                <p>
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
                </p>
                <p>
                  Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
                </p>
                <p>
                  Curabitur pretium tincidunt lacus. Nulla gravida orci a odio. Nullam varius, turpis et commodo pharetra, est eros bibendum elit, nec luctus magna felis sollicitudin mauris.
                </p>
              </div>
            </div>
            <div className="order-1 md:order-2 relative group">
              <div className="absolute -inset-3 rounded-2xl bg-white/5 blur-xl group-hover:bg-white/10 transition-all duration-500" />
              <div className="relative h-[320px] sm:h-[420px] rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10">
                <img
                  src="/storyredruello.webp"
                  alt="Familia Redruello"
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
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
          loading="lazy"
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
