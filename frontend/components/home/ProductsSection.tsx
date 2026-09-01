"use client"

import Link from 'next/link';
import { m } from 'framer-motion';
import { ProductCard } from '@/components/product-card';
import { type Product } from '@/lib/api';
import { fadeUp } from './animations';

const FALLBACK_PRODUCTS: Product[] = [
  {
    id: 'fallback-1',
    name: 'Fernet Los Horneros 750ml',
    description:
      'Fernet artesanal elaborado con botánicos seleccionados y madera de roble. Edición clásica.',
    price: 12500,
    image: '/storyfernet.webp',
    status: 'disponible',
    stock: 50,
  },
  {
    id: 'fallback-2',
    name: 'Fernet Los Horneros 500ml',
    description:
      'La versión compacta de nuestro fernet signature. Ideal para compartir en cualquier ocasión.',
    price: 8900,
    image: '/storyfernet.webp',
    status: 'disponible',
    stock: 50,
  },
  {
    id: 'fallback-3',
    name: 'Copa Los Horneros',
    description: 'Copa de cristal premium con el escudo de Los Horneros grabado. Edición limitada.',
    price: 4500,
    image: '/storyfernet.webp',
    status: 'disponible',
    stock: 30,
  },
];

interface ProductsSectionProps {
  items: Product[];
  loading: boolean;
}

export function ProductsSection({ items, loading }: ProductsSectionProps) {
  const displayProducts = items.length > 0 ? items : FALLBACK_PRODUCTS;

  return (
    <section
      id="productos"
      className="relative scroll-mt-20 overflow-hidden rounded-t-3xl rounded-b-3xl bg-white px-4 pt-20 pb-16 sm:pt-24 sm:pb-24"
    >
      <div className="container mx-auto max-w-6xl">
        <m.div
          className="mb-12 text-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={fadeUp}
        >
          <h2 className="mb-4 font-serif text-3xl font-bold text-[#0b0a07] sm:text-4xl">
            Nuestros Productos
          </h2>
          <p className="text-lg text-black/60">
            Fernet artesanal y cristalería seleccionada para disfrutar cada momento.
          </p>
        </m.div>

        <div className="mx-auto grid max-w-5xl gap-7 md:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            <p className="col-span-full text-center text-black/50">Cargando…</p>
          ) : (
            displayProducts.map((product, index) => (
              <div
                key={product.id}
                className="animate-in fade-in slide-in-from-bottom-4 fill-mode-both duration-700"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <ProductCard product={product} />
              </div>
            ))
          )}
        </div>

        <m.div
          className="mt-12 text-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
        >
          <Link
            href="/productos"
            className="inline-flex transform-gpu items-center justify-center rounded-full border border-[#0b0a07] bg-[#0b0a07] px-8 py-4 font-semibold text-white transition-all duration-200 hover:scale-105 hover:border-[#AA6F3B] hover:bg-[#AA6F3B] hover:shadow-md focus-visible:ring-2 focus-visible:ring-[#AA6F3B]/30 focus-visible:outline-none active:scale-95"
          >
            Ver Todos los Productos
          </Link>
        </m.div>
      </div>
    </section>
  );
}
