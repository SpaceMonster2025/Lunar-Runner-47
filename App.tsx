import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Faction, GameState, Location, LocationType, Contract, ShipStats, SCREEN_WIDTH, SCREEN_HEIGHT, CENTER, Coordinates } from './types';
import { LOCATIONS, INITIAL_SHIP_STATS, CONTRACT_TEMPLATES, MUSIC_TRACK_URL } from './constants';
import GameMap from './components/GameMap';
import ContractCard from './components/ContractCard';
import { AudioManager } from './audio';
import { Gauge, Fuel, DollarSign, Crosshair, Radio, TriangleAlert, Settings, Info, Volume2, VolumeX, Power, Clock, Droplets } from 'lucide-react';

const LOG_MAX_LENGTH = 5;

// Helper to get coordinates based on time
const getDynamicLocations = (time: number): Location[] => {
    return LOCATIONS.map(loc => {
        if (!loc.orbitRadius || loc.orbitSpeed === undefined) return loc;

        // Calculate angle: Initial + (Speed * Time)
        const angleDeg = (loc.initialAngle || 0) + (loc.orbitSpeed * time);
        const angleRad = angleDeg * (Math.PI / 180);

        return {
            ...loc,
            coords: {
                x: CENTER.x + loc.orbitRadius * Math.cos(angleRad),
                y: CENTER.y + loc.orbitRadius * Math.sin(angleRad)
            }
        };
    });
};

export default function App() {
  // --- STATE ---
  const [gameState, setGameState] = useState<GameState>({
    credits: 150, // Starting credits
    fuel: 400,
    hull: 100,
    currentLocationId: 'station-x33',
    reputation: {
      [Faction.X33]: 50,
      [Faction.X63]: 40,
      [Faction.X99]: 20,
      [Faction.NEUTRAL]: 0
    },
    ship: INITIAL_SHIP_STATS,
    day: 1,
    gameTime: 0,
    isFlying: false,
    flightProgress: 0,
    flightOriginId: null,
    flightDestinationId: null,
    activeContract: null,
    logs: ["SYSTEM INIT...", "DOCKED AT X-33 LIBERTY."]
  });

  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [generatedContracts, setGeneratedContracts] = useState<Contract[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [audioInitialized, setAudioInitialized] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [fuelToAdd, setFuelToAdd] = useState<number>(0);
  
  // Game Loop Ref
  const requestRef = useRef<number>();
  const flightRef = useRef<number>();
  const audioManager = useRef(new AudioManager());

  // Dynamic Locations derived from state time
  const currentLocations = useMemo(() => getDynamicLocations(gameState.gameTime), [gameState.gameTime]);
  const currentLocation = currentLocations.find(l => l.id === gameState.currentLocationId);
  const selectedLocation = selectedLocationId ? currentLocations.find(l => l.id === selectedLocationId) || null : null;
  const destinationLocation = currentLocations.find(l => l.id === gameState.flightDestinationId);

  // --- AUDIO INIT ---
  const initAudio = () => {
    audioManager.current.init(MUSIC_TRACK_URL);
    setAudioInitialized(true);
    audioManager.current.playAccept();
    startGameLoop();
  };

  const toggleMute = () => {
    const muted = audioManager.current.toggleMute();
    setIsMuted(muted);
    if (!muted) audioManager.current.playClick();
  };

  const playHover = () => {
      if (audioInitialized) audioManager.current.playHover();
  };
  
  const playClick = () => {
      if (audioInitialized) audioManager.current.playClick();
  };

  // --- HELPERS ---

  const addLog = useCallback((msg: string) => {
    setGameState(prev => ({
      ...prev,
      logs: [msg, ...prev.logs].slice(0, LOG_MAX_LENGTH)
    }));
  }, []);

  // UPDATED: Now accepts generic Coordinates objects ({x,y}) directly
  const getDistance = (p1: Coordinates, p2: Coordinates) => {
    return Math.sqrt(
      Math.pow(p2.x - p1.x, 2) + 
      Math.pow(p2.y - p1.y, 2)
    );
  };

  const getFuelCost = (dist: number) => {
    return dist * gameState.ship.fuelEfficiency * 0.5; // Tuning factor
  };

  // --- GAME LOOP (ORBITS) ---
  const updateGameLoop = () => {
      setGameState(prev => {
          let newCredits = prev.credits;
          let logs = prev.logs;

          // DOCKING FEE PENALTY
          // If contract is active AND we are not flying AND we have credits
          if (prev.activeContract && !prev.isFlying && prev.currentLocationId) {
             // Every 60 ticks (approx 1 sec) deduct 1 credit
             if (prev.gameTime % 60 === 0) {
                 newCredits = Math.max(0, newCredits - 1);
                 
                 // Alert player every 10 credits lost or first tick
                 if (prev.gameTime % 300 === 0) {
                     logs = ["ALERT: DOCKING OVERTIME PENALTY -1CR", ...logs].slice(0, LOG_MAX_LENGTH);
                     if (audioInitialized && !isMuted) audioManager.current.playError();
                 }
             }
          }

          return {
              ...prev,
              credits: newCredits,
              logs: logs,
              gameTime: prev.gameTime + 1
          };
      });
      requestRef.current = requestAnimationFrame(updateGameLoop);
  };

  const startGameLoop = () => {
      if (!requestRef.current) {
          requestRef.current = requestAnimationFrame(updateGameLoop);
      }
  };

  // Cleanup
  useEffect(() => {
      return () => {
          if (requestRef.current) cancelAnimationFrame(requestRef.current);
          if (flightRef.current) cancelAnimationFrame(flightRef.current);
      }
  }, []);

  // Reset fuel slider on location change
  useEffect(() => {
    setFuelToAdd(0);
  }, [gameState.currentLocationId]);

  // --- GAME LOGIC ---

  // Helper to generate a single random contract
  const generateNewContract = (stationId: string, currentTime: number, indexOffset: number = 0): Contract | null => {
      const station = LOCATIONS.find(l => l.id === stationId);
      if (!station) return null;

      const template = CONTRACT_TEMPLATES[Math.floor(Math.random() * CONTRACT_TEMPLATES.length)];
      
      // Select destination: Any location except current
      const destinations = LOCATIONS.filter(l => l.id !== stationId);
      const dest = destinations[Math.floor(Math.random() * destinations.length)];
      
      const risk = Math.random() > 0.7 ? 'HIGH' : (Math.random() > 0.4 ? 'MED' : 'LOW');
      const riskPay = risk === 'HIGH' ? 200 : (risk === 'MED' ? 80 : 0);
      
      // Duration: 1500 to 4500 ticks (approx 25s to 75s)
      const duration = 1500 + Math.floor(Math.random() * 3000);

      return {
        id: `cnt-${Date.now()}-${indexOffset}`,
        title: template.title,
        description: template.desc,
        destinationId: dest.id,
        pay: Math.floor(template.basePay + riskPay),
        riskLevel: risk as 'LOW'|'MED'|'HIGH',
        faction: station.faction,
        expiresAt: currentTime + duration
      };
  };

  // Effect to handle contract generation and lifecycle
  useEffect(() => {
    // 1. Contract Maintenance (Expiry & Rivals)
    if (generatedContracts.length > 0) {
        const now = gameState.gameTime;
        
        // Filter out expired contracts
        const active = generatedContracts.filter(c => c.expiresAt > now);
        
        // Random "Rival Runner" Snatch
        // Chance per tick: 1 in 2000
        const rivalSnatch = Math.random() < 0.0005;
        let snatchedId: string | null = null;

        if (rivalSnatch && active.length > 0) {
             const idx = Math.floor(Math.random() * active.length);
             snatchedId = active[idx].id;
             active.splice(idx, 1);
        }
        
        // 2. Replenishment Logic
        // If we are at a station OR moon, and contracts are low, randomly spawn one
        if (active.length < 3 && currentLocation) {
            if (Math.random() < 0.005) { // ~0.5% chance per tick to spawn a new one
                const newContract = generateNewContract(currentLocation.id, now, Math.random());
                if (newContract) {
                    active.push(newContract);
                }
            }
        }

        if (active.length !== generatedContracts.length) {
            setGeneratedContracts(active);
            if (snatchedId) {
                 addLog("ALERT: CONTRACT TAKEN BY RIVAL RUNNER.");
            }
        }
    } else if (currentLocation && !gameState.isFlying) {
         // If completely empty and we are landed, force spawn one (slowly)
         if (Math.random() < 0.01) {
             const newContract = generateNewContract(currentLocation.id, gameState.gameTime, Math.random());
             if (newContract) setGeneratedContracts([newContract]);
         }
    }
  }, [gameState.gameTime]); // Runs every tick

  // Initial Generation / Refresh on Arrival
  const spawnContractsForLocation = (stationId: string, currentTime: number) => {
      const station = LOCATIONS.find(l => l.id === stationId);
      if (!station) {
          setGeneratedContracts([]);
          return;
      }

      const numContracts = 3;
      const newContracts: Contract[] = [];

      for (let i = 0; i < numContracts; i++) {
        const c = generateNewContract(stationId, currentTime, i);
        if (c) newContracts.push(c);
      }
      setGeneratedContracts(newContracts);
  };

  // Travel Logic
  // Ship position for Map Rendering
  const shipPos = useMemo((): Coordinates => {
    if (!gameState.isFlying) {
      return currentLocation ? currentLocation.coords : CENTER;
    }
    
    const origin = currentLocations.find(l => l.id === gameState.flightOriginId);
    const dest = currentLocations.find(l => l.id === gameState.flightDestinationId);
    
    if (!origin || !dest) return CENTER;

    const x = origin.coords.x + (dest.coords.x - origin.coords.x) * gameState.flightProgress;
    const y = origin.coords.y + (dest.coords.y - origin.coords.y) * gameState.flightProgress;
    return { x, y };

  }, [gameState.isFlying, gameState.flightOriginId, gameState.flightDestinationId, gameState.flightProgress, currentLocations, currentLocation]);

  const shipRotation = useMemo(() => {
    if (!gameState.isFlying || !gameState.flightOriginId || !gameState.flightDestinationId) return 0;
    const origin = currentLocations.find(l => l.id === gameState.flightOriginId);
    const dest = currentLocations.find(l => l.id === gameState.flightDestinationId);
    if (!origin || !dest) return 0;
    
    const dy = dest.coords.y - origin.coords.y;
    const dx = dest.coords.x - origin.coords.x;
    return (Math.atan2(dy, dx) * 180 / Math.PI) + 90;
  }, [gameState.isFlying, gameState.flightOriginId, gameState.flightDestinationId, currentLocations]);


  // Actual Flight Loop
  useEffect(() => {
      if (!gameState.isFlying) return;

      const dest = currentLocations.find(l => l.id === gameState.flightDestinationId);
      const origin = currentLocations.find(l => l.id === gameState.flightOriginId);
      
      if (!dest || !origin) return;

      // FIX: Use getDistance with simple coords. shipPos is already a Coordinate.
      // Treat shipPos as the current point.
      const dist = getDistance(shipPos, dest.coords);
      
      const flightDurationFrames = 120; // ~2 seconds nominal
      const progressIncrement = 1 / flightDurationFrames;

      // Calculate fuel burn for this frame based on instant distance
      const instantDist = getDistance(origin.coords, dest.coords); 
      const fuelBurn = (instantDist * gameState.ship.fuelEfficiency * 0.5) * progressIncrement; 

      setGameState(prev => {
          if (prev.fuel <= 0 || prev.hull <= 0) {
              setGameOver(true);
              audioManager.current.stopEngine();
              if (audioInitialized) audioManager.current.playError();
              return { ...prev, isFlying: false, logs: ["CRITICAL FAILURE.", ...prev.logs] };
          }

          if (prev.flightProgress >= 1) {
              // ARRIVAL
              audioManager.current.stopEngine();
              if (audioInitialized) audioManager.current.playAccept();
              
              const arrivalId = prev.flightDestinationId!;
              const destName = LOCATIONS.find(l => l.id === arrivalId)?.name || "UNKNOWN";
              let newCredits = prev.credits;
              let newContract = prev.activeContract;
              const newRep = { ...prev.reputation };
              let msg = `ARRIVED AT ${destName}.`;

              if (prev.activeContract && prev.activeContract.destinationId === arrivalId) {
                  newCredits += prev.activeContract.pay;
                  if (prev.activeContract.faction !== Faction.NEUTRAL) {
                      newRep[prev.activeContract.faction] += 5;
                  }
                  msg = `JOB DONE. +${prev.activeContract.pay} CR.`;
                  if (audioInitialized) audioManager.current.playCash();
                  newContract = null;
              }

              return {
                  ...prev,
                  isFlying: false,
                  flightProgress: 0,
                  currentLocationId: arrivalId,
                  flightOriginId: null,
                  flightDestinationId: null,
                  activeContract: newContract,
                  credits: newCredits,
                  reputation: newRep,
                  logs: [msg, ...prev.logs].slice(0, LOG_MAX_LENGTH)
              };
          }

          // In Flight
          // Random Event
          let damage = 0;
          if (Math.random() < 0.005) {
              damage = 5;
              if (audioInitialized) audioManager.current.playAlert();
          }

          return {
              ...prev,
              flightProgress: prev.flightProgress + progressIncrement,
              fuel: prev.fuel - fuelBurn,
              hull: prev.hull - damage,
              logs: damage > 0 ? ["ALERT: HULL DAMAGE", ...prev.logs].slice(0, LOG_MAX_LENGTH) : prev.logs
          };
      });

  }, [gameState.isFlying, gameState.gameTime]); // Run every tick when flying

  // Trigger contract spawn on arrival AND Auto-navigate to services
  useEffect(() => {
      if (!gameState.isFlying && gameState.currentLocationId) {
          spawnContractsForLocation(gameState.currentLocationId, gameState.gameTime);
          // Auto-navigate to services by clearing selection, bypassing the "YOU ARE HERE" screen
          setSelectedLocationId(null);
      }
  }, [gameState.currentLocationId, gameState.isFlying]); // When location changes and we stop flying

  const startTravel = (targetId: string) => {
    playClick();
    const origin = currentLocation;
    const dest = currentLocations.find(l => l.id === targetId);
    
    if (!origin || !dest) return;

    // FIX: Pass coords specifically
    const dist = getDistance(origin.coords, dest.coords);
    const fuelNeeded = getFuelCost(dist);

    if (gameState.fuel < fuelNeeded) {
        addLog("ERROR: INSUFFICIENT FUEL FOR TRAJECTORY.");
        if (audioInitialized) audioManager.current.playError();
        return;
    }

    addLog(`TRAJECTORY LOCKED: ${dest.name}...`);
    if (audioInitialized) audioManager.current.startEngine();
    
    setGameState(prev => ({
      ...prev,
      isFlying: true,
      flightOriginId: origin.id,
      flightDestinationId: dest.id,
      flightProgress: 0
    }));
  };

  const handleWait = () => {
      playClick();
      // Fast forward 500 ticks
      const TICKS_TO_WAIT = 500;
      setGameState(prev => ({
          ...prev,
          gameTime: prev.gameTime + TICKS_TO_WAIT,
          logs: ["WAITING FOR ALIGNMENT...", ...prev.logs].slice(0, LOG_MAX_LENGTH)
      }));
  };

  const handleAcceptContract = (c: Contract) => {
      if (gameState.activeContract) {
          addLog("ERROR: ACTIVE CONTRACT IN PROGRESS.");
          if (audioInitialized) audioManager.current.playError();
          return;
      }
      if (audioInitialized) audioManager.current.playAccept();
      setGameState(prev => ({
          ...prev,
          activeContract: c,
          logs: [`ACCEPTED: ${c.title}`, ...prev.logs].slice(0, LOG_MAX_LENGTH)
      }));
      setGeneratedContracts(prev => prev.filter(con => con.id !== c.id));
      
      // Select the destination automatically to encourage flight
      setSelectedLocationId(c.destinationId);
  };

  const confirmRefuel = () => {
      if (!currentLocation?.fuelPrice || fuelToAdd <= 0) return;
      const cost = Math.floor(fuelToAdd * currentLocation.fuelPrice);
      
      if (gameState.credits >= cost) {
          if (audioInitialized) audioManager.current.playCash();
          setGameState(prev => ({
              ...prev,
              fuel: Math.min(prev.ship.maxFuel, prev.fuel + fuelToAdd),
              credits: prev.credits - cost,
              logs: [`REFUELED ${fuelToAdd.toFixed(0)}L. -${cost} CR`, ...prev.logs].slice(0, LOG_MAX_LENGTH)
          }));
          setFuelToAdd(0);
      }
  };

  const handleRepair = () => {
    const repairCostPerHp = 2;
    const hpNeeded = gameState.ship.maxHull - gameState.hull;
    const cost = hpNeeded * repairCostPerHp;
    if (hpNeeded <= 0) return;

    if (gameState.credits >= cost) {
        if (audioInitialized) audioManager.current.playCash();
        setGameState(prev => ({
            ...prev,
            hull: prev.ship.maxHull,
            credits: prev.credits - cost,
            logs: ["HULL REPAIRED.", ...prev.logs].slice(0, LOG_MAX_LENGTH)
        }));
    } else {
        addLog("INSUFFICIENT FUNDS.");
        if (audioInitialized) audioManager.current.playError();
    }
  };

  // --- UI RENDERERS ---

  if (!audioInitialized) {
      return (
        <div className="w-full h-screen bg-black flex flex-col items-center justify-center font-display text-amber-500 crt relative">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-30"></div>
            <div className="z-10 text-center p-8 border-4 border-amber-900 bg-black/80 max-w-lg">
                <Power className="w-16 h-16 mx-auto mb-6 text-amber-500 animate-pulse" />
                <h1 className="text-4xl font-bold tracking-widest mb-2">SYSTEM OFFLINE</h1>
                <p className="text-xl font-mono text-amber-700 mb-8">INITIALIZE COCKPIT CONTROLS</p>
                
                <button 
                    onClick={initAudio}
                    className="group relative px-8 py-4 bg-amber-900/20 border border-amber-500 text-amber-500 hover:bg-amber-500 hover:text-black transition-all uppercase font-bold tracking-[0.2em]"
                >
                    <span className="absolute inset-0 border border-amber-500 scale-105 opacity-0 group-hover:scale-110 group-hover:opacity-100 transition-all duration-300"></span>
                    Engage Systems
                </button>
            </div>
        </div>
      );
  }

  if (gameOver) {
      return (
          <div className="w-full h-screen bg-black flex items-center justify-center font-display text-red-500 crt">
              <div className="text-center">
                  <h1 className="text-6xl mb-4 font-bold tracking-tighter">SIGNAL LOST</h1>
                  <p className="text-2xl mb-8 font-mono">PILOT STATUS: TERMINATED</p>
                  <p className="mb-8 text-amber-500">CREDITS EARNED: {gameState.credits}</p>
                  <button onClick={() => window.location.reload()} className="border border-red-500 px-6 py-3 hover:bg-red-900/20 text-lg uppercase tracking-widest">
                      Reboot System
                  </button>
              </div>
          </div>
      );
  }

  const isLanded = !gameState.isFlying && currentLocation;

  return (
    <div className="w-full h-screen bg-zinc-950 p-4 flex flex-col crt select-none overflow-hidden">
        {/* TOP BAR */}
        <header className="h-16 border-b-2 border-amber-900/50 flex items-center justify-between px-4 mb-4 bg-zinc-900/50">
            <div className="flex items-center gap-4">
                <h1 className="text-2xl font-display font-bold text-amber-500 tracking-wider flex items-center gap-2">
                    <Radio className="animate-pulse" />
                    LUNAR RUNNER '47
                </h1>
                <span className="text-xs font-mono text-zinc-500 mt-1">v1.3.0 // ORBITAL SYNC ACTIVE</span>
            </div>
            
            <div className="flex items-center gap-8 font-mono text-amber-400">
                <button onClick={toggleMute} className="hover:text-amber-200 transition-colors">
                    {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>

                <div className="flex items-center gap-2">
                    <DollarSign size={18} />
                    <span className={`text-xl tracking-widest ${gameState.activeContract && !gameState.isFlying ? "text-red-500 animate-pulse" : ""}`}>
                        {gameState.credits.toString().padStart(5, '0')}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <Fuel size={18} className={gameState.fuel < 100 ? "text-red-500 animate-pulse" : ""} />
                    <div className="flex flex-col w-32">
                        <div className="h-2 w-full bg-zinc-800 border border-zinc-700">
                            <div 
                                className={`h-full ${gameState.fuel < 100 ? "bg-red-500" : "bg-amber-500"}`} 
                                style={{ width: `${(gameState.fuel / gameState.ship.maxFuel) * 100}%` }}
                            ></div>
                        </div>
                        <span className="text-xs text-right mt-1">{Math.round(gameState.fuel)} / {gameState.ship.maxFuel} L</span>
                    </div>
                </div>
            </div>
        </header>

        {/* MAIN CONTENT */}
        <div className="flex-1 flex gap-4 overflow-hidden">
            {/* LEFT PANEL: MAP & SHIP VIEW */}
            <div className="flex-[2] relative flex flex-col min-w-0">
                <div className="absolute top-4 left-4 z-20 pointer-events-none">
                    <div className="bg-zinc-950/80 border border-amber-900 p-2 text-amber-500 font-mono text-xs shadow-lg">
                        <p>LOC: {currentLocation?.name.toUpperCase() ?? "UNKNOWN"}</p>
                        <p>STS: {gameState.isFlying ? "IN TRANSIT" : "DOCKED"}</p>
                        {gameState.activeContract && (
                             <p className="text-cyan-400 mt-1">JOB: {gameState.activeContract.title}</p>
                        )}
                    </div>
                </div>

                {/* WAIT BUTTON */}
                {!gameState.isFlying && (
                    <div className="absolute top-4 right-4 z-20">
                         <button 
                            onClick={handleWait}
                            onMouseEnter={playHover}
                            className="bg-zinc-900 border border-amber-900 hover:border-amber-500 text-amber-500 px-3 py-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest shadow-lg active:bg-amber-900/30"
                         >
                            <Clock size={14} />
                            Wait (1h)
                         </button>
                    </div>
                )}

                <GameMap 
                    gameState={gameState} 
                    locations={currentLocations}
                    onLocationClick={(loc) => {
                        playClick();
                        setSelectedLocationId(loc.id);
                    }}
                    onHover={playHover}
                    shipPosition={shipPos}
                    shipRotation={shipRotation}
                />

                {/* LOG CONSOLE */}
                <div className="absolute bottom-4 left-4 right-4 h-24 pointer-events-none">
                    <div className="w-full h-full bg-black/40 backdrop-blur-sm border-t border-amber-900/30 p-2 font-mono text-xs text-amber-500/80 flex flex-col justify-end">
                        {gameState.logs.map((log, i) => (
                            <p key={i} className="opacity-80 drop-shadow-md">> {log}</p>
                        ))}
                    </div>
                </div>
            </div>

            {/* RIGHT PANEL: INTERFACE */}
            <div className="flex-1 bg-zinc-900/30 border-l-2 border-amber-900/50 flex flex-col min-w-[300px] max-w-[400px]">
                
                <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
                    {gameState.isFlying ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-8 animate-pulse">
                            <RocketIcon className="w-16 h-16 text-amber-500 mb-4" />
                            <h2 className="text-xl font-display text-amber-500 mb-2">TRAJECTORY LOCKED</h2>
                            <p className="font-mono text-sm text-amber-700">Distance to Target: {Math.round((1 - gameState.flightProgress) * 100)}%</p>
                            <div className="w-full h-1 bg-zinc-800 mt-4">
                                <div className="h-full bg-amber-500 transition-all duration-75" style={{ width: `${gameState.flightProgress * 100}%`}}></div>
                            </div>
                        </div>
                    ) : selectedLocation ? (
                        // TRAVEL PREVIEW
                         <div className="h-full flex flex-col">
                             <div className="border-b border-amber-900/50 pb-4 mb-4">
                                <h2 className="text-2xl font-display text-amber-500 uppercase">{selectedLocation.name}</h2>
                                <p className="text-amber-700 text-sm font-mono mt-1">{selectedLocation.type} | {selectedLocation.faction}</p>
                                <p className="text-amber-100/50 text-xs mt-2 italic">"{selectedLocation.description}"</p>
                             </div>

                             {selectedLocation.id !== gameState.currentLocationId ? (
                                <div className="space-y-4">
                                    <div className="bg-black/20 p-4 border border-amber-900/30">
                                        <div className="flex justify-between text-sm font-mono text-amber-500 mb-2">
                                            <span>DISTANCE</span>
                                            {/* Calculate dynamic distance SAFE */}
                                            <span>{currentLocation ? Math.round(getDistance(currentLocation.coords, selectedLocation.coords)) : 'ERR'} AU</span>
                                        </div>
                                        <div className="flex justify-between text-sm font-mono text-amber-500 mb-2">
                                            <span>FUEL REQ</span>
                                            <span className={currentLocation && gameState.fuel < getFuelCost(getDistance(currentLocation.coords, selectedLocation.coords)) ? "text-red-500" : ""}>
                                                {currentLocation ? Math.round(getFuelCost(getDistance(currentLocation.coords, selectedLocation.coords))) : 0} L
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <button 
                                        onClick={() => startTravel(selectedLocation.id)}
                                        onMouseEnter={playHover}
                                        className="w-full bg-amber-500 text-black font-bold py-3 uppercase tracking-widest hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed"
                                        disabled={!currentLocation || gameState.fuel < getFuelCost(getDistance(currentLocation.coords, selectedLocation.coords))}
                                    >
                                        ENGAGE AUTOPILOT
                                    </button>
                                    <button 
                                        onClick={() => { playClick(); setSelectedLocationId(null); }}
                                        onMouseEnter={playHover}
                                        className="w-full text-amber-700 text-xs font-mono hover:text-amber-500 mt-2"
                                    >
                                        CANCEL PLOT
                                    </button>
                                </div>
                             ) : (
                                 <div className="text-center py-8">
                                     <p className="text-amber-500/50 font-mono text-sm">YOU ARE HERE</p>
                                     <button onClick={() => { playClick(); setSelectedLocationId(null); }} className="mt-4 text-amber-500 underline" onMouseEnter={playHover}>Back to Services</button>
                                 </div>
                             )}
                         </div>
                    ) : isLanded ? (
                        // STATION/MOON MENU
                        <div className="space-y-6">
                            <div className="flex items-center justify-between border-b border-amber-900/50 pb-2">
                                <h2 className="font-display text-xl text-amber-500">
                                    {currentLocation.type === LocationType.STATION ? "STATION SERVICES" : "SURFACE LOGISTICS"}
                                </h2>
                                <span className="text-xs font-mono text-zinc-500">{currentLocation?.faction}</span>
                            </div>
                            
                            {/* DOCKING PENALTY WARNING */}
                            {gameState.activeContract && (
                                <div className="bg-red-900/20 border border-red-500/50 p-2 mb-2 flex items-center justify-between text-red-400 animate-pulse">
                                    <span className="text-xs font-bold">⚠ DEPARTURE OVERDUE</span>
                                    <span className="text-[10px] font-mono">FEES ACCUMULATING</span>
                                </div>
                            )}

                            {/* REFUEL & REPAIR GRID */}
                            <div className="grid grid-cols-1 gap-4">
                                {/* FUEL PUMP */}
                                {currentLocation.fuelPrice && (
                                <div className="bg-zinc-900/50 border border-zinc-700 p-3">
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="flex items-center gap-2 text-amber-500 font-bold text-xs uppercase">
                                            <Droplets size={14} />
                                            <span>Fuel Pump</span>
                                        </div>
                                        <div className="text-xs font-mono text-amber-700">{currentLocation.fuelPrice} CR/L</div>
                                    </div>

                                    {/* Slider & Controls */}
                                    {(() => {
                                        const maxCapacity = gameState.ship.maxFuel;
                                        const currentFuel = gameState.fuel;
                                        const spaceEmpty = maxCapacity - currentFuel;
                                        const price = currentLocation.fuelPrice;
                                        const maxAffordable = Math.floor(gameState.credits / price);
                                        const maxBuyable = Math.min(spaceEmpty, maxAffordable);
                                        const cost = Math.ceil(fuelToAdd * price);

                                        return (
                                            <div className="space-y-3">
                                                <input 
                                                    type="range" 
                                                    min="0" 
                                                    max={maxBuyable} 
                                                    value={fuelToAdd}
                                                    onChange={(e) => setFuelToAdd(Number(e.target.value))}
                                                    className="w-full accent-amber-500 h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                                                />
                                                
                                                <div className="flex justify-between text-[10px] font-mono text-zinc-400">
                                                    <button onClick={() => setFuelToAdd(0)} className="hover:text-amber-500">[RESET]</button>
                                                    <div className="flex gap-2">
                                                        <button 
                                                            onClick={() => {
                                                                if (gameState.activeContract) {
                                                                     const dest = currentLocations.find(l => l.id === gameState.activeContract?.destinationId);
                                                                     if (dest) {
                                                                         const dist = getDistance(currentLocation.coords, dest.coords);
                                                                         const needed = Math.ceil(getFuelCost(dist));
                                                                         const toBuy = Math.max(0, needed - currentFuel);
                                                                         setFuelToAdd(Math.min(toBuy, maxBuyable));
                                                                     }
                                                                }
                                                            }} 
                                                            className="hover:text-amber-500 disabled:opacity-30"
                                                            disabled={!gameState.activeContract}
                                                        >
                                                            [REQ]
                                                        </button>
                                                        <button onClick={() => setFuelToAdd(maxBuyable)} className="hover:text-amber-500">[MAX]</button>
                                                    </div>
                                                </div>

                                                <div className="flex justify-between items-end border-t border-zinc-700 pt-2">
                                                    <div className="text-xs font-mono">
                                                        <span className="text-zinc-500">ADD: </span>
                                                        <span className="text-amber-300">{fuelToAdd.toFixed(0)} L</span>
                                                    </div>
                                                    <button 
                                                        onClick={confirmRefuel}
                                                        disabled={fuelToAdd <= 0 || gameState.credits < cost}
                                                        className="bg-amber-900/30 border border-amber-500 text-amber-500 text-xs px-3 py-1 hover:bg-amber-500 hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        BUY (-{cost} CR)
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                                )}

                                {/* REPAIR BUTTON */}
                                <button 
                                    onClick={handleRepair}
                                    onMouseEnter={playHover}
                                    className="bg-zinc-800 p-2 border border-zinc-700 hover:border-amber-500 group flex items-center justify-between px-4"
                                >
                                    <div className="flex items-center gap-2">
                                        <Settings size={16} className="text-amber-600 group-hover:text-amber-400" />
                                        <span className="text-xs text-amber-500 uppercase font-bold">Repair Hull</span>
                                    </div>
                                    <span className="text-[10px] font-mono text-zinc-500 group-hover:text-amber-500">2 CR / HP</span>
                                </button>
                            </div>

                            {/* CONTRACTS - NOW AVAILABLE AT MOONS AND STATIONS */}
                            <div>
                                <h3 className="text-xs font-bold text-amber-700 uppercase tracking-widest mb-3 border-l-2 border-amber-700 pl-2">Available Contracts</h3>
                                <div className="space-y-2">
                                    {generatedContracts.length > 0 ? (
                                        generatedContracts.map(c => {
                                            const dest = currentLocations.find(l => l.id === c.destinationId);
                                            // FIX: Safe checks for currentLocation and dest
                                            const dist = (dest && currentLocation) ? getDistance(currentLocation.coords, dest.coords) : 0;
                                            const cost = getFuelCost(dist);
                                            const destName = dest?.name || "Unknown";

                                            return (
                                                <ContractCard 
                                                    key={c.id} 
                                                    contract={c} 
                                                    onAccept={handleAcceptContract}
                                                    canAffordFuel={gameState.fuel >= cost}
                                                    currentDistance={dist}
                                                    currentFuelCost={cost}
                                                    onHover={playHover}
                                                    gameTime={gameState.gameTime}
                                                    destinationName={destName}
                                                />
                                            );
                                        })
                                    ) : (
                                        <div className="text-xs font-mono text-zinc-600 italic py-4 text-center border border-dashed border-zinc-800">
                                            No contracts available.<br/>Stand by for new transmissions...
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                         <div className="h-full flex items-center justify-center text-amber-900/50 font-mono text-sm text-center px-4">
                             SELECT A DESTINATION<br/>ON THE RADAR
                         </div>
                    )}
                </div>

                {/* 2. Ship Status Footer */}
                <div className="h-32 border-t-2 border-amber-900/50 p-4 bg-black/20">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-mono text-amber-700 uppercase">Hull Integrity</span>
                        <span className={`text-xs font-mono font-bold ${gameState.hull < 30 ? "text-red-500 crt-flicker" : "text-amber-500"}`}>{Math.round(gameState.hull)}%</span>
                    </div>
                    <div className="w-full h-2 bg-zinc-800 mb-4">
                        <div 
                            className={`h-full ${gameState.hull < 30 ? "bg-red-600" : "bg-cyan-600"}`} 
                            style={{ width: `${(gameState.hull / gameState.ship.maxHull) * 100}%` }}
                        ></div>
                    </div>
                    
                    {gameState.activeContract && (
                        <div className="bg-amber-900/20 p-2 border border-amber-900/30 flex items-center gap-2">
                            <TriangleAlert size={14} className="text-amber-500" />
                            <div className="overflow-hidden">
                                <p className="text-[10px] text-amber-300 font-bold truncate">{gameState.activeContract.title}</p>
                                <p className="text-[10px] text-amber-500/60 truncate">Dest: {LOCATIONS.find(l=>l.id === gameState.activeContract?.destinationId)?.name}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
}

// Icon Wrapper for the animated rocket in menu
const RocketIcon = ({ className }: { className?: string }) => (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
    </svg>
);