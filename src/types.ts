export interface Participant {
  id: string;
  code: string;
  name: string;
  department: string;
  eligible: boolean;
}

export type SpinMode = 'batch' | 'single';

export function giftForSlot(prize: Prize, slotIndex: number): string {
  return prize.slotGifts?.[slotIndex] || prize.giftName;
}

export interface Prize {
  id: string;
  name: string;
  giftName: string;
  giftValue?: string;
  quantity: number;
  /** Phần quà từng suất khi một giải gồm nhiều món khác nhau. */
  slotGifts?: string[];
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
 * One entry per slot, length matches prize.quantity.
 * - null: random among everyone still eligible
 * - participant id: that exact person
 * - "pool:guests": random guest outside the four Agribank units
 * - "pool:dept:<department>": random inside that department
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
  spinDurationSec: number; // lượt đơn, mặc định 10. Giải Khuyến khích cố định 15 giây.
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
