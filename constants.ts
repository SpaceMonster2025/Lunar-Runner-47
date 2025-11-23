import { Faction, Location, LocationType, ShipStats, SCREEN_WIDTH, SCREEN_HEIGHT } from './types';

const CENTER_X = SCREEN_WIDTH / 2;
const CENTER_Y = SCREEN_HEIGHT / 2;

// "Ghost Processional" - Kevin MacLeod (Odd, Theremin-esque, Spooky/Quirky)
export const MUSIC_TRACK_URL = "https://upload.wikimedia.org/wikipedia/commons/c/c4/Ghost_Processional_-_Kevin_MacLeod.ogg";

export const INITIAL_SHIP_STATS: ShipStats = {
  speed: 1.5,
  fuelEfficiency: 1.0,
  maxFuel: 500,
  maxHull: 100,
  cargoCapacity: 10
};

export const LOCATIONS: Location[] = [
  // Stations (Hubs) - Inner Orbit (Radius ~100-140)
  {
    id: 'station-x33',
    name: 'X-33 Liberty',
    type: LocationType.STATION,
    faction: Faction.X33,
    coords: { x: 0, y: 0 }, // Calculated at runtime
    description: "Military surplus aesthetic. Clean, strict, expensive fuel.",
    color: "#3b82f6", // Blue-500
    fuelPrice: 1.2,
    orbitRadius: 100,
    orbitSpeed: 0.2, // Fast
    initialAngle: 0
  },
  {
    id: 'station-x63',
    name: 'X-63 Bazaar',
    type: LocationType.STATION,
    faction: Faction.X63,
    coords: { x: 0, y: 0 },
    description: "Neon-lit marketplace. Risky deals, average fuel prices.",
    color: "#d946ef", // Fuchsia-500
    fuelPrice: 0.9,
    orbitRadius: 130,
    orbitSpeed: 0.15,
    initialAngle: 120
  },
  {
    id: 'station-x99',
    name: 'X-99 Fringe',
    type: LocationType.STATION,
    faction: Faction.X99,
    coords: { x: 0, y: 0 },
    description: "Smoky, dim lights. Cheap dirty fuel, high repair costs.",
    color: "#f97316", // Orange-500
    fuelPrice: 0.6,
    orbitRadius: 115,
    orbitSpeed: 0.18,
    initialAngle: 240
  },
  
  // Moons (Destinations) - Outer Orbits (Radius ~200-300)
  {
    id: 'moon-liberty1',
    name: 'New Kansas',
    type: LocationType.MOON,
    faction: Faction.X33,
    coords: { x: 0, y: 0 },
    description: "Terraformed agricultural dome.",
    color: "#22c55e", // Green-500
    orbitRadius: 220,
    orbitSpeed: 0.08,
    initialAngle: 45
  },
  {
    id: 'moon-atlas7',
    name: 'Atlas-7',
    type: LocationType.MOON,
    faction: Faction.X63,
    coords: { x: 0, y: 0 },
    description: "Corporate mining facility.",
    color: "#94a3b8", // Slate-400
    orbitRadius: 260,
    orbitSpeed: 0.06,
    initialAngle: 180
  },
  {
    id: 'moon-bloodrust',
    name: 'Blood Rust',
    type: LocationType.MOON,
    faction: Faction.X99,
    coords: { x: 0, y: 0 },
    description: "Pirate haven in the red dust.",
    color: "#ef4444", // Red-500
    orbitRadius: 290,
    orbitSpeed: 0.05,
    initialAngle: 300
  },
  {
    id: 'moon-cryo9',
    name: 'Cryo-9',
    type: LocationType.MOON,
    faction: Faction.X33,
    coords: { x: 0, y: 0 },
    description: "Ice harvesting plant.",
    color: "#06b6d4", // Cyan-500
    orbitRadius: 240,
    orbitSpeed: 0.07,
    initialAngle: 90
  },
  {
    id: 'moon-glimmer',
    name: 'Glimmer',
    type: LocationType.MOON,
    faction: Faction.NEUTRAL,
    coords: { x: 0, y: 0 },
    description: "Luxury resort for the elite.",
    color: "#eab308", // Yellow-500
    orbitRadius: 310,
    orbitSpeed: 0.04,
    initialAngle: 0
  }
];

export const CONTRACT_TEMPLATES = [
  { title: "Diplomatic Envoy", basePay: 400, desc: "Transport VIPs silently." },
  { title: "Mining Equipment", basePay: 250, desc: "Heavy machinery, watch fuel." },
  { title: "Perishable Food", basePay: 300, desc: "Rush delivery required." },
  { title: "Unmarked Crates", basePay: 600, desc: "Don't ask questions.", risk: 'HIGH' },
  { title: "Refugee Transport", basePay: 150, desc: "Low pay, moral boost." },
  { title: "Spare Parts", basePay: 200, desc: "Routine maintenance run." },
];