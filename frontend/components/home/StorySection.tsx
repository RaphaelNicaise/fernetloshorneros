"use client"

import { useState } from 'react';
import Image from 'next/image';
import { m } from 'framer-motion';
import { slideLeft, slideRight } from './animations';

export function StorySection() {
  const [expanded1, setExpanded1] = useState(false);
  const [expanded2, setExpanded2] = useState(false);

  return (
    <section className="relative overflow-hidden bg-[#0b0a07] px-4 py-14 sm:py-28">
      <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-transparent via-[#AA6F3B]/30 to-transparent" />
      <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-transparent via-[#AA6F3B]/30 to-transparent" />

      <div className="container mx-auto max-w-6xl space-y-16 sm:space-y-24">
        {/* Story Part 1: Fernet Los Horneros */}
        <div className="grid items-center gap-8 sm:gap-10 md:grid-cols-2 md:gap-16">
          <m.div
            className="group relative"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={slideLeft}
          >
            <div className="absolute -inset-3 rounded-2xl ring-2 ring-[#AA6F3B]/20 transition-all duration-500 group-hover:ring-[#AA6F3B]/40" />
            <div className="relative h-[320px] overflow-hidden rounded-2xl shadow-2xl ring-1 ring-[#AA6F3B]/20 sm:h-[420px]">
              <Image
                src="/storyfernet.webp"
                alt="Fernet Los Horneros"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            </div>
          </m.div>
          <m.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={slideRight}
          >
            <span className="mb-3 inline-block text-xs font-semibold tracking-[0.25em] text-[#AA6F3B] uppercase">
              Nuestra Esencia
            </span>
            <h2 className="mb-6 font-serif text-3xl leading-tight font-bold text-[#f5f0e6] sm:text-4xl lg:text-5xl">
              Fernet Los Horneros
            </h2>
            <div className="mb-6 h-0.5 w-16 rounded-full bg-[#AA6F3B]/40" />
            <div className="max-w-prose space-y-4 text-base leading-relaxed text-[#e8e0d0] sm:text-lg">
              <div className={`space-y-4 ${expanded1 ? '' : 'line-clamp-5 sm:line-clamp-none'}`}>
                <p>
                  Dicen que el hornero ama una sola vez, y que con ese amor construye su nido
                  para siempre. Cada rama, cada pedacito de barro, es una muestra de su
                  dedicación y su paciencia. Así también nace este fernet, fiel a sus raíces
                  pampeanas, creado con respeto por la tierra y por las manos que lo elaboran.
                </p>
                <p>
                  Es un fernet hecho sin apuro, pensado para acompañar los momentos que dejan
                  huella. Para compartir con quienes elegís cada día, esos vínculos que se
                  construyen con el tiempo, con historias, risas y silencios.
                </p>
                <p>
                  Como el hornero, que levanta su casa mirando al horizonte, este fernet
                  celebra lo nuestro: la perseverancia, la amistad y ese amor que no se
                  suelta, porque cuando algo está hecho con alma, dura para siempre.
                </p>
              </div>
              <button
                onClick={() => setExpanded1(!expanded1)}
                className="mt-2 text-sm font-semibold tracking-wider text-[#AA6F3B] uppercase hover:text-[#c48d56] sm:hidden"
              >
                {expanded1 ? 'Leer menos' : 'Leer más'}
              </button>
            </div>
          </m.div>
        </div>

        <div className="mx-auto flex max-w-md items-center gap-4">
          <div className="h-px flex-1 bg-[#AA6F3B]/20" />
          <Image
            src="/logonuevo.webp"
            alt=""
            width={40}
            height={40}
            className="object-contain opacity-20 brightness-0 invert"
          />
          <div className="h-px flex-1 bg-[#AA6F3B]/20" />
        </div>

        {/* Story Part 2: Familia Redruello */}
        <div className="grid items-center gap-8 sm:gap-10 md:grid-cols-2 md:gap-16">
          <m.div
            className="order-2 md:order-1"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={slideLeft}
          >
            <span className="mb-3 inline-block text-xs font-semibold tracking-[0.25em] text-[#AA6F3B] uppercase">
              Quiénes Somos
            </span>
            <h2 className="mb-6 font-serif text-3xl leading-tight font-bold text-[#f5f0e6] sm:text-4xl lg:text-5xl">
              Familia Redruello
            </h2>
            <div className="mb-6 h-0.5 w-16 rounded-full bg-[#AA6F3B]/40" />
            <div className="max-w-prose space-y-4 text-base leading-relaxed text-[#e8e0d0] sm:text-lg">
              <div className={`space-y-4 ${expanded2 ? '' : 'line-clamp-5 sm:line-clamp-none'}`}>
                <p>
                  En la Familia Redruello entendemos el fernet como una estructura de capas.
                  Bajo el nombre de Los Horneros, hemos desarrollado un destilado de autor que
                  prioriza la riqueza aromática y la persistencia de las maderas nobles.
                </p>
                <p>
                  Nos alejamos de las fórmulas masivas para centrarnos en la precisión del
                  lote pequeño. Cada botella es un testimonio de nuestra interpretación de la
                  herencia herbal: una mezcla donde el amargor convive con la calidez de las
                  especias y la elegancia de los campos de lavanda. La técnica al servicio del
                  paladar.
                </p>
              </div>
              <button
                onClick={() => setExpanded2(!expanded2)}
                className="mt-2 text-sm font-semibold tracking-wider text-[#AA6F3B] uppercase hover:text-[#c48d56] sm:hidden"
              >
                {expanded2 ? 'Leer menos' : 'Leer más'}
              </button>
            </div>
          </m.div>
          <m.div
            className="group relative order-1 md:order-2"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={slideRight}
          >
            <div className="absolute -inset-3 rounded-2xl ring-2 ring-[#AA6F3B]/20 transition-all duration-500 group-hover:ring-[#AA6F3B]/40" />
            <div className="relative h-[320px] overflow-hidden rounded-2xl shadow-2xl ring-1 ring-[#AA6F3B]/20 sm:h-[420px]">
              <Image
                src="/storyredruello.webp"
                alt="Familia Redruello"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            </div>
          </m.div>
        </div>
      </div>
    </section>
  );
}
