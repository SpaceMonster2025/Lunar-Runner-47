import React from 'react';
import { Contract, Faction } from '../types';
import { BadgeDollarSign, Fuel, MapPin, Clock, ArrowRight } from 'lucide-react';

interface ContractCardProps {
  contract: Contract;
  onAccept: (c: Contract) => void;
  canAffordFuel: boolean;
  currentDistance: number;
  currentFuelCost: number;
  onHover?: () => void;
  gameTime: number;
  destinationName: string;
}

const ContractCard: React.FC<ContractCardProps> = ({ 
  contract, 
  onAccept, 
  canAffordFuel, 
  currentDistance, 
  currentFuelCost, 
  onHover, 
  gameTime,
  destinationName
}) => {
  const timeLeft = Math.max(0, contract.expiresAt - gameTime);
  // Assuming 60 ticks per second roughly
  const secondsLeft = Math.ceil(timeLeft / 60);
  
  // < 15 seconds = Critical
  const isCritical = secondsLeft < 15;

  return (
    <div 
      className={`bg-slate-900 border p-3 mb-3 rounded-sm transition-colors group relative overflow-hidden
        ${isCritical ? 'border-red-900/50' : 'border-amber-900/50 hover:border-amber-500'}
      `}
      onMouseEnter={onHover}
    >
      {/* Expiration Background Fill Effect */}
      <div 
        className={`absolute bottom-0 left-0 h-1 transition-all duration-1000 ${isCritical ? 'bg-red-600' : 'bg-amber-900/40'}`}
        style={{ width: `${Math.min(100, secondsLeft * 2)}%` }}
      />

      {/* Header */}
      <div className="flex justify-between items-start mb-1 relative z-10">
        <h3 className="text-amber-500 font-display font-bold uppercase text-base group-hover:text-amber-400 leading-tight w-2/3">{contract.title}</h3>
        <div className="flex flex-col items-end gap-1">
            <span className={`text-[10px] px-1.5 rounded border ${contract.riskLevel === 'HIGH' ? 'border-red-500 text-red-500' : 'border-amber-900 text-amber-700'}`}>
            {contract.riskLevel} RISK
            </span>
        </div>
      </div>
      
      {/* Destination Highlight */}
      <div className="flex items-center gap-2 text-sm font-bold text-amber-100 bg-amber-900/20 p-1.5 rounded mb-2 relative z-10 border border-amber-900/30">
        <MapPin size={14} className="text-amber-500" />
        <span className="text-amber-500 text-xs">TO:</span>
        <span className="tracking-wide uppercase">{destinationName}</span>
      </div>

      <p className="text-amber-100/60 text-[10px] mb-3 font-mono relative z-10 italic truncate">"{contract.description}"</p>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-y-1 gap-x-2 text-[10px] font-mono text-amber-500/80 mb-3 relative z-10">
        <div className="flex items-center gap-1">
          <BadgeDollarSign size={12} />
          <span>PAY: {contract.pay} CR</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock size={12} className={isCritical ? "text-red-500" : ""} />
          <span className={isCritical ? "text-red-500 animate-pulse" : ""}>{secondsLeft}s LEFT</span>
        </div>
        <div className="flex items-center gap-1">
          <Fuel size={12} />
          <span className={canAffordFuel ? "" : "text-red-500 animate-pulse"}>{Math.round(currentFuelCost)} L</span>
        </div>
        <div className="flex items-center gap-1">
          <ArrowRight size={12} />
          <span>{Math.round(currentDistance)} AU</span>
        </div>
      </div>

      <button 
        onClick={() => onAccept(contract)}
        disabled={!canAffordFuel}
        className={`w-full py-2 text-xs font-bold tracking-widest uppercase border relative z-10
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