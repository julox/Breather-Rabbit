import React, { useState } from 'react';
import { SetupView } from './components/SetupView';
import { SessionView } from './components/SessionView';
import { SummaryView } from './components/SummaryView';
import { AppPhase, SessionConfig } from './types';

export default function App() {
  const [phase, setPhase] = useState<AppPhase>(AppPhase.SETUP);
  const [config, setConfig] = useState<SessionConfig | null>(null);
  const [sessionStats, setSessionStats] = useState<{ minutes: number } | null>(null);

  const handleStart = (newConfig: SessionConfig) => {
    setConfig(newConfig);
    setPhase(AppPhase.SESSION);
  };

  const handleFinish = (minutes: number) => {
    setSessionStats({ minutes });
    setPhase(AppPhase.SUMMARY);
  };

  const handleReset = () => {
    setPhase(AppPhase.SETUP);
    setConfig(null);
    setSessionStats(null);
  };

  return (
    <main className="antialiased selection:bg-cyan-500/30">
      {phase === AppPhase.SETUP && (
        <SetupView onStart={handleStart} />
      )}
      
      {phase === AppPhase.SESSION && config && (
        <SessionView 
          config={config} 
          onFinish={handleFinish} 
          onCancel={handleReset}
        />
      )}

      {phase === AppPhase.SUMMARY && sessionStats && config && (
        <SummaryView 
            rounds={config.rounds} 
            elapsedMinutes={sessionStats.minutes} 
            onReset={handleReset} 
        />
      )}
    </main>
  );
}