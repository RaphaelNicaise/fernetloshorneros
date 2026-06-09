"use client"

import { useState, useEffect, useMemo } from "react"
import { 
  quoteShippingOptions, 
  fetchProvincias, 
  fetchLocalidades, 
  type ShippingOption, 
  type PickupPoint,
  type Provincia,
  type Localidad 
} from "@/lib/api"

// Iconos SVG inline
const HomeIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
)

const LocationIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)

const CheckIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
  </svg>
)

interface CustomerAddress {
  provincia: string
  ciudad: string
  codigoPostal: string
  direccion: string
  numero: string
  extra: string
}

interface CustomerContact {
  email: string
  dni: string
  telefono: string
  nombre: string
}

export interface ShippingSelection {
  rate_id: string
  service_type: 'standard_delivery' | 'pickup_point'
  logistic_type?: string | null
  carrier_id?: number | null
  point_id?: string | null
  shipping_cost: number
  carrier_name: string
  address?: CustomerAddress
  contact: CustomerContact
}

interface ShippingSelectorProps {
  items: Array<{ id: string; quantity: number }>
  productsTotal: number
  onSelectionComplete: (selection: ShippingSelection) => void
  onTotalChange: (total: number) => void
}

// Formatear fecha de entrega
function formatDeliveryDate(minDays: number, maxDays: number): string {
  const today = new Date()
  const minDate = new Date(today)
  minDate.setDate(today.getDate() + minDays)
  const maxDate = new Date(today)
  maxDate.setDate(today.getDate() + maxDays)
  
  const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' }
  const minStr = minDate.toLocaleDateString('es-AR', options)
  const maxStr = maxDate.toLocaleDateString('es-AR', options)
  
  if (minDays === maxDays) {
    return `Llega el ${minStr}`
  }
  return `Llega entre el ${minStr} y el ${maxStr}`
}

export function ShippingSelector({ items, productsTotal, onSelectionComplete, onTotalChange }: ShippingSelectorProps) {
  // Estado paso 1: Código postal y provincia
  const [codigoPostal, setCodigoPostal] = useState("")
  const [provincia, setProvincia] = useState("")
  const [provincias, setProvincias] = useState<Provincia[]>([])
  const [loadingProvincias, setLoadingProvincias] = useState(false)
  
  // Estado de cotización
  const [loadingOptions, setLoadingOptions] = useState(false)
  const [allOptions, setAllOptions] = useState<ShippingOption[]>([])
  const [quoteFetched, setQuoteFetched] = useState(false)
  
  // Estado paso 2: Selección de método
  const [selectedType, setSelectedType] = useState<'standard_delivery' | 'pickup_point' | null>(null)
  const [selectedOption, setSelectedOption] = useState<ShippingOption | null>(null)
  
  // Estado formulario domicilio
  const [ciudad, setCiudad] = useState("")
  const [localidades, setLocalidades] = useState<Localidad[]>([])
  const [loadingLocalidades, setLoadingLocalidades] = useState(false)
  const [direccion, setDireccion] = useState("")
  const [numero, setNumero] = useState("")
  const [extra, setExtra] = useState("")
  
  // Estado formulario pickup
  const [selectedPickupPoint, setSelectedPickupPoint] = useState<PickupPoint | null>(null)
  
  // Estado contacto (común)
  const [nombre, setNombre] = useState("")
  const [email, setEmail] = useState("")
  const [dni, setDni] = useState("")
  const [telefono, setTelefono] = useState("")

  // Cargar provincias al montar
  useEffect(() => {
    async function load() {
      setLoadingProvincias(true)
      try {
        const data = await fetchProvincias()
        setProvincias(data)
      } catch (e) {
        console.error("Error cargando provincias:", e)
      } finally {
        setLoadingProvincias(false)
      }
    }
    load()
  }, [])

  // Cargar localidades cuando cambia la provincia
  useEffect(() => {
    if (!provincia) {
      setLocalidades([])
      return
    }
    async function load() {
      setLoadingLocalidades(true)
      setCiudad("")
      try {
        const data = await fetchLocalidades(provincia)
        setLocalidades(data)
      } catch (e) {
        console.error("Error cargando localidades:", e)
      } finally {
        setLoadingLocalidades(false)
      }
    }
    load()
  }, [provincia])

  // Filtrar opciones: la más barata de cada tipo (solo standard_delivery ahora)
  const { deliveryOption } = useMemo(() => {
    const deliveryOptions = allOptions.filter(o => o.service_type === 'standard_delivery')
    
    const delivery = deliveryOptions.length > 0 
      ? deliveryOptions.reduce((min, curr) => 
          curr.amounts.price_incl_tax < min.amounts.price_incl_tax ? curr : min
        )
      : null
    
    return { deliveryOption: delivery }
  }, [allOptions])


  const canQuote = codigoPostal.trim().length >= 4 && provincia.trim() !== "" && ciudad.trim() !== ""
  
  const itemsKey = items.map(i => `${i.id}:${i.quantity}`).join(',')
  const [lastQuotedValues, setLastQuotedValues] = useState<string | null>(null)
  const currentQuoteKey = `${codigoPostal.trim()}-${provincia.trim()}-${ciudad.trim()}-${itemsKey}`
  
  useEffect(() => {
    if (!canQuote) {
      setAllOptions([])
      setQuoteFetched(false)
      setSelectedType(null)
      setSelectedOption(null)
      setLastQuotedValues(null)
      return
    }

    if (lastQuotedValues === currentQuoteKey) {
      return
    }

    const timeout = setTimeout(async () => {
      setLoadingOptions(true)
      try {
        const result = await quoteShippingOptions({
          destination: {
            city: ciudad,
            state: provincia,
            zipcode: codigoPostal,
          },
          items,
        })
        if (result.success && result.all_results) {
          setAllOptions(result.all_results)
          // Auto-seleccionar standard_delivery si hay opciones
          setSelectedType('standard_delivery')
        } else {
          setAllOptions([])
          setSelectedType(null)
        }
        setQuoteFetched(true)
        setLastQuotedValues(currentQuoteKey)
      } catch (e) {
        console.error("Error cotizando:", e)
        setAllOptions([])
        setSelectedType(null)
        setQuoteFetched(true)
      } finally {
        setLoadingOptions(false)
      }
    }, 600)

    return () => clearTimeout(timeout)
  }, [canQuote, codigoPostal, provincia, ciudad, items, lastQuotedValues, currentQuoteKey])

  useEffect(() => {
    if (selectedOption) {
      onTotalChange(productsTotal + selectedOption.amounts.price_incl_tax)
    } else {
      onTotalChange(productsTotal)
    }
  }, [selectedOption, productsTotal, onTotalChange])

  const handleSelectType = (type: 'standard_delivery' | 'pickup_point') => {
    setSelectedType(type)
    if (type === 'standard_delivery' && deliveryOption) {
      setSelectedOption(deliveryOption)
      setSelectedPickupPoint(null)
    }
  }

  const isDeliveryFormComplete = 
    selectedType === 'standard_delivery' &&
    direccion.trim() !== "" &&
    numero.trim() !== "" &&
    nombre.trim() !== "" &&
    email.trim() !== "" &&
    dni.trim() !== "" &&
    telefono.trim() !== ""

  const isFormComplete = isDeliveryFormComplete

  useEffect(() => {
    if (isFormComplete && selectedOption) {
      const selection: ShippingSelection = {
        rate_id: selectedOption.rate_id,
        service_type: 'standard_delivery',
        logistic_type: null,
        carrier_id: null,
        point_id: null,
        shipping_cost: selectedOption.amounts.price_incl_tax,
        carrier_name: selectedOption.carrier_name,
        contact: { nombre, email, dni, telefono },
      }

      selection.address = {
        provincia,
        ciudad,
        codigoPostal,
        direccion,
        numero,
        extra,
      }

      onSelectionComplete(selection)
    }
  }, [isFormComplete, selectedOption, selectedType, selectedPickupPoint, provincia, ciudad, codigoPostal, direccion, numero, extra, nombre, email, dni, telefono, onSelectionComplete])

  const fieldClassName = "w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-[#0b0a07] transition-all placeholder:text-black/30 focus:border-[#aa825e]/45 focus:outline-none focus:ring-2 focus:ring-[#aa825e]/20 disabled:cursor-not-allowed disabled:opacity-50"
  const labelClassName = "mb-1.5 block text-sm font-medium text-[#0b0a07]"

  return (
    <div className="space-y-6">
      {/* Paso 1: Provincia, Ciudad y Código Postal */}
      <div className="rounded-2xl border border-black/8 bg-white p-6 shadow-[0_18px_38px_rgba(11,10,7,0.05)]">
        <h2 className="mb-4 font-serif text-xl font-bold text-[#0b0a07]">¿Dónde lo enviamos?</h2>
        
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className={labelClassName}>
              Provincia *
            </label>
            <select
              value={provincia}
              onChange={(e) => setProvincia(e.target.value)}
              disabled={loadingProvincias}
              className={fieldClassName}
            >
              <option value="">
                {loadingProvincias ? "Cargando..." : "Seleccionar provincia"}
              </option>
              {provincias.map((p) => (
                <option key={p.id} value={p.nombre}>{p.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClassName}>
              Ciudad *
            </label>
            <select
              value={ciudad}
              onChange={(e) => setCiudad(e.target.value)}
              disabled={!provincia || loadingLocalidades}
              className={fieldClassName}
            >
              <option value="">
                {loadingLocalidades 
                  ? "Cargando..." 
                  : !provincia 
                    ? "Primero seleccioná provincia" 
                    : "Seleccionar ciudad"}
              </option>
              {localidades.map((l) => (
                <option key={l.id} value={l.nombre}>{l.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClassName}>
              Código Postal *
            </label>
            <input
              type="text"
              value={codigoPostal}
              onChange={(e) => setCodigoPostal(e.target.value)}
              placeholder="Ej: 3500"
              className={fieldClassName}
            />
          </div>
        </div>

        {loadingOptions && (
          <div className="mt-4 flex items-center gap-2 text-black/55">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#aa825e] border-t-transparent" />
            <span className="text-sm">Calculando opciones de envío...</span>
          </div>
        )}
      </div>

      {/* Paso 2: Selección de método de envío */}
      {quoteFetched && !loadingOptions && deliveryOption && (
        <div className="rounded-2xl border border-black/8 bg-white p-6 shadow-[0_18px_38px_rgba(11,10,7,0.05)]">
          <h2 className="mb-4 font-serif text-xl font-bold text-[#0b0a07]">Tu envío</h2>
          
          <div className="grid md:grid-cols-1 gap-4">
            {/* Opción Domicilio */}
            <div className="relative rounded-2xl border border-[#aa825e]/45 bg-[#aa825e]/8 shadow-[0_14px_28px_rgba(170,130,94,0.12)] p-5 text-left transition-all">
              <div className="flex items-start gap-4">
                <div className="rounded-xl p-2.5 bg-[#aa825e] text-white">
                  <HomeIcon />
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-[#0b0a07]">Envío a domicilio</h3>
                    <span className="text-[#aa825e]"><CheckIcon /></span>
                  </div>
                  <p className="mt-0.5 text-sm text-black/55">
                    {deliveryOption.carrier_name}
                  </p>
                  <p className="mt-1 text-sm text-black/55">
                    {formatDeliveryDate(
                      deliveryOption.estimated_delivery.min_days,
                      deliveryOption.estimated_delivery.max_days
                    )}
                  </p>
                  <p className="mt-2 text-lg font-bold text-[#0b0a07]">
                    ${deliveryOption.amounts.price_incl_tax.toLocaleString('es-AR')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Formulario condicional según selección */}
      {selectedType && (
        <div className="animate-in slide-in-from-top-2 fade-in rounded-2xl border border-black/8 bg-white p-6 shadow-[0_18px_38px_rgba(11,10,7,0.05)] duration-300">
          {selectedType === 'standard_delivery' ? (
            <>
              <h2 className="mb-4 font-serif text-xl font-bold text-[#0b0a07]">Dirección de entrega</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClassName}>Calle *</label>
                  <input
                    type="text"
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                    placeholder="Nombre de la calle"
                    className={fieldClassName}
                  />
                </div>

                <div>
                  <label className={labelClassName}>Número *</label>
                  <input
                    type="text"
                    value={numero}
                    onChange={(e) => setNumero(e.target.value)}
                    placeholder="Número"
                    className={fieldClassName}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className={labelClassName}>Piso / Depto</label>
                  <input
                    type="text"
                    value={extra}
                    onChange={(e) => setExtra(e.target.value)}
                    placeholder="Opcional"
                    className={fieldClassName}
                  />
                </div>
              </div>
            </>
          ) : null}

          {/* Datos de contacto - común para ambos */}
          <div className="mt-6 border-t border-black/8 pt-6">
            <h3 className="mb-4 font-semibold text-[#0b0a07]">Datos de contacto</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className={labelClassName}>Nombre completo *</label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Tu nombre"
                  className={fieldClassName}
                />
              </div>

              <div>
                <label className={labelClassName}>Email *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className={fieldClassName}
                />
              </div>

              <div>
                <label className={labelClassName}>DNI *</label>
                <input
                  type="text"
                  value={dni}
                  onChange={(e) => setDni(e.target.value)}
                  placeholder="12345678"
                  className={fieldClassName}
                />
              </div>

              <div>
                <label className={labelClassName}>Teléfono *</label>
                <input
                  type="tel"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="+54 11 1234-5678"
                  className={fieldClassName}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mensaje cuando no hay opciones */}
      {quoteFetched && !loadingOptions && !deliveryOption && (
        <div className="rounded-2xl border border-[#aa825e]/30 bg-[#f5ede5] p-6 text-center">
          <p className="text-[#6B5743]">
            No encontramos opciones de envío para tu zona. Verificá el código postal e intentá nuevamente.
          </p>
        </div>
      )}
    </div>
  )
}
