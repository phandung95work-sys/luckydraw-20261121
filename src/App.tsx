import { useCallback, useEffect, useState } from 'react';
import {
  Calendar,
  MapPin,
  Maximize2,
  Minimize2,
  Music,
  RotateCcw,
  Settings,
  Trophy,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { AppState, WinnerRecord } from './types';
import { DEFAULT_APP_STATE } from './data/defaultData';
import { ceremonyAudio } from './audio/ceremonyAudio';
import { CosmicBackdrop } from './components/CosmicBackdrop';
import { BrandHeader } from './components/BrandHeader';
import { DrawStage } from './components/DrawStage';
import { WinnersBoard } from './components/WinnersBoard';
import { AdminModal } from './components/AdminModal';

const STORAGE_KEY = 'agribank_gala_luckydraw_v1';

function loadInitialState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_APP_STATE;
    const parsed = JSON.parse(raw) as Partial<AppState>;
    return {
      participants:
        Array.isArray(parsed.participants) && parsed.participants.length > 0
          ? parsed.participants
          : DEFAULT_APP_STATE.participants,
      prizes:
        Array.isArray(parsed.prizes) && parsed.prizes.length > 0
          ? parsed.prizes
          : DEFAULT_APP_STATE.prizes,
      winners: Array.isArray(parsed.winners) ? parsed.winners : [],
      riggedAssignments: parsed.riggedAssignments ?? {},
      audio: { ...DEFAULT_APP_STATE.audio, ...(parsed.audio ?? {}) },
      settings: { ...DEFAULT_APP_STATE.settings, ...(parsed.settings ?? {}) },
    };
  } catch {
    return DEFAULT_APP_STATE;
  }
}

export function App() {
  const [state, setState] = useState<AppState>(loadInitialState);
  const [isSpinning, setIsSpinning] = useState(false);
  const [celebrateKey, setCelebrateKey] = useState(0);
  const [showWinnersBoard, setShowWinnersBoard] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hideControls, setHideControls] = useState(false);
  const [stageKey, setStageKey] = useState(0);

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore quota issues
    }
  }, [state]);

  // Sync audio engine
  useEffect(() => {
    ceremonyAudio.updateConfig(state.audio);
  }, [state.audio]);

  // Keyboard shortcuts: Ctrl+Shift+A opens Admin, H toggles discreet toolbar
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        if (!isSpinning) setShowAdminModal((v) => !v);
      } else if (
        e.key.toLowerCase() === 'h' &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey
      ) {
        const tag = (e.target as HTMLElement | null)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        setHideControls((v) => !v);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isSpinning]);

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // fullscreen blocked
    }
  };

  const handleCommitWinners = useCallback((newWinners: WinnerRecord[]) => {
    setState((prev) => ({
      ...prev,
      winners: [...prev.winners, ...newWinners],
    }));
  }, []);

  const handleUndoLastRound = useCallback((count: number) => {
    setState((prev) => ({
      ...prev,
      winners: prev.winners.slice(0, Math.max(0, prev.winners.length - count)),
    }));
  }, []);

  const handleRemoveWinner = useCallback((winnerId: string) => {
    setState((prev) => ({
      ...prev,
      winners: prev.winners.filter((w) => w.id !== winnerId),
    }));
  }, []);

  const handleResetWinners = useCallback(() => {
    if (isSpinning) return;
    if (
      !window.confirm(
        'Xóa toàn bộ kết quả đã quay để bắt đầu chương trình mới?\n(Danh sách người chơi và giải thưởng được giữ nguyên)'
      )
    ) {
      return;
    }
    setState((prev) => ({ ...prev, winners: [] }));
    setStageKey((k) => k + 1);
  }, [isSpinning]);

  const toggleSound = () => {
    ceremonyAudio.unlock();
    setState((prev) => ({
      ...prev,
      audio: { ...prev.audio, enabled: !prev.audio.enabled },
    }));
  };

  const toggleAmbient = () => {
    ceremonyAudio.unlock();
    setState((prev) => ({
      ...prev,
      audio: {
        ...prev.audio,
        enabled: true,
        ambientEnabled: !prev.audio.ambientEnabled,
      },
    }));
  };

  return (
    <div className="relative flex min-h-screen flex-col justify-between overflow-hidden">
      <CosmicBackdrop
        isSpinning={isSpinning}
        celebrateKey={celebrateKey}
        backdropOpacity={state.settings.backdropOpacity}
      />

      {/* Discreet Floating Stage Control Bar */}
      {!hideControls && (
        <div className="relative z-30 flex w-full justify-end px-3 pt-2.5 md:fixed md:right-4 md:top-4 md:w-auto md:p-0">
          <div className="flex items-center gap-1.5 rounded-full border border-amber-300/25 bg-[#040c20]/80 px-2 py-1.5 backdrop-blur-md shadow-lg">
          <button
            type="button"
            onClick={toggleAmbient}
            title={
              state.audio.ambientEnabled
                ? 'Tắt nhạc nền chờ Gala'
                : 'Bật nhạc nền chờ Gala thanh lịch'
            }
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
              state.audio.ambientEnabled && state.audio.enabled
                ? 'bg-amber-400/20 text-amber-200 border border-amber-300/40'
                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
            }`}
          >
            <Music className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Nhạc nền</span>
          </button>

          <button
            type="button"
            onClick={toggleSound}
            title={state.audio.enabled ? 'Tắt toàn bộ âm thanh' : 'Bật âm thanh'}
            className="rounded-full p-1.5 text-slate-300 hover:bg-slate-800/80 hover:text-amber-200 transition cursor-pointer"
          >
            {state.audio.enabled ? (
              <Volume2 className="h-4 w-4 text-amber-300" />
            ) : (
              <VolumeX className="h-4 w-4 text-slate-400" />
            )}
          </button>

          <button
            type="button"
            disabled={isSpinning}
            onClick={() => setShowWinnersBoard(true)}
            title="Bảng Vinh Danh Trúng Giải"
            className="relative inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold text-amber-200 hover:bg-amber-400/15 disabled:opacity-50 transition cursor-pointer"
          >
            <Trophy className="h-3.5 w-3.5 text-amber-300" />
            <span className="hidden sm:inline">Vinh danh</span>
            {state.winners.length > 0 && (
              <span className="rounded-full bg-amber-400 px-1.5 py-0.2 text-[10px] font-extrabold text-slate-950">
                {state.winners.length}
              </span>
            )}
          </button>

          <button
            type="button"
            disabled={isSpinning || state.winners.length === 0}
            onClick={handleResetWinners}
            title="Reset toàn bộ kết quả đã quay"
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold text-rose-200 hover:bg-rose-500/15 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Thoát toàn màn hình' : 'Trình chiếu toàn màn hình'}
            className="rounded-full p-1.5 text-slate-300 hover:bg-slate-800/80 hover:text-white transition cursor-pointer"
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </button>

          <button
            type="button"
            disabled={isSpinning}
            onClick={() => setShowAdminModal(true)}
            title="Cấu hình giải thưởng, danh sách & người trúng (Ctrl+Shift+A)"
            className="rounded-full p-1.5 text-slate-300 hover:bg-slate-800/80 hover:text-amber-200 disabled:opacity-50 transition cursor-pointer"
          >
            <Settings className="h-4 w-4" />
          </button>
          </div>
        </div>
      )}

      {/* Brand Header */}
      <BrandHeader compact={isSpinning} />

      {/* Main Lucky Draw Stage */}
      <DrawStage
        key={stageKey}
        participants={state.participants}
        prizes={state.prizes}
        winners={state.winners}
        riggedAssignments={state.riggedAssignments}
        spinDurationSec={state.settings.spinDurationSec}
        allowRepeatWinners={state.settings.allowRepeatWinners}
        isSpinning={isSpinning}
        onSpinStateChange={setIsSpinning}
        onCommitWinners={handleCommitWinners}
        onUndoLastRound={handleUndoLastRound}
        onCelebrate={() => setCelebrateKey((k) => k + 1)}
      />

      {/* Event Footer matching Backdrop */}
      {state.settings.showEventFooter && (
        <footer className="relative z-10 pb-2.5 pt-0.5 text-center select-none">
          <div className="inline-flex flex-wrap items-center justify-center gap-3 px-4 text-[11px] sm:text-xs font-medium text-amber-100/85">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-amber-300" />
              <span>{state.settings.eventTimeText}</span>
            </span>
            <span className="text-amber-300/45">|</span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-amber-300" />
              <span>{state.settings.eventLocationText}</span>
            </span>
          </div>
        </footer>
      )}

      {/* Modals */}
      <WinnersBoard
        open={showWinnersBoard}
        onClose={() => setShowWinnersBoard(false)}
        prizes={state.prizes}
        winners={state.winners}
        onRemoveWinner={handleRemoveWinner}
        onResetWinners={handleResetWinners}
      />

      <AdminModal
        open={showAdminModal}
        onClose={() => setShowAdminModal(false)}
        state={state}
        onUpdateState={setState}
        onResetWinners={handleResetWinners}
        onResetAll={() => {
          setState(DEFAULT_APP_STATE);
          setStageKey((k) => k + 1);
        }}
      />
    </div>
  );
}

export default App;
