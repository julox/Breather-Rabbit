import React, { useEffect, useState } from 'react';
import { getSessionInsight } from '../services/geminiService';
import { RefreshCw, Home, Award, Rabbit } from 'lucide-react';

interface SummaryViewProps {
  rounds: number;
  elapsedMinutes: number;
  onReset: () => void;
}

export const SummaryView: React.FC<SummaryViewProps> = ({ rounds, elapsedMinutes, onReset }) => {
  const [insight, setInsight] = useState("El conejo está analizando tu sesión...");

  useEffect(() => {
    getSessionInsight(elapsedMinutes, rounds).then(setInsight);
  }, [elapsedMinutes, rounds]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-slate-900 text-slate-100">
      <div className="max-w-md w-full space-y-8 animate-fade-in text-center">
        
        <div className="inline-flex p-6 bg-green-500/20 rounded-full ring-4 ring-green-500/10 mb-4">
            <Rabbit className="w-16 h-16 text-green-400" />
        </div>

        <h2 className="text-4xl font-bold text-white">¡Sesión Completada!</h2>
        
        <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                <p className="text-slate-400 text-sm">Rondas</p>
                <p className="text-2xl font-bold text-cyan-400">{rounds}</p>
            </div>
            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                <p className="text-slate-400 text-sm">Duración</p>
                <p className="text-2xl font-bold text-cyan-400">{elapsedMinutes.toFixed(1)} min</p>
            </div>
        </div>

        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700 shadow-lg">
            <h3 className="text-sm font-semibold text-cyan-500 mb-2 uppercase tracking-wider flex items-center justify-center gap-2">
              <Rabbit className="w-4 h-4" />
              Sabiduría del Conejo
            </h3>
            <p className="text-slate-300 leading-relaxed italic">
                "{insight}"
            </p>
        </div>

        <button 
            onClick={onReset}
            className="w-full py-4 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-medium transition-colors flex items-center justify-center gap-2"
        >
            <RefreshCw className="w-4 h-4" />
            Nueva Sesión
        </button>
      </div>
    </div>
  );
};