import { Navigation } from "@/components/navigation"
import { ImageCarousel } from "@/components/image-carousel"
import Image from "next/image"
import { products } from "@/lib/products"
import { ProductCard } from "@/components/product-card"
import Link from "next/link"
import { Link as VTLink } from "next-view-transitions"
import { Footer } from "@/components/footer"

const productionImages = [
  {
    src: "/fernet-production-herbs.jpg",
    alt: "Selección de hierbas aromáticas",
    caption: "Seleccionamos cuidadosamente más de 20 hierbas aromáticas de la región",
  },
  {
    src: "/fernet-production-maceration.jpg",
    alt: "Proceso de maceración",
    caption: "Maceración lenta durante semanas para extraer los sabores más profundos",
  },
  {
    src: "/fernet-production-distillation.jpg",
    alt: "Destilación artesanal",
    caption: "Destilación artesanal en pequeños lotes para garantizar la calidad",
  },
  {
    src: "/fernet-production-aging.jpg",
    alt: "Añejamiento en barricas",
    caption: "Reposo en barricas de roble para desarrollar complejidad y suavidad",
  },
  {
    src: "/fernet-production-bottling.jpg",
    alt: "Embotellado manual",
    caption: "Cada botella es embotellada y etiquetada a mano con dedicación",
  },
]

const heroImages = [
  { src: "/fernet1.jpg", alt: "Fernet 1" },
  { src: "/fernet2.jpg", alt: "Fernet 2" },
  { src: "/fernet3.jpg", alt: "Fernet 3" },
  { src: "/fernet4.jpg", alt: "Fernet 4" },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-primary">
      <Navigation />

      {/* Hero Section */}
      <section className="pt-24 sm:pt-32 pb-16 sm:pb-24 px-4 bg-white">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
            <div>
              <div className="mb-6">
                <Image
                  src="/logo-fernet.png"
                  alt="Fernet Los Horneros"
                  width={520}
                  height={140}
                  className="h-24 sm:h-28 md:h-32 w-auto object-contain"
                  priority
                />
              </div>
              <p className="text-lg sm:text-xl text-muted-foreground mb-8 leading-relaxed">
                Elaborado con más de 20 hierbas aromáticas seleccionadas, siguiendo métodos tradicionales y el cuidado
                artesanal de generaciones.
              </p>
              <div className="flex flex-wrap gap-4">
                <VTLink
                  href="/productos"
                  className="inline-flex items-center justify-center px-6 sm:px-8 py-3 sm:py-4 bg-primary text-primary-foreground font-semibold rounded-lg transition-all duration-200 transform-gpu hover:bg-primary/90 hover:shadow-md hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  Ver Productos
                </VTLink>
                <VTLink
                  href="/lista-espera"
                  className="inline-flex items-center justify-center px-6 sm:px-8 py-3 sm:py-4 border-2 border-primary text-primary font-semibold rounded-lg transition-all duration-200 transform-gpu hover:bg-primary hover:text-primary-foreground hover:shadow-md hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  Únete a la Lista
                </VTLink>
              </div>
            </div>
            <div className="relative h-[400px] sm:h-[500px] rounded-lg overflow-hidden">
              <ImageCarousel images={heroImages} autoPlayInterval={12000} />
            </div>
          </div>
        </div>
      </section>

      {/* Production Process Carousel */}
      <section className="py-16 sm:py-24 px-4 bg-secondary">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
              Nuestro Proceso Artesanal
            </h2>
            <p className="text-text text-lg max-w-2xl mx-auto">
              Cada botella es el resultado de un proceso cuidadoso que respeta la tradición y busca la excelencia
            </p>
          </div>
          <div className="h-[400px] sm:h-[500px] md:h-[600px]">
            <ImageCarousel images={productionImages} autoPlayInterval={12000} />
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-16 sm:py-24 px-4 bg-primary">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
            <div className="order-2 md:order-1 relative h-[300px] sm:h-[400px] rounded-lg overflow-hidden">
              <img
                src="/small-dark-fernet-bottle-minimalist.jpg"
                alt="Detalle del fernet"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="order-1 md:order-2">
              <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white mb-6">Nuestra Historia</h2>
              <div className="space-y-4 text-text leading-relaxed">
                <p>
                  Los Horneros nace de la pasión por rescatar y perfeccionar las recetas tradicionales de fernet
                  artesanal. Inspirados en las técnicas centenarias europeas, creamos un producto único que refleja
                  nuestra identidad y dedicación.
                </p>
                <p>
                  Cada botella es el resultado de meses de maceración, destilación cuidadosa y añejamiento paciente.
                  Utilizamos solo ingredientes naturales de la más alta calidad, sin aditivos ni aceleradores
                  artificiales.
                </p>
                <p>
                  Nuestro compromiso es con la autenticidad: un fernet que honra la tradición mientras crea nuevos
                  momentos memorables para compartir.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Products Preview */}
      <section className="py-16 sm:py-24 px-4 bg-accent">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-foreground mb-4">Nuestros Productos</h2>
            <p className="text-text text-lg">Fernet artesanal y cristalería de calidad premium</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          <div className="text-center mt-12">
            <VTLink
              href="/productos"
              className="inline-flex items-center justify-center px-8 py-4 bg-white text-primary font-semibold rounded-lg transition-all duration-200 transform-gpu hover:bg-text hover:shadow-md hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              Ver Todos los Productos
            </VTLink>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
