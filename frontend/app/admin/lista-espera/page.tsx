"use client"

import { useMemo, useState, useRef } from "react"
import { useWaitlist, type WaitlistUser } from "@/hooks/use-waitlist"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import * as XLSX from "xlsx"
import { API_BASE_URL } from "@/lib/api"

type SortKey = keyof Pick<WaitlistUser, "id" | "nombre" | "email" | "provincia" | "fecha_registro">

const PAGE_SIZE = 15

export default function AdminListaEsperaPage() {
  const { data, loading, error, refetch } = useWaitlist()
  const [page, setPage] = useState(1)
  const [sortKey, setSortKey] = useState<SortKey>("fecha_registro")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  const [query, setQuery] = useState("")
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const sorted = useMemo(() => {
    if (!data) return [] as WaitlistUser[]
    const copy = [...data]
    copy.sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      let res = 0
      if (sortKey === "id") res = (av as number) - (bv as number)
      else if (sortKey === "fecha_registro") res = new Date(av as string).getTime() - new Date(bv as string).getTime()
      else res = String(av).localeCompare(String(bv))
      return sortDir === "asc" ? res : -res
    })
    return copy
  }, [data, sortKey, sortDir])

  const originalTotal = sorted.length
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return sorted
    return sorted.filter((u) => {
      const idMatch = String(u.id).includes(q)
      const nombreMatch = (u.nombre ?? "").toLowerCase().includes(q)
      const emailMatch = (u.email ?? "").toLowerCase().includes(q)
      const provinciaMatch = (u.provincia ?? "").toLowerCase().includes(q)
      const fechaStr = new Date(u.fecha_registro).toLocaleString().toLowerCase()
      const fechaMatch = fechaStr.includes(q)
      return idMatch || nombreMatch || emailMatch || provinciaMatch || fechaMatch
    })
  }, [sorted, query])
  const total = filtered.length
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const current = Math.min(page, pages)
  const start = (current - 1) * PAGE_SIZE
  const visible = filtered.slice(start, start + PAGE_SIZE)

  const changeSort = (key: SortKey) => {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    else {
      setSortKey(key)
      setSortDir("asc")
    }
    setPage(1)
  }

  const exportXlsx = () => {
    if (!sorted || sorted.length === 0) return
    // Preparar datos con headers amigables
    const rows = sorted.map((u) => ({
      ID: u.id,
      Nombre: u.nombre,
      Email: u.email,
      Provincia: u.provincia,
      "Fecha registro": new Date(u.fecha_registro).toLocaleString(),
    }))
    const ws = XLSX.utils.json_to_sheet(rows, {
      header: ["ID", "Nombre", "Email", "Provincia", "Fecha registro"],
    })
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Lista de espera")
    const ts = new Date()
    const pad = (n: number) => String(n).padStart(2, "0")
    const filename = `lista_espera_${ts.getFullYear()}${pad(ts.getMonth() + 1)}${pad(ts.getDate())}_${pad(ts.getHours())}${pad(ts.getMinutes())}${pad(ts.getSeconds())}.xlsx`
    XLSX.writeFile(wb, filename)
  }

  function parseCsv(text: string) {
    // Espera headers: id,nombre,email,provincia,fecha_registro
    const lines = text.split(/\r?\n/).filter(l => l.trim().length)
    if (lines.length === 0) return [] as any[]
    const header = lines[0].split(',').map(h => h.trim().toLowerCase())
    const idx = {
      id: header.indexOf('id'),
      nombre: header.indexOf('nombre'),
      email: header.indexOf('email'),
      provincia: header.indexOf('provincia'),
      fecha_registro: header.indexOf('fecha_registro'),
    }
    const rows: any[] = []
    for (let i = 1; i < lines.length; i++) {
      const raw = lines[i]
      if (!raw) continue
      const cols = raw.split(',')
      // tolerancia básica: si trae más comas por provincia con coma, se unirá.
      const get = (pos: number) => pos >= 0 && pos < cols.length ? cols[pos].trim() : ''
      const id = get(idx.id)
      const nombre = get(idx.nombre)
      const email = get(idx.email)
      const provincia = get(idx.provincia)
      const fecha = get(idx.fecha_registro)
      if (!email) continue
      rows.push({
        id: id ? Number(id) : undefined,
        nombre,
        email,
        provincia,
        fecha_registro: fecha || undefined,
      })
    }
    return rows
  }

  async function handleImport(file: File) {
    try {
      setImportMsg(null)
      setImporting(true)
      const text = await file.text()
      const rows = parseCsv(text)
      const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null
      const res = await fetch(`${API_BASE_URL}/waitlist/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ rows }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({} as any))
        throw new Error(body?.error || `Error ${res.status}`)
      }
      const result = await res.json()
      setImportMsg(`Importados: ${result.inserted} | Duplicados: ${result.duplicates} | Inválidos: ${result.invalid}`)
      await refetch()
    } catch (e: any) {
      setImportMsg(e?.message || 'Error al importar')
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-3xl font-bold text-white">
          Lista de espera {(!loading && !error) ? <span className="text-white/70 text-2xl ml-2">({originalTotal})</span> : null}
        </h2>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Buscar..."
            className="w-64 text-white placeholder:text-white/70 border-white"
            value={query}
            onChange={(e) => { setPage(1); setQuery(e.target.value) }}
          />
          <Button variant="outline" onClick={refetch}>Recargar</Button>
          <Button variant="outline" onClick={exportXlsx} disabled={!data || data.length === 0}>Exportar a Excel</Button>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              id="import-waitlist-input"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleImport(f)
              }}
              disabled={importing}
            />
            <Button
              variant="outline"
              onClick={() => document.getElementById('import-waitlist-input')?.click()}
              disabled={importing}
            >
              {importing ? 'Importando...' : 'Importar CSV'}
            </Button>
          </div>
        </div>
      </div>

      {importMsg && (
        <div className="text-sm text-white/90">
          {importMsg}
        </div>
      )}

      {loading && <div className="text-text">Cargando...</div>}
      {error && <div className="text-red-400">{error}</div>}

      {!loading && !error && (
        <>
          {/* Contenedor blanco para la tabla */}
          <div className="rounded-lg border border-gray-200 bg-white text-black shadow-sm dark:bg-white dark:text-black">
          <Table className="table-fixed w-full">
            <colgroup>
              <col style={{ width: "64px" }} />
              <col style={{ width: "260px" }} />
              <col style={{ width: "420px" }} />
              <col style={{ width: "220px" }} />
              <col style={{ width: "200px" }} />
            </colgroup>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer whitespace-nowrap" onClick={() => changeSort("id")}>ID {sortKey === "id" ? (sortDir === "asc" ? "▲" : "▼") : null}</TableHead>
                <TableHead className="cursor-pointer whitespace-nowrap" onClick={() => changeSort("nombre")}>Nombre {sortKey === "nombre" ? (sortDir === "asc" ? "▲" : "▼") : null}</TableHead>
                <TableHead className="cursor-pointer whitespace-nowrap" onClick={() => changeSort("email")}>Email {sortKey === "email" ? (sortDir === "asc" ? "▲" : "▼") : null}</TableHead>
                <TableHead className="cursor-pointer whitespace-nowrap" onClick={() => changeSort("provincia")}>Provincia {sortKey === "provincia" ? (sortDir === "asc" ? "▲" : "▼") : null}</TableHead>
                <TableHead className="cursor-pointer whitespace-nowrap" onClick={() => changeSort("fecha_registro")}>Fecha registro {sortKey === "fecha_registro" ? (sortDir === "asc" ? "▲" : "▼") : null}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>{u.id}</TableCell>
                  <TableCell className="text-black truncate" title={u.nombre}>{u.nombre}</TableCell>
                  <TableCell className="text-black truncate" title={u.email}>{u.email}</TableCell>
                  <TableCell className="text-black truncate" title={u.provincia}>{u.provincia}</TableCell>
                  <TableCell className="text-black whitespace-nowrap">{new Date(u.fecha_registro).toLocaleString()}</TableCell>
                </TableRow>
              ))}
              {visible.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-text py-6">Sin resultados</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </div>

          {/* Paginación 25 por página */}
          <div className="flex items-center justify-between text-text mt-2">
            <div>
              Mostrando {visible.length > 0 ? start + 1 : 0}–{Math.min(start + PAGE_SIZE, total)} de {total}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" disabled={current === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                Anterior
              </Button>
              <span>Página {current} / {pages}</span>
              <Button variant="outline" disabled={current === pages} onClick={() => setPage((p) => Math.min(pages, p + 1))}>
                Siguiente
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
