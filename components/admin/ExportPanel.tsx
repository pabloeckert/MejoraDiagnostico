'use client'
import { useState } from 'react'
import * as XLSX from 'xlsx'
import { COLUMNAS_EXPORT, COLUMNAS_EXPORT_DEFAULT } from '@/lib/admin'
import type { SessionRow } from '@/lib/admin'

type Formato = 'xlsx' | 'csv'

export default function ExportPanel({ filas }: { filas: SessionRow[] }) {
  const [columnas, setColumnas] = useState<Set<string>>(new Set(COLUMNAS_EXPORT_DEFAULT))
  const [formato, setFormato] = useState<Formato>('xlsx')

  const toggleColumna = (key: string) => {
    setColumnas((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const exportar = () => {
    const cols = COLUMNAS_EXPORT.filter((c) => columnas.has(c.key))
    if (!cols.length || !filas.length) return

    const datos = filas.map((s) => {
      const fila: Record<string, string> = {}
      cols.forEach((c) => { fila[c.label] = c.get(s) })
      return fila
    })

    const ws = XLSX.utils.json_to_sheet(datos)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Sesiones')

    const fecha = new Date().toISOString().slice(0, 10)
    const nombreArchivo = `diagnostico-sesiones-${fecha}.${formato}`
    XLSX.writeFile(wb, nombreArchivo, { bookType: formato })
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <p className="text-sm font-bold text-mc-negro mb-4">Exportar sesiones</p>

      <div className="space-y-4">
        <div>
          <p className="text-xs font-semibold text-mc-gris uppercase mb-2">Columnas a exportar</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {COLUMNAS_EXPORT.map((c) => (
              <label key={c.key} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={columnas.has(c.key)}
                  onChange={() => toggleColumna(c.key)}
                />
                {c.label}
              </label>
            ))}
          </div>
        </div>

        <div className="flex items-end gap-4">
          <div>
            <p className="text-xs font-semibold text-mc-gris uppercase mb-1">Formato</p>
            <select
              value={formato}
              onChange={(e) => setFormato(e.target.value as Formato)}
              className="border border-gray-300 rounded px-3 py-2 text-sm"
            >
              <option value="xlsx">XLSX</option>
              <option value="csv">CSV</option>
            </select>
          </div>

          <button
            onClick={exportar}
            disabled={!filas.length}
            className="bg-mc-azul text-white font-bold px-5 py-2 rounded disabled:opacity-40"
          >
            Exportar ({filas.length})
          </button>
        </div>
      </div>
    </div>
  )
}
