"use client"

import { Navigation } from "@/components/navigation"
import { ImageCarousel } from "@/components/image-carousel"
import Image from "next/image"
import { fetchProducts, type Product } from "@/lib/api"
import { ProductCard } from "@/components/product-card"
import Link from "next/link"
import { Footer } from "@/components/footer"
import { useEffect, useState } from "react"
import { motion } from "framer-motion"

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } },
}

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.6, ease: "easeOut" as const } },
}

const slideLeft = {
  hidden: { opacity: 0, x: -60 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: "easeOut" as const } },
}

const slideRight = {
  hidden: { opacity: 0, x: 60 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: "easeOut" as const } },
}

const stagger = {
  visible: { transition: { staggerChildren: 0.15 } },
}


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
            <motion.div className="relative" initial="hidden" animate="visible" variants={slideLeft}>
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
              
            </motion.div>
            <motion.div className="relative h-[400px] sm:h-[500px] rounded-lg overflow-hidden" initial="hidden" animate="visible" variants={slideRight}>
              <ImageCarousel images={heroImages} autoPlayInterval={12000} />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Production Process */}
      <section className="py-16 sm:py-24 px-4 bg-secondary">
        <div className="container mx-auto max-w-6xl">
          <motion.div className="text-center mb-14" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} variants={fadeUp}>
            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
              Nuestro Proceso Artesanal
            </h2>
            <p className="text-text text-lg max-w-2xl mx-auto">
              Cada botella de Fernet Los Horneros es el resultado de dedicación, pasión y un proceso único.
            </p>
          </motion.div>

          {/* Círculos de proceso */}
          <motion.div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6 mb-16" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={stagger}>
            {[
              { img: "/proceso1.webp", title: "Aroma", desc: "Perfil aromático único donde los botánicos se funden con la calidez de la madera de roble." },
              { img: "/proceso2.webp", title: "Apariencia", desc: "Oscuridad infinita con reflejos bronce." },
              { img: "/proceso3.webp", title: "Sabor", desc: "Destaca con su suavidad en boca y un final dulzón." },
              { img: "/proceso4.webp", title: "Final", desc: "Un cierre cálido y persistente con sutiles notas de roble ahumado." },
            ].map((item) => (
              <motion.div key={item.title} className="flex flex-col items-center text-center group" variants={fadeUp}>
                <div className="relative w-44 h-44 sm:w-52 sm:h-52 lg:w-60 lg:h-60 rounded-full overflow-hidden shadow-lg ring-2 ring-primary/10 mb-5 transition-transform duration-500 group-hover:scale-105">
                  <img
                    src={item.img}
                    alt={item.title}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                </div>
                <h3 className="font-serif text-lg sm:text-xl font-bold text-foreground tracking-wide uppercase mb-2">
                  {item.title}
                </h3>
                <p className="text-text text-sm sm:text-base max-w-[220px] leading-relaxed">
                  {item.desc}
                </p>
              </motion.div>
            ))}
          </motion.div>

          {/* CTA Redes */}
          <motion.div className="text-center" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} variants={fadeUp}>
            <p className="text-foreground font-serif text-xl sm:text-2xl font-semibold mb-6">
              ¿Querés seguir de cerca el proceso? Seguinos
            </p>
            <div className="flex justify-center gap-4">
              <a
                href="https://www.instagram.com/fernetloshorneros"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-lg transition-all duration-200 hover:bg-primary/90 hover:shadow-md hover:scale-105 active:scale-95"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                Instagram
              </a>
              <a
                href="https://www.tiktok.com/@santiredruelloo"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-lg transition-all duration-200 hover:bg-primary/90 hover:shadow-md hover:scale-105 active:scale-95"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.46V13a8.28 8.28 0 005.58 2.17v-3.48a4.85 4.85 0 01-3.77-1.64V6.69h3.77z"/></svg>
                TikTok
              </a>
            </div>
          </motion.div>
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
            <motion.div className="relative group" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} variants={slideLeft}>
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
            </motion.div>
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} variants={slideRight}>
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
            </motion.div>
          </div>

          {/* Separador decorativo */}
          <div className="flex items-center gap-4 max-w-md mx-auto">
            <div className="flex-1 h-px bg-white/15" />
            <img src="/logo-fernet.png" alt="" aria-hidden className="w-10 h-10 object-contain opacity-20" />
            <div className="flex-1 h-px bg-white/15" />
          </div>

          {/* Familia Redruello — texto izquierda, imagen derecha */}
          <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
            <motion.div className="order-2 md:order-1" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} variants={slideLeft}>
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
            </motion.div>
            <motion.div className="order-1 md:order-2 relative group" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} variants={slideRight}>
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
            </motion.div>
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
          <motion.div className="text-center mb-12" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} variants={fadeUp}>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-foreground mb-4">Nuestros Productos</h2>
            <p className="text-text text-lg">Fernet artesanal y cristalería de calidad premium</p>
          </motion.div>
          <motion.div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }} variants={stagger}>
            {loading ? (
              <p className="col-span-full text-center text-muted-foreground">Cargando…</p>
            ) : error ? (
              <p className="col-span-full text-center text-destructive">{error}</p>
            ) : items.length === 0 ? (
              <p className="col-span-full text-center text-muted-foreground">Pronto vas a ver nuestros productos aquí.</p>
            ) : (
              items.map((product) => <motion.div key={product.id} variants={fadeUp}><ProductCard product={product} /></motion.div>)
            )}
          </motion.div>
          <motion.div className="text-center mt-12" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
            <Link
              href="/productos"
              className="inline-flex items-center justify-center px-8 py-4 bg-white text-primary font-semibold rounded-lg transition-all duration-200 transform-gpu hover:bg-text hover:shadow-md hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              Ver Todos los Productos
            </Link>
          </motion.div>
        </div>
      </section>


        <Footer />
      </div>
    </div>
  )
}
