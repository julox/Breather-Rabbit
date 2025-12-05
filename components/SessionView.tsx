import React, { useState, useEffect, useRef } from 'react';
import { SessionConfig, BreathPhase } from '../types';
import { Play, Pause, Square, Check, Volume2, VolumeX, AlertCircle, Loader2, SkipForward } from 'lucide-react';

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
  const [isMuted, setIsMuted] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [musicLoading, setMusicLoading] = useState(true);
  const [musicError, setMusicError] = useState(false);

  // Constants
  const INHALE_TIME_MS = 1600; // Duration of standard Inhale
  const EXHALE_TIME_MS = 1900; // Duration of standard Exhale
  const FINAL_EXHALE_TIME_MS = 3800; // Duration of Last Exhale (Double)
  const RECOVERY_INHALE_SEC = 3.2; // Duration of the deep inhale after retention (Double of standard inhale 1.6s)
  const RECOVERY_HOLD_SEC = 15; // Duration of the recovery hold
  const INTERMISSION_TIME_SEC = 5;
  
  // Audio Levels
  const MUSIC_VOLUME = 0.6;
  const BREATH_VOLUME = 0.3;
  const BELL_VOLUME = 0.8;

  // Refs for Audio
  const audioCtxRef = useRef<AudioContext | null>(null);
  const breathNodeRef = useRef<{ gain: GainNode; filter: BiquadFilterNode } | null>(null);
  const bgMusicSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const bgMusicGainRef = useRef<GainNode | null>(null);
  const breathCycleTimeoutRef = useRef<number | null>(null);
  const isMutedRef = useRef(isMuted);

  // Keep ref in sync with state for async operations
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  // --- WAKE LOCK (Keep screen on) ---
  useEffect(() => {
    let wakeLock: any = null; // Type as any to avoid TS issues if types aren't available

    const requestWakeLock = async () => {
      try {
        // Check if Wake Lock API is supported
        if ('wakeLock' in navigator) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
          console.log('Screen Wake Lock acquired');
          
          wakeLock.addEventListener('release', () => {
            console.log('Screen Wake Lock released');
          });
        }
      } catch (err) {
        console.warn(`Wake Lock request failed: ${err}`);
      }
    };

    requestWakeLock();

    // Re-acquire lock if page becomes visible again (e.g. switching tabs back)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && (!wakeLock || wakeLock.released)) {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLock) {
        wakeLock.release().catch(console.error);
      }
    };
  }, []);

  // --- AUDIO ENGINE INITIALIZATION ---

  useEffect(() => {
    // 1. Setup Web Audio API for Breathing (Synthesis) AND Music (Gapless Loop)
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContextClass();
    audioCtxRef.current = ctx;

    // --- BREATH SYNTHESIS SETUP ---
    // Create Pink Noise Buffer for Breath
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0, b1, b2, b3, b4, b5, b6;
    b0 = b1 = b2 = b3 = b4 = b5 = b6 = 0.0;
    for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
        data[i] *= 0.11; 
        b6 = white * 0.115926;
    }

    const breathSource = ctx.createBufferSource();
    breathSource.buffer = buffer;
    breathSource.loop = true;

    const breathFilter = ctx.createBiquadFilter();
    breathFilter.type = 'lowpass';
    breathFilter.frequency.value = 200; 

    const breathGain = ctx.createGain();
    breathGain.gain.value = 0;

    breathSource.connect(breathFilter);
    breathFilter.connect(breathGain);
    breathGain.connect(ctx.destination);
    breathSource.start();

    breathNodeRef.current = { filter: breathFilter, gain: breathGain };

    if (ctx.state === 'suspended') {
        setAudioBlocked(true);
    }

    // --- BACKGROUND MUSIC SETUP (GAPLESS) ---
    setMusicLoading(true);
    setMusicError(false);
    
    const initMusic = async () => {
        const theme = config.audioTheme;
        const capTheme = theme.charAt(0).toUpperCase() + theme.slice(1);
        
        // Priority list:
        // 1. /audio/ (Standard Vite/Production)
        // 2. /public/audio/ (Fallback/Raw server)
        // 3. Capitalized versions (Case sensitive environments)
        const paths = [
            `/audio/${theme}.mp3`,
            `/audio/${capTheme}.mp3`,
            `/public/audio/${theme}.mp3`,
            `/public/audio/${capTheme}.mp3`
        ];

        let decodedBuffer: AudioBuffer | null = null;

        for (const path of paths) {
            try {
                // Fetch with explicit check for content type to avoid "Index.html is not audio" error
                const response = await fetch(path);
                if (!response.ok) continue;

                const contentType = response.headers.get('Content-Type');
                // If the server returns HTML (like a 404 fallback page), skip it
                if (contentType && contentType.includes('text/html')) {
                    continue;
                }

                const arrayBuffer = await response.arrayBuffer();
                decodedBuffer = await ctx.decodeAudioData(arrayBuffer);
                
                if (decodedBuffer) {
                    console.log(`Loaded audio from: ${path}`);
                    break;
                }
            } catch (e) {
                // Sigue al siguiente path silenciosamente
            }
        }

        if (decodedBuffer) {
            const musicSource = ctx.createBufferSource();
            musicSource.buffer = decodedBuffer;
            musicSource.loop = true; // Seamless loop!

            const musicGain = ctx.createGain();
            // Use ref here to ensure we don't blast music if user muted during load
            musicGain.gain.value = isMutedRef.current ? 0 : MUSIC_VOLUME;

            musicSource.connect(musicGain);
            musicGain.connect(ctx.destination);
            
            musicSource.start(0);

            bgMusicSourceRef.current = musicSource;
            bgMusicGainRef.current = musicGain;
            setMusicLoading(false);
        } else {
            console.error("All music paths failed or decoding failed");
            setMusicError(true);
            setMusicLoading(false);
        }
    };

    initMusic();

    return () => {
        // Cleanup Music
        if (bgMusicSourceRef.current) {
            try {
                bgMusicSourceRef.current.stop();
                bgMusicSourceRef.current.disconnect();
            } catch(e) {}
            bgMusicSourceRef.current = null;
        }
        // Cleanup Context
        if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
            audioCtxRef.current.close();
        }
    };
  }, [config.audioTheme]); 

  // Function to unlock audio manually
  const unlockAudio = () => {
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
          audioCtxRef.current.resume();
      }
      setAudioBlocked(false);
  };

  // Sync Mute State
  useEffect(() => {
    if (bgMusicGainRef.current && audioCtxRef.current) {
        const targetGain = isMuted ? 0 : MUSIC_VOLUME;
        bgMusicGainRef.current.gain.setTargetAtTime(targetGain, audioCtxRef.current.currentTime, 0.1);
    }
  }, [isMuted]);

  // Sync Pause State
  useEffect(() => {
    if (audioCtxRef.current) {
        if (isPaused || phase === BreathPhase.FINISHED) {
            audioCtxRef.current.suspend();
        } else {
            audioCtxRef.current.resume();
        }
    }
  }, [isPaused, phase]);

  // --- BREATHING LOGIC ---

  const triggerBreathSound = (inhaling: boolean, durationMs: number = EXHALE_TIME_MS) => {
      if (isMuted || !breathNodeRef.current || !audioCtxRef.current) return;
      const { gain, filter } = breathNodeRef.current;
      const ctx = audioCtxRef.current;
      const now = ctx.currentTime;
      const durationSec = durationMs / 1000;
      
      gain.gain.cancelScheduledValues(now);
      filter.frequency.cancelScheduledValues(now);

      if (inhaling) {
          // Si es inhalación, permitimos usar durationMs para inhalaciones largas (como en recovery)
          // Si no se pasa un durationMs explícito que difiera de EXHALE (que es el default), usamos INHALE
          // Pero para simplificar, usaremos durationMs si se provee contextualmente
          
          const activeInhaleDuration = durationMs === EXHALE_TIME_MS ? (INHALE_TIME_MS / 1000) : durationSec;

          filter.frequency.setValueAtTime(200, now);
          filter.frequency.exponentialRampToValueAtTime(2000, now + activeInhaleDuration);
          
          gain.gain.setValueAtTime(0, now);
          // Reduced volume for inhale
          gain.gain.linearRampToValueAtTime(BREATH_VOLUME, now + activeInhaleDuration - 0.2);
      } else {
          // Exhale adapts to duration
          filter.frequency.setValueAtTime(2000, now);
          filter.frequency.exponentialRampToValueAtTime(200, now + durationSec);

          // Reduced volume for exhale start
          gain.gain.setValueAtTime(BREATH_VOLUME, now);
          gain.gain.linearRampToValueAtTime(0, now + durationSec);
      }
  };

  const playBellSound = () => {
    if (isMuted) return;

    // Try multiple paths for bell sound too
    const paths = ['/audio/bell.mp3', '/public/audio/bell.mp3'];
    
    // Simple recursive player
    const playAttempt = (index: number) => {
        if (index >= paths.length) return;
        
        const audio = new Audio(paths[index]);
        audio.volume = BELL_VOLUME;
        audio.onerror = () => playAttempt(index + 1);
        audio.play().catch(() => playAttempt(index + 1));
    };

    playAttempt(0);
  };

  // Timer Logic
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isPaused && phase !== BreathPhase.FINISHED) {
        setTotalSeconds(s => s + 1);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isPaused, phase]);

  // Phase Timers
  useEffect(() => {
    if (isPaused) return;

    let phaseInterval: number | undefined;

    if (phase === BreathPhase.PREPARE) {
        if (timer === 0) setTimer(3);
        phaseInterval = window.setInterval(() => {
            setTimer(prev => {
                if (prev <= 1) {
                    clearInterval(phaseInterval);
                    startBreathingPhase();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }
    else if (phase === BreathPhase.RETENTION) {
        // Silence breath sound
        if(breathNodeRef.current && audioCtxRef.current) {
             breathNodeRef.current.gain.gain.setTargetAtTime(0, audioCtxRef.current.currentTime, 0.1);
        }

        const target = config.retentionTimes[round];
        phaseInterval = window.setInterval(() => {
            setTimer(t => {
                if (t >= target) {
                    clearInterval(phaseInterval);
                    // Cambiamos a la fase de inhalación de recuperación
                    setPhase(BreathPhase.RECOVERY_INHALE);
                    return 0;
                }
                return t + 1;
            });
        }, 1000);
    }
    else if (phase === BreathPhase.RECOVERY_INHALE) {
        if (timer === 0) {
            setTimer(RECOVERY_INHALE_SEC);
            // Trigger sound for the deep inhale
            triggerBreathSound(true, RECOVERY_INHALE_SEC * 1000);
        }

        // Usamos un intervalo más preciso para visualización si quisieramos, 
        // pero 1s está bien para la lógica
        phaseInterval = window.setInterval(() => {
             // Simplemente esperamos que termine la animación/timer
             setTimer(prev => {
                 if (prev <= 0) {
                     clearInterval(phaseInterval);
                     setPhase(BreathPhase.RECOVERY_HOLD);
                     return 0;
                 }
                 return prev - 0.1; // Decremento decimal para que no se quede pegado
             });
        }, 100);
        
        // Safety timeout matching the duration
        setTimeout(() => {
             if (phase === BreathPhase.RECOVERY_INHALE && !isPaused) {
                 setPhase(BreathPhase.RECOVERY_HOLD);
             }
        }, RECOVERY_INHALE_SEC * 1000);
    }
    else if (phase === BreathPhase.RECOVERY_HOLD) {
        if (timer === 0 || timer <= 1) setTimer(RECOVERY_HOLD_SEC); // Reset to 15s logic
        
        // Ensure silence immediately upon entering Hold
        if(breathNodeRef.current && audioCtxRef.current) {
             breathNodeRef.current.gain.gain.setTargetAtTime(0, audioCtxRef.current.currentTime, 0.1);
        }

        phaseInterval = window.setInterval(() => {
            setTimer(prev => {
                if (prev <= 1) {
                    clearInterval(phaseInterval);
                    handleRoundCompletion();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }
    else if (phase === BreathPhase.INTERMISSION) {
        if (timer === 0) setTimer(INTERMISSION_TIME_SEC);
        phaseInterval = window.setInterval(() => {
            setTimer(prev => {
                if (prev <= 1) {
                    clearInterval(phaseInterval);
                    startNextRound();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }

    return () => clearInterval(phaseInterval);
  }, [phase, isPaused, round, config]);

  // Breathing Loop
  useEffect(() => {
      if (phase !== BreathPhase.BREATHING || isPaused) {
          if (breathCycleTimeoutRef.current) clearTimeout(breathCycleTimeoutRef.current);
          return;
      }

      const runBreath = () => {
          // Check if it's the last breath of the round
          const isLastBreath = breathCount === config.breathsPerRound - 1;
          const currentExhaleDuration = isLastBreath ? FINAL_EXHALE_TIME_MS : EXHALE_TIME_MS;
          const cycleDuration = INHALE_TIME_MS + currentExhaleDuration;

          // Start Inhale
          setIsInhaling(true);
          triggerBreathSound(true);

          // Schedule Exhale
          setTimeout(() => {
              if (phase === BreathPhase.BREATHING && !isPaused) {
                  setIsInhaling(false);
                  triggerBreathSound(false, currentExhaleDuration);
              }
          }, INHALE_TIME_MS);

          // Schedule Next Breath
          breathCycleTimeoutRef.current = window.setTimeout(() => {
              setBreathCount(prev => {
                  const next = prev + 1;
                  if (next >= config.breathsPerRound) {
                      startRetentionPhase();
                      return 0;
                  }
                  runBreath();
                  return next;
              });
          }, cycleDuration);
      };

      runBreath();

      return () => {
          if (breathCycleTimeoutRef.current) clearTimeout(breathCycleTimeoutRef.current);
      };
  }, [phase, isPaused, config.breathsPerRound, breathCount]);

  const startBreathingPhase = () => {
    setPhase(BreathPhase.BREATHING);
    setBreathCount(0);
    setIsInhaling(true);
  };

  const startRetentionPhase = () => {
    setPhase(BreathPhase.RETENTION);
    setTimer(0);
  };

  const startNextRound = () => {
    setRound(r => r + 1);
    startBreathingPhase();
  };

  const handleRoundCompletion = () => {
    playBellSound();
    if (round + 1 >= config.rounds) {
      setPhase(BreathPhase.FINISHED);
      onFinish(totalSeconds / 60);
    } else {
      setPhase(BreathPhase.INTERMISSION);
    }
  };

  const handleSkip = () => {
    switch (phase) {
      case BreathPhase.PREPARE:
        startBreathingPhase();
        break;
      case BreathPhase.BREATHING:
        startRetentionPhase();
        break;
      case BreathPhase.RETENTION:
        setPhase(BreathPhase.RECOVERY_INHALE);
        break;
      case BreathPhase.RECOVERY_INHALE:
        setPhase(BreathPhase.RECOVERY_HOLD);
        break;
      case BreathPhase.RECOVERY_HOLD:
        handleRoundCompletion();
        break;
      case BreathPhase.INTERMISSION:
        startNextRound();
        break;
      default:
        break;
    }
  };

  // --- VISUALS ---
  const getBubbleClass = () => {
    if (phase === BreathPhase.BREATHING) {
        if (isInhaling) {
            return 'scale-150 opacity-100 duration-[1600ms]';
        } else {
            // Check if it is the last exhale
            if (breathCount === config.breathsPerRound - 1) {
                 return 'scale-75 opacity-60 duration-[3800ms]'; // Double duration
            }
            return 'scale-75 opacity-60 duration-[1900ms]';
        }
    }
    if (phase === BreathPhase.RETENTION) return 'scale-75 opacity-40 duration-1000';
    
    // Nueva fase Inhalación profunda de recuperación
    if (phase === BreathPhase.RECOVERY_INHALE) return 'scale-150 opacity-100 duration-[3200ms] ease-out';
    
    // Fase de mantenimiento
    if (phase === BreathPhase.RECOVERY_HOLD) return 'scale-150 opacity-100 duration-500';
    
    if (phase === BreathPhase.INTERMISSION) return 'scale-110 opacity-100 duration-500';
    return 'scale-100 opacity-80';
  };

  const getBgColor = () => {
      if (phase === BreathPhase.RETENTION) return 'from-slate-900 to-slate-950'; 
      if (phase === BreathPhase.RECOVERY_INHALE) return 'from-cyan-800/60 to-slate-900'; // Transition color
      if (phase === BreathPhase.RECOVERY_HOLD) return 'from-cyan-900/40 to-slate-900';
      if (phase === BreathPhase.INTERMISSION) return 'from-emerald-900/40 to-slate-900';
      return 'from-blue-900/20 to-slate-900';
  };

  const getInstructionText = () => {
    switch (phase) {
      case BreathPhase.PREPARE: return "Prepárate...";
      case BreathPhase.BREATHING: 
        if (isInhaling) return "Inhala...";
        if (breathCount === config.breathsPerRound - 1) return "¡Exhala profundo ahora!";
        return "Exhala...";
      case BreathPhase.RETENTION: return "Aguanta...";
      case BreathPhase.RECOVERY_INHALE: return "¡Inhala profundo!";
      case BreathPhase.RECOVERY_HOLD: return "Mantén (Aprieta)";
      case BreathPhase.INTERMISSION: return "¡Ronda Completada!";
      case BreathPhase.FINISHED: return "Terminado";
      default: return "";
    }
  };

  return (
    <div className={`relative flex flex-col items-center justify-center min-h-screen overflow-hidden bg-gradient-radial ${getBgColor()} transition-colors duration-1000`}>
      
      {/* Audio Blocked Overlay */}
      {audioBlocked && (
        <div 
            onClick={unlockAudio}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm cursor-pointer animate-fade-in"
        >
            <div className="bg-slate-800 p-6 rounded-xl border border-cyan-500/50 shadow-2xl flex flex-col items-center gap-4 animate-bounce-slight">
                <AlertCircle className="w-12 h-12 text-cyan-400" />
                <div className="text-center">
                    <h3 className="text-xl font-bold text-white">Audio en espera</h3>
                    <p className="text-slate-300">Toca la pantalla para activar el sonido</p>
                </div>
            </div>
        </div>
      )}

      {/* Info HUD */}
      <div className="absolute top-6 w-full flex justify-between px-8 text-slate-400 text-sm z-20">
        <div>Ronda {round + 1} / {config.rounds}</div>
        <div className="flex items-center gap-4">
             {musicLoading && <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />}
             {musicError && <span className="text-red-400 text-xs">Error de audio</span>}
             <button onClick={() => setIsMuted(!isMuted)} className="hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors">
                 {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
             </button>
            <div>{Math.floor(totalSeconds / 60)}:{(totalSeconds % 60).toString().padStart(2, '0')}</div>
        </div>
      </div>

      {/* Main Visual */}
      <div className="relative z-10 flex flex-col items-center justify-center w-full">
        
        <div className="relative w-64 h-64 md:w-80 md:h-80 flex items-center justify-center mb-12">
            <div className={`absolute inset-0 rounded-full bg-cyan-500/20 blur-3xl transition-all duration-1000 ${phase === BreathPhase.RETENTION ? 'opacity-10 scale-50' : 'opacity-50'}`}></div>
            
            <div className={`w-40 h-40 md:w-48 md:h-48 rounded-full bg-gradient-to-br from-cyan-200 to-blue-500 shadow-lg transition-all ease-in-out ${getBubbleClass()}`}></div>
            
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className={`text-5xl md:text-6xl font-bold text-white drop-shadow-lg transition-opacity duration-300 ${phase === BreathPhase.BREATHING ? 'opacity-0' : 'opacity-100'}`}>
                    {phase === BreathPhase.RETENTION 
                        ? <span className="font-mono">{Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}</span>
                        : phase === BreathPhase.INTERMISSION 
                            ? <Check className="w-12 h-12" />
                            : phase === BreathPhase.RECOVERY_INHALE ? '' 
                            : timer > 0 ? Math.ceil(timer) : ''
                    }
                </span>
            </div>
        </div>

        <div className="text-center space-y-2 h-24 px-4">
            <h2 className={`text-3xl font-bold tracking-wide animate-pulse ${phase === BreathPhase.BREATHING && !isInhaling && breathCount === config.breathsPerRound - 1 ? 'text-yellow-400 scale-110' : 'text-white'}`}>
                {getInstructionText()}
            </h2>
            <p className="text-cyan-300 font-medium text-lg">
                {phase === BreathPhase.BREATHING && `${breathCount + 1} / ${config.breathsPerRound}`}
                {phase === BreathPhase.RETENTION && `Objetivo: ${config.retentionTimes[round]}s`}
                {phase === BreathPhase.INTERMISSION && "Descansa brevemente..."}
            </p>
        </div>

        <div className="mt-8 flex gap-8 z-20 items-center">
            <button 
                onClick={onCancel}
                className="p-4 rounded-full bg-red-900/20 hover:bg-red-900/40 border border-red-900/50 text-red-400 transition-colors backdrop-blur-sm"
                title="Detener sesión"
            >
                <Square className="w-6 h-6 fill-current" />
            </button>

            <button 
                onClick={() => setIsPaused(!isPaused)}
                className="p-6 rounded-full bg-slate-800/80 hover:bg-slate-700 border border-slate-600 text-white transition-all hover:scale-105 shadow-xl backdrop-blur-sm"
                title={isPaused ? "Reanudar" : "Pausar"}
            >
                {isPaused ? <Play className="w-8 h-8 ml-1 fill-current" /> : <Pause className="w-8 h-8 fill-current" />}
            </button>
            
            <button 
                onClick={handleSkip}
                className="p-4 rounded-full bg-cyan-900/20 hover:bg-cyan-900/40 border border-cyan-900/50 text-cyan-400 transition-colors backdrop-blur-sm"
                title="Siguiente fase"
            >
                <SkipForward className="w-6 h-6 fill-current" />
            </button>
        </div>
      </div>
    </div>
  );
};