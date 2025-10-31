export interface Product {
  id: string
  name: string
  description: string
  price: number
  image: string
}

export const products: Product[] = [
  {
    id: "fernet-750",
    name: "Fernet Artesanal Los Horneros 750ml",
    description:
      "Nuestro fernet insignia, elaborado con más de 20 hierbas seleccionadas y macerado durante meses para lograr el equilibrio perfecto.",
    price: 4500,
    image: "/fernet1.jpg"
  },
  {
    id: "vaso-mediano",
    name: "Vaso Mediano",
    description: "Vaso de cristal de alta calidad, diseñado para disfrutar tu fernet con hielo.",
    price: 1800,
    image: "/vaso-mediano.jpg",
  },
  {
    id: "vaso-grande",
    name: "Vaso Grande",
    description: "Copa tipo balón perfecta para cócteles con fernet, realza los aromas.",
    price: 2200,
    image: "/vaso-grande.jpg",
  },
]
