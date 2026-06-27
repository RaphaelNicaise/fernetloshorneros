import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"

export const metadata = {
  title: "Términos y Condiciones",
  description: "Términos y condiciones de Fernet Los Horneros.",
}

export default function TerminosPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#0b0a07]">
      <div className="relative z-10">
        <Navigation />
        
        <main className="container mx-auto max-w-4xl px-4 py-32 sm:py-40">
          <div className="rounded-3xl bg-white px-8 py-12 sm:px-16 sm:py-16 shadow-[0_-40px_60px_rgba(0,0,0,0.3)]">
            <h1 className="mb-8 font-serif text-3xl font-bold text-[#0b0a07] sm:text-4xl">Términos y Condiciones</h1>
            
            <div className="prose prose-stone max-w-none space-y-6 text-black/70">
              <p>
                Bienvenido a Fernet Los Horneros. Al acceder y utilizar este sitio web, aceptas cumplir con los siguientes términos y condiciones de uso, que junto con nuestra política de privacidad rigen la relación de Fernet Los Horneros contigo en relación a este sitio web.
              </p>

              <h2 className="font-serif text-2xl font-semibold text-[#0b0a07]">1. Restricción de Edad</h2>
              <p>
                El acceso a este sitio y la compra de nuestros productos están estrictamente restringidos a personas mayores de 18 años. Al utilizar este sitio, declaras y garantizas que tienes al menos 18 años de edad.
              </p>

              <h2 className="font-serif text-2xl font-semibold text-[#0b0a07]">2. Preventa y Listas de Espera</h2>
              <p>
                Nuestros productos se ofrecen a menudo bajo la modalidad de preventa debido a su naturaleza artesanal y disponibilidad limitada (como el Lote 2). La inscripción en la lista de espera no garantiza la compra del producto. La disponibilidad final está sujeta a la producción y se asignará según los criterios establecidos por Fernet Los Horneros en el momento del lanzamiento.
              </p>

              <h2 className="font-serif text-2xl font-semibold text-[#0b0a07]">3. Compras y Pagos</h2>
              <p>
                Todos los precios están indicados en pesos argentinos e incluyen los impuestos aplicables, salvo indicación contraria. Nos reservamos el derecho de modificar los precios en cualquier momento. El pago debe realizarse en su totalidad en el momento de confirmar el pedido.
              </p>

              <h2 className="font-serif text-2xl font-semibold text-[#0b0a07]">4. Envíos y Entregas</h2>
              <p>
                Los tiempos de entrega son estimados y pueden variar debido a factores externos. Los envíos correspondientes a las compras en preventa comenzarán a despacharse a partir de la fecha de lanzamiento oficial anunciada (ej. Septiembre 2026).
              </p>

              <h2 className="font-serif text-2xl font-semibold text-[#0b0a07]">5. Modificaciones</h2>
              <p>
                Fernet Los Horneros se reserva el derecho de revisar y modificar estos términos y condiciones en cualquier momento. El uso continuado del sitio después de cualquier cambio constituirá tu aceptación de tales modificaciones.
              </p>

              <h2 className="font-serif text-2xl font-semibold text-[#0b0a07]">6. Contacto</h2>
              <p>
                Para cualquier duda o consulta sobre estos términos, por favor contáctanos a través de nuestro formulario en la sección de contacto o al correo loshornerosbb@gmail.com.
              </p>
              
              <p className="pt-8 text-sm italic">Última actualización: Junio de 2026</p>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </div>
  )
}
