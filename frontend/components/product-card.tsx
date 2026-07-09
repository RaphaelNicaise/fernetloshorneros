'use client';

import { useCart } from '@/lib/cart-context';
import { useState } from 'react';
import clsx from 'clsx';
import { Check } from 'lucide-react';
import { getImageSrc } from '@/lib/api';
import { toast } from '@/hooks/use-toast';

import Image from 'next/image';

interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  description: string;
  roastLevel?: string;
  status?: 'disponible' | 'proximamente' | 'agotado';
  limite?: number;
  stock?: number;
}

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCart();
  const [isAdding, setIsAdding] = useState(false);
  const isAvailable = (product.status ?? 'disponible') === 'disponible';
  const hasStock = (product.stock ?? 0) > 0;
  const priceNumber = Number(product.price);
  const statusLabel = !isAvailable
    ? product.status === 'proximamente'
      ? 'Próximamente'
      : 'Agotado'
    : !hasStock
      ? 'Sin stock'
      : 'Disponible';

  const handleAddToCart = () => {
    if (!isAvailable) return;

    if (!hasStock) {
      toast({
        title: 'Producto agotado',
        description: `${product.name} no tiene stock disponible en este momento.`,
        variant: 'destructive',
      });
      return;
    }

    addItem({
      id: product.id,
      name: product.name,
      price: Number.isFinite(priceNumber) ? priceNumber : 0,
      image: getImageSrc(product.image),
      limite: product.limite,
      stock: product.stock,
    });
    setIsAdding(true);
    setTimeout(() => setIsAdding(false), 1000);
  };

  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-[1.6rem] border border-black/10 bg-white shadow-sm transition-transform duration-300 transform-gpu hover:-translate-y-1 hover:shadow-md">
      <div className="relative h-72 overflow-hidden bg-[#0b0a07]">
        <Image
          src={getImageSrc(product.image) || '/placeholder.svg'}
          alt={product.name}
          fill
          unoptimized
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-transform duration-500 transform-gpu group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b0a07]/80 via-transparent to-transparent" />
        <div className="absolute top-4 right-4 left-4 flex items-center justify-between gap-3">
          <div
            className={`rounded-full px-3 py-1 text-[11px] font-semibold tracking-[0.18em] uppercase ${
              isAvailable && hasStock
                ? 'border border-[#6B5743]/35 bg-[#6B5743]/12 text-[#6B5743]'
                : 'border border-white/12 bg-white/8 text-white/72'
            }`}
          >
            {statusLabel}
          </div>
          {product.roastLevel ? (
            <div className="rounded-full border border-white/12 bg-black/40 px-3 py-1 text-[11px] font-medium tracking-[0.14em] text-white/75 uppercase">
              {product.roastLevel}
            </div>
          ) : null}
        </div>
        <div className="absolute bottom-4 left-4 rounded-full border border-white/12 bg-black/40 px-3 py-1 text-sm font-medium text-white">
          Edición artesanal
        </div>
      </div>
      <div className="flex flex-1 flex-col p-6">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h3 className="font-serif text-[1.45rem] leading-tight font-bold text-[#0b0a07]">
            {product.name}
          </h3>
          <div className="h-px w-14 bg-[#6B5743]/35" />
        </div>
        <p className="mb-6 text-sm leading-relaxed text-black/62">{product.description}</p>
        <div className="mt-auto flex items-end justify-between gap-4">
          <span className="font-serif text-3xl font-bold text-[#0b0a07]">
            {Number.isFinite(priceNumber)
              ? priceNumber.toLocaleString('es-AR', {
                  style: 'currency',
                  currency: 'ARS',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })
              : '-'}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleAddToCart}
              disabled={isAdding || !isAvailable || !hasStock}
              aria-label="Agregar al carrito"
              className={`inline-flex h-12 w-12 items-center justify-center rounded-full border font-semibold transition-all duration-200 focus-visible:ring-2 focus-visible:ring-[#6B5743]/30 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
                isAdding
                  ? 'border-[#6B5743] bg-[#6B5743] text-white'
                  : 'border-black bg-black text-white hover:border-[#6B5743] hover:bg-[#6B5743] disabled:border-black/12 disabled:bg-black/10 disabled:text-black/30'
              }`}
            >
              <span className="relative inline-flex h-5 w-5 items-center justify-center">
                {/* Carrito */}
                <span
                  className={clsx(
                    'absolute inset-0 flex items-center justify-center transition-all duration-200',
                    isAdding ? 'scale-75 rotate-90 opacity-0' : 'scale-100 rotate-0 opacity-100'
                  )}
                  aria-hidden={isAdding}
                >
                  <span className="material-symbols-outlined translate-y-[1px] align-middle text-[20px] leading-none">
                    add_shopping_cart
                  </span>
                </span>
                {/* Check */}
                <span
                  className={clsx(
                    'absolute inset-0 flex items-center justify-center transition-all duration-200',
                    isAdding ? 'scale-100 rotate-0 opacity-100' : 'scale-75 -rotate-90 opacity-0'
                  )}
                  aria-hidden={!isAdding}
                >
                  <Check className="h-5 w-5 translate-y-[1px] text-white" />
                </span>
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
