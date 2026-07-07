"use client"

import { useState, useEffect, useMemo } from "react"
import { useCart } from "@/lib/cart-context"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import Link from "next/link"
import { fetchProducts, api, type Product } from "@/lib/api"
import { useCartValidation } from "@/hooks/use-cart-validation"

import { CheckoutSteps } from "@/components/checkout/checkout-steps"
import { StepProducts } from "@/components/checkout/step-products"
import { StepShipping, type ShippingData } from "@/components/checkout/step-shipping"
import { StepCouponSummary, type CouponData } from "@/components/checkout/step-coupon-summary"
import { StepPayment } from "@/components/checkout/step-payment"
import { OrderSummarySidebar } from "@/components/checkout/order-summary-sidebar"

const FALLBACK_PRODUCTS: Product[] = [
  { id: 'fallback-1', name: 'Fernet Los Horneros 750ml', description: 'Fernet artesanal', price: 12500, image: '/storyfernet.webp', status: 'disponible', stock: 50 },
  { id: 'fallback-2', name: 'Fernet Los Horneros 500ml', description: 'Versión compacta', price: 8900, image: '/storyfernet.webp', status: 'disponible', stock: 50 },
]

export default function CartPage() {
  const { items, removeItem, updateQuantity, clearCart, totalPrice, addItem } = useCart()
  const [minPurchaseAmount, setMinPurchaseAmount] = useState(0)
  const [catalog, setCatalog] = useState<Product[]>([])

  // States for checkout flow
  const [currentStep, setCurrentStep] = useState(1)
  const [shippingData, setShippingData] = useState<ShippingData | null>(null)
  const [couponData, setCouponData] = useState<CouponData | null>(null)

  useCartValidation()

  useEffect(() => {
    const fetchMinPurchaseAmount = async () => {
      try {
        const response = await api.get('/settings/min_purchase_amount')
        setMinPurchaseAmount(parseFloat(response.data.value))
      } catch (error) {
        console.error('Failed to fetch min purchase amount', error)
      }
    }
    const loadCatalog = async () => {
      try {
        const data = await fetchProducts()
        setCatalog(data.length > 0 ? data : FALLBACK_PRODUCTS)
      } catch {
        setCatalog(FALLBACK_PRODUCTS)
      }
    }
    fetchMinPurchaseAmount()
    loadCatalog()
  }, [])

  const recommended = useMemo(() => {
    const cartIds = new Set(items.map((i) => i.id))
    const allRecommended = catalog.filter((p) => !cartIds.has(p.id) && p.status === 'disponible' && (p.stock ?? 0) > 0)
    const maxRecommendations = items.length === 1 ? 2 : items.length === 2 ? 1 : 0
    return allRecommended.slice(0, maxRecommendations)
  }, [items, catalog])

  // Helpers to navigate steps
  const goToNextStep = () => setCurrentStep(prev => prev + 1)
  const goToPrevStep = () => setCurrentStep(prev => prev - 1)
  const handleStepClick = (step: number) => {
    if (step < currentStep) setCurrentStep(step)
  }

  // Si el carrito está vacío
  if (items.length === 0) {
    return (
      <div className="bg-background flex min-h-screen flex-col overflow-x-hidden">
        <Navigation />
        <main className="flex-1">
          <div className="container mx-auto px-4 pt-28 pb-20 sm:pt-32">
            <div className="mx-auto max-w-md text-center">
              <div className="bg-secondary mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full">
                <svg className="text-muted-foreground h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <h1 className="text-foreground mb-4 font-serif text-3xl font-bold">Tu Carrito está Vacío</h1>
              <p className="text-muted-foreground mb-8">Parece que aún no has agregado productos a tu carrito. Explora nuestra tienda.</p>
              <Link
                href="/productos"
                className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex transform-gpu items-center justify-center rounded-lg px-6 py-3 font-semibold transition-all duration-200 hover:scale-105 active:scale-95"
              >
                Ver Productos
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  const grandTotal = totalPrice + (shippingData?.shipping_cost || 0) - (couponData?.amountApplied || 0)

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-[#faf8f5]">
      <Navigation />

      <main className="flex-1">
        <div className="container mx-auto px-4 pt-28 pb-12 sm:pt-32">
          <div className="mx-auto max-w-5xl">
            
            <div className="mb-8 flex items-center justify-between">
              <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#0b0a07]">Finalizar Compra</h1>
              {currentStep === 1 && (
                <button
                  onClick={clearCart}
                  className="cursor-pointer text-sm font-medium text-black/50 transition-colors hover:text-[#aa825e]"
                >
                  Vaciar carrito
                </button>
              )}
            </div>

            {/* Progreso */}
            <div className="mb-10">
              <CheckoutSteps currentStep={currentStep} onStepClick={handleStepClick} />
            </div>

            <div className="grid gap-8 lg:grid-cols-12 items-start">
              
              {/* Contenido principal del paso */}
              <div className="lg:col-span-8">
                {currentStep === 1 && (
                  <StepProducts
                    items={items}
                    updateQuantity={updateQuantity}
                    removeItem={removeItem}
                    addItem={addItem}
                    totalPrice={totalPrice}
                    minPurchaseAmount={minPurchaseAmount}
                    recommended={recommended}
                    onContinue={goToNextStep}
                  />
                )}

                {currentStep === 2 && (
                  <StepShipping
                    items={items}
                    initialData={shippingData || undefined}
                    onContinue={(data) => {
                      setShippingData(data)
                      // Recalcular cupón si aplicaba envío gratis
                      if (couponData?.tipo_descuento === 'envio_gratis') {
                        setCouponData({ ...couponData, amountApplied: data.shipping_cost })
                      }
                      goToNextStep()
                    }}
                    onBack={goToPrevStep}
                  />
                )}

                {currentStep === 3 && shippingData && (
                  <StepCouponSummary
                    cartTotal={totalPrice}
                    shippingCost={shippingData.shipping_cost}
                    appliedCoupon={couponData}
                    onContinue={(coupon) => {
                      setCouponData(coupon)
                      goToNextStep()
                    }}
                    onBack={goToPrevStep}
                  />
                )}

                {currentStep === 4 && shippingData && (
                  <StepPayment
                    items={items}
                    shipping={shippingData}
                    coupon={couponData}
                    total={grandTotal}
                    onBack={goToPrevStep}
                  />
                )}
              </div>

              {/* Sidebar resumen */}
              <div className="lg:col-span-4 hidden lg:block">
                <OrderSummarySidebar 
                  items={items} 
                  shipping={currentStep > 1 ? shippingData : null} 
                  coupon={currentStep > 2 ? couponData : null}
                />
              </div>

            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
