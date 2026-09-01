"use client"

import { useState, useEffect } from "react"
import { 
  quoteShippingOptions, 
  fetchProvincias, 
  fetchLocalidades, 
  type ShippingOption, 
  type PickupPoint,
  type Provincia,
  type Localidad 
} from "@/lib/api"
import { ShippingLocationStep } from "./shipping/ShippingLocationStep"
import { ShippingMethodStep } from "./shipping/ShippingMethodStep"
import { ShippingDetailsForm } from "./shipping/ShippingDetailsForm"
import { ShippingSelection, ShippingSelectorProps } from "./shipping/types"

export * from "./shipping/types"

export function ShippingSelector({
  items,
  productsTotal: _productsTotal,
  onSelectionComplete,
  onTotalChange,
}: ShippingSelectorProps) {
  // Estado paso 1: Código postal y provincia
  const [codigoPostal, setCodigoPostal] = useState("")
  const [provincia, setProvincia] = useState("")
  const [openProvincia, setOpenProvincia] = useState(false)
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
  const [openCiudad, setOpenCiudad] = useState(false)
  const [localidades, setLocalidades] = useState<Localidad[]>([])
  const [loadingLocalidades, setLoadingLocalidades] = useState(false)
  const [direccion, setDireccion] = useState("")
  const [numero, setNumero] = useState("")
  const [extra, setExtra] = useState("")
  
  // Estado formulario pickup
  const [selectedPickupPoint, _setSelectedPickupPoint] = useState<PickupPoint | null>(null)
  
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

    if (currentQuoteKey === lastQuotedValues) {
      return
    }

    const timer = setTimeout(async () => {
      setLoadingOptions(true)
      setSelectedType(null)
      setSelectedOption(null)
      try {
        const res = await quoteShippingOptions({
          destination: {
            zipcode: codigoPostal.trim(),
            state: provincia.trim(),
            city: ciudad.trim()
          },
          items,
        })
        
        if (res.success && res.all_results) {
          setAllOptions(res.all_results)
          setQuoteFetched(true)
          setLastQuotedValues(currentQuoteKey)
          
          if (res.all_results.length > 0) {
            const first = res.all_results[0]
            setSelectedOption(first)
            setSelectedType(first.service_type as any)
            onTotalChange(first.amounts.price_incl_tax)
          }
        } else {
          setAllOptions([])
          setQuoteFetched(true)
        }
      } catch (e) {
        console.error("Error cotizando opciones de envío:", e)
        setAllOptions([])
        setQuoteFetched(true)
      } finally {
        setLoadingOptions(false)
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [canQuote, currentQuoteKey, lastQuotedValues, codigoPostal, provincia, ciudad, items, onTotalChange])

  const handleSelectType = (option: ShippingOption) => {
    setSelectedOption(option)
    setSelectedType(option.service_type as any)
    onTotalChange(option.amounts.price_incl_tax)
  }

  const isDeliveryFormComplete = 
    selectedType === 'standard_delivery' &&
    direccion.trim() !== "" &&
    numero.trim() !== "" &&
    nombre.trim() !== "" &&
    email.trim() !== "" &&
    dni.trim() !== "" &&
    telefono.trim() !== ""

  const isPickupFormComplete = 
    selectedType === 'pickup_point' &&
    nombre.trim() !== "" &&
    email.trim() !== "" &&
    dni.trim() !== "" &&
    telefono.trim() !== ""

  const isFormComplete = isDeliveryFormComplete || isPickupFormComplete

  useEffect(() => {
    if (isFormComplete && selectedOption) {
      const selection: ShippingSelection = {
        rate_id: selectedOption.rate_id,
        service_type: selectedOption.service_type as any,
        logistic_type: null,
        carrier_id: null,
        point_id: null,
        shipping_cost: selectedOption.amounts.price_incl_tax,
        carrier_name: selectedOption.carrier_name,
        contact: { nombre, email, dni, telefono },
      }

      if (selectedType === 'standard_delivery') {
        selection.address = {
          provincia,
          ciudad,
          codigoPostal,
          direccion,
          numero,
          extra,
        }
      }

      onSelectionComplete(selection)
    }
  }, [isFormComplete, selectedOption, selectedType, selectedPickupPoint, provincia, ciudad, codigoPostal, direccion, numero, extra, nombre, email, dni, telefono, onSelectionComplete])

  return (
    <div className="space-y-6">
      <ShippingLocationStep
        provincia={provincia}
        setProvincia={setProvincia}
        openProvincia={openProvincia}
        setOpenProvincia={setOpenProvincia}
        provincias={provincias}
        loadingProvincias={loadingProvincias}
        ciudad={ciudad}
        setCiudad={setCiudad}
        openCiudad={openCiudad}
        setOpenCiudad={setOpenCiudad}
        localidades={localidades}
        loadingLocalidades={loadingLocalidades}
        codigoPostal={codigoPostal}
        setCodigoPostal={setCodigoPostal}
        loadingOptions={loadingOptions}
      />

      {quoteFetched && !loadingOptions && allOptions.length > 0 && (
        <ShippingMethodStep
          allOptions={allOptions}
          selectedOption={selectedOption}
          onSelectOption={handleSelectType}
        />
      )}

      {selectedType && (
        <ShippingDetailsForm
          selectedType={selectedType}
          direccion={direccion}
          setDireccion={setDireccion}
          numero={numero}
          setNumero={setNumero}
          extra={extra}
          setExtra={setExtra}
          nombre={nombre}
          setNombre={setNombre}
          email={email}
          setEmail={setEmail}
          dni={dni}
          setDni={setDni}
          telefono={telefono}
          setTelefono={setTelefono}
        />
      )}

      {quoteFetched && !loadingOptions && allOptions.length === 0 && (
        <div className="rounded-2xl border border-[#aa825e]/30 bg-[#f5ede5] p-6 text-center">
          <p className="text-[#6B5743]">
            No encontramos opciones de envío para tu zona. Verificá el código postal e intentá nuevamente.
          </p>
        </div>
      )}
    </div>
  )
}
