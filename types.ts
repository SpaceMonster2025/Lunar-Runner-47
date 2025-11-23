export enum Faction {
  X33 = "X-33 Liberty Bell",
  X63 = "X-63 The Bazaar",
  X99 = "X-99 The Fringe",
  NEUTRAL = "Neutral"
}

export enum LocationType {
  STATION = "Station",
  MOON = "Moon",
  PLANET = "Planet"
}

export interface Coordinates {
  x: number;
  y: number;
}

export interface Location {
  id: string;
  name: string;
  type: LocationType;
  faction: Faction;
  coords: Coordinates;
  description: string;
  fuelPrice?: number; // Only stations sell fuel
  // Orbital Mechanics
  orbitRadius?: number;
  orbitSpeed?: number; // degrees per tick
  initialAngle?: number; // degrees
}

export interface Contract {
  id: string;
  title: string;
  description: string;
  destinationId: string;
  pay: number;
  // Dynamic values calculated at runtime, kept here for initial reference if needed
  baseDistance?: number; 
  deadline?: number; 
  riskLevel: 'LOW' | 'MED' | 'HIGH';
  faction: Faction;
}

export interface ShipStats {
  speed: number;
  fuelEfficiency: number; // Lower is better
  maxFuel: number;
  maxHull: number;
  cargoCapacity: number;
}

export interface GameState {
  credits: number;
  fuel: number;
  hull: number;
  currentLocationId: string;
  reputation: Record<Faction, number>;
  ship: ShipStats;
  day: number;
  gameTime: number; // Global ticker for orbits
  isFlying: boolean;
  flightProgress: number; // 0 to 1 (Approximate for flight bar)
  flightOriginId: string | null;
  flightDestinationId: string | null;
  activeContract: Contract | null;
  logs: string[];
}

export const SCREEN_WIDTH = 800;
export const SCREEN_HEIGHT = 600;
export const CENTER = { x: SCREEN_WIDTH / 2, y: SCREEN_HEIGHT / 2 };