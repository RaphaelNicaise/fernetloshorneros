"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { geoMercator, geoPath } from "d3-geo"
import { scaleLinear } from "d3-scale"

interface ProvinceData {
  name: string      // lowercase
  value: number
}

interface ArgentinaMapProps {
  data: ProvinceData[]
  colorRange?: [string, string]
  emptyColor?: string
  tooltipLabel?: string
  hoveredFromOutside?: string | null   // lowercase province name to highlight from list
  onHoverChange?: (name: string | null) => void // notifies parent
  width?: number
  height?: number
}

export default function ArgentinaMap({
  data,
  colorRange = ["#c8a97a", "#7a3e0f"],
  emptyColor = "#d1c9ba",
  tooltipLabel = "envíos",
  hoveredFromOutside = null,
  onHoverChange,
  width = 280,
  height = 520,
}: ArgentinaMapProps) {
  const [geoData, setGeoData] = useState<any>(null)
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null)
  const [internalHovered, setInternalHovered] = useState<string | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    fetch("/argentina.geojson")
      .then((r) => r.json())
      .then((d) => setGeoData(d))
      .catch(console.error)
  }, [])

  const maxValue = useMemo(() => Math.max(...data.map((d) => d.value), 1), [data])
  const colorScale = useMemo(
    () => scaleLinear<string>().domain([0, maxValue]).range(colorRange),
    [maxValue, colorRange]
  )

  const { features, projection, pathGen } = useMemo(() => {
    if (!geoData) return { features: [], projection: null, pathGen: null }

    // Filter out Antarctic territory which destroys the bounding box
    const filtered = geoData.features.filter((f: any) => {
      const name = (f.properties?.nombre || "").toLowerCase()
      return !name.includes("antártida") && !name.includes("antartida") && !name.includes("sector antártico")
    })

    const fc = { type: "FeatureCollection" as const, features: filtered }
    const proj = geoMercator().fitSize([width, height], fc)
    const pg = geoPath().projection(proj)

    return { features: filtered, projection: proj, pathGen: pg }
  }, [geoData, width, height])

  const normalizeProvinceName = (name: string) => {
    let n = name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()

    if (n === "caba" || n.includes("ciudad autonoma")) {
      return "ciudad autonoma de buenos aires"
    }
    if (n.includes("tierra del fuego")) {
      return "tierra del fuego, antartida e islas del atlantico sur"
    }
    return n
  }

  const getColor = (featureName: string) => {
    const featNorm = normalizeProvinceName(featureName)
    const d = data.find(
      (s) => s.name && normalizeProvinceName(s.name) === featNorm
    )
    return { color: d ? colorScale(d.value) : emptyColor, value: d?.value ?? 0 }
  }

  const hoveredKey = internalHovered || hoveredFromOutside

  return (
    <div className="relative w-full h-full">
      {tooltip && (
        <div
          className="absolute z-30 pointer-events-none rounded-xl border border-[#AA6F3B]/40 bg-[#0b0a07]/95 px-4 py-2 backdrop-blur-xl shadow-2xl text-white text-xs font-semibold"
          style={{ left: tooltip.x + 10, top: tooltip.y - 30 }}
        >
          {tooltip.text}
        </div>
      )}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-full"
        style={{ display: "block" }}
      >
        {features.map((feature: any, i: number) => {
          const rawName = feature.properties?.nombre || ""
          const featNorm = normalizeProvinceName(rawName)
          const { color, value } = getColor(rawName)
          
          const hoveredNorm = hoveredKey ? normalizeProvinceName(hoveredKey) : null
          const isHovered = hoveredNorm && featNorm === hoveredNorm

          return (
            <path
              key={i}
              d={pathGen!(feature) || ""}
              fill={isHovered ? "#AA6F3B" : color}
              stroke="white"
              strokeWidth={isHovered ? 1.2 : 0.6}
              style={{ cursor: "pointer", transition: "fill 150ms ease" }}
              onMouseEnter={(e) => {
                const svgRect = svgRef.current?.getBoundingClientRect()
                if (svgRect) {
                  setTooltip({
                    x: e.clientX - svgRect.left,
                    y: e.clientY - svgRect.top,
                    text: `${feature.properties.nombre}: ${value} ${tooltipLabel}`,
                  })
                }
                setInternalHovered(rawName)
                onHoverChange?.(rawName)
              }}
              onMouseMove={(e) => {
                const svgRect = svgRef.current?.getBoundingClientRect()
                if (svgRect) {
                  setTooltip((prev) =>
                    prev ? { ...prev, x: e.clientX - svgRect.left, y: e.clientY - svgRect.top } : null
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
