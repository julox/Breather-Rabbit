import React, { useState, useEffect, useRef } from 'react';
import { SessionConfig, AudioTheme } from '../types';
import { Play, Rabbit, Timer, HelpCircle, X, AlertTriangle, Wind, Moon, Sun, Music, Trees, Building2, Car, Waves } from 'lucide-react';
import { getMotivationalQuote } from '../services/geminiService';

interface SetupViewProps {
  onStart: (config: SessionConfig) => void;
}

export const SetupView: React.FC<SetupViewProps> = ({ onStart }) => {
  const [rounds, setRounds] = useState(3);
  const [breaths, setBreaths] = useState(30);
  const [retentionTimes, setRetentionTimes] = useState<number[]>([90, 120, 150]);
  const [audioTheme, setAudioTheme] = useState<AudioTheme>('sea');
  const [quote, setQuote] = useState<string>("Cargando motivación...");
  const [showHelp, setShowHelp] = useState(false);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    getMotivationalQuote().then(setQuote);
  }, []);

  useEffect(() => {
    setRetentionTimes((prev) => {
      const newTimes = [...prev];
      if (rounds > prev.length) {
        for (let i = prev.length; i < rounds; i++) {
          newTimes.push((newTimes[i - 1] || 60) + 30);
        }
      } else if (rounds < prev.length) {
        return newTimes.slice(0, rounds);
      }
      return newTimes;
    });
  }, [rounds]);

  useEffect(() => {
      return () => {
          if (previewAudioRef.current) {
              previewAudioRef.current.pause();
              previewAudioRef.current = null;
          }
      };
  }, []);

  const playPreviewAudio = async (theme: AudioTheme) => {
      if (previewAudioRef.current) {
          previewAudioRef.current.pause();
          previewAudioRef.current = null;
      }

      const capTheme = theme.charAt(0).toUpperCase() + theme.slice(1);
      const paths = [
          `/public/audio/${theme}.mp3`,
          `/audio/${theme}.mp3`,
          `/public/audio/${capTheme}.mp3`,
          `/audio/${capTheme}.mp3`
      ];

      let foundUrl: string | null = null;

      // Try to find valid url
      for (const path of paths) {
          try {
              const res = await fetch(path, { method: 'HEAD' });
              if (res.ok) {
                  const type = res.headers.get('Content-Type');
                  if (type && !type.includes('text/html')) {
                      foundUrl = path;
                      break;
                  }
              }
          } catch(e) {}
      }

      // Fallback: use direct path if fetch checks fail (common in some envs)
      if (!foundUrl) {
           foundUrl = `/public/audio/${theme}.mp3`;
      }

      if (foundUrl) {
          const audio = new Audio(`${foundUrl}?t=${Date.now()}`);
          audio.loop = true;
          audio.volume = 0.5;
          
          // Safety timeout
          const safetyTimeout = setTimeout(() => {
             // If hanging, just ignore
          }, 3000);

          audio.oncanplaythrough = () => {
              clearTimeout(safetyTimeout);
              if (audioTheme === theme) {
                  audio.play().catch(console.warn);
                  previewAudioRef.current = audio;
              }
          };
          
          audio.onerror = () => {
              clearTimeout(safetyTimeout);
              // Simple try next path logic not implemented here for brevity in preview, 
              // assuming explicit path usually works.
          }

          audio.load();
      }
  };

  const handleThemeSelect = (theme: AudioTheme) => {
      setAudioTheme(theme);
      if (previewAudioRef.current) {
          previewAudioRef.current.pause();
          previewAudioRef.current = null;
      }
      playPreviewAudio(theme);
  };

  const handleRetentionChange = (index: number, value: string) => {
    const newTimes = [...retentionTimes];
    newTimes[index] = parseInt(value) || 0;
    setRetentionTimes(newTimes);
  };

  const handleStart = () => {
    if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
    }

    onStart({
      rounds,
      breathsPerRound: breaths,
      retentionTimes,
      audioTheme
    });
  };

  const themes: { id: AudioTheme; label: string; icon: React.ReactNode }[] = [
    { id: 'sea', label: 'Mar', icon: <Waves className="w-5 h-5" /> },
    { id: 'forest', label: 'Bosque', icon: <Trees className="w-5 h-5" /> },
    { id: 'city', label: 'Ciudad', icon: <Building2 className="w-5 h-5" /> },
    { id: 'autoway', label: 'Carretera', icon: <Car className="w-5 h-5" /> },
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 md:p-6 bg-slate-900 text-slate-100 relative">
      
      <div className="absolute top-6 right-6 flex items-center gap-4">
        <button 
          onClick={() => setShowHelp(true)}
          className="p-2 text-slate-400 hover:text-cyan-400 transition-colors rounded-full hover:bg-slate-800"
          title="Guía del Conejo"
        >
          <HelpCircle className="w-6 h-6" />
        </button>
      </div>

      <div className="max-w-lg w-full space-y-8 animate-fade-in">
        
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-4 bg-cyan-500/10 rounded-full mb-4 border border-cyan-500/30">
            <Rabbit className="w-12 h-12 text-cyan-400" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-500">
            La Respiración del Conejo Zen
          </h1>
          <p className="text-slate-400 italic min-h-[3rem] text-sm px-4">
            "{quote}"
          </p>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-6 space-y-8 shadow-xl">
          
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-slate-300">Rondas</label>
                <span className="text-cyan-400 font-bold text-lg">{rounds}</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={rounds}
                onChange={(e) => setRounds(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-slate-300">Resp. por Ronda</label>
                <span className="text-cyan-400 font-bold text-lg">{breaths}</span>
              </div>
              <input
                type="range"
                min="5"
                max="60"
                step="5"
                value={breaths}
                onChange={(e) => setBreaths(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <Music className="w-4 h-4 text-cyan-400" />
                Música de Fondo
            </label>
            <div className="grid grid-cols-2 gap-3">
                {themes.map((theme) => (
                    <button
                        key={theme.id}
                        onClick={() => handleThemeSelect(theme.id)}
                        className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-medium transition-all ${
                            audioTheme === theme.id
                            ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/20 ring-1 ring-cyan-400'
                            : 'bg-slate-900 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700'
                        }`}
                    >
                        {theme.icon}
                        {theme.label}
                    </button>
                ))}
            </div>
          </div>

          <div className="space-y-4 border-t border-slate-700 pt-6">
            <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <Timer className="w-4 h-4 text-cyan-400" />
                Tiempos de Retención
                </label>
                <span className="text-xs text-slate-500">Personaliza cada ronda</span>
            </div>
            
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {retentionTimes.map((time, idx) => (
                <div key={idx} className="flex flex-col group">
                  <span className="text-[10px] text-slate-500 mb-1 ml-1 uppercase tracking-wider font-bold">Ronda {idx + 1}</span>
                  <div className="relative flex items-center">
                      <input
                        type="number"
                        value={time}
                        onChange={(e) => handleRetentionChange(idx, e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 text-cyan-300 text-center font-mono py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                      />
                      <span className="absolute right-2 text-xs text-slate-600 pointer-events-none">s</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleStart}
            className="w-full group relative flex justify-center py-4 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-cyan-600 hover:bg-cyan-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition-all overflow-hidden shadow-lg shadow-cyan-900/20"
          >
            <div className="absolute inset-0 bg-white/10 group-hover:translate-x-full transition-transform duration-500 -skew-x-12 w-1/2 -translate-x-full"></div>
            <span className="flex items-center gap-2 text-lg font-bold tracking-wide">
              <Play className="w-5 h-5 fill-current" />
              INICIAR SESIÓN
            </span>
          </button>
        </div>
      </div>

      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
            
            <div className="sticky top-0 bg-slate-800/95 backdrop-blur border-b border-slate-700 p-4 flex justify-between items-center z-10">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Rabbit className="w-6 h-6 text-cyan-400" />
                La Respiración del Conejo Zen
              </h2>
              <button 
                onClick={() => setShowHelp(false)}
                className="p-1 hover:bg-slate-700 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>

            <div className="p-6 space-y-8">
              
              <p className="text-slate-300 leading-relaxed">
                Bienvenido a "La Respiración del Conejo Zen". Esta técnica está diseñada para oxigenar tu cuerpo y resetear tu sistema nervioso. Sigue estos pasos en cada ronda:
              </p>

              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                    <Wind className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-lg">1. La Carga (Respiración)</h3>
                    <p className="text-sm text-slate-400 mt-1">
                      Inhala profundamente llevando aire a la panza y luego al pecho. Exhala relajadamente ("deja ir"). No fuerces la salida del aire. Repite esto 30-40 veces siguiendo a la burbuja. Sentirás un hormigueo; ¡es normal!
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                    <Moon className="w-6 h-6 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-lg">2. La Madriguera (Retención)</h3>
                    <p className="text-sm text-slate-400 mt-1">
                      En la última exhalación, suelta todo el aire y <strong>AGUANTA</strong> sin respirar. Cierra los ojos y relájate. Este es el momento de paz profunda. Aguanta hasta que sientas el reflejo de respirar.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30">
                    <Sun className="w-6 h-6 text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-lg">3. El Despertar (Recuperación)</h3>
                    <p className="text-sm text-slate-400 mt-1">
                      Cuando no aguantes más, haz una inhalación profunda y <strong>MANTÉN</strong> el aire dentro durante 15 segundos apretando ligeramente hacia la cabeza. Luego suelta y comienza la siguiente ronda.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-xl p-4 flex gap-3 items-start">
                <AlertTriangle className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <h4 className="font-bold text-yellow-500 mb-1">ADVERTENCIAS IMPORTANTES</h4>
                  <ul className="text-slate-300 list-disc pl-4 space-y-1">
                    <li>Nunca practiques esto en el agua (bañera, piscina) ni bajo la ducha.</li>
                    <li>No lo hagas mientras conduces o manejas maquinaria pesada.</li>
                    <li>Hazlo siempre sentado o tumbado en un lugar seguro (riesgo de desmayo leve).</li>
                    <li>No fuerces. Si te sientes mal, para inmediatamente.</li>
                  </ul>
                </div>
              </div>

            </div>

            <div className="p-4 border-t border-slate-700 bg-slate-800/50">
              <button 
                onClick={() => setShowHelp(false)}
                className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
              >
                Entendido, soy un conejo responsable
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};