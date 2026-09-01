"use client"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Provincia, Localidad } from "@/lib/api"

interface ShippingLocationStepProps {
  provincia: string
  setProvincia: (prov: string) => void
  openProvincia: boolean
  setOpenProvincia: (open: boolean) => void
  provincias: Provincia[]
  loadingProvincias: boolean
  ciudad: string
  setCiudad: (city: string) => void
  openCiudad: boolean
  setOpenCiudad: (open: boolean) => void
  localidades: Localidad[]
  loadingLocalidades: boolean
  codigoPostal: string
  setCodigoPostal: (cp: string) => void
  loadingOptions: boolean
}

export const fieldClassName = "w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-[#0b0a07] transition-all placeholder:text-black/30 focus:border-[#aa825e]/45 focus:outline-none focus:ring-2 focus:ring-[#aa825e]/20 disabled:cursor-not-allowed disabled:opacity-50"
export const labelClassName = "mb-1.5 block text-sm font-medium text-[#0b0a07]"

export function ShippingLocationStep({
  provincia,
  setProvincia,
  openProvincia,
  setOpenProvincia,
  provincias,
  loadingProvincias,
  ciudad,
  setCiudad,
  openCiudad,
  setOpenCiudad,
  localidades,
  loadingLocalidades,
  codigoPostal,
  setCodigoPostal,
  loadingOptions,
}: ShippingLocationStepProps) {
  return (
    <div className="rounded-2xl border border-black/8 bg-white p-6 shadow-[0_18px_38px_rgba(11,10,7,0.05)]">
      <h2 className="mb-4 font-serif text-xl font-bold text-[#0b0a07]">¿Dónde lo enviamos?</h2>
      
      <div className="grid md:grid-cols-3 gap-4">
        <div>
          <label className={labelClassName}>
            Provincia *
          </label>
          <Popover open={openProvincia} onOpenChange={setOpenProvincia}>
            <PopoverTrigger asChild>
              <button
                type="button"
                disabled={loadingProvincias}
                role="combobox"
                className={cn(
                  fieldClassName,
                  "flex w-full items-center justify-between font-normal text-left",
                  !provincia && "text-black/30"
                )}
              >
                <span className="truncate">{provincia || (loadingProvincias ? "Cargando..." : "Seleccionar provincia")}</span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
              <Command>
                <CommandInput placeholder="Buscar provincia..." className="h-9" />
                <CommandList>
                  <CommandEmpty>No se encontró la provincia.</CommandEmpty>
                  <CommandGroup>
                    {provincias.map((p) => (
                      <CommandItem
                        key={p.id}
                        value={p.nombre}
                        onSelect={(currentValue) => {
                          const selected = provincias.find(prov => prov.nombre.toLowerCase() === currentValue.toLowerCase())
                          setProvincia(selected ? selected.nombre : "")
                          setOpenProvincia(false)
                        }}
                      >
                        {p.nombre}
                        <Check
                          className={cn(
                            "ml-auto h-4 w-4",
                            provincia === p.nombre ? "opacity-100 text-[#aa825e]" : "opacity-0"
                          )}
                        />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        <div>
          <label className={labelClassName}>
            Ciudad *
          </label>
          <Popover open={openCiudad} onOpenChange={setOpenCiudad}>
            <PopoverTrigger asChild>
              <button
                type="button"
                disabled={!provincia || loadingLocalidades}
                role="combobox"
                className={cn(
                  fieldClassName,
                  "flex w-full items-center justify-between font-normal text-left",
                  !ciudad && "text-black/30"
                )}
              >
                <span className="truncate">
                  {loadingLocalidades 
                    ? "Cargando..." 
                    : !provincia 
                      ? "Primero seleccioná provincia" 
                      : (ciudad || "Seleccionar ciudad")}
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
              <Command>
                <CommandInput placeholder="Buscar ciudad..." className="h-9" />
                <CommandList>
                  <CommandEmpty>No se encontró la ciudad.</CommandEmpty>
                  <CommandGroup>
                    {localidades.map((l) => (
                      <CommandItem
                        key={l.id}
                        value={l.nombre}
                        onSelect={(currentValue) => {
                          const selected = localidades.find(loc => loc.nombre.toLowerCase() === currentValue.toLowerCase())
                          setCiudad(selected ? selected.nombre : "")
                          setOpenCiudad(false)
                        }}
                      >
                        {l.nombre}
                        <Check
                          className={cn(
                            "ml-auto h-4 w-4",
                            ciudad === l.nombre ? "opacity-100 text-[#aa825e]" : "opacity-0"
                          )}
                        />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
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
  )
}
