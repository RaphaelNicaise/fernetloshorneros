"use client"

import { ShippingOption } from "@/lib/api"
import { formatDeliveryDate } from "./types"

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

interface ShippingMethodStepProps {
  allOptions: ShippingOption[]
  selectedOption: ShippingOption | null
  onSelectOption: (option: ShippingOption) => void
}

export function ShippingMethodStep({
  allOptions,
  selectedOption,
  onSelectOption,
}: ShippingMethodStepProps) {
  return (
    <div className="rounded-2xl border border-black/8 bg-white p-6 shadow-[0_18px_38px_rgba(11,10,7,0.05)]">
      <h2 className="mb-4 font-serif text-xl font-bold text-[#0b0a07]">Tu envío</h2>
      
      <div className="grid md:grid-cols-1 gap-4">
        {allOptions.map((option) => (
          <button
            key={option.rate_id}
            onClick={() => onSelectOption(option)}
            className={`relative rounded-2xl border p-5 text-left transition-all ${
              selectedOption?.rate_id === option.rate_id
                ? 'border-[#aa825e]/45 bg-[#aa825e]/8 shadow-[0_14px_28px_rgba(170,130,94,0.12)]'
                : 'border-black/10 hover:border-[#aa825e]/30'
            }`}
          >
            <div className="flex items-start gap-4">
              <div
                className={`rounded-xl p-2.5 ${
                  selectedOption?.rate_id === option.rate_id
                    ? 'bg-[#aa825e] text-white'
                    : 'bg-black/5 text-black/40'
                }`}
              >
                {option.service_type === 'standard_delivery' ? <HomeIcon /> : <LocationIcon />}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-[#0b0a07]">{option.carrier_name}</h3>
                  {selectedOption?.rate_id === option.rate_id && (
                    <span className="text-[#aa825e]">
                      <CheckIcon />
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-black/55">
                  {option.service_type === 'standard_delivery' ? 'Envío a domicilio' : 'Retiro en punto de entrega'}
                </p>
                <p className="mt-1 text-sm text-black/55">
                  {formatDeliveryDate(option.estimated_delivery.min_days, option.estimated_delivery.max_days)}
                </p>
                <p className="mt-2 text-lg font-bold text-[#0b0a07]">
                  ${option.amounts.price_incl_tax.toLocaleString('es-AR')}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
