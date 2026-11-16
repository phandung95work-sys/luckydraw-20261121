export interface Participant {
  id: string;
  code: string;
  name: string;
  department: string;
  eligible: boolean;
}

export type SpinMode = 'batch' | 'single';

export interface Prize {
  id: string;
  name: string;
  giftName: string;
  giftValue?: string;
  quantity: number;
  spinMode: SpinMode;
  colorAccent: 'gold' | 'crimson' | 'emerald' | 'sapphire';
  order: number;
}

export interface WinnerRecord {
  id: string;
  prizeId: string;
  prizeName: string;
  giftName: string;
  participantId: string;
  participantCode: string;
  participantName: string;
  participantDepartment: string;
  wonAt: string;
  slotIndex: number;
}

/**
 * Exact winner assignment per prizeId -> array of participantIds (or null for random).
 * Length matches prize.quantity.
 */
export type RiggedAssignments = Record<string, (string | null)[]>;

export interface AudioConfig {
  enabled: boolean;
  ambientEnabled: boolean;
  masterVolume: number; // 0 to 1
  customAmbientUrl?: string;
  customSpinUrl?: string;
  customWinUrl?: string;
}

export interface EventSettings {
  spinDurationSec: number; // default 15
  allowRepeatWinners: boolean; // default false
  backdropOpacity: number; // 0 to 0.65 subtle blend of original backdrop
  showEventFooter: boolean;
  eventTimeText: string;
  eventLocationText: string;
  adminPin: string; // empty string = no PIN required
}

export interface AppState {
  participants: Participant[];
  prizes: Prize[];
  winners: WinnerRecord[];
  riggedAssignments: RiggedAssignments;
  audio: AudioConfig;
  settings: EventSettings;
}
