import { Participant } from '../types';

/** Bốn đơn vị Agribank trong cơ cấu giải Ba. Khách mời là người ngoài các đơn vị này. */
export const INTERNAL_UNITS = [
  'Trung tâm CNTT',
  'Ban Công nghệ',
  'Ban Ngân hàng Số',
  'Trung tâm Quản lý Dữ liệu',
] as const;

export const GUEST_POOL = 'pool:guests';
export const DEPT_POOL_PREFIX = 'pool:dept:';

export function deptPool(department: string): string {
  return `${DEPT_POOL_PREFIX}${department}`;
}

export function isPersonPin(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.length > 0 && !value.startsWith('pool:');
}

function isPoolRule(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.startsWith('pool:');
}

/** Nhãn hiển thị cho ô quay theo nhóm. Ô chỉ định cá nhân không lộ tên. */
export function poolLabel(value: string | null | undefined): string | null {
  if (!isPoolRule(value)) return null;
  if (value === GUEST_POOL) return 'Khách mời';
  if (value.startsWith(DEPT_POOL_PREFIX)) return value.slice(DEPT_POOL_PREFIX.length);
  return null;
}

export function matchesPool(department: string, rule: string | null | undefined): boolean {
  if (!isPoolRule(rule)) return true;
  if (rule === GUEST_POOL) {
    return !(INTERNAL_UNITS as readonly string[]).includes(department);
  }
  if (rule.startsWith(DEPT_POOL_PREFIX)) {
    return department === rule.slice(DEPT_POOL_PREFIX.length);
  }
  return true;
}

export interface DrawPick {
  slotIndex: number;
  participant: Participant;
}

/**
 * Chọn người trúng cho một lượt quay.
 * Ô cá nhân dừng đúng người đó. Ô nhóm chỉ lấy trong nhóm.
 * Người đã ghim cho lượt khác nằm trong reservedIds và không bị bốc ngẫu nhiên.
 */
export function resolveDrawWinners(args: {
  participants: Participant[];
  reservedIds: Set<string>;
  pins: (string | null)[];
  startSlotIndex: number;
  drawCount: number;
}): { winners: DrawPick[]; error: string | null } {
  const { participants, reservedIds, pins, startSlotIndex, drawCount } = args;
  const used = new Set<string>();
  const chosen: DrawPick[] = [];
  const slotNeedsRandom: number[] = [];

  for (let k = 0; k < drawCount; k++) {
    const slotIdx = startSlotIndex + k;
    const pin = pins[slotIdx] ?? null;
    if (isPersonPin(pin)) {
      const candidate = participants.find((p) => p.id === pin && !used.has(p.id));
      if (!candidate) {
        return {
          winners: [],
          error: 'Người được chỉ định cho lượt này không còn trong danh sách quay.',
        };
      }
      used.add(candidate.id);
      chosen.push({ slotIndex: slotIdx, participant: candidate });
    } else {
      slotNeedsRandom.push(slotIdx);
    }
  }

  for (const slotIdx of slotNeedsRandom) {
    const rule = pins[slotIdx] ?? null;
    const constrained = typeof rule === 'string' && rule.startsWith('pool:');
    let candidates = participants.filter(
      (p) => !used.has(p.id) && !reservedIds.has(p.id) && matchesPool(p.department, rule)
    );
    if (!constrained && candidates.length === 0) {
      candidates = participants.filter(
        (p) => !used.has(p.id) && matchesPool(p.department, rule)
      );
    }
    if (candidates.length === 0) {
      const label = poolLabel(rule) ?? 'ngẫu nhiên';
      return {
        winners: [],
        error: `Không còn người phù hợp cho phạm vi "${label}".`,
      };
    }
    const picked = candidates[Math.floor(Math.random() * candidates.length)];
    used.add(picked.id);
    chosen.push({ slotIndex: slotIdx, participant: picked });
  }

  chosen.sort((a, b) => a.slotIndex - b.slotIndex);
  return { winners: chosen, error: null };
}
