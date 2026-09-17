"use client"

import { useRef } from 'react';
import Image from 'next/image';
import { m, useScroll, useTransform } from 'framer-motion';
import { CountdownTimer } from './CountdownTimer';

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

      <div className="relative z-10 mx-auto flex h-full w-full max-w-6xl items-center px-4 pt-16 sm:pt-20">
        <m.div
          className="w-full max-w-[520px] will-change-transform md:max-w-[620px]"
          initial={{ opacity: 0, x: -60 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        >
          <m.div style={{ opacity: heroContentOpacity, y: heroContentY }} className="w-full">
            {/* Mobile Layout */}
            <div className="flex w-full flex-col items-center text-center md:hidden">
              <h1 className="sr-only">Fernet Artesanal Los Horneros</h1>

              <div className="mb-6 flex items-center justify-center gap-3">
                <Image
                  src="/logonuevo.webp"
                  alt="Los Horneros"
                  width={46}
                  height={46}
                  className="h-10 w-10 sm:h-12 sm:w-12 object-contain brightness-0 invert"
                  priority
                />
                <Image
                  src="/logo-fernet.webp"
                  alt="Fernet Los Horneros"
                  width={280}
                  height={65}
                  className="h-auto w-[230px] sm:w-[270px] object-contain brightness-0 invert"
                  priority
                />
              </div>

              {/* Lotes Agotados Badges */}
              <div className="mb-5 flex w-full max-w-sm flex-col gap-2">
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/40 px-4 py-2.5 backdrop-blur-md">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#aa825e]" />
                    <span className="font-serif font-bold text-white text-xs">Lote 1</span>
                    <span className="rounded-full bg-red-500/15 border border-red-500/30 px-1.5 py-0.5 text-[9px] font-bold text-red-400 uppercase tracking-wider">
                      Agotado
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-white/80 font-medium">
                    160 botellas en <span className="text-[#aa825e] font-bold">8 min</span>
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/40 px-4 py-2.5 backdrop-blur-md">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#aa825e]" />
                    <span className="font-serif font-bold text-white text-xs">Lote 2</span>
                    <span className="rounded-full bg-red-500/15 border border-red-500/30 px-1.5 py-0.5 text-[9px] font-bold text-red-400 uppercase tracking-wider">
                      Agotado
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-white/80 font-medium">
                    2.000 botellas en <span className="text-[#aa825e] font-bold">4 hs</span>
                  </span>
                </div>
              </div>

              {/* CountdownTimer reservado para futuros lanzamientos */}
              {/* <div className="mb-5 flex flex-col items-center gap-2">
                <span className="text-[11px] font-semibold tracking-[0.22em] text-[#aa825e] uppercase">
                  Disponible en:
                </span>
                <CountdownTimer />
              </div> */}

              <p className="mb-6 max-w-[42ch] text-sm leading-[1.85] text-white/82 sm:text-base">
                Sumate a la lista de espera para tener <span className="font-semibold text-white">acceso anticipado y descuentos</span> en el próximo lote.
              </p>

              <div className="flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row sm:gap-5">
                <m.button
                  onClick={onOpenWaitlist}
                  whileHover={{ scale: 1.03, y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex w-full items-center justify-center rounded-md border border-[#aa825e] bg-[#aa825e] px-8 py-3.5 text-base font-semibold text-white shadow-[0_20px_40px_rgba(170,130,94,0.22)] transition-all duration-200 hover:bg-[#b78d68] focus-visible:ring-2 focus-visible:ring-[#aa825e] focus-visible:outline-none sm:w-auto sm:rounded-full cursor-pointer"
                >
                  Unirme a la lista de espera
                </m.button>
                <button
                  onClick={() =>
                    document.getElementById('productos')?.scrollIntoView({ behavior: 'smooth' })
                  }
                  className="group inline-flex w-full cursor-pointer items-center justify-center rounded-md border border-white/20 py-3 text-sm font-medium tracking-[0.2em] text-white/78 uppercase transition-colors hover:bg-white/10 hover:text-white sm:w-auto sm:justify-start sm:rounded-full sm:border-transparent sm:py-2 sm:hover:bg-transparent"
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
              <h1 className="sr-only">Fernet Artesanal Los Horneros</h1>

              <div className="mb-7 flex flex-col items-start text-left">
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
                      alt="Fernet Los Horneros"
                      width={420}
                      height={100}
                      className="h-auto w-[360px] lg:w-[420px] object-contain brightness-0 invert"
                      priority
                    />
                  </div>
                </div>
              </div>

              {/* Lotes Agotados Badges */}
              <div className="mb-6 flex w-full max-w-lg flex-col gap-2.5">
                <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/40 px-5 py-3 backdrop-blur-md">
                  <div className="flex items-center gap-3">
                    <span className="h-2 w-2 rounded-full bg-[#aa825e]" />
                    <span className="font-serif font-bold text-white text-sm">Lote 1</span>
                    <span className="rounded-full bg-red-500/15 border border-red-500/30 px-2 py-0.5 text-[10px] font-bold text-red-400 uppercase tracking-wider">
                      Agotado
                    </span>
                  </div>
                  <span className="font-mono text-xs text-white/80 font-medium">
                    160 botellas en <span className="text-[#aa825e] font-bold">8 minutos</span>
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/40 px-5 py-3 backdrop-blur-md">
                  <div className="flex items-center gap-3">
                    <span className="h-2 w-2 rounded-full bg-[#aa825e]" />
                    <span className="font-serif font-bold text-white text-sm">Lote 2</span>
                    <span className="rounded-full bg-red-500/15 border border-red-500/30 px-2 py-0.5 text-[10px] font-bold text-red-400 uppercase tracking-wider">
                      Agotado
                    </span>
                  </div>
                  <span className="font-mono text-xs text-white/80 font-medium">
                    2.000 botellas en <span className="text-[#aa825e] font-bold">4 horas</span>
                  </span>
                </div>
              </div>

              {/* CountdownTimer reservado para futuros lanzamientos */}
              {/* <div className="mb-6 flex flex-col items-start gap-2.5">
                <span className="text-xs font-semibold tracking-[0.25em] text-[#aa825e] uppercase">
                  Disponible en:
                </span>
                <CountdownTimer />
              </div> */}

              <p className="mb-8 max-w-[44ch] text-left text-base leading-[1.85] text-white/82 md:text-lg">
                Sumate a la lista de espera para tener <span className="font-semibold text-white">acceso anticipado y descuentos exclusivos</span> en el próximo lote.
              </p>

              <div className="flex w-auto flex-row items-center gap-5">
                <m.button
                  onClick={onOpenWaitlist}
                  whileHover={{ scale: 1.03, y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex w-auto items-center justify-center rounded-full border border-[#aa825e] bg-[#aa825e] px-8 py-4 text-base font-semibold text-white shadow-[0_20px_40px_rgba(170,130,94,0.22)] transition-all duration-200 hover:bg-[#b78d68] focus-visible:ring-2 focus-visible:ring-[#aa825e] focus-visible:outline-none cursor-pointer"
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
            </div>
          </m.div>
        </m.div>
      </div>
    </section>
  );
}
