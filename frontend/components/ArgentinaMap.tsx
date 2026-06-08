"use client"

import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import { geoMercator, geoPath } from "d3-geo"
import { scaleLinear } from "d3-scale"

interface ProvinceData {
  name: string
  value: number
}

interface ArgentinaMapProps {
  data: ProvinceData[]
  colorRange?: [string, string]
  emptyColor?: string
  tooltipLabel?: string
  hoveredFromOutside?: string | null
  onHoverChange?: (name: string | null) => void
}

function normalizeName(name: string): string {
  const n = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
  if (n === "caba" || n.includes("ciudad autonoma") || n.includes("ciudad de buenos aires")) {
    return "ciudad autonoma de buenos aires"
  }
  if (n.includes("tierra del fuego")) return "tierra del fuego"
  return n
}

/**
 * Clips a MultiPolygon by removing sub-polygons whose centroid latitude is below cutoffLat.
 * This removes the Antarctic territory from Tierra del Fuego without touching the rest.
 */
function clipMultiPolygon(coordinates: number[][][][], cutoffLat: number, cutoffLon: number): number[][][][] {
  return coordinates.filter((polygon) => {
    const ring = polygon[0]
    if (!ring || ring.length === 0) return false
    // compute centroid latitude and longitude of the outer ring
    const avgLat = ring.reduce((sum, [, lat]) => sum + lat, 0) / ring.length
    const avgLon = ring.reduce((sum, [lon]) => sum + lon, 0) / ring.length
    return avgLat > cutoffLat && avgLon < cutoffLon
  })
}

/** Pre-process GeoJSON: clip TDF to remove Antarctic sub-polygons and eastern islands */
function cleanFeatures(features: any[]): any[] {
  return features.map((f) => {
    const name = (f.properties?.nombre || "").toLowerCase()
    if (name.includes("tierra del fuego") && f.geometry?.type === "MultiPolygon") {
      // Filter out Antarctica (lat < -58) and South Georgia/Sandwich (lon > -50)
      const clipped = clipMultiPolygon(f.geometry.coordinates, -58, -50)
      return { ...f, geometry: { ...f.geometry, coordinates: clipped } }
    }
    return f
  })
}

export default function ArgentinaMap({
  data,
  colorRange = ["#c8a97a", "#7a3e0f"],
  emptyColor = "#c5bfb5",
  tooltipLabel = "envíos",
  hoveredFromOutside = null,
  onHoverChange,
}: ArgentinaMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const [size, setSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 })
  const [features, setFeatures] = useState<any[]>([])
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null)
  const [internalHovered, setInternalHovered] = useState<string | null>(null)

  // Observe container size so projection always fits
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      if (width > 0 && height > 0) setSize({ w: width, h: height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Load & clean GeoJSON once
  useEffect(() => {
    fetch("/argentina.geojson")
      .then((r) => r.json())
      .then((d) => setFeatures(cleanFeatures(d.features || [])))
      .catch(console.error)
  }, [])

  const maxValue = useMemo(() => Math.max(...data.map((d) => d.value), 1), [data])
  const colorScale = useMemo(
    () => scaleLinear<string>().domain([0, maxValue]).range(colorRange).clamp(true),
    [maxValue, colorRange]
  )

  // Build projection & path generator whenever size or features change
  const { projection, pathGen } = useMemo(() => {
    if (!features.length || size.w === 0 || size.h === 0) return { projection: null, pathGen: null }
    const padding = 12
    
    // Manually compute bounds to avoid D3 winding order bugs where reversed polygons cover the whole globe
    let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180
    features.forEach(f => {
      if (f.geometry?.type === 'Polygon') {
        f.geometry.coordinates[0].forEach(([lon, lat]: number[]) => {
          if (lat < minLat) minLat = lat
          if (lat > maxLat) maxLat = lat
          if (lon < minLon) minLon = lon
          if (lon > maxLon) maxLon = lon
        })
      } else if (f.geometry?.type === 'MultiPolygon') {
        f.geometry.coordinates.forEach((poly: number[][][]) => {
          poly[0].forEach(([lon, lat]: number[]) => {
            if (lat < minLat) minLat = lat
            if (lat > maxLat) maxLat = lat
            if (lon < minLon) minLon = lon
            if (lon > maxLon) maxLon = lon
          })
        })
      }
    })

    const bboxFeature = {
      type: "Feature" as const,
      properties: {},
      geometry: {
        type: "MultiPoint" as const,
        coordinates: [
          [minLon, minLat],
          [maxLon, maxLat]
        ]
      }
    }

    const proj = geoMercator().fitExtent(
      [
        [padding, padding],
        [size.w - padding, size.h - padding],
      ],
      bboxFeature
    )
    return { projection: proj, pathGen: geoPath().projection(proj) }
  }, [features, size.w, size.h])

  const getProvinceData = useCallback(
    (geoName: string) => {
      const norm = normalizeName(geoName)
      return data.find((d) => d.name && normalizeName(d.name) === norm)
    },
    [data]
  )

  const hoveredKey = internalHovered || hoveredFromOutside

  return (
    <div ref={containerRef} className="relative w-full h-full">
      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute z-30 pointer-events-none rounded-xl border border-[#AA6F3B]/40 bg-[#0b0a07]/95 px-3 py-1.5 backdrop-blur-xl shadow-2xl text-white text-xs font-semibold whitespace-nowrap"
          style={{ left: tooltip.x + 12, top: Math.max(tooltip.y - 36, 4) }}
        >
          {tooltip.text}
        </div>
      )}

      {/* Loading skeleton */}
      {(!pathGen || size.w === 0) && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-6 w-6 rounded-full border-2 border-[#AA6F3B] border-t-transparent animate-spin" />
        </div>
      )}

      {/* SVG map — sized to container via width/height attrs */}
      <svg
        ref={svgRef}
        width={size.w || "100%"}
        height={size.h || "100%"}
        style={{ display: "block", width: "100%", height: "100%" }}
      >
        {pathGen &&
          features.map((feature, i) => {
            const rawName: string = feature.properties?.nombre || ""
            const prov = getProvinceData(rawName)
            const value = prov?.value ?? 0
            const baseFill = prov ? colorScale(value) : emptyColor

            const normRaw = normalizeName(rawName)
            const normHov = hoveredKey ? normalizeName(hoveredKey) : null
            const isHovered = normHov !== null && normRaw === normHov

            const pathD = pathGen(feature) || ""

            return (
              <path
                key={i}
                d={pathD}
                fill={isHovered ? "#AA6F3B" : baseFill}
                stroke={isHovered ? "#ffffff" : "#AA6F3B40"}
                strokeWidth={isHovered ? 1.2 : 0.75}
                style={{ cursor: "pointer", transition: "fill 150ms ease" }}
                onMouseEnter={(e) => {
                  const rect = containerRef.current?.getBoundingClientRect()
                  if (rect) {
                    setTooltip({
                      x: e.clientX - rect.left,
                      y: e.clientY - rect.top,
                      text: `${rawName}: ${value.toLocaleString("es-AR")} ${tooltipLabel}`,
                    })
                  }
                  setInternalHovered(rawName)
                  onHoverChange?.(rawName)
                }}
                onMouseMove={(e) => {
                  const rect = containerRef.current?.getBoundingClientRect()
                  if (rect) {
                    setTooltip((prev) =>
                      prev ? { ...prev, x: e.clientX - rect.left, y: e.clientY - rect.top } : null
                    )
                  }
                }}
                onMouseLeave={() => {
                  setTooltip(null)
                  setInternalHovered(null)
                  onHoverChange?.(null)
                }}
              />
            )
          })}
      </svg>
    </div>
  )
}
