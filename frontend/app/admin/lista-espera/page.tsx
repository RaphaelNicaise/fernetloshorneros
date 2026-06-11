"use client"

import { useMemo, useState } from "react"
import { useWaitlist, type WaitlistUser } from "@/hooks/use-waitlist"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Download } from "lucide-react"
import * as XLSX from "xlsx"

type SortKey = keyof Pick<WaitlistUser, "id" | "nombre" | "email" | "provincia" | "fecha_registro">

const PAGE_SIZE = 50

export default function AdminListaEsperaPage() {
  const { data, loading, error, refetch } = useWaitlist()
  const [page, setPage] = useState(1)
  const [sortKey, setSortKey] = useState<SortKey>("fecha_registro")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  const [query, setQuery] = useState("")
  // Se eliminó la importación de CSV y estados relacionados

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

  // Funciones de importación CSV eliminadas

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="font-serif text-3xl font-bold text-white">
          Lista de espera {(!loading && !error) ? <span className="text-white/70 text-2xl ml-2">({originalTotal})</span> : null}
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-white/40" />
            <Input
              placeholder="Buscar por ID, Nombre, Email..."
              className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-[#AA6F3B]/50 h-10"
              value={query}
              onChange={(e) => { setPage(1); setQuery(e.target.value) }}
            />
          </div>
          <Button variant="outline" className="h-10 border-white/10 bg-white/5 text-white hover:bg-white/10 flex items-center gap-2" onClick={exportXlsx} disabled={!data || data.length === 0}>
            <Download className="w-4 h-4" />
            Exportar Excel
          </Button>
          <Button variant="secondary" className="h-10 bg-[#AA6F3B]/20 text-[#AA6F3B] hover:bg-[#AA6F3B]/30 border border-[#AA6F3B]/30" onClick={refetch}>Recargar</Button>
        </div>
      </div>
      {/* Mensajes de importación eliminados */}
 
      {loading && <div className="text-white/40">Cargando...</div>}
      {error && <div className="text-red-400">{error}</div>}
 
      {!loading && !error && (
        <>
          {/* Contenedor blanco para la tabla */}
          <div className="rounded-xl border border-white/8 bg-[#0b0a07]/40 shadow-2xl backdrop-blur-sm text-white overflow-hidden">
          <Table className="table-fixed w-full">
            <colgroup>
              <col style={{ width: "64px" }} />
              <col style={{ width: "260px" }} />
              <col style={{ width: "420px" }} />
              <col style={{ width: "220px" }} />
              <col style={{ width: "200px" }} />
            </colgroup>
            <TableHeader className="border-b border-white/8">
              <TableRow className="hover:bg-transparent border-b border-white/8">
                <TableHead className="cursor-pointer whitespace-nowrap text-white/60 hover:text-white" onClick={() => changeSort("id")}>ID {sortKey === "id" ? (sortDir === "asc" ? "▲" : "▼") : null}</TableHead>
                <TableHead className="cursor-pointer whitespace-nowrap text-white/60 hover:text-white" onClick={() => changeSort("nombre")}>Nombre {sortKey === "nombre" ? (sortDir === "asc" ? "▲" : "▼") : null}</TableHead>
                <TableHead className="cursor-pointer whitespace-nowrap text-white/60 hover:text-white" onClick={() => changeSort("email")}>Email {sortKey === "email" ? (sortDir === "asc" ? "▲" : "▼") : null}</TableHead>
                <TableHead className="cursor-pointer whitespace-nowrap text-white/60 hover:text-white" onClick={() => changeSort("provincia")}>Provincia {sortKey === "provincia" ? (sortDir === "asc" ? "▲" : "▼") : null}</TableHead>
                <TableHead className="cursor-pointer whitespace-nowrap text-white/60 hover:text-white" onClick={() => changeSort("fecha_registro")}>Fecha registro {sortKey === "fecha_registro" ? (sortDir === "asc" ? "▲" : "▼") : null}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((u) => (
                <TableRow key={u.id} className="hover:bg-white/5 border-b border-white/5 text-white/90">
                  <TableCell className="font-semibold text-white">{u.id}</TableCell>
                  <TableCell className="truncate text-white/85" title={u.nombre}>{u.nombre}</TableCell>
                  <TableCell className="truncate text-white/85" title={u.email}>{u.email}</TableCell>
                  <TableCell className="truncate text-white/85" title={u.provincia}>{u.provincia}</TableCell>
                  <TableCell className="whitespace-nowrap text-white/85">{new Date(u.fecha_registro).toLocaleString()}</TableCell>
                </TableRow>
              ))}
              {visible.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-white/40 py-6">Sin resultados</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </div>
 
          {/* Paginación 50 por página */}
          <div className="flex items-center justify-between text-white mt-2">
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
