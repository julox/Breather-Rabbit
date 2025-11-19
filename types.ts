export enum AppPhase {
  SETUP = 'SETUP',
  SESSION = 'SESSION',
  SUMMARY = 'SUMMARY'
}

export enum BreathPhase {
  PREPARE = 'PREPARE',
  BREATHING = 'BREATHING', // The 30-40 breaths
  RETENTION = 'RETENTION', // The breath hold
  RECOVERY = 'RECOVERY', // The 15s inhale hold
  INTERMISSION = 'INTERMISSION', // Break between rounds
  FINISHED = 'FINISHED'
}

export interface SessionConfig {
  rounds: number;
  breathsPerRound: number;
  retentionTimes: number[]; // Seconds per round
}

export interface BreathingState {
  currentRound: number;
  currentBreath: number;
  elapsedTime: number;
  phase: BreathPhase;
  isInhaling: boolean;
}