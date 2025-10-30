// Esta ruta se movió a /productos. Redirige manualmente si llegara a ser cargada.
export default function OldProductsRedirect() {
  if (typeof window !== 'undefined') {
    window.location.replace('/productos')
  }
  return null
}
