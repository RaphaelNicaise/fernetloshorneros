"use client"

import Image from 'next/image';
import { m } from 'framer-motion';
import { fadeUp, stagger } from './animations';

export function ProcessSection() {
  return (
    <section className="relative z-10 rounded-t-3xl rounded-b-3xl bg-white px-4 pt-28 pb-16 shadow-[0_-40px_60px_rgba(0,0,0,0.3)] sm:pt-32 sm:pb-24">
      <div className="container mx-auto max-w-6xl">
        <m.div
          className="mb-14 text-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={fadeUp}
        >
          <h2 className="mb-4 font-serif text-3xl font-bold text-[#0b0a07] sm:text-4xl md:text-5xl">
            Nuestro Proceso Artesanal
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-black/68">
            Cada botella de Fernet Los Horneros es el resultado de dedicación, pasión y un
            proceso único.
          </p>
        </m.div>

        <m.div
          className="mb-16 grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-8 lg:grid-cols-4 lg:gap-6"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={stagger}
        >
          {[
            {
              img: '/proceso1.webp',
              title: 'Aroma',
              desc: 'Perfil aromático único donde los botánicos se funden con la calidez de la madera de roble.',
              num: 'I',
            },
            {
              img: '/proceso2.webp',
              title: 'Apariencia',
              desc: 'Oscuridad infinita con reflejos bronce.',
              num: 'II',
            },
            {
              img: '/proceso3.webp',
              title: 'Sabor',
              desc: 'Destaca con su suavidad en boca y un final dulzón.',
              num: 'III',
            },
            {
              img: '/proceso4.webp',
              title: 'Final',
              desc: 'Un cierre cálido y persistente con sutiles notas de roble ahumado.',
              num: 'IV',
            },
          ].map((item) => (
            <m.div
              key={item.title}
              className="group flex flex-row items-center gap-4 text-left sm:flex-col sm:text-center"
              variants={fadeUp}
            >
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-black/8 shadow-lg ring-2 ring-[#AA6F3B]/12 transition-transform duration-500 group-hover:scale-105 group-hover:shadow-xl sm:mb-5 sm:h-52 sm:w-52 lg:h-60 lg:w-60">
                <Image
                  src={item.img}
                  alt={item.title}
                  fill
                  sizes="(max-width: 640px) 80px, (max-width: 1024px) 50vw, 25vw"
                  className="object-cover"
                />
              </div>
              <div>
                <h3 className="mb-1 flex items-center gap-2 font-serif text-lg font-bold tracking-wide text-[#0b0a07] uppercase sm:mb-2 sm:justify-center sm:text-xl">
                  <span className="text-xs text-[#AA6F3B]">{item.num}.</span>
                  {item.title}
                </h3>
                <p className="max-w-[220px] text-sm leading-relaxed text-black/68 sm:mx-auto sm:text-base">
                  {item.desc}
                </p>
              </div>
            </m.div>
          ))}
        </m.div>

        <m.div
          className="text-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={fadeUp}
        >
          <p className="mb-6 font-serif text-xl font-semibold text-[#0b0a07] sm:text-2xl">
            ¿Querés seguir de cerca el proceso? Seguinos
          </p>
          <div className="mx-auto flex w-full max-w-xs flex-col justify-center gap-3 sm:w-auto sm:max-w-none sm:flex-row">
            <div className="flex flex-col items-center gap-1.5">
              <a
                href="https://www.instagram.com/fernetloshorneros"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-black bg-black px-4 py-2.5 font-semibold text-white transition-all duration-200 hover:scale-105 hover:border-[#AA6F3B] hover:shadow-md active:scale-95 sm:px-6 sm:py-3"
              >
                <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path
                    d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"
                  />
                </svg>
                Instagram
              </a>
              <span className="text-[10px] tracking-wide text-black/40 sm:text-xs">
                @fernetloshorneros
              </span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <a
                href="https://www.tiktok.com/@santiredruelloo"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-black bg-black px-4 py-2.5 font-semibold text-white transition-all duration-200 hover:scale-105 hover:border-[#AA6F3B] hover:shadow-md active:scale-95 sm:px-6 sm:py-3"
              >
                <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.46V13a8.28 8.28 0 005.58 2.17v-3.48a4.85 4.85 0 01-3.77-1.64V6.69h3.77z" />
                </svg>
                TikTok
              </a>
              <span className="text-[10px] tracking-wide text-black/40 sm:text-xs">
                @santiredruelloo
              </span>
            </div>
          </div>
        </m.div>
      </div>
    </section>
  );
}
