import React, { useState, useEffect, useRef } from 'react';
import { SessionConfig, BreathPhase } from '../types';
import { Play, Pause, Square, Check } from 'lucide-react';

interface SessionViewProps {
  config: SessionConfig;
  onFinish: (elapsedMinutes: number) => void;
  onCancel: () => void;
}

export const SessionView: React.FC<SessionViewProps> = ({ config, onFinish, onCancel }) => {
  // State
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<BreathPhase>(BreathPhase.PREPARE);
  const [breathCount, setBreathCount] = useState(0);
  const [timer, setTimer] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isInhaling, setIsInhaling] = useState(true);
  const [totalSeconds, setTotalSeconds] = useState(0);

  // Constants
  const BREATH_DURATION_MS = 3500; // Total cycle time
  const INHALE_TIME_MS = 1600; // Slightly shorter inhale
  const RECOVERY_TIME_SEC = 15;
  const INTERMISSION_TIME_SEC = 5;

  // Use number for browser setTimeout return type
  const breathCycleRef = useRef<number | null>(null);

  // Total session timer
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isPaused && phase !== BreathPhase.FINISHED) {
        setTotalSeconds(s => s + 1);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isPaused, phase]);

  // Auto-advance Retention Phase
  useEffect(() => {
    if (phase === BreathPhase.RETENTION) {
        const targetTime = config.retentionTimes[round];
        if (timer >= targetTime) {
            setPhase(BreathPhase.RECOVERY);
        }
    }
  }, [timer, phase, round, config.retentionTimes]);

  // Main Logic Engine
  useEffect(() => {
    if (isPaused) return;

    if (phase === BreathPhase.PREPARE) {
      // Quick 3-second countdown
      setTimer(3);
      const countdown = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            clearInterval(countdown);
            startBreathingPhase();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(countdown);
    }

    if (phase === BreathPhase.RETENTION) {
       // Timer logic handled in separate useEffect for pure seconds counting
       const interval = setInterval(() => {
          setTimer(t => t + 1);
       }, 1000);
       return () => clearInterval(interval);
    }

    if (phase === BreathPhase.RECOVERY) {
      setTimer(RECOVERY_TIME_SEC);
      const interval = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            handleRoundCompletion();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }

    if (phase === BreathPhase.INTERMISSION) {
        setTimer(INTERMISSION_TIME_SEC);
        const interval = setInterval(() => {
          setTimer((prev) => {
            if (prev <= 1) {
              clearInterval(interval);
              startNextRound();
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        return () => clearInterval(interval);
      }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, isPaused]);

  // Breathing Cycle Logic (Separated for precise control)
  useEffect(() => {
    if (phase !== BreathPhase.BREATHING || isPaused) {
        if (breathCycleRef.current) clearTimeout(breathCycleRef.current);
        return;
    }

    const runBreathCycle = () => {
        setIsInhaling(true);
        
        // Schedule Exhale
        const exhaleTimeout = setTimeout(() => {
            setIsInhaling(false);
        }, INHALE_TIME_MS);

        // Schedule Next Breath or End
        breathCycleRef.current = window.setTimeout(() => {
             setBreathCount((prev) => {
                 const next = prev + 1;
                 if (next >= config.breathsPerRound) {
                     startRetentionPhase();
                     return 0; // Reset for display, or keep at max? Let's reset visually in next phase
                 }
                 // Recursively call for next breath
                 runBreathCycle();
                 return next;
             });
        }, BREATH_DURATION_MS);
    };

    // Start the first cycle
    runBreathCycle();

    return () => {
        if (breathCycleRef.current) clearTimeout(breathCycleRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, isPaused, config.breathsPerRound]);


  // Phase Transitions
  const startBreathingPhase = () => {
    setPhase(BreathPhase.BREATHING);
    setBreathCount(0);
    setIsInhaling(true);
  };

  const startRetentionPhase = () => {
    setPhase(BreathPhase.RETENTION);
    setTimer(0); // Counting UP
  };

  const startNextRound = () => {
    setRound(r => r + 1);
    startBreathingPhase();
  };

  const handleRoundCompletion = () => {
    if (round + 1 >= config.rounds) {
      setPhase(BreathPhase.FINISHED);
      onFinish(totalSeconds / 60);
    } else {
      setPhase(BreathPhase.INTERMISSION);
    }
  };

  // Visual Helpers
  const getBubbleClass = () => {
    if (phase === BreathPhase.BREATHING) {
        return isInhaling ? 'scale-150 opacity-100 duration-[1600ms]' : 'scale-75 opacity-60 duration-[1900ms]';
    }
    if (phase === BreathPhase.RETENTION) return 'scale-75 opacity-40 duration-1000'; // Deflated
    if (phase === BreathPhase.RECOVERY) return 'scale-150 opacity-100 duration-[15000ms]'; // Fully inflated
    if (phase === BreathPhase.INTERMISSION) return 'scale-110 opacity-100 duration-500'; // Steady for intermission
    return 'scale-100 opacity-80';
  };

  const getInstructionText = () => {
    switch (phase) {
      case BreathPhase.PREPARE: return "Prepárate...";
      case BreathPhase.BREATHING: return isInhaling ? "Inhala..." : "Exhala...";
      case BreathPhase.RETENTION: return "Aguanta la respiración";
      case BreathPhase.RECOVERY: return "Inhala y mantén (Recuperación)";
      case BreathPhase.INTERMISSION: return "¡Ronda Completada!";
      case BreathPhase.FINISHED: return "Sesión Terminada";
      default: return "";
    }
  };

  const getSubText = () => {
    if (phase === BreathPhase.BREATHING) return `${breathCount + 1} / ${config.breathsPerRound}`;
    if (phase === BreathPhase.RETENTION) return `Objetivo: ${config.retentionTimes[round]}s`;
    if (phase === BreathPhase.INTERMISSION) return "Bien hecho. Vamos a la siguiente...";
    return "";
  };

  // Dynamic Background based on phase
  const getBgColor = () => {
      if (phase === BreathPhase.RETENTION) return 'from-slate-900 to-slate-950'; // Dark for calm
      if (phase === BreathPhase.RECOVERY) return 'from-cyan-900/40 to-slate-900';
      if (phase === BreathPhase.INTERMISSION) return 'from-emerald-900/40 to-slate-900'; // Greenish for success
      return 'from-blue-900/20 to-slate-900';
  };

  const getBubbleColor = () => {
      if (phase === BreathPhase.INTERMISSION) return 'from-green-400 to-emerald-600 shadow-[0_0_60px_-10px_rgba(16,185,129,0.6)]';
      return 'from-cyan-200 to-blue-500 shadow-[0_0_60px_-10px_rgba(6,182,212,0.6)]';
  }

  return (
    <div className={`relative flex flex-col items-center justify-center min-h-screen overflow-hidden bg-gradient-radial ${getBgColor()} transition-colors duration-1000`}>
      
      {/* Info HUD */}
      <div className="absolute top-6 w-full flex justify-between px-8 text-slate-400 text-sm">
        <div>Ronda {round + 1} / {config.rounds}</div>
        <div>Tiempo Total: {Math.floor(totalSeconds / 60)}:{(totalSeconds % 60).toString().padStart(2, '0')}</div>
      </div>

      {/* Main Visual */}
      <div className="relative z-10 flex flex-col items-center justify-center w-full">
        
        {/* Breathing Bubble Container */}
        <div className="relative w-64 h-64 md:w-80 md:h-80 flex items-center justify-center mb-12">
            {/* Glow Effect */}
            <div className={`absolute inset-0 rounded-full bg-cyan-500/20 blur-3xl transition-all duration-1000 ${phase === BreathPhase.RETENTION ? 'opacity-10 scale-50' : 'opacity-50'}`}></div>
            
            {/* The Physical Bubble */}
            <div 
                className={`w-40 h-40 md:w-48 md:h-48 rounded-full bg-gradient-to-br transition-all ease-in-out ${getBubbleColor()} ${getBubbleClass()}`}
            ></div>
            
            {/* Central Timer/Counter */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className={`text-5xl md:text-6xl font-bold text-white drop-shadow-lg transition-opacity duration-300 ${phase === BreathPhase.BREATHING ? 'opacity-0' : 'opacity-100'}`}>
                    {phase === BreathPhase.RETENTION 
                        ? <span className="font-mono">{Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}</span>
                        : phase === BreathPhase.INTERMISSION 
                            ? <div className="flex flex-col items-center"><Check className="w-8 h-8 mb-2" />{timer}</div>
                            : timer > 0 ? timer : ''
                    }
                </span>
            </div>
        </div>

        {/* Instructions */}
        <div className="text-center space-y-2 h-24 px-4">
            <h2 className="text-3xl font-bold text-white tracking-wide animate-fade-in transition-all duration-300">
                {getInstructionText()}
            </h2>
            <p className={`font-medium text-lg transition-colors duration-300 ${phase === BreathPhase.INTERMISSION ? 'text-emerald-400' : 'text-cyan-300'}`}>
                {getSubText()}
            </p>
        </div>

        {/* Controls */}
        <div className="mt-8 flex gap-8 z-20 items-center">
            
            {/* Stop / Cancel Button (Square) */}
            <button 
                onClick={onCancel}
                className="p-4 rounded-full bg-red-900/20 hover:bg-red-900/40 border border-red-900/50 text-red-400 hover:text-red-300 transition-colors backdrop-blur-sm group"
                title="Finalizar Sesión"
            >
                <Square className="w-6 h-6 fill-current" />
            </button>

            {/* Play / Pause Button */}
            <button 
                onClick={() => setIsPaused(!isPaused)}
                className="p-6 rounded-full bg-slate-800/80 hover:bg-slate-700 border border-slate-600 text-white transition-all hover:scale-105 shadow-xl backdrop-blur-sm"
            >
                {isPaused ? <Play className="w-8 h-8 ml-1 fill-current" /> : <Pause className="w-8 h-8 fill-current" />}
            </button>

            {/* Placeholder for spacing where the third button used to be to keep center alignment */}
            <div className="w-[58px]"></div>
        </div>
      </div>

    </div>
  );
};