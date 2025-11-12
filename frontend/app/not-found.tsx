import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="text-center max-w-xl">
          <p className="text-sm text-muted-foreground mb-2">Error 404</p>
          <h1 className="text-3xl font-serif font-bold tracking-tight text-foreground sm:text-4xl">
            Página no encontrada
          </h1>
          <p className="mt-3 text-muted-foreground">
            La URL que intentaste abrir no existe. Puede que haya sido movida o que la dirección esté mal escrita.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Button asChild>
              <Link href="/">Volver al inicio</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/productos">Ver productos</Link>
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
