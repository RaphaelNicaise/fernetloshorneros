"use client"

import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"

export default function ContactanosPage() {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Sin funcionalidad por ahora
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      <main className="flex-1">
        <section className="bg-secondary py-16">
          <div className="container mx-auto px-4">
            <h1 className="font-serif text-5xl font-bold text-foreground mb-4">Contactanos</h1>
            <p className="text-xl text-muted-foreground max-w-2xl">
              Escribinos tu consulta. Te responderemos a la brevedad.
            </p>
          </div>
        </section>

        <section className="py-12">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto bg-card border border-border rounded-lg p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground">Mail</label>
                  <Input type="email" placeholder="tu@email.com" required />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Asunto</label>
                  <Input placeholder="Asunto de tu mensaje" required />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Mensaje</label>
                  <Textarea rows={6} placeholder="Contanos en qué podemos ayudarte" required />
                </div>
                <div className="pt-2">
                  <Button type="submit">Enviar</Button>
                </div>
              </form>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
