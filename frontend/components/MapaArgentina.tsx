"use client";

import React from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker
} from "react-simple-maps";

// URL de GeoJSON de Argentina (país entero). Reemplazado por una fuente pública funcionando.
const geoUrl: string =
  "https://raw.githubusercontent.com/johan/world.geo.json/master/countries/ARG.geo.json";

// Coordenadas de Bahía Blanca [LON, LAT] (formato decimal)
const bahiaBlancaCoords: [number, number] = [-62.2666, -37.8333];

// Estilos para las geografías (Provincias de Argentina)
// Definimos el tipo para TypeScript
const geographyStyle: React.CSSProperties = {
  fill: "#333333", // Relleno gris oscuro/negro
  stroke: "#FFFFFF", // Bordes de provincias en blanco
  strokeWidth: 0.5,
  outline: "none"
};

const MapArgentina: React.FC = () => {
  const [hovered, setHovered] = React.useState<boolean>(false)

  // contenedor exterior: layout, sin borde (sin "líneas")
  const outerStyle: React.CSSProperties = {
    backgroundColor: "#FFFFFF",
    width: "100%",
    height: 480,
    overflow: "hidden",
    display: "flex",
    alignItems: "stretch",
    justifyContent: "center",
  }

  // wrapper interior que recibirá el hover y la animación (solo al pasar por encima del mapa)
  const innerStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    transition: "transform 200ms ease, box-shadow 200ms ease",
    transform: hovered ? "translateY(-6px) scale(1.01)" : "none",
    boxShadow: hovered ? "0 12px 30px rgba(0,0,0,0.12)" : "none",
    cursor: "pointer",
  }

  return (
    // Contenedor sin bordes para eliminar las "líneas" alrededor
    <div style={outerStyle}>
      <div
        style={innerStyle}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        role="button"
        aria-label="Mapa de ubicación"
      >
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{
          // Zoom más alejado para que se vea todo el país
          center: [-64, -38],
          scale: 620
        }}
        style={{ width: "100%", height: "100%" }}
      >
        <Geographies geography={geoUrl}>
          {({ geographies }: { geographies: any[] }) =>
            geographies.map((geo: any) => (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                style={{
                  default: geographyStyle,
                  hover: geographyStyle,   // Mantenemos el mismo estilo al pasar el mouse
                  pressed: geographyStyle  // Mantenemos el mismo estilo al presionar
                }}
              />
            ))
          }
        </Geographies>

        {/* Marcador de Bahía Blanca: solo emoji más grande */}
        <Marker coordinates={bahiaBlancaCoords}>
          <text
            y={0}
            fontSize={44}
            alignmentBaseline="middle"
            textAnchor="middle"
            style={{ pointerEvents: "none", transform: "translateY(-6px)" }}
          >
            📍
          </text>
        </Marker>
        </ComposableMap>
      </div>
    </div>
  );
};

export default MapArgentina;