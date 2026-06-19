'use client';

import { useCart } from '@/lib/cart-context';
import { Navigation } from '@/components/navigation';
import { Footer } from '@/components/footer';
import Link from 'next/link';
import { fetchProducts, createPaymentPreference, api, type Product, API_BASE_URL } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { useState, useCallback, useEffect } from 'react';
import { ShippingSelector, type ShippingSelection } from '@/components/shipping-selector';
import { useCartValidation } from '@/hooks/use-cart-validation';
import { Loader2, Tag, Trash2, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';

function RecommendedCard({
  product,
  onAdd,
  wide,
}: {
  product: Product;
  onAdd: () => void;
  wide?: boolean;
}) {
  const [added, setAdded] = useState(false);
  const outOfStock = (product.stock ?? 0) <= 0;

  const handleAdd = () => {
    if (outOfStock) return;
    onAdd();
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-black/8 bg-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(11,10,7,0.08)] ${wide ? 'flex flex-row items-center' : ''}`}
    >
      <div className={`relative overflow-hidden ${wide ? 'h-28 w-28 flex-shrink-0' : 'h-32'}`}>
        <img
          src={product.image || '/placeholder.svg'}
          alt={product.name}
          className={`h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 ${outOfStock ? 'opacity-50' : ''}`}
        />
      </div>
      <div className={`flex flex-col gap-1.5 p-3 ${wide ? 'flex-1' : ''}`}>
        <p className="text-foreground line-clamp-1 text-sm leading-tight font-semibold">
          {product.name}
        </p>
        {product.description && (
          <p className="line-clamp-1 text-xs text-black/55">{product.description}</p>
        )}
        <div className="mt-auto flex items-center justify-between gap-2">
          <span className="text-sm font-bold text-[#0b0a07]">
            ${Number(product.price || 0).toLocaleString('es-AR')}
          </span>
          {outOfStock ? (
            <span className="text-xs text-black/45">Sin stock</span>
          ) : (
            <button
              onClick={handleAdd}
              className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-[#aa825e]/30 px-3 py-1.5 text-xs font-medium text-[#6B5743] transition-all duration-150 hover:border-[#aa825e]/50 hover:bg-[#aa825e]/10 hover:text-[#0b0a07] active:scale-95"
            >
              {added ? (
                <>
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Agregado
                </>
              ) : (
                <>+ Agregar</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

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

export default function CartPage() {
  const { items, removeItem, updateQuantity, clearCart, totalPrice, addItem } = useCart();
  const [loading, setLoading] = useState(false);
  const [minPurchaseAmount, setMinPurchaseAmount] = useState(0);
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [isMaintenance, setIsMaintenance] = useState(false);
  const skipShippingCost = isMaintenance || process.env.NODE_ENV === 'development';

  // Validar carrito cada 20 segundos
  useCartValidation();

  // Selección de envío
  const [shippingSelection, setShippingSelection] = useState<ShippingSelection | null>(null);
  const [totalWithShipping, setTotalWithShipping] = useState(totalPrice);

  // Cupones
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [couponError, setCouponError] = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    codigo: string;
    tipo_descuento: string;
    valor: number;
  } | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  // Recalcular el descuento cada vez que cambian los precios
  useEffect(() => {
    if (appliedCoupon) {
      let calcDiscount = 0;
      if (appliedCoupon.tipo_descuento === 'porcentaje') {
        calcDiscount = (totalPrice * appliedCoupon.valor) / 100;
      } else if (appliedCoupon.tipo_descuento === 'fijo') {
        calcDiscount = appliedCoupon.valor;
      } else if (appliedCoupon.tipo_descuento === 'envio_gratis') {
        calcDiscount = shippingSelection ? shippingSelection.shipping_cost : 0;
      }

      if (calcDiscount > totalPrice && appliedCoupon.tipo_descuento !== 'envio_gratis') {
        calcDiscount = totalPrice;
      }
      setDiscountAmount(calcDiscount);
    } else {
      setDiscountAmount(0);
    }
  }, [totalPrice, appliedCoupon, shippingSelection]);

  const applyCoupon = async () => {
    if (!couponCodeInput.trim()) return;
    setValidatingCoupon(true);
    setCouponError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/coupons/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo: couponCodeInput, subtotal: totalPrice }),
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        setAppliedCoupon(data.coupon);
        setCouponCodeInput('');
        toast({
          title: 'Cupón aplicado',
          description: 'Se ha aplicado el descuento correctamente.',
        });
      } else {
        throw new Error(data.error || 'Cupón inválido');
      }
    } catch (err: any) {
      setCouponError(err.message);
      setAppliedCoupon(null);
    } finally {
      setValidatingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setDiscountAmount(0);
    setCouponError(null);
  };

  useEffect(() => {
    const fetchMinPurchaseAmount = async () => {
      try {
        const response = await api.get('/settings/min_purchase_amount');
        setMinPurchaseAmount(parseFloat(response.data.value));
      } catch (error) {
        console.error('Failed to fetch min purchase amount', error);
      }
    };
    const loadCatalog = async () => {
      try {
        const data = await fetchProducts();
        setCatalog(data.length > 0 ? data : FALLBACK_PRODUCTS);
      } catch {
        setCatalog(FALLBACK_PRODUCTS);
      }
    };
    const checkMaintenance = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/settings/maintenance-check`);
        if (res.ok) {
          const data = await res.json();
          setIsMaintenance(Boolean(data.maintenance));
        }
      } catch {
        // silencioso
      }
    };
    fetchMinPurchaseAmount();
    loadCatalog();
    checkMaintenance();
  }, []);

  const cartIds = new Set(items.map((i) => i.id));
  const allRecommended = catalog.filter(
    (p) => !cartIds.has(p.id) && p.status === 'disponible' && (p.stock ?? 0) > 0
  );

  // Lógica de inventario: 1 en carrito → 2 recs, 2 → 1 rec, 3+ → ocultar
  const maxRecommendations = items.length === 1 ? 2 : items.length === 2 ? 1 : 0;
  const recommended = allRecommended.slice(0, maxRecommendations);

  const handleShippingComplete = useCallback((selection: ShippingSelection) => {
    setShippingSelection(selection);
  }, []);

  const handleTotalChange = useCallback((total: number) => {
    setTotalWithShipping(total);
  }, []);

  // Verificar si se puede proceder al pago
  const canCheckout = shippingSelection !== null && totalPrice >= minPurchaseAmount;

  async function handleCheckout() {
    if (totalPrice < minPurchaseAmount) {
      toast({
        title: 'Monto mínimo no alcanzado',
        description: `Debes superar los $${minPurchaseAmount.toLocaleString('es-AR')} para realizar la compra.`,
        variant: 'destructive',
      });
      return;
    }

    if (!canCheckout || !shippingSelection) {
      toast({
        title: 'Datos incompletos',
        description: 'Por favor completa todos los datos de envío antes de continuar',
      });
      return;
    }

    try {
      setLoading(true);
      const catalog = await fetchProducts();
      const byId = new Map(catalog.map((p) => [p.id, p]));
      const removedNames: string[] = [];
      const adjustedItems: { name: string; newQuantity: number; oldQuantity: number }[] = [];

      for (const it of items) {
        const p = byId.get(it.id);

        // Si el producto no existe o no está disponible, quitarlo
        if (!p || p.status !== 'disponible') {
          removedNames.push(it.name);
          removeItem(it.id);
          continue;
        }

        // Si no hay stock, quitarlo
        const availableStock = p.stock ?? 0;
        if (availableStock === 0) {
          removedNames.push(it.name);
          removeItem(it.id);
          continue;
        }

        // Si el stock es insuficiente, ajustar cantidad
        if (availableStock < it.quantity) {
          adjustedItems.push({
            name: it.name,
            oldQuantity: it.quantity,
            newQuantity: availableStock,
          });
          updateQuantity(it.id, availableStock);
        }
      }

      if (removedNames.length > 0) {
        toast({
          title: 'Productos removidos',
          description:
            removedNames.length === 1
              ? `"${removedNames[0]}" no está más disponible y fue quitado del carrito.`
              : `Estos productos ya no están disponibles: ${removedNames.join(', ')}.`,
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      if (adjustedItems.length > 0) {
        const adjustmentText = adjustedItems
          .map((item) => `${item.name}: ${item.oldQuantity} → ${item.newQuantity}`)
          .join(', ');
        toast({
          title: 'Stock ajustado',
          description: `Cantidades actualizadas por disponibilidad: ${adjustmentText}`,
        });
        setLoading(false);
        return;
      }

      // Crear preferencia de pago en MercadoPago (incluye productos + envío)
      const preference = await createPaymentPreference(
        items.map((item) => ({
          id: item.id,
          quantity: item.quantity,
        })),
        {
          cost: skipShippingCost ? 0 : shippingSelection.shipping_cost,
          rate_id: shippingSelection.rate_id,
          service_type: shippingSelection.service_type,
          logistic_type: shippingSelection.logistic_type || null,
          carrier_id: shippingSelection.carrier_id || null,
          point_id: shippingSelection.point_id || null,
          address: shippingSelection.address || null,
          contact: shippingSelection.contact,
        },
        appliedCoupon ? appliedCoupon.codigo : undefined
      );

      // Redirigir a MercadoPago
      if (preference.init_point) {
        window.location.href = preference.init_point;
      } else {
        throw new Error('No se recibió URL de pago');
      }
    } catch (e: any) {
      console.error('Error en checkout:', e);

      // Determinar tipo de error
      let errorTitle = 'Error en checkout';
      let errorDescription = 'No se pudo procesar el pago';

      const errorMsg = e?.message || '';

      if (errorMsg.includes('agotado')) {
        errorTitle = 'Producto agotado';
        errorDescription = errorMsg;
      } else if (errorMsg.includes('Stock insuficiente')) {
        errorTitle = 'Stock insuficiente';
        errorDescription = errorMsg;
      } else if (errorMsg.includes('no está disponible')) {
        errorTitle = 'Producto no disponible';
        errorDescription = errorMsg;
      } else if (errorMsg.includes('Límite')) {
        errorTitle = 'Límite de cantidad excedido';
        errorDescription = errorMsg;
      } else if (errorMsg.includes('no encontrado')) {
        errorTitle = 'Producto no encontrado';
        errorDescription = errorMsg;
      }

      toast({
        title: errorTitle,
        description: errorDescription,
        variant: 'destructive',
      });
      setLoading(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="bg-background flex min-h-screen flex-col overflow-x-hidden">
        <Navigation />

        {/* Empty Cart */}
        <main className="flex-1">
          <div className="container mx-auto px-4 pt-28 pb-20 sm:pt-32">
            <div className="mx-auto max-w-md text-center">
              <div className="bg-secondary mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full">
                <svg
                  className="text-muted-foreground h-12 w-12"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                  />
                </svg>
              </div>
              <h1 className="text-foreground mb-4 font-serif text-3xl font-bold">
                Tu Carrito está Vacío
              </h1>
              <p className="text-muted-foreground mb-8">
                Parece que aún no has agregado productos a tu carrito. Explora nuestra tienda.
              </p>
              <Link
                href="/productos"
                className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-primary/40 inline-flex transform-gpu items-center justify-center rounded-lg px-6 py-3 font-semibold transition-all duration-200 hover:scale-105 hover:shadow-md focus-visible:ring-2 focus-visible:outline-none active:scale-95"
              >
                Ver Productos
              </Link>
            </div>
          </div>
        </main>

        {/* Footer */}
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-white">
      <Navigation />

      {/* Cart Content */}
      <main className="flex-1">
        <div className="container mx-auto px-4 pt-28 pb-12 sm:pt-32">
          <div className="mx-auto max-w-6xl">
            <div className="mb-8 flex items-center justify-between">
              <h1 className="font-serif text-4xl font-bold text-[#0b0a07]">Carrito</h1>
              <button
                onClick={clearCart}
                className="cursor-pointer text-sm text-black/50 transition-colors hover:text-[#aa825e]"
              >
                Limpiar Carrito
              </button>
            </div>

            <div className="grid gap-8 lg:grid-cols-3">
              {/* Cart Items y Envío */}
              <div className="space-y-6 lg:col-span-2">
                {/* Productos */}
                <div className="space-y-4">
                  <h2 className="font-serif text-xl font-bold text-[#0b0a07]">Productos</h2>
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-black/8 bg-white p-4 shadow-[0_18px_38px_rgba(11,10,7,0.05)] sm:p-6"
                    >
                      <div className="flex gap-4">
                        <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-[#f5f0e6] sm:h-24 sm:w-24">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.image || '/placeholder.svg'}
                            alt={item.name}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:justify-between">
                          <div>
                            <h3 className="mb-1 font-serif text-base font-bold text-[#0b0a07] sm:text-lg">
                              {item.name}
                            </h3>
                            <p className="mb-3 text-xs text-black/55 sm:text-sm">
                              ${Number(item.price || 0).toLocaleString('es-AR')} por articulo
                            </p>
                            <div className="flex flex-wrap items-center gap-3">
                              <div className="flex items-center gap-1 rounded-full border border-[#6B5743]/18 bg-[#f8f5f1] p-1">
                                <button
                                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                  aria-label={`Reducir cantidad de ${item.name}`}
                                  className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-lg leading-none font-medium text-[#6B5743] transition-colors hover:bg-[#aa825e]/14 hover:text-[#0b0a07] active:scale-95"
                                >
                                  <span className="-mt-px">-</span>
                                </button>
                                <span className="flex min-w-11 items-center justify-center px-2 text-sm font-semibold text-[#0b0a07] tabular-nums">
                                  {item.quantity}
                                </span>
                                <button
                                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                  aria-label={`Aumentar cantidad de ${item.name}`}
                                  className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-lg leading-none font-medium text-[#6B5743] transition-colors hover:bg-[#aa825e]/14 hover:text-[#0b0a07] active:scale-95"
                                >
                                  <span className="-mt-px">+</span>
                                </button>
                              </div>
                              <button
                                onClick={() => removeItem(item.id)}
                                className="cursor-pointer text-sm text-black/48 transition-colors hover:text-[#aa825e]"
                                aria-label={`Quitar ${item.name} del carrito`}
                              >
                                <Trash2 className="h-5 w-5 text-red-400 transition-colors hover:text-red-500" />
                              </button>
                            </div>
                          </div>
                          <div className="mt-2 text-left sm:mt-0 sm:text-right">
                            <p className="text-base font-bold text-[#0b0a07] sm:text-lg">
                              $
                              {(Number(item.price || 0) * (item.quantity || 1)).toLocaleString(
                                'es-AR'
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Upsell de final de lista */}
                {recommended.length > 0 && (
                  <div className="pt-2 pb-1">
                    <p className="mb-3 text-sm font-medium text-black/52">
                      ¿Te falta algo para tu set?
                    </p>
                    <div
                      className={`grid gap-3 ${recommended.length === 1 ? 'max-w-sm grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}
                    >
                      {recommended.map((product) => (
                        <RecommendedCard
                          key={product.id}
                          product={product}
                          wide={recommended.length === 1}
                          onAdd={() =>
                            addItem({
                              id: product.id,
                              name: product.name,
                              price: product.price,
                              image: product.image,
                              stock: product.stock ?? 0,
                              limite: product.limite ?? 0,
                            })
                          }
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Alerta de monto mínimo */}
                {totalPrice < minPurchaseAmount && minPurchaseAmount > 0 && (
                  <div
                    className="border-l-4 border-[#aa825e] bg-[#f5ede5] p-4 text-[#6B5743]"
                    role="alert"
                  >
                    <p className="font-bold">Atención</p>
                    <p>
                      El monto mínimo de compra es de ${minPurchaseAmount.toLocaleString('es-AR')}.
                      ¡Agregá más productos para continuar!
                    </p>
                  </div>
                )}

                {/* Envío */}
                <div className="rounded-2xl border border-black/8 bg-white p-6 shadow-[0_18px_38px_rgba(11,10,7,0.05)]">
                  <h2 className="mb-4 font-serif text-xl font-bold text-[#0b0a07]">Envío</h2>
                  <ShippingSelector
                    items={items.map((item) => ({ id: item.id, quantity: item.quantity }))}
                    productsTotal={totalPrice}
                    onSelectionComplete={handleShippingComplete}
                    onTotalChange={handleTotalChange}
                  />
                </div>
              </div>

              {/* Order Summary */}
              <div className="lg:col-span-1">
                <div className="sticky top-24 rounded-2xl border border-[#0b0a07] bg-[#0b0a07] p-6 text-[#f5f0e6] shadow-[0_28px_70px_rgba(11,10,7,0.2)]">
                  <h2 className="mb-6 font-serif text-2xl font-bold text-[#f5f0e6]">
                    Resumen del Pedido
                  </h2>
                  <div className="mb-6 space-y-3">
                    <div className="flex justify-between text-[#f5f0e6]/68">
                      <span>Subtotal productos</span>
                      <span>${Number(totalPrice || 0).toLocaleString('es-AR')}</span>
                    </div>

                    <div className="flex justify-between text-[#f5f0e6]/68">
                      <span>Envío</span>
                      {skipShippingCost ? (
                        <span className="font-medium text-[#aa825e]">Gratis (modo prueba)</span>
                      ) : shippingSelection ? (
                        <span>
                          ${Number(shippingSelection.shipping_cost || 0).toLocaleString('es-AR')}
                        </span>
                      ) : (
                        <span className="text-sm">Completa los datos</span>
                      )}
                    </div>

                    {shippingSelection && (
                      <div className="text-xs text-[#f5f0e6]/52">
                        <span>{shippingSelection.carrier_name}</span>
                        <span className="block">
                          {shippingSelection.service_type === 'standard_delivery'
                            ? 'Envío a domicilio'
                            : 'Retiro en punto de entrega'}
                        </span>
                      </div>
                    )}

                    {/* Sección de Cupón */}
                    <div className="border-t border-white/10 pt-3">
                      {!appliedCoupon ? (
                        <div className="flex flex-col gap-2">
                          <div className="flex gap-2">
                            <Input
                              placeholder="Ingresá tu código"
                              value={couponCodeInput}
                              onChange={(e) => {
                                setCouponCodeInput(e.target.value.toUpperCase());
                                if (couponError) setCouponError(null);
                              }}
                              className={`border bg-transparent ${couponError ? 'border-red-500/50 focus-visible:ring-red-500/50' : 'border-white/20 focus-visible:ring-[#AA6F3B]'} text-white placeholder:text-white/30`}
                              disabled={validatingCoupon}
                            />
                            <button
                              className="flex min-w-[80px] items-center justify-center rounded-md bg-white/10 px-4 text-sm font-medium text-white transition-colors hover:bg-white/20"
                              onClick={applyCoupon}
                              disabled={validatingCoupon || !couponCodeInput}
                            >
                              {validatingCoupon ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                'Aplicar'
                              )}
                            </button>
                          </div>
                          {couponError && (
                            <div className="mt-1 flex items-center gap-1.5 rounded border border-red-400/20 bg-red-400/10 p-2 text-xs text-red-400">
                              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                              <span>{couponError}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="rounded-md border border-[#AA6F3B]/30 bg-[#1a1a1a] p-3">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2 font-medium text-[#AA6F3B]">
                              <Tag className="h-4 w-4" />
                              <span>{appliedCoupon.codigo}</span>
                            </div>
                            <button
                              onClick={removeCoupon}
                              className="text-xs text-white/50 underline hover:text-white"
                            >
                              Quitar
                            </button>
                          </div>
                          <div className="mt-2 flex justify-between text-sm font-bold text-[#f5f0e6]">
                            <span>Descuento</span>
                            <span className="text-[#AA6F3B]">
                              -
                              {appliedCoupon.tipo_descuento === 'envio_gratis'
                                ? 'Envío'
                                : `$${discountAmount.toLocaleString('es-AR')}`}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between border-t border-white/10 pt-3">
                      <span className="text-lg font-bold text-[#f5f0e6]">Total</span>
                      <span className="text-lg font-bold text-[#f5f0e6]">
                        $
                        {Math.max(
                          0,
                          (skipShippingCost ? totalPrice : totalWithShipping) - discountAmount
                        ).toLocaleString('es-AR')}
                      </span>
                    </div>
                  </div>

                  {!canCheckout && (
                    <p className="mb-3 text-sm text-[#aa825e]">
                      Completa todos los datos de envío para continuar
                    </p>
                  )}

                  <div className="flex justify-end">
                    <button
                      onClick={handleCheckout}
                      disabled={loading || !canCheckout}
                      className="inline-flex w-full transform-gpu items-center justify-center rounded-full bg-[#aa825e] px-8 py-4 font-semibold text-white transition-all duration-200 hover:scale-[1.01] hover:bg-[#b78d68] hover:shadow-lg focus-visible:ring-2 focus-visible:ring-[#aa825e]/40 focus-visible:outline-none active:scale-95 disabled:scale-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                    >
                      {loading ? 'Procesando...' : 'Ir a Pagar'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
