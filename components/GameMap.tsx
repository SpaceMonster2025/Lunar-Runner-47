import React, { useMemo, useState } from 'react';
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
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: SCREEN_WIDTH, h: SCREEN_HEIGHT });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Extract unique orbit radii to draw rings
  const orbits = useMemo(() => {
    const radii = new Set<number>();
    locations.forEach(l => {
        if(l.orbitRadius) radii.add(l.orbitRadius);
    });
    return Array.from(radii).sort((a,b) => a - b);
  }, [locations]);

  const handleWheel = (e: React.WheelEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;

    const px = offsetX / rect.width;
    const py = offsetY / rect.height;

    const { w: curW, h: curH, x: curX, y: curY } = viewBox;
    const ZOOM_SPEED = 0.15;
    
    // Zoom in (negative delta) -> smaller viewbox
    // Zoom out (positive delta) -> larger viewbox
    const factor = e.deltaY > 0 ? (1 + ZOOM_SPEED) : (1 - ZOOM_SPEED);
    
    let newW = curW * factor;
    let newH = curH * factor;

    // Constraints
    const MIN_W = 200;
    const MAX_W = 2500;

    if (newW < MIN_W) {
        newW = MIN_W;
        newH = MIN_W * (SCREEN_HEIGHT / SCREEN_WIDTH);
    }
    if (newW > MAX_W) {
        newW = MAX_W;
        newH = MAX_W * (SCREEN_HEIGHT / SCREEN_WIDTH);
    }

    const newX = curX + px * (curW - newW);
    const newY = curY + py * (curH - newH);

    setViewBox({ x: newX, y: newY, w: newW, h: newH });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
      if (e.button === 2) { // Right Click
          setIsDragging(true);
          setDragStart({ x: e.clientX, y: e.clientY });
      }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      if (isDragging) {
          const rect = e.currentTarget.getBoundingClientRect();
          
          // Calculate delta in screen pixels
          const dx = e.clientX - dragStart.x;
          const dy = e.clientY - dragStart.y;
          
          // Convert to SVG units based on current zoom (viewBox width / screen width)
          const scaleX = viewBox.w / rect.width;
          const scaleY = viewBox.h / rect.height;

          // Update viewBox (Panning logic: dragging right moves camera left relative to content, so subtract delta)
          setViewBox(prev => ({
              ...prev,
              x: prev.x - (dx * scaleX),
              y: prev.y - (dy * scaleY)
          }));

          // Reset drag start to current position for next frame
          setDragStart({ x: e.clientX, y: e.clientY });
      }
  };

  const handleMouseUp = () => {
      setIsDragging(false);
  };

  return (
    <div 
      className={`relative w-full h-full border-2 border-amber-900/50 bg-slate-950 rounded-lg overflow-hidden shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] ${isDragging ? 'cursor-grabbing' : 'cursor-crosshair'}`}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onContextMenu={(e) => e.preventDefault()} // Disable default context menu
    >
      {/* Grid Background - Static "Radar Screen" overlay */}
      <div 
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(#fbbf24 1px, transparent 1px), linear-gradient(90deg, #fbbf24 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}
      />
      
      {/* Controls hint */}
      <div className="absolute top-2 right-2 z-20 pointer-events-none opacity-30 text-[10px] text-amber-500 font-mono text-right">
         SCROLL: ZOOM<br/>R-CLICK: PAN
      </div>

      <svg 
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`} 
        className="w-full h-full relative z-10"
        preserveAspectRatio="xMidYMid slice"
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
              onClick={(e) => {
                  e.stopPropagation();
                  if(!gameState.isFlying) onLocationClick(loc);
              }}
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