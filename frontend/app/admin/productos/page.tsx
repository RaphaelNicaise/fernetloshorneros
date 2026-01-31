"use client"

import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { API_BASE_URL } from "@/lib/api"

type Product = {
  id: string
  name: string
  description: string
  price: number
  image: string
  limite: number // 0 = sin límite
  stock: number // cantidad disponible
  status: "disponible" | "proximamente" | "agotado"
}

const API_URL = API_BASE_URL

export default function AdminProductosPage() {
  const [items, setItems] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  // La creación ahora exige subir archivo compatible (jpg/jpeg/png/webp)
  const [imageErrorCreate, setImageErrorCreate] = useState<string | null>(null)

  // Create form state
  const [form, setForm] = useState<Omit<Product, "status"> & { status: Product["status"] }>(
    {
      id: "",
      name: "",
      description: "",
      price: 0,
      image: "",
      limite: 0,
      stock: 0,
      status: "disponible",
    },
  )

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Omit<Product, "id">>({
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
    return src // rutas de /public del frontend
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
    return data.path // ej: /uploads/xxx.jpg (servible desde API_URL)
  }

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_URL}/products`, { cache: "no-store" })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: Product[] = await res.json()
      setItems(data)
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

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      // Validación mínima en front
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
    setEditingId(p.id)
    setEditForm({ name: p.name, description: p.description, price: p.price, image: p.image, limite: p.limite ?? 0, stock: p.stock ?? 0, status: p.status })
  }

  async function handleUpdate(id: string) {
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
      const res = await fetch(`${API_URL}/products/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error("No se pudo actualizar")
      setEditingId(null)
      await load()
    } catch (e: any) {
      setError(e?.message || "Error al actualizar")
    }
  }

  async function handleDelete(id: string) {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-4xl font-bold text-white">Productos</h1>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-white text-black hover:bg-white/90">Nuevo producto</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear producto</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-muted-foreground">ID</label>
                  <Input value={form.id} onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))} required />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Nombre</label>
                  <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Precio</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.price}
                    onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Límite (0 = sin límite)</label>
                  <Input
                    type="number"
                    min={0}
                    value={form.limite}
                    onChange={(e) => setForm((f) => ({ ...f, limite: Math.max(0, Number(e.target.value)) }))}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Stock</label>
                  <Input
                    type="number"
                    min={0}
                    value={form.stock}
                    onChange={(e) => setForm((f) => ({ ...f, stock: Math.max(0, Number(e.target.value)) }))}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Imagen del sistema</label>
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
                  <div className="mt-2 flex items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById("create-image-file")?.click()}
                    >
                      Seleccionar imagen
                    </Button>
                    {form.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={getImageSrc(form.image)}
                        alt="preview"
                        className="h-16 w-16 rounded object-cover border"
                      />
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">Formatos: JPG, JPEG, PNG, WEBP. Máx 5MB.</p>
                  {imageErrorCreate && (
                    <p className="mt-1 text-xs text-destructive">{imageErrorCreate}</p>
                  )}
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm text-muted-foreground">Descripción</label>
                  <Textarea
                    rows={3}
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Estado</label>
                  <div className="mt-1">
                    <Select
                      value={form.status}
                      onValueChange={(v) => setForm((f) => ({ ...f, status: v as Product["status"] }))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Estado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="disponible">disponible</SelectItem>
                        <SelectItem value="proximamente">proximamente</SelectItem>
                        <SelectItem value="agotado">agotado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={!form.id || !form.name || !form.description || !form.image}>
                  Crear
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista */}
      <div className="rounded-lg border bg-white p-2">
        <Table className="table-fixed">
          <colgroup>
            <col className="w-[76px]" />
            <col className="w-[140px]" />
            <col />
            <col className="w-[280px]" />
            <col className="w-[100px]" />
            <col className="w-[100px]" />
            <col className="w-[80px]" />
            <col className="w-[80px]" />
            <col className="w-[220px]" />
          </colgroup>
          <TableHeader>
            <TableRow>
              <TableHead>Imagen</TableHead>
              <TableHead>ID</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Precio</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Límite</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9}>Cargando…</TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9}>Sin productos</TableCell>
              </TableRow>
            ) : (
              items.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    {p.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={getImageSrc(p.image)} alt="" className="size-12 object-cover rounded" />
                    ) : (
                      <div className="size-12 rounded bg-muted" />
                    )}
                  </TableCell>
                  <TableCell className="truncate" title={p.id}>
                    {p.id}
                  </TableCell>
                  <TableCell className="truncate" title={p.name}>
                    {editingId === p.id ? (
                      <Input
                        value={editForm.name}
                        onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                      />
                    ) : (
                      p.name
                    )}
                  </TableCell>
                  <TableCell className="truncate" title={p.description}>
                    {editingId === p.id ? (
                      <Textarea
                        rows={2}
                        value={editForm.description}
                        onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                      />
                    ) : (
                      <div className="truncate">{p.description}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === p.id ? (
                      <Input
                        type="number"
                        step="0.01"
                        value={editForm.price}
                        onChange={(e) => setEditForm((f) => ({ ...f, price: Number(e.target.value) }))}
                      />
                    ) : (
                      p.price.toLocaleString("es-AR", { style: "currency", currency: "ARS" })
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === p.id ? (
                      <Select
                        value={editForm.status}
                        onValueChange={(v) => setEditForm((f) => ({ ...f, status: v as Product["status"] }))}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="disponible">disponible</SelectItem>
                          <SelectItem value="proximamente">proximamente</SelectItem>
                          <SelectItem value="agotado">agotado</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      p.status
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === p.id ? (
                      <Input
                        type="number"
                        min={0}
                        value={editForm.stock}
                        onChange={(e) => setEditForm((f) => ({ ...f, stock: Math.max(0, Number(e.target.value)) }))}
                      />
                    ) : (
                      (p.stock ?? 0)
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === p.id ? (
                      <Input
                        type="number"
                        min={0}
                        value={editForm.limite}
                        onChange={(e) => setEditForm((f) => ({ ...f, limite: Math.max(0, Number(e.target.value)) }))}
                      />
                    ) : (
                      (p.limite ?? 0)
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === p.id ? (
                      <div className="flex gap-2">
                        <input
                          id={`file-${p.id}`}
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
                        <Button size="sm" variant="outline" onClick={() => document.getElementById(`file-${p.id}`)?.click()}>
                          Subir imagen
                        </Button>
                        <Button size="sm" onClick={() => handleUpdate(p.id)}>
                          Guardar
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                          Cancelar
                        </Button>
                        {imageErrorEdit && (
                          <p className="mt-1 text-xs text-destructive">{imageErrorEdit}</p>
                        )}
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => startEdit(p)}>
                          Editar
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(p.id)}>
                          Eliminar
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {error && <p className="text-destructive mt-2 text-sm">{error}</p>}
      </div>
    </div>
  )
}
