import React, { useMemo } from 'react';
import { Coordinates, GameState, Location, LocationType, SCREEN_HEIGHT, SCREEN_WIDTH, CENTER } from '../types';

interface GameMapProps {
  gameState: GameState;
  locations: Location[];
  onLocationClick: (loc: Location) => void;
  onHover?: () => void;
  shipPosition: Coordinates;
  shipRotation: number;
}

const GameMap: React.FC<GameMapProps> = ({ gameState, locations, onLocationClick, onHover, shipPosition, shipRotation }) => {
  
  // Extract unique orbit radii to draw rings
  const orbits = useMemo(() => {
    const radii = new Set<number>();
    locations.forEach(l => {
        if(l.orbitRadius) radii.add(l.orbitRadius);
    });
    return Array.from(radii).sort((a,b) => a - b);
  }, [locations]);

  return (
    <div className="relative w-full h-full border-2 border-amber-900/50 bg-slate-950 rounded-lg overflow-hidden shadow-[inset_0_0_20px_rgba(0,0,0,0.8)]">
      {/* Grid Background */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: 'linear-gradient(#fbbf24 1px, transparent 1px), linear-gradient(90deg, #fbbf24 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}
      />

      <svg 
        viewBox={`0 0 ${SCREEN_WIDTH} ${SCREEN_HEIGHT}`} 
        className="w-full h-full relative z-10"
      >
        {/* Orbit Rings */}
        {orbits.map(r => (
            <circle 
                key={r}
                cx={CENTER.x} 
                cy={CENTER.y} 
                r={r} 
                fill="none" 
                stroke="#fbbf24" 
                strokeOpacity="0.05" 
                strokeDasharray="4 4" 
            />
        ))}

        {/* Flight Path Line (Dynamic Target) */}
        {gameState.isFlying && gameState.flightOriginId && gameState.flightDestinationId && (
          <line 
            x1={shipPosition.x}
            y1={shipPosition.y}
            x2={locations.find(l => l.id === gameState.flightDestinationId)?.coords.x ?? 0}
            y2={locations.find(l => l.id === gameState.flightDestinationId)?.coords.y ?? 0}
            stroke="#ef4444"
            strokeWidth="1"
            strokeDasharray="2 2"
            opacity="0.4"
          />
        )}

        {/* Central Planet */}
        <circle cx={CENTER.x} cy={CENTER.y} r={40} fill="#0f172a" stroke="#3b82f6" strokeWidth="2" />
        <text x={CENTER.x} y={CENTER.y + 5} textAnchor="middle" fill="#3b82f6" fontSize="10" className="font-display tracking-widest opacity-50">TERRA-NV</text>

        {/* Locations */}
        {locations.map(loc => {
          const isCurrent = loc.id === gameState.currentLocationId && !gameState.isFlying;
          const isDest = loc.id === gameState.activeContract?.destinationId;

          return (
            <g 
              key={loc.id} 
              onClick={() => !gameState.isFlying && onLocationClick(loc)}
              onMouseEnter={!gameState.isFlying ? onHover : undefined}
              className={`${!gameState.isFlying ? 'cursor-pointer hover:opacity-80' : ''} transition-all duration-300`}
            >
              {/* Hit Area */}
              <circle cx={loc.coords.x} cy={loc.coords.y} r={25} fill="transparent" />
              
              {/* Icon */}
              {loc.type === LocationType.STATION ? (
                <rect 
                  x={loc.coords.x - 8} 
                  y={loc.coords.y - 8} 
                  width="16" 
                  height="16" 
                  fill={isCurrent ? "#fbbf24" : "#1e293b"} 
                  stroke={isDest ? "#ef4444" : "#fbbf24"} 
                  strokeWidth={isDest ? 3 : 2}
                  transform={`rotate(45 ${loc.coords.x} ${loc.coords.y})`}
                />
              ) : (
                <circle 
                  cx={loc.coords.x} 
                  cy={loc.coords.y} 
                  r={8} 
                  fill={isCurrent ? "#fbbf24" : "#1e293b"} 
                  stroke={isDest ? "#ef4444" : "#fbbf24"} 
                  strokeWidth={isDest ? 3 : 2}
                />
              )}

              {/* Label */}
              <text 
                x={loc.coords.x} 
                y={loc.coords.y + 24} 
                textAnchor="middle" 
                fill={isDest ? "#ef4444" : "#fbbf24"} 
                fontSize="10" 
                className="font-mono"
              >
                {loc.name.toUpperCase()}
              </text>

              {/* Current Location Indicator */}
              {isCurrent && (
                <circle cx={loc.coords.x} cy={loc.coords.y} r={18} fill="none" stroke="#fbbf24" strokeWidth="1" className="animate-ping opacity-75" />
              )}
            </g>
          );
        })}

        {/* The Ship */}
        <g transform={`translate(${shipPosition.x}, ${shipPosition.y}) rotate(${shipRotation})`}>
          <path d="M 0 -10 L 8 10 L 0 6 L -8 10 Z" fill="#fbbf24" stroke="#78350f" strokeWidth="1" />
          <path d="M 0 6 L 0 14" stroke="#ef4444" strokeWidth="2" className={gameState.isFlying ? "opacity-100" : "opacity-0"} />
        </g>
      </svg>
    </div>
  );
};

export default GameMap;