import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Award,
  CheckCircle2,
  Crown,
  Gift,
  Play,
  RotateCcw,
  Sparkles,
  Users,
} from 'lucide-react';
import { Participant, Prize, RiggedAssignments, WinnerRecord } from '../types';
import { ceremonyAudio } from '../audio/ceremonyAudio';

interface DrawStageProps {
  participants: Participant[];
  prizes: Prize[];
  winners: WinnerRecord[];
  riggedAssignments: RiggedAssignments;
  spinDurationSec: number;
  allowRepeatWinners: boolean;
  isSpinning: boolean;
  onSpinStateChange: (spinning: boolean) => void;
  onCommitWinners: (newWinners: WinnerRecord[]) => void;
  onUndoLastRound: (count: number) => void;
  onCelebrate: () => void;
}

interface ReelSlotDisplay {
  slotIndex: number;
  reelItems: Participant[];
  targetIndex: number;
  currentOffset: number;
  winner: Participant;
  locked: boolean;
}

const ITEM_HEIGHT = 118; // px for single grand reel row

/**
 * Smooth ceremonial 3-phase progress curve:
 * - 0.00 -> 0.12: gentle acceleration
 * - 0.12 -> 0.68: brisk steady cruise
 * - 0.68 -> 1.00: dramatic cubic/quartic deceleration to exact stop
 */
function ceremonialEase(t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  if (clamped < 0.12) {
    const p = clamped / 0.12;
    return 0.06 * (p * p);
  }
  if (clamped < 0.68) {
    const p = (clamped - 0.12) / 0.56;
    return 0.06 + 0.62 * p;
  }
  const p = (clamped - 0.68) / 0.32;
  const decel = 1 - Math.pow(1 - p, 3.6);
  return 0.68 + 0.32 * decel;
}

export const DrawStage: React.FC<DrawStageProps> = ({
  participants,
  prizes,
  winners,
  riggedAssignments,
  spinDurationSec,
  allowRepeatWinners,
  isSpinning,
  onSpinStateChange,
  onCommitWinners,
  onUndoLastRound,
  onCelebrate,
}) => {
  const sortedPrizes = useMemo(
    () => [...prizes].sort((a, b) => a.order - b.order),
    [prizes]
  );

  const [selectedPrizeId, setSelectedPrizeId] = useState<string>(
    sortedPrizes[0]?.id ?? ''
  );

  useEffect(() => {
    if (!sortedPrizes.some((p) => p.id === selectedPrizeId)) {
      setSelectedPrizeId(sortedPrizes[0]?.id ?? '');
    }
  }, [sortedPrizes, selectedPrizeId]);

  const activePrize = useMemo(
    () => sortedPrizes.find((p) => p.id === selectedPrizeId) ?? sortedPrizes[0],
    [sortedPrizes, selectedPrizeId]
  );

  const winnersForPrize = useMemo(() => {
    if (!activePrize) return [];
    return winners.filter((w) => w.prizeId === activePrize.id);
  }, [winners, activePrize]);

  const remainingSlots = activePrize
    ? Math.max(0, activePrize.quantity - winnersForPrize.length)
    : 0;

  // Animation state
  const [elapsedSec, setElapsedSec] = useState(0);
  const [reelSlots, setReelSlots] = useState<ReelSlotDisplay[]>([]);
  const [lastRevealedBatch, setLastRevealedBatch] = useState<WinnerRecord[]>([]);
  const [showRevealCard, setShowRevealCard] = useState(false);

  const rafRef = useRef<number | null>(null);
  const lastTickIndexRef = useRef<number>(-1);
  const lastTickTimeRef = useRef<number>(0);

  // Clear reveal screen when user manually switches to another prize (while not spinning)
  const handleSelectPrize = (id: string) => {
    if (isSpinning) return;
    setSelectedPrizeId(id);
    setShowRevealCard(false);
    setLastRevealedBatch([]);
    setReelSlots([]);
  };

  // Compute eligible pool
  const availablePool = useMemo(() => {
    const wonIds = new Set(winners.map((w) => w.participantId));
    return participants.filter(
      (p) => p.eligible && (allowRepeatWinners || !wonIds.has(p.id))
    );
  }, [participants, winners, allowRepeatWinners]);

  // IDs reserved for un-drawn slots in other prizes so random draws don't steal them unless necessary
  const reservedForFutureOtherSlots = useMemo(() => {
    const set = new Set<string>();
    for (const prize of sortedPrizes) {
      const wonCount = winners.filter((w) => w.prizeId === prize.id).length;
      const pins = riggedAssignments[prize.id] ?? [];
      for (let i = wonCount; i < prize.quantity; i++) {
        const pinnedId = pins[i];
        if (pinnedId) set.add(pinnedId);
      }
    }
    return set;
  }, [sortedPrizes, winners, riggedAssignments]);

  const buildReelForTarget = useCallback(
    (winner: Participant, length = 86): { items: Participant[]; targetIndex: number } => {
      const source = participants.length > 0 ? participants : [winner];
      const items: Participant[] = [];
      for (let i = 0; i < length; i++) {
        const rand = source[Math.floor(Math.random() * source.length)];
        items.push(rand);
      }
      const targetIndex = length - 4;
      // Ensure surrounding neighbors aren't identical to winner for visual realism
      items[targetIndex] = winner;
      if (source.length > 1) {
        if (items[targetIndex - 1]?.id === winner.id) {
          items[targetIndex - 1] = source.find((p) => p.id !== winner.id) ?? winner;
        }
        if (items[targetIndex + 1]?.id === winner.id) {
          items[targetIndex + 1] = source.find((p) => p.id !== winner.id) ?? winner;
        }
      }
      return { items, targetIndex };
    },
    [participants]
  );

  const startDraw = useCallback(() => {
    if (!activePrize || isSpinning || remainingSlots <= 0) return;
    if (availablePool.length === 0) return;

    ceremonyAudio.unlock();

    const drawCount =
      activePrize.spinMode === 'batch' ? remainingSlots : 1;
    const startSlotIndex = winnersForPrize.length;
    const pins = riggedAssignments[activePrize.id] ?? [];

    const usedInThisRound = new Set<string>();
    const chosenWinners: { slotIndex: number; participant: Participant }[] = [];

    // 1. Resolve pinned slots first so unpinned random slots won't take pinned winners
    const slotNeedsRandom: number[] = [];
    for (let k = 0; k < drawCount; k++) {
      const slotIdx = startSlotIndex + k;
      const pinnedId = pins[slotIdx];
      if (pinnedId) {
        const candidate = availablePool.find(
          (p) => p.id === pinnedId && !usedInThisRound.has(p.id)
        );
        if (candidate) {
          usedInThisRound.add(candidate.id);
          chosenWinners.push({ slotIndex: slotIdx, participant: candidate });
          continue;
        }
      }
      slotNeedsRandom.push(slotIdx);
    }

    // 2. Resolve random slots
    for (const slotIdx of slotNeedsRandom) {
      let candidates = availablePool.filter(
        (p) => !usedInThisRound.has(p.id) && !reservedForFutureOtherSlots.has(p.id)
      );
      if (candidates.length === 0) {
        candidates = availablePool.filter((p) => !usedInThisRound.has(p.id));
      }
      if (candidates.length === 0) {
        candidates = availablePool;
      }
      const picked = candidates[Math.floor(Math.random() * candidates.length)];
      if (picked) {
        usedInThisRound.add(picked.id);
        chosenWinners.push({ slotIndex: slotIdx, participant: picked });
      }
    }

    chosenWinners.sort((a, b) => a.slotIndex - b.slotIndex);
    if (chosenWinners.length === 0) return;

    const initialSlots: ReelSlotDisplay[] = chosenWinners.map((cw, idx) => {
      const reelLen = drawCount === 1 ? 92 : 68 + idx * 5;
      const { items, targetIndex } = buildReelForTarget(cw.participant, reelLen);
      return {
        slotIndex: cw.slotIndex,
        reelItems: items,
        targetIndex,
        currentOffset: 0,
        winner: cw.participant,
        locked: false,
      };
    });

    setShowRevealCard(false);
    setLastRevealedBatch([]);
    setReelSlots(initialSlots);
    setElapsedSec(0);
    lastTickIndexRef.current = -1;
    lastTickTimeRef.current = 0;

    onSpinStateChange(true);
    const durationMs = Math.max(3, spinDurationSec) * 1000;
    ceremonyAudio.startSpinCeremony(spinDurationSec);

    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const rawT = Math.min(1, elapsed / durationMs);
      setElapsedSec(Math.min(spinDurationSec, elapsed / 1000));

      const isBatch = initialSlots.length > 1;
      let leadOffset = 0;

      const updated = initialSlots.map((slot, idx) => {
        // For batch mode, stagger finish slightly between 86% and 100% for dramatic cascade
        const finishT = isBatch
          ? 0.86 + (idx / Math.max(1, initialSlots.length - 1)) * 0.14
          : 1.0;
        const localT = Math.min(1, rawT / finishT);
        const eased = ceremonialEase(localT);
        const offset = eased * slot.targetIndex;
        if (idx === initialSlots.length - 1) {
          leadOffset = offset;
        }
        return {
          ...slot,
          currentOffset: offset,
          locked: localT >= 1,
        };
      });

      setReelSlots(updated);

      // Audio tick synced to lead slot transition
      const curIdx = Math.floor(leadOffset);
      if (curIdx !== lastTickIndexRef.current && rawT < 0.995) {
        lastTickIndexRef.current = curIdx;
        const minInterval = rawT < 0.68 ? 55 : 30;
        if (now - lastTickTimeRef.current > minInterval) {
          lastTickTimeRef.current = now;
          ceremonyAudio.triggerReelTick(rawT);
        }
      }

      if (rawT < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        // Exact 15s completion!
        const finalRecords: WinnerRecord[] = chosenWinners.map((cw) => ({
          id: `win-${Date.now()}-${cw.slotIndex}-${Math.random().toString(36).slice(2, 6)}`,
          prizeId: activePrize.id,
          prizeName: activePrize.name,
          giftName: activePrize.giftName,
          participantId: cw.participant.id,
          participantCode: cw.participant.code,
          participantName: cw.participant.name,
          participantDepartment: cw.participant.department,
          wonAt: new Date().toISOString(),
          slotIndex: cw.slotIndex,
        }));

        onSpinStateChange(false);
        setLastRevealedBatch(finalRecords);
        setShowRevealCard(true);
        onCommitWinners(finalRecords);
        ceremonyAudio.playWinFanfare();
        onCelebrate();
      }
    };

    rafRef.current = requestAnimationFrame(step);
  }, [
    activePrize,
    isSpinning,
    remainingSlots,
    availablePool,
    winnersForPrize.length,
    riggedAssignments,
    reservedForFutureOtherSlots,
    buildReelForTarget,
    onSpinStateChange,
    spinDurationSec,
    onCommitWinners,
    onCelebrate,
  ]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Spacebar shortcut to start draw when stage is ready
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT')
      ) {
        return;
      }
      if (e.code === 'Space' && !isSpinning && remainingSlots > 0 && availablePool.length > 0) {
        // Don't hijack Space if a modal is open
        if (document.querySelector('[data-modal-open="true"]')) return;
        e.preventDefault();
        startDraw();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isSpinning, remainingSlots, availablePool.length, startDraw]);

  const handleUndoCurrentReveal = () => {
    if (isSpinning || lastRevealedBatch.length === 0) return;
    onUndoLastRound(lastRevealedBatch.length);
    setShowRevealCard(false);
    setLastRevealedBatch([]);
    setReelSlots([]);
  };

  if (!activePrize) {
    return (
      <div className="gold-card mx-auto mt-8 max-w-xl rounded-2xl p-8 text-center">
        <p className="text-amber-200">Chưa có giải thưởng nào được cấu hình.</p>
      </div>
    );
  }

  const progressPct = Math.min(100, (elapsedSec / Math.max(1, spinDurationSec)) * 100);
  const phaseLabel =
    progressPct < 15
      ? 'Khởi động vòng quay may mắn...'
      : progressPct < 70
        ? 'Đang lựa chọn chủ nhân may mắn...'
        : progressPct < 99
          ? 'Khoảnh khắc hồi hộp sắp lộ diện...'
          : 'Chúc mừng chủ nhân giải thưởng!';

  return (
    <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-4 pb-10 pt-2">
      {/* Prize Selector Pills */}
      <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
        {sortedPrizes.map((prize) => {
          const wonCount = winners.filter((w) => w.prizeId === prize.id).length;
          const rem = Math.max(0, prize.quantity - wonCount);
          const isSelected = prize.id === activePrize.id;
          return (
            <button
              key={prize.id}
              type="button"
              disabled={isSpinning}
              onClick={() => handleSelectPrize(prize.id)}
              className={`group relative flex items-center gap-2 rounded-full px-4 py-1.5 text-xs sm:text-sm font-semibold transition-all duration-200 border ${
                isSelected
                  ? 'border-amber-300 bg-gradient-to-r from-amber-500/30 via-amber-400/20 to-amber-500/30 text-amber-100 shadow-[0_0_20px_rgba(245,194,72,0.35)]'
                  : 'border-amber-200/20 bg-slate-950/60 text-slate-300 hover:border-amber-300/50 hover:text-amber-100'
              } ${isSpinning ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {prize.order === sortedPrizes[sortedPrizes.length - 1]?.order ? (
                <Crown className="h-3.5 w-3.5 text-amber-300" />
              ) : (
                <Award className="h-3.5 w-3.5 text-amber-300/80" />
              )}
              <span>{prize.name}</span>
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  rem === 0
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-amber-400/20 text-amber-200'
                }`}
              >
                {rem === 0 ? 'Xong' : `${rem}/${prize.quantity}`}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Stage Frame */}
      <div className="gold-card relative w-full overflow-hidden rounded-3xl p-5 sm:p-8">
        {/* Subtle decorative corner flourishes */}
        <div className="pointer-events-none absolute left-0 top-0 h-20 w-20 border-l-2 border-t-2 border-amber-300/40 rounded-tl-3xl" />
        <div className="pointer-events-none absolute right-0 top-0 h-20 w-20 border-r-2 border-t-2 border-amber-300/40 rounded-tr-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-20 w-20 border-b-2 border-l-2 border-amber-300/40 rounded-bl-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-20 w-20 border-b-2 border-r-2 border-amber-300/40 rounded-br-3xl" />

        {/* Prize Showcase Header */}
        <div className="flex flex-col items-center text-center">
          <div className="inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 rounded-full border border-amber-300/35 bg-amber-400/10 px-4 py-1 text-[11px] sm:text-xs font-semibold uppercase tracking-[0.1em] sm:tracking-[0.18em] text-amber-200">
            <Gift className="h-3.5 w-3.5 text-amber-300" />
            <span>{activePrize.name}</span>
            <span className="text-amber-300/60">•</span>
            <span>
              {activePrize.spinMode === 'batch' && remainingSlots > 1
                ? `Quay ${remainingSlots} giải cùng lúc`
                : `Còn ${remainingSlots} / ${activePrize.quantity} giải`}
            </span>
          </div>

          <h3 className="mt-2.5 text-xl sm:text-3xl font-bold text-white tracking-wide drop-shadow">
            {activePrize.giftName}
          </h3>
          {activePrize.giftValue && (
            <p className="mt-1 text-xs sm:text-sm font-medium text-amber-300/90">
              Giá trị giải thưởng: {activePrize.giftValue}
            </p>
          )}
        </div>

        {/* Center Lucky Draw Arena */}
        <div className="mt-6">
          {/* STATE 1: WINNER REVEAL SPOTLIGHT */}
          {showRevealCard && lastRevealedBatch.length > 0 ? (
            <div className="animate-winner-pop">
              <div className="mb-4 flex items-center justify-center gap-2 text-amber-300">
                <Sparkles className="h-5 w-5 animate-pulse" />
                <span className="text-sm sm:text-base font-bold uppercase tracking-[0.2em]">
                  CHÚC MỪNG NGƯỜI TRÚNG {activePrize.name}
                </span>
                <Sparkles className="h-5 w-5 animate-pulse" />
              </div>

              {lastRevealedBatch.length === 1 ? (
                <div className="gold-card-winner relative mx-auto max-w-2xl overflow-hidden rounded-2xl p-6 sm:p-9 text-center">
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-amber-200/15 to-transparent animate-shimmer" />
                  <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/60 bg-amber-400/20 px-4 py-1 text-sm font-bold tracking-widest text-amber-100">
                    <span>MÃ SỐ: {lastRevealedBatch[0].participantCode}</span>
                  </div>
                  <div className="font-display-gold mt-4 text-3xl sm:text-5xl font-extrabold tracking-wide leading-tight">
                    {lastRevealedBatch[0].participantName}
                  </div>
                  <p className="mt-3 text-base sm:text-xl font-medium text-amber-100/90">
                    {lastRevealedBatch[0].participantDepartment}
                  </p>
                </div>
              ) : (
                <div
                  className={`grid gap-3 sm:gap-4 ${
                    lastRevealedBatch.length <= 4
                      ? 'grid-cols-1 sm:grid-cols-2'
                      : lastRevealedBatch.length <= 6
                        ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                        : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5'
                  }`}
                >
                  {lastRevealedBatch.map((w, idx) => (
                    <div
                      key={w.id}
                      style={{ animationDelay: `${idx * 80}ms` }}
                      className="gold-card-winner animate-winner-pop relative overflow-hidden rounded-xl p-4 text-center"
                    >
                      <div className="inline-block rounded-full border border-amber-300/45 bg-amber-400/15 px-2.5 py-0.5 text-[11px] font-bold tracking-wider text-amber-200">
                        {w.participantCode}
                      </div>
                      <div className="mt-2 text-lg sm:text-xl font-extrabold text-amber-100 leading-snug">
                        {w.participantName}
                      </div>
                      <div className="mt-1 text-xs text-slate-300/90 line-clamp-2">
                        {w.participantDepartment}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : isSpinning || reelSlots.length > 0 ? (
            /* STATE 2: ACTIVE 15s SPINNING REELS */
            <div>
              {reelSlots.length === 1 ? (
                /* Grand Single Drum Reel */
                <div className="relative mx-auto max-w-3xl">
                  {/* Outer glow halo */}
                  <div className="animate-pulse-aura pointer-events-none absolute -inset-2 rounded-3xl bg-gradient-to-r from-amber-500/20 via-rose-500/15 to-amber-500/20 blur-xl" />

                  <div
                    className="relative overflow-hidden rounded-2xl border-2 border-amber-300/70 bg-[#040c20]/95 shadow-[inset_0_0_50px_rgba(0,0,0,0.85)]"
                    style={{ height: `${ITEM_HEIGHT * 3}px` }}
                  >
                    {/* Top & bottom gradient fade masks */}
                    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-24 bg-gradient-to-b from-[#030917] via-[#030917]/80 to-transparent" />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-24 bg-gradient-to-t from-[#030917] via-[#030917]/80 to-transparent" />

                    {/* Center Target Highlight Frame */}
                    <div
                      className="pointer-events-none absolute inset-x-3 z-20 rounded-xl border-2 border-amber-300/90 bg-amber-400/10 shadow-[0_0_30px_rgba(245,194,72,0.32)]"
                      style={{
                        top: `${ITEM_HEIGHT}px`,
                        height: `${ITEM_HEIGHT}px`,
                      }}
                    >
                      <div className="absolute -left-1.5 top-1/2 h-4 w-3 -translate-y-1/2 rounded-r bg-amber-300 shadow-[0_0_12px_#fcd34d]" />
                      <div className="absolute -right-1.5 top-1/2 h-4 w-3 -translate-y-1/2 rounded-l bg-amber-300 shadow-[0_0_12px_#fcd34d]" />
                    </div>

                    {/* Scrolling strip */}
                    <div
                      className="relative z-10 will-change-transform"
                      style={{
                        transform: `translate3d(0, ${
                          ITEM_HEIGHT - reelSlots[0].currentOffset * ITEM_HEIGHT
                        }px, 0)`,
                      }}
                    >
                      {reelSlots[0].reelItems.map((item, idx) => (
                        <div
                          key={`${item.id}-${idx}`}
                          className="flex flex-col items-center justify-center px-6 text-center"
                          style={{ height: `${ITEM_HEIGHT}px` }}
                        >
                          <span className="rounded-full border border-amber-300/35 bg-amber-400/15 px-3 py-0.5 text-xs font-bold tracking-widest text-amber-200">
                            {item.code}
                          </span>
                          <span className="mt-1.5 text-2xl sm:text-4xl font-extrabold tracking-wide text-white drop-shadow-[0_2px_10px_rgba(245,194,72,0.3)]">
                            {item.name}
                          </span>
                          <span className="mt-0.5 text-xs sm:text-sm text-amber-100/75">
                            {item.department}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* Multi-Slot Cascading Matrix */
                <div
                  className={`grid gap-3 ${
                    reelSlots.length <= 4
                      ? 'grid-cols-1 sm:grid-cols-2'
                      : reelSlots.length <= 6
                        ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                        : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5'
                  }`}
                >
                  {reelSlots.map((slot, sIdx) => {
                    const idx = Math.min(
                      slot.reelItems.length - 1,
                      Math.floor(slot.currentOffset)
                    );
                    const currentItem = slot.reelItems[idx] ?? slot.winner;
                    return (
                      <div
                        key={slot.slotIndex}
                        className={`relative overflow-hidden rounded-xl border p-4 text-center transition-all duration-300 ${
                          slot.locked
                            ? 'gold-card-winner scale-[1.01]'
                            : 'border-amber-300/35 bg-[#051028]/90'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-amber-300/75">
                          <span>Giải #{sIdx + 1}</span>
                          <span>{currentItem.code}</span>
                        </div>
                        <div className="mt-2 truncate text-base sm:text-lg font-extrabold text-white">
                          {currentItem.name}
                        </div>
                        <div className="mt-1 truncate text-[11px] text-slate-300/80">
                          {currentItem.department}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 15s Progress Bar */}
              <div className="mx-auto mt-5 max-w-2xl">
                <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-amber-200/90">
                  <span>{phaseLabel}</span>
                  <span className="font-mono font-bold text-amber-300">
                    {elapsedSec.toFixed(1)}s / {spinDurationSec.toFixed(1)}s
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-900/90 p-0.5 border border-amber-300/25">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-400 shadow-[0_0_14px_rgba(251,191,36,0.75)] transition-[width] duration-75"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            </div>
          ) : (
            /* STATE 3: STANDBY / READY TO SPIN */
            <div className="mx-auto max-w-3xl rounded-2xl border border-amber-300/25 bg-[#040d22]/75 px-6 py-10 text-center">
              {remainingSlots > 0 ? (
                <>
                  <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full border border-amber-300/40 bg-amber-400/10 text-amber-300 shadow-[0_0_24px_rgba(245,194,72,0.2)]">
                    <Sparkles className="h-7 w-7" />
                  </div>
                  <p className="text-lg sm:text-2xl font-bold text-amber-100">
                    Sẵn sàng tìm chủ nhân may mắn
                  </p>
                  <p className="mt-2 text-xs sm:text-sm text-slate-300/85">
                    Tổng số người tham gia hợp lệ:{' '}
                    <span className="font-bold text-amber-300">
                      {availablePool.length}
                    </span>{' '}
                    người • Thời gian quay:{' '}
                    <span className="font-bold text-amber-300">
                      {spinDurationSec} giây
                    </span>
                  </p>
                </>
              ) : (
                <div className="py-2">
                  <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400" />
                  <p className="mt-3 text-xl font-bold text-emerald-200">
                    {activePrize.name} đã trao đủ {activePrize.quantity} giải!
                  </p>
                  <p className="mt-1 text-sm text-slate-300">
                    Chọn hạng mục giải thưởng khác ở phía trên hoặc mở Bảng Vinh Danh để xem kết quả.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Bar */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {remainingSlots > 0 && (
            <button
              type="button"
              disabled={isSpinning || availablePool.length === 0}
              onClick={startDraw}
              className="gold-button relative inline-flex items-center gap-3 overflow-hidden rounded-full px-8 py-3.5 text-base sm:text-lg font-extrabold tracking-wide disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/35 to-transparent animate-shimmer" />
              <Play className="h-5 w-5 fill-current" />
              <span>
                {isSpinning
                  ? 'ĐANG QUAY SỐ...'
                  : showRevealCard
                    ? 'QUAY LƯỢT TIẾP THEO'
                    : 'BẮT ĐẦU QUAY SỐ'}
              </span>
            </button>
          )}

          {showRevealCard && lastRevealedBatch.length > 0 && !isSpinning && (
            <button
              type="button"
              onClick={handleUndoCurrentReveal}
              title="Hủy kết quả lượt vừa quay để quay lại"
              className="inline-flex items-center gap-2 rounded-full border border-rose-400/40 bg-rose-950/50 px-4 py-2.5 text-xs sm:text-sm font-semibold text-rose-200 hover:bg-rose-900/60 transition cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Hủy &amp; Quay lại lượt này</span>
            </button>
          )}
        </div>

        {/* Existing winners for this prize (subtle strip at bottom if any prior rounds exist) */}
        {winnersForPrize.length > 0 && !isSpinning && (
          <div className="mt-6 border-t border-amber-300/15 pt-4">
            <div className="mb-2 flex items-center justify-between text-xs text-amber-200/80">
              <span className="inline-flex items-center gap-1.5 font-semibold uppercase tracking-wider">
                <Users className="h-3.5 w-3.5" />
                Danh sách đã trúng {activePrize.name} ({winnersForPrize.length}/
                {activePrize.quantity})
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {winnersForPrize.map((w) => (
                <div
                  key={w.id}
                  className="inline-flex items-center gap-2 rounded-lg border border-amber-300/25 bg-slate-900/75 px-3 py-1.5 text-xs"
                >
                  <span className="font-mono font-bold text-amber-300">
                    {w.participantCode}
                  </span>
                  <span className="font-semibold text-white">{w.participantName}</span>
                  <span className="hidden sm:inline text-slate-400">
                    ({w.participantDepartment})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
};
