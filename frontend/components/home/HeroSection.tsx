"use client"

import { useRef } from 'react';
import Image from 'next/image';
import { m, useScroll, useTransform } from 'framer-motion';

interface HeroSectionProps {
  onOpenWaitlist: () => void;
}

export function HeroSection({ onOpenWaitlist }: HeroSectionProps) {
  const heroRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });

  const heroScale = useTransform(scrollYProgress, [0, 1], [1.0, 1.32]);
  const heroImageY = useTransform(scrollYProgress, [0, 1], ['0%', '-8%']);
  const heroContentOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const heroContentY = useTransform(scrollYProgress, [0, 0.7], [0, -60]);
  const heroCloseOpacity = useTransform(scrollYProgress, [0.1, 1], [0, 0.82]);

  return (
    <section
      id="inicio"
      ref={heroRef}
      className="relative h-screen overflow-hidden bg-[#0b0a07]"
    >
      <div className="absolute inset-0 z-0">
        <m.div
          className="absolute inset-0 will-change-transform"
          style={{ scale: heroScale, y: heroImageY }}
        >
          <Image
            src="/fernet1.webp"
            alt="Fernet Los Horneros"
            fill
            priority
            fetchPriority="high"
            className="object-cover object-[center_top] sm:object-[48%_42%]"
            sizes="(max-width: 768px) 100vw, 100vw"
          />
        </m.div>
        <div className="absolute inset-0 z-[1] bg-gradient-to-b from-black/90 via-black/60 to-transparent sm:bg-[linear-gradient(90deg,rgba(8,7,5,0.92)_0%,rgba(8,7,5,0.7)_36%,rgba(8,7,5,0.18)_64%,rgba(8,7,5,0.5)_100%),linear-gradient(0deg,rgba(8,7,5,0.85)_0%,transparent_32%,transparent_70%,rgba(8,7,5,0.55)_100%)]" />
        <m.div
          className="pointer-events-none absolute inset-0 z-[2] hidden sm:block bg-[radial-gradient(120%_120%_at_50%_46%,transparent_38%,rgba(6,5,3,0.92)_100%)]"
          style={{ opacity: heroCloseOpacity }}
        />
      </div>

      <div className="relative z-10 mx-auto flex h-full w-full max-w-6xl items-start px-4 pt-[15vh] sm:items-center sm:pt-28 lg:pt-32">
        <m.div
          className="w-full max-w-[520px] will-change-transform md:max-w-[620px]"
          initial={{ opacity: 0, x: -60 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        >
          <m.div style={{ opacity: heroContentOpacity, y: heroContentY }} className="w-full">
            {/* Mobile Layout */}
            <div className="flex w-full flex-col items-center text-center md:hidden">
              <m.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6, ease: 'easeOut' }}
                className="mb-8 inline-flex max-w-full items-center gap-3 rounded-full border border-white/12 bg-black/28 px-4 py-2.5 text-left text-[10px] tracking-[0.18em] text-white/78 uppercase backdrop-blur-md sm:text-xs"
              >
                <span className="h-2 w-2 rounded-full bg-[#aa825e]" />
                Lote 1 sold out en 8 minutos
              </m.div>

              <div className="mb-6 flex flex-col items-center">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <Image
                      src="/logonuevo.webp"
                      alt="Los Horneros"
                      width={54}
                      height={54}
                      className="h-12 w-12 object-contain brightness-0 invert sm:h-[54px] sm:w-[54px]"
                      priority
                    />
                  </div>
                </div>
              </div>
              <span className="mt-3 ml-0 block font-serif text-2xl tracking-[0.24em] text-[#aa825e] uppercase sm:text-3xl">
                Lote 2
              </span>
              <br />
              <h1 className="mb-5 text-center font-serif text-4xl leading-[1.02] font-bold text-white sm:text-5xl">
                Preventa Septiembre 2026
              </h1>

              <p className="mb-8 max-w-[42ch] text-sm leading-[1.85] text-white/82 sm:text-lg">
                Solo{' '}
                <span className="font-semibold text-white">17.500 botellas numeradas</span>.
                Reservá tu lugar ahora para asegurar tu unidad antes del lanzamiento público.
              </p>

              <div className="flex w-full flex-col items-center gap-4 sm:w-auto sm:flex-row sm:gap-5">
                <m.button
                  onClick={onOpenWaitlist}
                  whileHover={{ scale: 1.03, y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex w-full items-center justify-center rounded-md border border-[#aa825e] bg-[#aa825e] px-8 py-4 text-base font-semibold text-white shadow-[0_20px_40px_rgba(170,130,94,0.22)] transition-all duration-200 hover:bg-[#b78d68] focus-visible:ring-2 focus-visible:ring-[#aa825e] focus-visible:outline-none sm:w-auto sm:rounded-full"
                >
                  Unirme a la lista de espera
                </m.button>
                <button
                  onClick={() =>
                    document.getElementById('productos')?.scrollIntoView({ behavior: 'smooth' })
                  }
                  className="group inline-flex w-full items-center justify-center rounded-md border border-white/20 py-4 text-sm font-medium tracking-[0.2em] text-white/78 uppercase transition-colors hover:bg-white/10 hover:text-white sm:w-auto sm:justify-start sm:rounded-full sm:border-transparent sm:py-2 sm:hover:bg-transparent"
                >
                  Ver productos
                  <span
                    aria-hidden
                    className="hidden transition-transform duration-200 group-hover:translate-x-1 sm:inline-block"
                  >
                    →
                  </span>
                </button>
              </div>
            </div>

            {/* Desktop Layout */}
            <div className="hidden w-full flex-col items-start text-left md:flex">
              <div className="mb-8 flex flex-col items-start text-left">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-4">
                    <Image
                      src="/logonuevo.webp"
                      alt="Los Horneros"
                      width={54}
                      height={54}
                      className="h-[54px] w-[54px] object-contain brightness-0 invert"
                      priority
                    />
                    <Image
                      src="/logo-fernet.webp"
                      alt="Los Horneros Fernet"
                      width={420}
                      height={100}
                      className="h-auto w-[420px] object-contain brightness-0 invert"
                      priority
                    />
                  </div>
                </div>
              </div>

              <h1 className="mb-5 text-left font-serif text-6xl leading-[1.02] font-bold text-white lg:text-7xl">
                Preventa Septiembre 2026
                <span className="mt-0 ml-4 inline-block font-serif text-2xl tracking-[0.24em] text-[#aa825e] uppercase md:text-4xl">
                  Lote 2
                </span>
              </h1>

              <p className="mb-8 max-w-[42ch] text-left text-base leading-[1.85] text-white/82 md:text-lg">
                Solo{' '}
                <span className="font-semibold text-white">17.500 botellas numeradas</span>.
                Reservá tu lugar ahora para asegurar tu unidad antes del lanzamiento público.
              </p>

              <div className="flex w-auto flex-row items-center gap-5">
                <m.button
                  onClick={onOpenWaitlist}
                  whileHover={{ scale: 1.03, y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex w-auto items-center justify-center rounded-full border border-[#aa825e] bg-[#aa825e] px-8 py-4 text-base font-semibold text-white shadow-[0_20px_40px_rgba(170,130,94,0.22)] transition-all duration-200 hover:bg-[#b78d68] focus-visible:ring-2 focus-visible:ring-[#aa825e] focus-visible:outline-none"
                >
                  Unirme a la lista de espera
                </m.button>
                <button
                  onClick={() =>
                    document.getElementById('productos')?.scrollIntoView({ behavior: 'smooth' })
                  }
                  className="group inline-flex w-auto cursor-pointer items-center justify-start gap-2 py-2 text-sm font-medium tracking-[0.2em] text-white/78 uppercase transition-colors hover:text-white"
                >
                  Ver productos
                  <span
                    aria-hidden
                    className="transition-transform duration-200 group-hover:translate-x-1"
                  >
                    →
                  </span>
                </button>
              </div>

              <m.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.6, ease: 'easeOut' }}
                className="mt-8 inline-flex max-w-full items-center gap-3 rounded-full border border-white/12 bg-black/28 px-5 py-3 text-left text-xs tracking-[0.18em] text-white/78 uppercase backdrop-blur-md"
              >
                <span className="h-2 w-2 rounded-full bg-[#aa825e]" />
                Lote 1 sold out en 8 minutos
              </m.div>
            </div>
          </m.div>
        </m.div>
      </div>
    </section>
  );
}
