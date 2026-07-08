"use client"

import Image from "next/image"
import Link from "next/link"
import { useWaitlistModal } from "@/lib/waitlist-modal-context"

export function Footer() {
  const { open } = useWaitlistModal()

  return (
    <footer className="relative overflow-hidden border-t border-white/10 bg-[#0b0a07]">
      <div className="container mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="mb-4 flex items-center gap-3">
              <Image src="/logonuevo.webp" alt="Los Horneros" width={38} height={38} className="brightness-0 invert" />
              <Image src="/logo-fernet.webp" alt="Fernet Los Horneros" width={180} height={40} className="h-9 w-auto object-contain brightness-0 invert" />
            </div>
            <p className="text-sm text-white/58">Fernet artesanal elaborado con pasión y dedicación.</p>
          </div>
          <div>
            <h4 className="mb-4 font-semibold text-white">Navegación</h4>
            <ul className="space-y-2 text-sm text-white/58">
              <li>
                <Link href="/" className="transition-colors hover:text-[#AA6F3B]">
                  Inicio
                </Link>
              </li>
              <li>
                <Link href="/productos" className="transition-colors hover:text-[#AA6F3B]">
                  Productos
                </Link>
              </li>
              <li>
                <button type="button" onClick={open} className="transition-colors hover:text-[#AA6F3B]">
                  Lista de Espera
                </button>
              </li>
              <li>
                <Link href="/cart" className="transition-colors hover:text-[#AA6F3B]">
                  Carrito
                </Link>
              </li>
              <li>
                <Link href="/contactanos" className="transition-colors hover:text-[#AA6F3B]">
                  Contáctanos
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="mb-4 font-semibold text-white">Contacto</h4>
            <ul className="space-y-2 text-sm text-white/58">
              <li>loshornerosbb@gmail.com</li>
              <li>+54 9 2916 41-5881</li>
              <li> dev by <a href="https://www.linkedin.com/in/rapha%C3%ABl-nicaise-68025b27a/?locale=es_ES" target="_blank">Raphael Nicaise</a> | <a href="https://landing-ravel.vercel.app/" target="_blank">Ravel</a></li>
            </ul>
          </div>
          <div className="text-center sm:text-left">
            <h4 className="mb-4 font-semibold text-white">Síguenos</h4>
            <div className="flex items-center justify-center sm:justify-start gap-4">
              <a
                href="https://www.instagram.com/fernetloshorneros/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/4 transition-colors hover:border-[#AA6F3B] hover:text-[#AA6F3B]"
                aria-label="Instagram"
              >
                <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>
              <a
                href="https://www.tiktok.com/@santiredruelloo"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/4 transition-colors hover:border-[#AA6F3B] hover:text-[#AA6F3B]"
                aria-label="TikTok"
              >
                <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 pt-8 flex flex-col items-center justify-between gap-4 sm:flex-row text-center sm:text-left text-sm text-white/45">
          <p>&copy; 2026 Fernet Los Horneros. Todos los derechos reservados. Prohibida la venta a menores de 18 años.</p>
          <Link href="/terminos" className="transition-colors hover:text-[#AA6F3B]">
            Términos y Condiciones
          </Link>
        </div>
      </div>

      {/* Firma decorativa al pie */}
      <div className="relative w-full mt-6 select-none pointer-events-none">
        <Image
          src="/firma.webp"
          alt=""
          aria-hidden
          role="presentation"
          width={1920}
          height={300}
          className="w-full block object-contain opacity-20 -translate-x-8 -translate-y-6"
        />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-b from-transparent to-[#0b0a07]" />
      </div>
    </footer>
  )
}
