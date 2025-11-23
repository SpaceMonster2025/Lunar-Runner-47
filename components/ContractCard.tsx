import React from 'react';
import { Contract, Faction } from '../types';
import { BadgeDollarSign, Fuel, MapPin, Clock } from 'lucide-react';

interface ContractCardProps {
  contract: Contract;
  onAccept: (c: Contract) => void;
  canAffordFuel: boolean;
  currentDistance: number;
  currentFuelCost: number;
  onHover?: () => void;
  gameTime: number;
}

const ContractCard: React.FC<ContractCardProps> = ({ contract, onAccept, canAffordFuel, currentDistance, currentFuelCost, onHover, gameTime }) => {
  const timeLeft = Math.max(0, contract.expiresAt - gameTime);
  // Assuming 60 ticks per second roughly
  const secondsLeft = Math.ceil(timeLeft / 60);
  
  // Calculate percentage for progress bar (Assuming max duration ~2000-5000 ticks, but we just want relative to "now")
  // We don't have the original duration, so we'll just style based on absolute time left.
  // < 10 seconds (600 ticks) = Critical
  const isCritical = secondsLeft < 15;

  return (
    <div 
      className={`bg-slate-900 border p-4 mb-3 rounded-sm transition-colors group relative overflow-hidden
        ${isCritical ? 'border-red-900/50' : 'border-amber-900/50 hover:border-amber-500'}
      `}
      onMouseEnter={onHover}
    >
      {/* Expiration Background Fill Effect */}
      <div 
        className={`absolute bottom-0 left-0 h-1 transition-all duration-1000 ${isCritical ? 'bg-red-600' : 'bg-amber-900/40'}`}
        style={{ width: `${Math.min(100, secondsLeft * 2)}%` }}
      />

      <div className="flex justify-between items-start mb-2 relative z-10">
        <h3 className="text-amber-500 font-display font-bold uppercase text-lg group-hover:text-amber-400">{contract.title}</h3>
        <div className="flex flex-col items-end gap-1">
            <span className={`text-xs px-2 py-0.5 rounded border ${contract.riskLevel === 'HIGH' ? 'border-red-500 text-red-500' : 'border-amber-900 text-amber-700'}`}>
            {contract.riskLevel} RISK
            </span>
            <div className={`flex items-center gap-1 text-[10px] font-mono ${isCritical ? 'text-red-500 animate-pulse' : 'text-zinc-500'}`}>
                <Clock size={10} />
                <span>EXP: {secondsLeft}s</span>
            </div>
        </div>
      </div>
      
      <p className="text-amber-100/60 text-xs mb-3 font-mono relative z-10">{contract.description}</p>
      
      <div className="grid grid-cols-2 gap-2 text-xs font-mono text-amber-500/80 mb-4 relative z-10">
        <div className="flex items-center gap-2">
          <BadgeDollarSign size={14} />
          <span>PAY: {contract.pay} CR</span>
        </div>
        <div className="flex items-center gap-2">
          <Fuel size={14} />
          <span className={canAffordFuel ? "" : "text-red-500 animate-pulse"}>EST FUEL: {Math.round(currentFuelCost)}</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin size={14} />
          <span>DIST: {Math.round(currentDistance)} AU</span>
        </div>
        {contract.faction !== Faction.NEUTRAL && (
           <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-amber-900/50 block rounded-full"></span>
            <span>{contract.faction.split(' ')[0]}</span>
           </div>
        )}
      </div>

      <button 
        onClick={() => onAccept(contract)}
        disabled={!canAffordFuel}
        className={`w-full py-2 text-sm font-bold tracking-widest uppercase border relative z-10
          ${canAffordFuel 
            ? 'bg-amber-900/20 border-amber-500 text-amber-500 hover:bg-amber-500 hover:text-black' 
            : 'bg-red-900/10 border-red-900 text-red-900 cursor-not-allowed'}
          transition-all`}
      >
        {canAffordFuel ? 'ACCEPT CONTRACT' : 'INSUFFICIENT FUEL'}
      </button>
    </div>
  );
};

export default ContractCard;