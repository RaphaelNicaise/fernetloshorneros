"use client"

import { fieldClassName, labelClassName } from "./ShippingLocationStep"

interface ShippingDetailsFormProps {
  selectedType: 'standard_delivery' | 'pickup_point'
  direccion: string
  setDireccion: (d: string) => void
  numero: string
  setNumero: (n: string) => void
  extra: string
  setExtra: (e: string) => void
  nombre: string
  setNombre: (name: string) => void
  email: string
  setEmail: (email: string) => void
  dni: string
  setDni: (dni: string) => void
  telefono: string
  setTelefono: (tel: string) => void
}

export function ShippingDetailsForm({
  selectedType,
  direccion,
  setDireccion,
  numero,
  setNumero,
  extra,
  setExtra,
  nombre,
  setNombre,
  email,
  setEmail,
  dni,
  setDni,
  telefono,
  setTelefono,
}: ShippingDetailsFormProps) {
  return (
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
              <label className={labelClassName}>Piso / Depto / Aclaraciones</label>
              <input
                type="text"
                value={extra}
                onChange={(e) => setExtra(e.target.value)}
                placeholder="Ej: Piso 3 Depto B, casa con portón negro, timbre no funciona... (Opcional)"
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
  )
}
