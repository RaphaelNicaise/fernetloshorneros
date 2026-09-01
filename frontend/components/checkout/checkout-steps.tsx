"use client"

import { ShoppingBag, Truck, Tag, CreditCard, Check } from "lucide-react"
import { cn } from "@/lib/utils"

const STEPS = [
  { icon: ShoppingBag, label: "Productos" },
  { icon: Truck, label: "Envío" },
  { icon: Tag, label: "Resumen" },
  { icon: CreditCard, label: "Pago" },
] as const

interface CheckoutStepsProps {
  currentStep: number
  onStepClick?: (step: number) => void
}

export function CheckoutSteps({ currentStep, onStepClick }: CheckoutStepsProps) {
  return (
    <nav aria-label="Progreso del checkout" className="w-full">
      <ol className="flex items-center justify-between">
        {STEPS.map((step, index) => {
          const stepNumber = index + 1
          const isCompleted = stepNumber < currentStep
          const isCurrent = stepNumber === currentStep
          const isClickable = isCompleted && onStepClick

          const Icon = isCompleted ? Check : step.icon

          return (
            <li
              key={step.label}
              className={cn(
                "flex flex-1 items-center",
                index < STEPS.length - 1 && "after:mx-2 after:h-px after:flex-1 after:content-[''] sm:after:mx-4",
                index < STEPS.length - 1 && (
                  isCompleted
                    ? "after:bg-[#aa825e]"
                    : "after:bg-black/10"
                )
              )}
            >
              <button
                type="button"
                onClick={() => isClickable && onStepClick(stepNumber)}
                disabled={!isClickable}
                className={cn(
                  "group flex flex-col items-center gap-1.5 transition-all duration-200",
                  isClickable && "cursor-pointer",
                  !isClickable && "cursor-default"
                )}
                aria-current={isCurrent ? "step" : undefined}
              >
                <span
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300 sm:h-12 sm:w-12",
                    isCompleted && "border-[#aa825e] bg-[#aa825e] text-white",
                    isCurrent && "border-[#aa825e] bg-[#aa825e]/10 text-[#aa825e] shadow-[0_0_0_4px_rgba(170,130,94,0.12)]",
                    !isCompleted && !isCurrent && "border-black/12 bg-white text-black/30"
                  )}
                >
                  <Icon className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={isCompleted ? 2.5 : 1.8} />
                </span>
                <span
                  className={cn(
                    "hidden text-xs font-medium sm:block",
                    isCompleted && "text-[#aa825e]",
                    isCurrent && "text-[#0b0a07] font-semibold",
                    !isCompleted && !isCurrent && "text-black/35"
                  )}
                >
                  {step.label}
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
