"use client"

import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { API_BASE_URL } from "@/lib/api"
import { Search, Download, Package } from "lucide-react"
import * as XLSX from "xlsx"

type Product = {
  id: string
  name: string
  description: string
  price: number
  image: string
  limite: number // 0 = sin límite
  stock: number // cantidad disponible total
  status: "disponible" | "proximamente" | "agotado"
}

const API_URL = API_BASE_URL

export default function AdminProductosPage() {
  const [items, setItems] = useState<Product[]>([])
  const [reservedStock, setReservedStock] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [createOpen, setCreateOpen] = useState(false)
  const [imageErrorCreate, setImageErrorCreate] = useState<string | null>(null)

  // Create form state
  const [form, setForm] = useState<Omit<Product, "status"> & { status: Product["status"] }>({
    id: "",
    name: "",
    description: "",
    price: 0,
    image: "",
    limite: 0,
    stock: 0,
    status: "disponible",
  })

  // Edit Modal state
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState<Product>({
    id: "",
    name: "",
    description: "",
    price: 0,
    image: "",
    limite: 0,
    stock: 0,
    status: "disponible",
  })
  const [imageErrorEdit, setImageErrorEdit] = useState<string | null>(null)

  function getImageSrc(src: string) {
    if (!src) return ""
    if (src.startsWith("http://") || src.startsWith("https://")) return src
    if (src.startsWith("/uploads/")) return src
    return src
  }

  async function uploadImage(file: File): Promise<string> {
    const fd = new FormData()
    fd.append("file", file)
    const token = localStorage.getItem("admin_token")
    const res = await fetch(`${API_URL}/uploads`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: fd,
    })
    if (!res.ok) {
      let msg = "No se pudo subir la imagen"
      try {
        const err = await res.json()
        if (typeof err?.error === "string") msg = err.error
      } catch {}
      throw new Error(msg)
    }
    const data = (await res.json()) as { path: string }
    return data.path
  }

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem("admin_token")
      const [resProd, resReserved] = await Promise.all([
        fetch(`${API_URL}/products`, { cache: "no-store" }),
        fetch(`${API_URL}/products/reserved-stock`, {
          cache: "no-store",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        }).catch(() => null)
      ])

      if (!resProd.ok) throw new Error(`HTTP ${resProd.status}`)
      const data: Product[] = await resProd.json()
      setItems(data)

      if (resReserved && resReserved.ok) {
        const reservedData = await resReserved.json()
        setReservedStock(reservedData)
      } else {
        setReservedStock({})
      }
    } catch (e: any) {
      setError(e?.message || "Error al cargar")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const resetCreate = () =>
    setForm({ id: "", name: "", description: "", price: 0, image: "", limite: 0, stock: 0, status: "disponible" })

  async function handleCreate() {
    setError(null)
    try {
      if (!form.id || !form.name || !form.description) throw new Error("Completá id, nombre y descripción")
      const body = {
        id: form.id,
        name: form.name,
        description: form.description,
        price: Number(form.price),
        image: form.image,
        limite: Number(form.limite) || 0,
        stock: Number(form.stock) || 0,
        status: form.status,
      }
      const token = localStorage.getItem("admin_token")
      const res = await fetch(`${API_URL}/products`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error("No se pudo crear el producto")
      resetCreate()
      setCreateOpen(false)
      await load()
    } catch (e: any) {
      setError(e?.message || "Error al crear")
    }
  }

  function startEdit(p: Product) {
    setEditForm({ ...p })
    setImageErrorEdit(null)
    setEditOpen(true)
  }

  async function handleUpdate() {
    setError(null)
    try {
      const body = {
        name: editForm.name,
        description: editForm.description,
        price: Number(editForm.price),
        image: editForm.image,
        limite: Number(editForm.limite) || 0,
        stock: Number(editForm.stock) || 0,
        status: editForm.status,
      }
      const token = localStorage.getItem("admin_token")
      const res = await fetch(`${API_URL}/products/${editForm.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error("No se pudo actualizar")
      setEditOpen(false)
      await load()
    } catch (e: any) {
      setError(e?.message || "Error al actualizar")
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("¿Estás seguro de que querés eliminar este producto? Esta acción no se puede deshacer.")) return
    setError(null)
    try {
      const token = localStorage.getItem("admin_token")
      const res = await fetch(`${API_URL}/products/${id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      if (!res.ok) throw new Error("No se pudo eliminar")
      await load()
    } catch (e: any) {
      setError(e?.message || "Error al eliminar")
    }
  }

  const handleKeyDownCreate = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "TEXTAREA") {
      e.preventDefault()
      handleCreate()
    }
  }

  const handleKeyDownEdit = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "TEXTAREA") {
      e.preventDefault()
      handleUpdate()
    }
  }

  const filteredItems = items.filter((p) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q)
  })

  const exportXlsx = () => {
    if (!filteredItems || filteredItems.length === 0) return
    const rows = filteredItems.map((p) => {
      const res = reservedStock[p.id] || 0
      const disp = p.stock - res
      return {
        ID: p.id,
        Nombre: p.name,
        Descripción: p.description,
        Precio: p.price,
        "Stock Total": p.stock,
        "Stock Reservado": res,
        "Stock Disponible": disp,
        Límite: p.limite === 0 ? "Sin límite" : p.limite,
        Estado: p.status,
      }
    })
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Productos")
    const ts = new Date()
    const pad = (n: number) => String(n).padStart(2, "0")
    const filename = `productos_${ts.getFullYear()}${pad(ts.getMonth() + 1)}${pad(ts.getDate())}_${pad(ts.getHours())}${pad(ts.getMinutes())}.xlsx`
    XLSX.writeFile(wb, filename)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="font-serif text-4xl font-bold text-white">Productos</h1>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-white/40" />
            <Input
              placeholder="Buscar por ID o Nombre..."
              className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-[#AA6F3B]/50 h-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button variant="outline" className="h-10 border-white/10 bg-white/5 text-white hover:bg-white/10 flex items-center gap-2" onClick={exportXlsx} disabled={filteredItems.length === 0}>
            <Download className="w-4 h-4" />
            Exportar Excel
          </Button>

          {/* Create Modal */}
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#AA6F3B] hover:bg-[#AA6F3B]/90 text-white font-semibold h-10 border-0">Nuevo producto</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] bg-[#0f0d0a] border-white/10 text-white" onKeyDown={handleKeyDownCreate}>
              <DialogHeader>
                <DialogTitle className="font-serif text-xl text-[#AA6F3B]">Crear producto</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-white/60">ID</label>
                    <Input className="bg-white/5 border-white/10 text-white focus:border-[#AA6F3B]/50" value={form.id} onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))} required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-white/60">Nombre</label>
                    <Input className="bg-white/5 border-white/10 text-white focus:border-[#AA6F3B]/50" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-white/60">Precio ($)</label>
                    <Input
                      className="bg-white/5 border-white/10 text-white focus:border-[#AA6F3B]/50"
                      type="number"
                      step="0.01"
                      value={form.price}
                      onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-white/60">Límite por compra (0 = sin límite)</label>
                    <Input
                      className="bg-white/5 border-white/10 text-white focus:border-[#AA6F3B]/50"
                      type="number"
                      min={0}
                      value={form.limite}
                      onChange={(e) => setForm((f) => ({ ...f, limite: Math.max(0, Number(e.target.value)) }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-white/60">Stock Total</label>
                    <Input
                      className="bg-white/5 border-white/10 text-white focus:border-[#AA6F3B]/50"
                      type="number"
                      min={0}
                      value={form.stock}
                      onChange={(e) => setForm((f) => ({ ...f, stock: Math.max(0, Number(e.target.value)) }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-white/60">Estado</label>
                    <Select
                      value={form.status}
                      onValueChange={(v) => setForm((f) => ({ ...f, status: v as Product["status"] }))}
                    >
                      <SelectTrigger className="w-full bg-white/5 border-white/10 text-white focus:border-[#AA6F3B]/50">
                        <SelectValue placeholder="Estado" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0b0a07] border-white/10 text-white">
                        <SelectItem value="disponible">Disponible</SelectItem>
                        <SelectItem value="proximamente">Próximamente</SelectItem>
                        <SelectItem value="agotado">Agotado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-sm font-medium text-white/60">Imagen del sistema</label>
                    <input
                      id="create-image-file"
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        try {
                          setImageErrorCreate(null)
                          const path = await uploadImage(file)
                          setForm((f) => ({ ...f, image: path }))
                        } catch (err) {
                          setImageErrorCreate((err as any)?.message || "Error al subir imagen")
                        }
                      }}
                    />
                    <div className="flex items-center gap-4">
                      <Button
                        type="button"
                        variant="outline"
                        className="bg-white/5 border-white/10 hover:bg-white/10 text-white"
                        onClick={() => document.getElementById("create-image-file")?.click()}
                      >
                        Seleccionar imagen
                      </Button>
                      {form.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={getImageSrc(form.image)}
                          alt="preview"
                          className="h-12 w-12 rounded-lg object-cover border border-white/10"
                        />
                      )}
                    </div>
                    <p className="text-xs text-white/40 mt-1">Formatos: JPG, JPEG, PNG, WEBP. Máx 5MB.</p>
                    {imageErrorCreate && <p className="text-xs text-red-400 mt-1">{imageErrorCreate}</p>}
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-sm font-medium text-white/60">Descripción</label>
                    <Textarea
                      rows={3}
                      className="bg-white/5 border-white/10 text-white focus:border-[#AA6F3B]/50 resize-none"
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" className="text-white hover:bg-white/10" onClick={() => setCreateOpen(false)}>Cancelar</Button>
                <Button className="bg-[#AA6F3B] hover:bg-[#AA6F3B]/90 text-white" onClick={handleCreate} disabled={!form.id || !form.name || !form.description || !form.image}>
                  Crear Producto
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit Modal */}
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogContent className="sm:max-w-[600px] bg-[#0f0d0a] border-white/10 text-white" onKeyDown={handleKeyDownEdit}>
              <DialogHeader>
                <DialogTitle className="font-serif text-xl text-[#AA6F3B]">Editar producto: {editForm.id}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-white/60">Nombre</label>
                    <Input className="bg-white/5 border-white/10 text-white focus:border-[#AA6F3B]/50" value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-white/60">Precio ($)</label>
                    <Input
                      className="bg-white/5 border-white/10 text-white focus:border-[#AA6F3B]/50"
                      type="number"
                      step="0.01"
                      value={editForm.price}
                      onChange={(e) => setEditForm((f) => ({ ...f, price: Number(e.target.value) }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-white/60">Límite por compra (0 = sin límite)</label>
                    <Input
                      className="bg-white/5 border-white/10 text-white focus:border-[#AA6F3B]/50"
                      type="number"
                      min={0}
                      value={editForm.limite}
                      onChange={(e) => setEditForm((f) => ({ ...f, limite: Math.max(0, Number(e.target.value)) }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-white/60">Stock Total</label>
                    <Input
                      className="bg-white/5 border-white/10 text-white focus:border-[#AA6F3B]/50"
                      type="number"
                      min={0}
                      value={editForm.stock}
                      onChange={(e) => setEditForm((f) => ({ ...f, stock: Math.max(0, Number(e.target.value)) }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-white/60">Estado</label>
                    <Select
                      value={editForm.status}
                      onValueChange={(v) => setEditForm((f) => ({ ...f, status: v as Product["status"] }))}
                    >
                      <SelectTrigger className="w-full bg-white/5 border-white/10 text-white focus:border-[#AA6F3B]/50">
                        <SelectValue placeholder="Estado" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0b0a07] border-white/10 text-white">
                        <SelectItem value="disponible">Disponible</SelectItem>
                        <SelectItem value="proximamente">Próximamente</SelectItem>
                        <SelectItem value="agotado">Agotado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-sm font-medium text-white/60">Imagen del sistema</label>
                    <input
                      id="edit-image-file"
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        try {
                          setImageErrorEdit(null)
                          const path = await uploadImage(file)
                          setEditForm((f) => ({ ...f, image: path }))
                        } catch (err) {
                          setImageErrorEdit((err as any)?.message || "Error al subir imagen")
                        }
                      }}
                    />
                    <div className="flex items-center gap-4">
                      <Button
                        type="button"
                        variant="outline"
                        className="bg-white/5 border-white/10 hover:bg-white/10 text-white"
                        onClick={() => document.getElementById("edit-image-file")?.click()}
                      >
                        Cambiar imagen
                      </Button>
                      {editForm.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={getImageSrc(editForm.image)}
                          alt="preview"
                          className="h-12 w-12 rounded-lg object-cover border border-white/10"
                        />
                      )}
                    </div>
                    {imageErrorEdit && <p className="text-xs text-red-400 mt-1">{imageErrorEdit}</p>}
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-sm font-medium text-white/60">Descripción</label>
                    <Textarea
                      rows={3}
                      className="bg-white/5 border-white/10 text-white focus:border-[#AA6F3B]/50 resize-none"
                      value={editForm.description}
                      onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" className="text-white hover:bg-white/10" onClick={() => setEditOpen(false)}>Cancelar</Button>
                <Button className="bg-[#AA6F3B] hover:bg-[#AA6F3B]/90 text-white" onClick={handleUpdate} disabled={!editForm.name || !editForm.description || !editForm.image}>
                  Guardar Cambios
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

        </div>
      </div>

      {/* Lista */}
      <div className="rounded-xl border border-white/8 bg-[#0b0a07]/40 shadow-2xl backdrop-blur-sm text-white overflow-hidden p-2">
        <Table className="table-fixed">
          <colgroup>
            <col className="w-[76px]" />
            <col className="w-[140px]" />
            <col className="w-[200px]" />
            <col className="w-[100px]" />
            <col className="w-[300px]" />
            <col className="w-[100px]" />
            <col className="w-[80px]" />
            <col className="w-[180px]" />
          </colgroup>
          <TableHeader className="border-b border-white/8">
            <TableRow className="hover:bg-transparent border-b border-white/8">
              <TableHead className="text-white/60">Imagen</TableHead>
              <TableHead className="text-white/60">ID</TableHead>
              <TableHead className="text-white/60">Nombre</TableHead>
              <TableHead className="text-white/60">Precio</TableHead>
              <TableHead className="text-white/60">Stock (Total / Rsv / Disp)</TableHead>
              <TableHead className="text-white/60">Estado</TableHead>
              <TableHead className="text-white/60">Límite</TableHead>
              <TableHead className="text-white/60 text-right pr-4">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-white/40">Cargando productos...</TableCell>
              </TableRow>
            ) : filteredItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-white/40">
                  {searchQuery ? "No se encontraron productos para tu búsqueda" : "Sin productos"}
                </TableCell>
              </TableRow>
            ) : (
              filteredItems.map((p) => {
                const res = reservedStock[p.id] || 0
                const disp = p.stock - res
                return (
                  <TableRow key={p.id} className="hover:bg-white/5 border-b border-white/5 text-white/90">
                    <TableCell>
                      {p.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={getImageSrc(p.image)} alt="" className="size-12 object-cover rounded-lg border border-white/10" />
                      ) : (
                        <div className="size-12 rounded-lg bg-white/10 border border-white/5 flex items-center justify-center">
                          <Package className="w-5 h-5 text-white/30" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="truncate font-mono text-xs text-white/70" title={p.id}>
                      {p.id}
                    </TableCell>
                    <TableCell className="truncate font-medium" title={p.name}>
                      {p.name}
                    </TableCell>
                    <TableCell>
                      {p.price.toLocaleString("es-AR", { style: "currency", currency: "ARS" })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-white" title="Stock Total">{p.stock}</span>
                        <span className="text-white/30">|</span>
                        <span className="text-[#AA6F3B]" title="Stock Reservado en carritos">{res}</span>
                        <span className="text-white/30">|</span>
                        <span className={disp > 0 ? "text-emerald-400 font-medium" : "text-red-400 font-medium"} title="Stock Disponible para compra">{disp}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${
                        p.status === 'disponible' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        p.status === 'agotado' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                        'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        {p.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      {p.limite === 0 ? <span className="text-white/40 text-xs">Sin límite</span> : p.limite}
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button size="sm" variant="outline" className="h-8 bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white" onClick={() => startEdit(p)}>
                          Editar
                        </Button>
                        <Button size="sm" variant="destructive" className="h-8 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 hover:text-red-300" onClick={() => handleDelete(p.id)}>
                          Eliminar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
        {error && <p className="text-destructive mt-4 text-sm px-4">{error}</p>}
      </div>
    </div>
  )
}
