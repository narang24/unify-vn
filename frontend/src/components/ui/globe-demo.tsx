"use client";
import { World, GlobeConfig } from "@/components/ui/globe";

const globeConfig: GlobeConfig = {
  pointSize: 1,
  globeColor: "#050b14",
  showAtmosphere: true,
  atmosphereColor: "#4da6ff",
  atmosphereAltitude: 0.15,
  emissive: "#062056",
  emissiveIntensity: 0.2,
  shininess: 0.9,
  polygonColor: "rgba(255,255,255,0.7)",
  ambientLight: "#ffffff",
  directionalLeftLight: "#ffffff",
  directionalTopLight: "#ffffff",
  pointLight: "#ffffff",
  arcTime: 1500,
  arcLength: 0.8,
  rings: 2,
  maxRings: 3,
  initialPosition: { lat: 20, lng: 0 },
  autoRotate: true,
  autoRotateSpeed: 0.5,
};

const colors = ["#06b6d4", "#3b82f6", "#6366f1"];

// Sample arcs data connecting random points around the world
const sampleArcs = Array.from({ length: 15 }).map((_, i) => ({
  order: i,
  startLat: (Math.random() - 0.5) * 180,
  startLng: (Math.random() - 0.5) * 360,
  endLat: (Math.random() - 0.5) * 180,
  endLng: (Math.random() - 0.5) * 360,
  arcAlt: Math.random() * 0.4 + 0.1,
  color: colors[Math.floor(Math.random() * colors.length)],
}));

export function Globe3DDemo() {
  return (
    <div className="w-full h-full max-w-[800px] max-h-[800px] mx-auto flex items-center justify-center">
      <World globeConfig={globeConfig} data={sampleArcs} />
    </div>
  );
}
