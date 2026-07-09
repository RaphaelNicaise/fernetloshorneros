"use client"

import { useState, useEffect } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Check, ChevronsUpDown, Home, MapPin, Truck } from "lucide-react"
import { cn } from "@/lib/utils"
import { fetchProvincias, fetchLocalidades, quoteShippingOptions, type Provincia, type Localidad, type ShippingOption } from "@/lib/api"
import type { CartItem } from "@/lib/cart-context"

export interface CustomerAddress {
  provincia: string
  ciudad: string
  codigoPostal: string
  direccion: string
  numero: string
  extra: string
}

export interface CustomerContact {
  email: string
  dni: string
  telefono: string
  nombre: string
}

export interface ShippingData {
  rate_id: string
  service_type: string
  shipping_cost: number
  carrier_name: string
  address: CustomerAddress
  contact: CustomerContact
}

interface StepShippingProps {
  items: CartItem[]
  initialData?: Partial<ShippingData>
  onContinue: (data: ShippingData) => void
  onBack: () => void
}

export function StepShipping({ items, initialData, onContinue, onBack }: StepShippingProps) {
  // Ubicación
  const [provincia, setProvincia] = useState(initialData?.address?.provincia || "")
  const [ciudad, setCiudad] = useState(initialData?.address?.ciudad || "")
  const [codigoPostal, setCodigoPostal] = useState(initialData?.address?.codigoPostal || "")
  
  // Combobox states
  const [openProvincia, setOpenProvincia] = useState(false)
  const [openCiudad, setOpenCiudad] = useState(false)
  const [provincias, setProvincias] = useState<Provincia[]>([])
  const [localidades, setLocalidades] = useState<Localidad[]>([])
  const [loadingProvincias, setLoadingProvincias] = useState(false)
  const [loadingLocalidades, setLoadingLocalidades] = useState(false)

  // Cotización
  const [loadingOptions, setLoadingOptions] = useState(false)
  const [options, setOptions] = useState<ShippingOption[]>([])
  const [selectedOption, setSelectedOption] = useState<ShippingOption | null>(null)
  
  // Dirección
  const [direccion, setDireccion] = useState(initialData?.address?.direccion || "")
  const [numero, setNumero] = useState(initialData?.address?.numero || "")
  const [extra, setExtra] = useState(initialData?.address?.extra || "")

  // Contacto
  const [nombre, setNombre] = useState(initialData?.contact?.nombre || "")
  const [email, setEmail] = useState(initialData?.contact?.email || "")
  const [dni, setDni] = useState(initialData?.contact?.dni || "")
  const [telefono, setTelefono] = useState(initialData?.contact?.telefono || "")

  // Cargar provincias
  useEffect(() => {
    async function load() {
      setLoadingProvincias(true)
      try {
        const data = await fetchProvincias()
        // Agregar Uruguay
        setProvincias([...data, { id: "UY", nombre: "Uruguay" }].sort((a, b) => a.nombre.localeCompare(b.nombre)))
      } catch (e) {
        console.error("Error cargando provincias:", e)
      } finally {
        setLoadingProvincias(false)
      }
    }
    load()
  }, [])

  // Cargar localidades
  useEffect(() => {
    if (!provincia) {
      setLocalidades([])
      return
    }
    if (provincia === "Uruguay") {
      setLocalidades([{ id: "UY-TODO", nombre: "Todo el país (Uruguay)" }])
      setCiudad("Todo el país (Uruguay)")
      return
    }
    async function load() {
      setLoadingLocalidades(true)
      setCiudad("") // Reset ciudad al cambiar provincia
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

  // Cotizar envío automáticamente
  const canQuote = codigoPostal.length >= 4 && provincia && ciudad
  
  useEffect(() => {
    if (!canQuote) {
      setOptions([])
      setSelectedOption(null)
      return
    }

    const timer = setTimeout(async () => {
      setLoadingOptions(true)
      try {
        const result = await quoteShippingOptions({
          destination: { city: ciudad, state: provincia, zipcode: codigoPostal },
          items: items.map(i => ({ id: i.id, quantity: i.quantity })),
        })
        if (result.success && result.all_results) {
          setOptions(result.all_results)
          if (result.all_results.length > 0) {
            setSelectedOption(result.all_results[0])
          }
        }
      } catch (e) {
        console.error("Error al cotizar:", e)
      } finally {
        setLoadingOptions(false)
      }
    }, 800)

    return () => clearTimeout(timer)
  }, [canQuote, codigoPostal, provincia, ciudad, items])

  const isValidEmail = (emailStr: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr.trim())
  }

  const isValid = 
    selectedOption &&
    direccion.trim() &&
    numero.trim() &&
    nombre.trim() &&
    isValidEmail(email) &&
    dni.trim() &&
    telefono.trim()

  const handleContinue = () => {
    if (!isValid || !selectedOption) return
    onContinue({
      rate_id: selectedOption.rate_id,
      service_type: selectedOption.service_type,
      shipping_cost: selectedOption.amounts.price_incl_tax,
      carrier_name: selectedOption.carrier_name,
      address: { provincia, ciudad, codigoPostal, direccion, numero, extra },
      contact: { nombre, email, dni, telefono }
    })
  }

  const fieldClass = "w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-[#0b0a07] transition-all placeholder:text-black/30 focus:border-[#aa825e]/45 focus:outline-none focus:ring-2 focus:ring-[#aa825e]/20"
  const labelClass = "mb-1.5 block text-sm font-medium text-[#0b0a07]"

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="space-y-6 rounded-2xl border border-black/8 bg-white p-5 sm:p-7 shadow-[0_18px_38px_rgba(11,10,7,0.05)]">
        <h2 className="font-serif text-xl font-bold text-[#0b0a07]">¿Dónde lo enviamos?</h2>
        <div className="grid gap-5 md:grid-cols-3">
          <div>
            <label className={labelClass}>Provincia *</label>
            <Popover open={openProvincia} onOpenChange={setOpenProvincia}>
              <PopoverTrigger asChild>
                <button type="button" disabled={loadingProvincias} className={cn(fieldClass, "flex w-full items-center justify-between text-left", !provincia && "text-black/30")}>
                  <span className="truncate">{provincia || "Seleccionar..."}</span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar provincia..." />
                  <CommandList>
                    <CommandEmpty>No se encontró.</CommandEmpty>
                    <CommandGroup>
                      {provincias.map((p) => (
                        <CommandItem
                          key={p.nombre}
                          value={p.nombre}
                          onSelect={(val) => {
                            const selected = provincias.find(x => x.nombre.toLowerCase() === val.toLowerCase())
                            setProvincia(selected?.nombre || "")
                            setOpenProvincia(false)
                          }}
                        >
                          {p.nombre}
                          <Check className={cn("ml-auto h-4 w-4", provincia === p.nombre ? "opacity-100" : "opacity-0")} />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <label className={labelClass}>Ciudad *</label>
            <Popover open={openCiudad} onOpenChange={setOpenCiudad}>
              <PopoverTrigger asChild>
                <button type="button" disabled={!provincia || loadingLocalidades || provincia === "Uruguay"} className={cn(fieldClass, "flex w-full items-center justify-between text-left", !ciudad && "text-black/30")}>
                  <span className="truncate">{loadingLocalidades ? "Cargando..." : (ciudad || "Seleccionar...")}</span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar ciudad..." />
                  <CommandList>
                    <CommandEmpty>No se encontró.</CommandEmpty>
                    <CommandGroup>
                      {localidades.map((l) => (
                        <CommandItem
                          key={l.id}
                          value={l.nombre}
                          onSelect={(val) => {
                            const selected = localidades.find(x => x.nombre.toLowerCase() === val.toLowerCase())
                            setCiudad(selected?.nombre || "")
                            setOpenCiudad(false)
                          }}
                        >
                          {l.nombre}
                          <Check className={cn("ml-auto h-4 w-4", ciudad === l.nombre ? "opacity-100" : "opacity-0")} />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <label className={labelClass}>Código Postal *</label>
            <input type="text" value={codigoPostal} onChange={e => setCodigoPostal(e.target.value)} placeholder="Ej: 3500" className={fieldClass} />
          </div>
        </div>

        {loadingOptions && (
          <div className="flex items-center gap-2 text-sm text-[#aa825e]">
            <Truck className="h-4 w-4 animate-bounce" />
            Calculando envío...
          </div>
        )}

        {options.length > 0 && !loadingOptions && (
          <div className="mt-4 animate-in fade-in slide-in-from-top-2">
            <h3 className={labelClass}>Método de envío</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {options.map(opt => {
                const isSelected = selectedOption?.rate_id === opt.rate_id
                const isLocal = opt.tags?.includes("local")
                return (
                  <button
                    key={opt.rate_id}
                    onClick={() => setSelectedOption(opt)}
                    className={cn(
                      "flex items-center gap-4 rounded-xl border p-4 text-left transition-all",
                      isSelected ? "border-[#aa825e] bg-[#aa825e]/5 ring-1 ring-[#aa825e]" : "border-black/10 hover:border-black/30"
                    )}
                  >
                    <div className={cn("rounded-full p-2.5", isSelected ? "bg-[#aa825e] text-white" : "bg-black/5 text-black/50")}>
                      {isLocal ? <Truck className="h-5 w-5" /> : <Home className="h-5 w-5" />}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-[#0b0a07]">{opt.carrier_name}</p>
                      <p className="text-sm text-black/50">{opt.estimated_delivery.min_days === opt.estimated_delivery.max_days ? `Llega en ${opt.estimated_delivery.min_days} días` : `Llega en ${opt.estimated_delivery.min_days} a ${opt.estimated_delivery.max_days} días`}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-[#aa825e]">${opt.amounts.price_incl_tax.toLocaleString("es-AR")}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <div className={cn("space-y-6 rounded-2xl border border-black/8 bg-white p-5 sm:p-7 shadow-[0_18px_38px_rgba(11,10,7,0.05)] transition-all", !selectedOption ? "opacity-50 pointer-events-none grayscale-[0.5]" : "")}>
        <h2 className="font-serif text-xl font-bold text-[#0b0a07]">Domicilio y Contacto</h2>
        
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className={labelClass}>Calle *</label>
            <input type="text" value={direccion} onChange={e => setDireccion(e.target.value)} placeholder="Ej: San Martín" className={fieldClass} />
          </div>
          <div>
            <label className={labelClass}>Número *</label>
            <input type="text" value={numero} onChange={e => setNumero(e.target.value)} placeholder="Ej: 1234" className={fieldClass} />
          </div>
          <div className="md:col-span-2">
            <label className={labelClass}>Piso / Depto / Aclaraciones</label>
            <input type="text" value={extra} onChange={e => setExtra(e.target.value)} placeholder="Ej: Piso 3 Depto B (Opcional)" className={fieldClass} />
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2 border-t border-black/8 pt-6">
          <div>
            <label className={labelClass}>Nombre completo *</label>
            <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Juan Pérez" className={fieldClass} />
          </div>
          <div>
            <label className={labelClass}>Email *</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="juan@gmail.com" className={fieldClass} />
          </div>
          <div>
            <label className={labelClass}>DNI / CUIL *</label>
            <input type="text" value={dni} onChange={e => setDni(e.target.value)} placeholder="12345678" className={fieldClass} />
          </div>
          <div>
            <label className={labelClass}>Teléfono *</label>
            <input type="tel" value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="+54 11 1234-5678" className={fieldClass} />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <button onClick={onBack} className="text-sm font-medium text-black/50 hover:text-[#0b0a07] transition-colors">
          Volver
        </button>
        <button
          onClick={handleContinue}
          disabled={!isValid}
          className="inline-flex transform-gpu items-center justify-center rounded-full bg-[#aa825e] px-8 py-3.5 font-semibold text-white transition-all duration-200 hover:scale-[1.01] hover:bg-[#b78d68] hover:shadow-lg active:scale-95 disabled:scale-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
        >
          Continuar
        </button>
      </div>
    </div>
  )
}
