"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { AnimatePresence, motion } from "framer-motion"
import { CheckCircle, ChevronDown, Loader2, X } from "lucide-react"
import { API_BASE_URL } from "@/lib/api"
import { useWaitlistModal } from "@/lib/waitlist-modal-context"

const PROVINCIAS_ARGENTINA = [
	"Buenos Aires", "Catamarca", "Chaco", "Chubut", "Ciudad Autónoma de Buenos Aires", "Córdoba", "Corrientes",
	"Entre Ríos", "Formosa", "Jujuy", "La Pampa", "La Rioja", "Mendoza",
	"Misiones", "Neuquén", "Río Negro", "Salta", "San Juan", "San Luis",
	"Santa Cruz", "Santa Fe", "Santiago del Estero", "Tierra del Fuego", "Tucumán",
]

const backdropVariants = {
	hidden: { opacity: 0 },
	visible: { opacity: 1, transition: { duration: 0.3, ease: "easeOut" } },
	exit: { opacity: 0, transition: { duration: 0.25, ease: "easeIn" } },
}

const panelVariants = {
	hidden: { opacity: 0, y: 60, scale: 0.96 },
	visible: {
		opacity: 1,
		y: 0,
		scale: 1,
		transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
	},
	exit: {
		opacity: 0,
		y: 40,
		scale: 0.97,
		transition: { duration: 0.25, ease: "easeIn" },
	},
}

const fieldVariants = {
	hidden: { opacity: 0, y: 16 },
	visible: (i: number) => ({
		opacity: 1,
		y: 0,
		transition: { delay: i * 0.07 + 0.15, duration: 0.35, ease: "easeOut" },
	}),
}

export function WaitlistModal() {
	const { isOpen, close } = useWaitlistModal()
	const [formData, setFormData] = useState({ name: "", email: "", province: "" })
	const [submitted, setSubmitted] = useState(false)
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [provinceMenuOpen, setProvinceMenuOpen] = useState(false)
	const provinceMenuRef = useRef<HTMLDivElement>(null)
	const provinceTriggerRef = useRef<HTMLButtonElement>(null)
	const [provinceMenuPosition, setProvinceMenuPosition] = useState<{
		top: number
		left: number
		width: number
		openUpward: boolean
		maxHeight: number
	} | null>(null)

	useEffect(() => {
		if (!provinceMenuOpen) {
			setProvinceMenuPosition(null)
			return
		}

		const updateMenuPosition = () => {
			const trigger = provinceTriggerRef.current
			if (!trigger) return

			const rect = trigger.getBoundingClientRect()
			const gap = 10
			const viewportHeight = window.innerHeight
			const spaceBelow = viewportHeight - rect.bottom - 24
			const spaceAbove = rect.top - 24
			const openUpward = spaceBelow < 260 && spaceAbove > spaceBelow
			const maxHeight = Math.max(Math.min(openUpward ? spaceAbove - gap : spaceBelow - gap, 320), 180)

			setProvinceMenuPosition({
				top: openUpward ? rect.top - gap : rect.bottom + gap,
				left: rect.left,
				width: rect.width,
				openUpward,
				maxHeight,
			})
		}

		updateMenuPosition()
		window.addEventListener("resize", updateMenuPosition)
		window.addEventListener("scroll", updateMenuPosition, true)

		return () => {
			window.removeEventListener("resize", updateMenuPosition)
			window.removeEventListener("scroll", updateMenuPosition, true)
		}
	}, [provinceMenuOpen])

	useEffect(() => {
		if (!provinceMenuOpen) return

		const handleOutsideClick = (event: MouseEvent) => {
			const target = event.target as Node
			if (!provinceMenuRef.current?.contains(target) && !provinceTriggerRef.current?.contains(target)) {
				setProvinceMenuOpen(false)
			}
		}

		document.addEventListener("mousedown", handleOutsideClick)
		return () => document.removeEventListener("mousedown", handleOutsideClick)
	}, [provinceMenuOpen])

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setIsSubmitting(true)
		setError(null)

		try {
			const res = await fetch(`${API_BASE_URL}/waitlist`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					nombre: formData.name.trim(),
					email: formData.email.trim(),
					provincia: formData.province,
				}),
			})

			if (!res.ok) {
				let friendly = "Ocurrió un problema. Intentá nuevamente."
				try {
					const data = await res.json()
					const rawMsg: string | undefined = data?.error || data?.message
					if (res.status === 409 || (rawMsg && rawMsg.toLowerCase().includes("ya está registrado"))) {
						friendly = "Este email ya está registrado en la lista de espera."
					} else if (rawMsg) {
						friendly = rawMsg
					}
				} catch {}
				throw new Error(friendly)
			}

			setSubmitted(true)
			setFormData({ name: "", email: "", province: "" })
		} catch (err: any) {
			setError(err?.message || "No pudimos enviar tu solicitud. Revisá tu conexión e intentá de nuevo.")
		} finally {
			setIsSubmitting(false)
		}
	}

	const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
		setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
	}

	const handleClose = () => {
		close()
		setProvinceMenuOpen(false)
		setTimeout(() => {
			setSubmitted(false)
			setError(null)
			setFormData({ name: "", email: "", province: "" })
		}, 300)
	}

	return (
		<AnimatePresence>
			{isOpen && (
				<div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4">
					<motion.div
						key="backdrop"
						variants={backdropVariants}
						initial="hidden"
						animate="visible"
						exit="exit"
						className="absolute inset-0 bg-[#0b0a07]/80 backdrop-blur-sm"
						onClick={handleClose}
					/>

					<motion.div
						key="panel"
						variants={panelVariants}
						initial="hidden"
						animate="visible"
						exit="exit"
						className="relative w-full overflow-visible rounded-t-3xl border border-[#aa825e]/30 bg-[#1a1208] shadow-2xl sm:max-w-md sm:rounded-2xl"
						role="dialog"
						aria-modal="true"
						aria-label="Lista de espera"
					>
						<div className="pointer-events-none absolute left-1/2 top-0 h-32 w-64 -translate-x-1/2 bg-[#aa825e]/15 blur-3xl" />

						<div className="relative border-b border-[#aa825e]/20 px-6 pb-4 pt-6">
							<div className="flex items-start justify-between gap-4">
								<div>
									<p className="mb-1 text-xs font-semibold uppercase tracking-[0.25em] text-[#aa825e]">Preventa · Lote 2</p>
									<h2 className="font-serif text-2xl font-bold text-[#f5f0e6]">Lista de Espera</h2>
									<p className="mt-1 text-sm leading-snug text-[#f5f0e6]/60">
										Solo 17.500 botellas. Te avisamos 24hs antes del lanzamiento.
									</p>
								</div>
								<button
									onClick={handleClose}
									className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#aa825e]/10 transition-colors hover:bg-[#aa825e]/20"
									aria-label="Cerrar"
								>
									<X className="h-4 w-4 text-[#f5f0e6]/70" />
								</button>
							</div>
						</div>

						<div className="px-6 pb-7 pt-5">
							<AnimatePresence mode="wait">
								{submitted ? (
									<motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1, transition: { duration: 0.4, ease: "easeOut" } }} className="py-8 text-center">
										<motion.div
											initial={{ scale: 0 }}
											animate={{ scale: 1, transition: { delay: 0.1, type: "spring", stiffness: 200, damping: 15 } }}
											className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full border border-[#aa825e]/40 bg-[#aa825e]/20"
										>
											<CheckCircle className="h-8 w-8 text-[#aa825e]" />
										</motion.div>
										<h3 className="mb-2 font-serif text-xl font-bold text-[#f5f0e6]">¡Estás adentro!</h3>
										<p className="mx-auto max-w-xs text-sm leading-relaxed text-[#f5f0e6]/70">
											Te vamos a avisar cuando el Lote 2 esté listo. Bienvenido a la familia Horneros.
										</p>
										<button
											onClick={handleClose}
											className="mt-6 rounded-full border border-[#aa825e]/40 bg-[#aa825e]/20 px-6 py-2.5 text-sm font-medium text-[#aa825e] transition-colors hover:bg-[#aa825e]/35"
										>
											Cerrar
										</button>
									</motion.div>
								) : (
									<motion.form key="form" onSubmit={handleSubmit} className="space-y-4">
										{[
											{ id: 0, label: "Nombre", field: "name", type: "text", placeholder: "Juan Pérez" },
											{ id: 1, label: "Email", field: "email", type: "email", placeholder: "juan@ejemplo.com" },
										].map(({ id, label, field, type, placeholder }) => (
											<motion.div key={field} custom={id} variants={fieldVariants} initial="hidden" animate="visible">
												<label htmlFor={`wl-${field}`} className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#f5f0e6]/75">
													{label}
												</label>
												<input
													id={`wl-${field}`}
													name={field}
													type={type}
													required
													value={formData[field as keyof typeof formData]}
													onChange={handleChange}
													placeholder={placeholder}
													className="w-full rounded-xl border border-[#aa825e]/25 bg-[#0b0a07]/40 px-4 py-3 text-sm text-[#f5f0e6] placeholder-[#f5f0e6]/30 transition-all duration-200 focus:border-[#aa825e]/60 focus:bg-[#0b0a07]/60 focus:outline-none"
												/>
											</motion.div>
										))}

										<motion.div custom={2} variants={fieldVariants} initial="hidden" animate="visible">
											<label htmlFor="wl-province" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#f5f0e6]/75">
												Provincia
											</label>
											<div className="md:hidden">
												<select
													id="wl-province"
													name="province"
													required
													value={formData.province}
													onChange={handleChange}
													className="w-full rounded-xl border border-[#aa825e]/25 bg-[#0b0a07]/40 px-4 py-3 text-sm text-[#f5f0e6] transition-all duration-200 focus:border-[#aa825e]/60 focus:bg-[#0b0a07]/60 focus:outline-none"
												>
													<option value="" disabled className="bg-[#1a1208] text-[#f5f0e6]/50">Seleccioná tu provincia</option>
													{PROVINCIAS_ARGENTINA.map((province) => (
														<option key={province} value={province} className="bg-[#1a1208] text-[#f5f0e6]">{province}</option>
													))}
												</select>
											</div>

											<div className="relative hidden md:block md:max-w-[290px]">
												<button
													ref={provinceTriggerRef}
													type="button"
													onClick={() => setProvinceMenuOpen((value) => !value)}
													className={`flex w-full items-center justify-between rounded-full border px-4 py-3 text-sm transition-all duration-200 ${
														provinceMenuOpen || formData.province
															? "border-[#aa825e]/55 bg-[#0b0a07]/62 text-[#f5f0e6]"
															: "border-white/10 bg-[#0b0a07]/34 text-[#f5f0e6]/60"
													}`}
													aria-haspopup="listbox"
													aria-expanded={provinceMenuOpen}
												>
													<span className="truncate">{formData.province || "Seleccioná tu provincia"}</span>
													<ChevronDown className={`h-4 w-4 text-[#aa825e] transition-transform duration-200 ${provinceMenuOpen ? "rotate-180" : ""}`} />
												</button>
											</div>
										</motion.div>

										{error && (
											<motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
												{error}
											</motion.div>
										)}

										<motion.div custom={3} variants={fieldVariants} initial="hidden" animate="visible" className="pt-2">
											<button
												type="submit"
												disabled={isSubmitting}
												className="inline-flex w-full items-center justify-center rounded-full bg-[#aa825e] px-6 py-3.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-[#b78d68] disabled:cursor-not-allowed disabled:opacity-60"
											>
												{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Asegurar mi lugar"}
											</button>
										</motion.div>
									</motion.form>
								)}
							</AnimatePresence>
						</div>
					</motion.div>

					{provinceMenuOpen && provinceMenuPosition
						? createPortal(
								<AnimatePresence>
									<motion.div
										ref={provinceMenuRef}
										initial={{ opacity: 0, y: provinceMenuPosition.openUpward ? 8 : -8, scale: 0.98 }}
										animate={{ opacity: 1, y: 0, scale: 1 }}
										exit={{ opacity: 0, y: provinceMenuPosition.openUpward ? 6 : -6, scale: 0.98 }}
										transition={{ duration: 0.18, ease: "easeOut" }}
										className="fixed z-[160] overflow-hidden rounded-2xl border border-white/10 bg-[#120e0b]/98 shadow-[0_24px_60px_rgba(0,0,0,0.45)]"
										style={{
											left: provinceMenuPosition.left,
											width: provinceMenuPosition.width,
											top: provinceMenuPosition.openUpward ? provinceMenuPosition.top - provinceMenuPosition.maxHeight : provinceMenuPosition.top,
										}}
									>
										<div className="overflow-y-auto py-2" style={{ maxHeight: provinceMenuPosition.maxHeight }}>
											{PROVINCIAS_ARGENTINA.map((province) => {
												const selected = formData.province === province

												return (
													<button
														key={province}
														type="button"
														onClick={() => {
															setFormData((prev) => ({ ...prev, province }))
															setProvinceMenuOpen(false)
														}}
														className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition-colors ${
															selected ? "bg-white/8 text-white" : "text-[#f5f0e6]/74 hover:bg-white/5 hover:text-white"
														}`}
													>
														<span>{province}</span>
														{selected && <span className="h-2 w-2 rounded-full bg-[#aa825e]" />}
													</button>
												)
											})}
										</div>
									</motion.div>
								</AnimatePresence>,
								document.body,
							)
						: null}
				</div>
			)}
		</AnimatePresence>
	)
}
