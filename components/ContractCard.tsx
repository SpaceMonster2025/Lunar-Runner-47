import React from 'react';
import { Contract, Faction } from '../types';
import { BadgeDollarSign, Fuel, MapPin, Skull } from 'lucide-react';

interface ContractCardProps {
  contract: Contract;
  onAccept: (c: Contract) => void;
  canAffordFuel: boolean;
  currentDistance: number;
  currentFuelCost: number;
  onHover?: () => void;
}

const ContractCard: React.FC<ContractCardProps> = ({ contract, onAccept, canAffordFuel, currentDistance, currentFuelCost, onHover }) => {
  return (
    <div 
      className="bg-slate-900 border border-amber-900/50 p-4 mb-3 rounded-sm hover:border-amber-500 transition-colors group"
      onMouseEnter={onHover}
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-amber-500 font-display font-bold uppercase text-lg group-hover:text-amber-400">{contract.title}</h3>
        <span className={`text-xs px-2 py-1 rounded border ${contract.riskLevel === 'HIGH' ? 'border-red-500 text-red-500' : 'border-amber-900 text-amber-700'}`}>
          {contract.riskLevel} RISK
        </span>
      </div>
      
      <p className="text-amber-100/60 text-xs mb-3 font-mono">{contract.description}</p>
      
      <div className="grid grid-cols-2 gap-2 text-xs font-mono text-amber-500/80 mb-4">
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
        className={`w-full py-2 text-sm font-bold tracking-widest uppercase border 
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