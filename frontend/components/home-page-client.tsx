'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LazyMotion, domAnimation } from 'framer-motion';
import { Navigation } from '@/components/navigation';
import { Footer } from '@/components/footer';
import { fetchProducts, type Product } from '@/lib/api';
import { useWaitlistModal } from '@/lib/waitlist-modal-context';

import { HeroSection } from './home/HeroSection';
import { ProcessSection } from './home/ProcessSection';
import { StorySection } from './home/StorySection';
import { ProductsSection } from './home/ProductsSection';

export default function HomePageContent() {
  const { open: openWaitlistModal } = useWaitlistModal();
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const router = useRouter();
  const searchParams = useSearchParams();

  // Si alguien llega desde /lista-espera (o con ?waitlist=1), abrir modal automáticamente
  useEffect(() => {
    if (searchParams.get('waitlist') === '1') {
      openWaitlistModal();
      router.replace('/', { scroll: false });
    }
  }, [searchParams, openWaitlistModal, router]);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const data = await fetchProducts();
        if (alive) setItems(data);
      } catch {
        if (alive) setItems([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  return (
    <LazyMotion features={domAnimation}>
      <div className="relative min-h-screen overflow-x-hidden bg-[#0b0a07]">
        <div className="relative z-10">
          <Navigation />

          {/* 1. Hero Section */}
          <HeroSection onOpenWaitlist={openWaitlistModal} />

          {/* 2. Proceso Artesanal */}
          <ProcessSection />

          {/* 3. Historia & Esencia */}
          <StorySection />

          {/* 4. Catálogo de Productos */}
          <ProductsSection items={items} loading={loading} />

          <Footer />
        </div>
      </div>
    </LazyMotion>
  );
}
