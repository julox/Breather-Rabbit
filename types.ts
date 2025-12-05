import React from 'react';

export enum AppPhase {
  SETUP = 'SETUP',
  SESSION = 'SESSION',
  SUMMARY = 'SUMMARY'
}

export enum BreathPhase {
  PREPARE = 'PREPARE',
  BREATHING = 'BREATHING', // The 30-40 breaths
  RETENTION = 'RETENTION', // The breath hold
  RECOVERY_INHALE = 'RECOVERY_INHALE', // The deep breath in after retention
  RECOVERY_HOLD = 'RECOVERY_HOLD', // The 15s hold
  INTERMISSION = 'INTERMISSION', // Break between rounds
  FINISHED = 'FINISHED'
}

export type AudioTheme = 'sea' | 'forest' | 'city' | 'autoway';

export interface SessionConfig {
  rounds: number;
  breathsPerRound: number;
  retentionTimes: number[]; // Seconds per round
  audioTheme: AudioTheme;
}

export interface BreathingState {
  currentRound: number;
  currentBreath: number;
  elapsedTime: number;
  phase: BreathPhase;
  isInhaling: boolean;
}