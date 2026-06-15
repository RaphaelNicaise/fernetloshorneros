"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { motion, useTransform, useScroll } from "framer-motion"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { ProductCard } from "@/components/product-card"
import { fetchProducts, type Product } from "@/lib/api"
import { useWaitlistModal } from "@/lib/waitlist-modal-context"

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } },
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

const FALLBACK_PRODUCTS: Product[] = [
  {
    id: "fallback-1",
    name: "Fernet Los Horneros 750ml",
    description: "Fernet artesanal elaborado con botánicos seleccionados y madera de roble. Edición clásica.",
    price: 12500,
    image: "/storyfernet.webp",
    status: "disponible",
    stock: 50,
  },
  {
    id: "fallback-2",
    name: "Fernet Los Horneros 500ml",
    description: "La versión compacta de nuestro fernet signature. Ideal para compartir en cualquier ocasión.",
    price: 8900,
    image: "/storyfernet.webp",
    status: "disponible",
    stock: 50,
  },
  {
    id: "fallback-3",
    name: "Copa Los Horneros",
    description: "Copa de cristal premium con el escudo de Los Horneros grabado. Edición limitada.",
    price: 4500,
    image: "/storyfernet.webp",
    status: "disponible",
    stock: 30,
  },
]

export default function HomePageContent() {
  const { open: openWaitlistModal } = useWaitlistModal()
  const [items, setItems] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const heroRef = useRef<HTMLElement>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  // Si alguien llega desde /lista-espera (o con ?waitlist=1), abrir modal automáticamente
  useEffect(() => {
    if (searchParams.get("waitlist") === "1") {
      openWaitlistModal()
      // Limpiar el query param de la URL sin recargar
      router.replace("/", { scroll: false })
    }
  }, [searchParams, openWaitlistModal, router])

  // useScroll tracks progress as the hero section exits the viewport:
  // 0 = top of section at top of viewport (fully visible)
  // 1 = bottom of section at top of viewport (completely off screen)
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  })

  const heroScale = useTransform(scrollYProgress, [0, 1], [1.0, 1.32])
  const heroImageY = useTransform(scrollYProgress, [0, 1], ["0%", "-8%"])
  const heroContentOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])
  const heroContentY = useTransform(scrollYProgress, [0, 0.7], [0, -60])
  const heroCloseOpacity = useTransform(scrollYProgress, [0.1, 1], [0, 0.82])
  const heroCueOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0])

  useEffect(() => {
    let alive = true

    ;(async () => {
      try {
        const data = await fetchProducts()
        if (alive) setItems(data)
      } catch {
        if (alive) setItems([])
      } finally {
        if (alive) setLoading(false)
      }
    })()

    return () => {
      alive = false
    }
  }, [])

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-white">
      <div className="relative z-10">
        <Navigation />

        {/* Hero: h-screen with no sticky — useScroll drives animation as it exits viewport */}
        <section id="inicio" ref={heroRef} className="relative h-screen overflow-hidden bg-[#0b0a07]">
          <div className="absolute inset-0 z-0">
            <motion.img
              src="/fernet1.webp"
              alt="Fernet Los Horneros"
              className="h-full w-full object-cover object-[48%_42%] will-change-transform"
              style={{ scale: heroScale, y: heroImageY }}
            />
            <div className="absolute inset-0 z-[1] bg-[linear-gradient(90deg,rgba(8,7,5,0.92)_0%,rgba(8,7,5,0.7)_36%,rgba(8,7,5,0.18)_64%,rgba(8,7,5,0.5)_100%),linear-gradient(0deg,rgba(8,7,5,0.85)_0%,transparent_32%,transparent_70%,rgba(8,7,5,0.55)_100%)]" />
            <motion.div
              className="pointer-events-none absolute inset-0 z-[2] bg-[radial-gradient(120%_120%_at_50%_46%,transparent_38%,rgba(6,5,3,0.92)_100%)]"
              style={{ opacity: heroCloseOpacity }}
            />
          </div>

          <div className="relative z-10 mx-auto flex h-full w-full max-w-6xl items-center px-4 pt-24 pb-0 sm:pt-28 lg:pt-32">
            {/* Entry animation — slide in from left on mount */}
            <motion.div
              className="max-w-[620px] will-change-transform"
              initial={{ opacity: 0, x: -60 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
            >
              {/* Scroll-driven fade/lift — controlled by useScroll, not animate */}
              <motion.div style={{ opacity: heroContentOpacity, y: heroContentY }}>
                <div className="mb-8 flex flex-col items-center text-center md:items-start md:text-left">
                  
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <Image
                        src="/logonuevo.webp"
                        alt="Los Horneros"
                        width={54}
                        height={54}
                        className="h-10 w-10 sm:h-[54px] sm:w-[54px] object-contain brightness-0 invert"
                        priority
                      />
                      <Image
                        src="/logo-fernet.webp"
                        alt="Los Horneros Fernet"
                        width={420}
                        height={100}
                        className="h-auto w-[min(65vw,320px)] sm:w-[360px] md:w-[420px] object-contain brightness-0 invert"
                        priority
                      />
                    </div>
                  </div>
                </div>

                <h1 className="mb-5 text-center font-serif text-4xl font-bold leading-[1.02] text-white sm:text-5xl md:text-left md:text-6xl lg:text-7xl">
                  Preventa Septiembre 2026
                  <span className="ml-0 mt-3 block font-serif text-2xl uppercase tracking-[0.24em] text-[#aa825e] sm:text-3xl md:ml-4 md:mt-0 md:inline-block md:text-4xl">
                    Lote 2
                  </span>
                </h1>

                <p className="mb-8 max-w-[42ch] text-center text-base leading-[1.85] text-white/82 sm:text-lg md:text-left">
                  Solo <span className="font-semibold text-white">17.500 botellas numeradas</span>. Reservá tu lugar ahora para asegurar tu unidad antes del lanzamiento público.
                </p>

                <div className="flex w-full flex-col items-center gap-4 md:w-auto md:flex-row md:gap-5">
                  <motion.button
                    onClick={openWaitlistModal}
                    whileHover={{ scale: 1.03, y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    className="inline-flex w-full items-center justify-center rounded-full border border-[#aa825e] bg-[#aa825e] px-8 py-4 text-base font-semibold text-white shadow-[0_20px_40px_rgba(170,130,94,0.22)] transition-all duration-200 hover:bg-[#b78d68] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#aa825e] sm:w-auto"
                  >
                    Unirme a la lista de espera
                  </motion.button>
                  <button
                    onClick={() => document.getElementById("productos")?.scrollIntoView({ behavior: "smooth" })}
                    className="group inline-flex w-full cursor-pointer items-center justify-center gap-2 py-2 text-sm font-medium uppercase tracking-[0.2em] text-white/78 transition-colors hover:text-white sm:w-auto sm:justify-start"
                  >
                    Ver productos
                    <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-1">→</span>
                  </button>
                </div>

                <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.6, ease: "easeOut" }} className="mt-8 inline-flex max-w-full items-center gap-3 rounded-full border border-white/12 bg-black/28 px-5 py-3 text-left text-xs uppercase tracking-[0.18em] text-white/78 backdrop-blur-md">
                  <span className="h-2 w-2 rounded-full bg-[#aa825e]" />
                  Lote 1 sold out en 8 minutos
                </motion.div>
              </motion.div>
            </motion.div>
          </div>

        </section>

        <section className="bg-white px-4 pb-16 pt-28 sm:pb-24 sm:pt-32">
          <div className="container mx-auto max-w-6xl">
            <motion.div className="mb-14 text-center" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} variants={fadeUp}>
              <h2 className="mb-4 font-serif text-3xl font-bold text-[#0b0a07] sm:text-4xl md:text-5xl">
                Nuestro Proceso Artesanal
              </h2>
              <p className="mx-auto max-w-2xl text-lg text-black/68">
                Cada botella de Fernet Los Horneros is el resultado de dedicación, pasión y un proceso único.
              </p>
            </motion.div>

            <motion.div className="mb-16 grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-8 lg:grid-cols-4 lg:gap-6" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={stagger}>
              {[
                { img: "/proceso1.webp", title: "Aroma", desc: "Perfil aromático único donde los botánicos se funden con la calidez de la madera de roble." },
                { img: "/proceso2.webp", title: "Apariencia", desc: "Oscuridad infinita con reflejos bronce." },
                { img: "/proceso3.webp", title: "Sabor", desc: "Destaca con su suavidad en boca y un final dulzón." },
                { img: "/proceso4.webp", title: "Final", desc: "Un cierre cálido y persistente con sutiles notas de roble ahumado." },
              ].map((item) => (
                <motion.div key={item.title} className="group flex flex-col items-center text-center" variants={fadeUp}>
                  <div className="relative mb-5 h-32 w-32 min-[380px]:h-36 min-[380px]:w-36 min-[460px]:h-44 min-[460px]:w-44 overflow-hidden rounded-full border border-black/8 shadow-lg ring-2 ring-[#AA6F3B]/12 transition-transform duration-500 group-hover:scale-105 group-hover:shadow-xl sm:h-52 sm:w-52 lg:h-60 lg:w-60">
                    <img src={item.img} alt={item.title} loading="lazy" className="h-full w-full object-cover" />
                  </div>
                  <h3 className="mb-2 font-serif text-lg font-bold uppercase tracking-wide text-[#0b0a07] sm:text-xl">
                    {item.title}
                  </h3>
                  <p className="max-w-[220px] text-sm leading-relaxed text-black/68 sm:text-base">{item.desc}</p>
                </motion.div>
              ))}
            </motion.div>

            <motion.div className="text-center" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} variants={fadeUp}>
              <p className="mb-6 font-serif text-xl font-semibold text-[#0b0a07] sm:text-2xl">
                ¿Querés seguir de cerca el proceso? Seguinos
              </p>
              <div className="flex flex-row justify-center gap-3 sm:gap-4">
                <a
                  href="https://www.instagram.com/fernetloshorneros"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-black bg-black px-4 py-2.5 sm:px-6 sm:py-3 font-semibold text-white transition-all duration-200 hover:border-[#AA6F3B] hover:text-[#AA6F3B] hover:shadow-md hover:scale-105 active:scale-95"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
                  Instagram
                </a>
                <a
                  href="https://www.tiktok.com/@santiredruelloo"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-black bg-black px-4 py-2.5 sm:px-6 sm:py-3 font-semibold text-white transition-all duration-200 hover:border-[#AA6F3B] hover:text-[#AA6F3B] hover:shadow-md hover:scale-105 active:scale-95"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.46V13a8.28 8.28 0 005.58 2.17v-3.48a4.85 4.85 0 01-3.77-1.64V6.69h3.77z" /></svg>
                  TikTok
                </a>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-[#0b0a07] px-4 py-20 sm:py-28">
          <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-transparent via-[#AA6F3B]/30 to-transparent" />
          <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-transparent via-[#AA6F3B]/30 to-transparent" />

          <div className="container mx-auto max-w-6xl space-y-24">
            <div className="grid items-center gap-10 md:grid-cols-2 md:gap-16">
              <motion.div className="group relative" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} variants={slideLeft}>
                <div className="absolute -inset-3 rounded-2xl bg-[#AA6F3B]/10 blur-xl transition-all duration-500 group-hover:bg-[#AA6F3B]/20" />
                <div className="relative h-[320px] overflow-hidden rounded-2xl shadow-2xl ring-1 ring-[#AA6F3B]/20 sm:h-[420px]">
                  <img src="/storyfernet.webp" alt="Fernet Los Horneros" loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                </div>
              </motion.div>
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} variants={slideRight}>
                <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-[0.25em] text-[#AA6F3B]">Nuestra Esencia</span>
                <h2 className="mb-6 font-serif text-3xl font-bold leading-tight text-[#f5f0e6] sm:text-4xl lg:text-5xl">
                  Fernet Los Horneros
                </h2>
                <div className="mb-6 h-0.5 w-16 rounded-full bg-[#AA6F3B]/40" />
                <div className="space-y-4 text-base leading-relaxed text-[#e8e0d0] sm:text-lg">
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

            <div className="mx-auto flex max-w-md items-center gap-4">
              <div className="h-px flex-1 bg-[#AA6F3B]/20" />
              <Image src="/logonuevo.webp" alt="" width={40} height={40} className="object-contain opacity-20 brightness-0 invert" />
              <div className="h-px flex-1 bg-[#AA6F3B]/20" />
            </div>

            <div className="grid items-center gap-10 md:grid-cols-2 md:gap-16">
              <motion.div className="order-2 md:order-1" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} variants={slideLeft}>
                <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-[0.25em] text-[#AA6F3B]">Quiénes Somos</span>
                <h2 className="mb-6 font-serif text-3xl font-bold leading-tight text-[#f5f0e6] sm:text-4xl lg:text-5xl">
                  Familia Redruello
                </h2>
                <div className="mb-6 h-0.5 w-16 rounded-full bg-[#AA6F3B]/40" />
                <div className="space-y-4 text-base leading-relaxed text-[#e8e0d0] sm:text-lg">
                  <p>
                    En la Familia Redruello entendemos el fernet como una estructura de capas. Bajo el nombre de Los Horneros, hemos desarrollado un destilado de autor que prioriza la riqueza aromática y la persistencia de las maderas nobles.
                  </p>
                  <p>
                    Nos alejamos de las fórmulas masivas para centrarnos en la precisión del lote pequeño. Cada botella es un testimonio de nuestra interpretación de la herencia herbal: una mezcla donde el amargor convive con la calidez de las especias y la elegancia de los campos de lavanda. La técnica al servicio del paladar.
                  </p>
                </div>
              </motion.div>
              <motion.div className="group relative order-1 md:order-2" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} variants={slideRight}>
                <div className="absolute -inset-3 rounded-2xl bg-[#AA6F3B]/10 blur-xl transition-all duration-500 group-hover:bg-[#AA6F3B]/20" />
                <div className="relative h-[320px] overflow-hidden rounded-2xl shadow-2xl ring-1 ring-[#AA6F3B]/20 sm:h-[420px]">
                  <img src="/storyredruello.webp" alt="Familia Redruello" loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        <section id="productos" className="relative overflow-hidden bg-white px-4 pb-16 pt-20 scroll-mt-20 sm:pb-24 sm:pt-24">
          <div className="container mx-auto max-w-6xl">
            <motion.div className="mb-12 text-center" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} variants={fadeUp}>
              <h2 className="mb-4 font-serif text-3xl font-bold text-[#0b0a07] sm:text-4xl">Nuestros Productos</h2>
              <p className="text-lg text-black/60">Fernet artesanal y cristalería seleccionada para disfrutar cada momento.</p>
            </motion.div>
            <motion.div className="mx-auto grid max-w-5xl gap-7 md:grid-cols-2 lg:grid-cols-3" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }} variants={stagger}>
              {loading ? (
                <p className="col-span-full text-center text-black/50">Cargando…</p>
              ) : (
                (items.length > 0 ? items : FALLBACK_PRODUCTS).map((product) => (
                  <motion.div key={product.id} variants={fadeUp}>
                    <ProductCard product={product} />
                  </motion.div>
                ))
              )}
            </motion.div>
            <motion.div className="mt-12 text-center" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
              <Link
                href="/productos"
                className="inline-flex items-center justify-center rounded-full border border-[#0b0a07] bg-[#0b0a07] px-8 py-4 font-semibold text-white transition-all duration-200 transform-gpu hover:border-[#AA6F3B] hover:bg-[#AA6F3B] hover:shadow-md hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#AA6F3B]/30"
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
