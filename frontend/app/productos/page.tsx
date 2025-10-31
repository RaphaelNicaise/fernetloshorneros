"use client"

import { ProductCard } from "@/components/product-card"
import { Navigation } from "@/components/navigation"
import Link from "next/link"
import { Footer } from "@/components/footer"
import { useEffect, useState } from "react"
import { fetchProducts, type Product } from "@/lib/api"

export default function ProductsPage() {
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
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Page Header */}
      <section className="bg-secondary py-16">
        <div className="container mx-auto px-4">
          <h1 className="font-serif text-5xl font-bold text-foreground mb-4 text-balance">Nuestros Productos</h1>
          <p className="text-xl text-muted-foreground max-w-2xl">
            Fernet artesanal de calidad premium y cristalería seleccionada para disfrutar cada momento.
          </p>
        </div>
      </section>

      {/* Products Grid */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {loading ? (
              <p className="col-span-full text-center text-muted-foreground">Cargando…</p>
            ) : error ? (
              <p className="col-span-full text-center text-destructive">{error}</p>
            ) : items.length === 0 ? (
              <p className="col-span-full text-center text-muted-foreground">Sin productos</p>
            ) : (
              items.map((product) => <ProductCard key={product.id} product={product} />)
            )}
          </div>
        </div>
      </section>

      {/* Info Section */}
      <section className="bg-secondary py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="font-serif text-3xl font-bold text-foreground mb-4">¿Tenés dudas?</h2>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              Nuestro fernet artesanal es perfecto para disfrutar solo con hielo o en tu cóctel favorito. La cristalería
              está diseñada específicamente para realzar la experiencia.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link
                href="/lista-espera"
                className="inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-lg transition-all duration-200 transform-gpu hover:bg-primary/90 hover:shadow-md hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                Únete a la Lista de Espera
              </Link>
              <Link
                href="/contactanos"
                className="inline-flex items-center justify-center px-6 py-3 border-2 border-primary text-primary font-semibold rounded-lg transition-all duration-200 transform-gpu hover:bg-primary hover:text-primary-foreground hover:shadow-md hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                Contáctanos
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
