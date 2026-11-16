import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Check,
  Download,
  FileSpreadsheet,
  Gift,
  Lock,
  Music,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  Sliders,
  Sparkles,
  Target,
  Trash2,
  Upload,
  Users,
  X,
} from 'lucide-react';
import {
  AppState,
  AudioConfig,
  EventSettings,
  Participant,
  Prize,
} from '../types';
import { generateSampleParticipants } from '../data/defaultData';

interface AdminModalProps {
  open: boolean;
  onClose: () => void;
  state: AppState;
  onUpdateState: (updater: (prev: AppState) => AppState) => void;
  onResetWinners: () => void;
  onResetAll: () => void;
}

type TabKey = 'prizes' | 'participants' | 'rigging' | 'settings';

export const AdminModal: React.FC<AdminModalProps> = ({
  open,
  onClose,
  state,
  onUpdateState,
  onResetWinners,
  onResetAll,
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>('prizes');
  const [unlockedPin, setUnlockedPin] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  // Participant UI states
  const [searchTerm, setSearchTerm] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newDept, setNewDept] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [showBulkBox, setShowBulkBox] = useState(false);

  // Rigging search state per slot dropdown
  const [rigSearch, setRigSearch] = useState('');

  const filteredParticipants = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return state.participants;
    return state.participants.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        p.department.toLowerCase().includes(q)
    );
  }, [state.participants, searchTerm]);

  const sortedPrizes = useMemo(
    () => [...state.prizes].sort((a, b) => a.order - b.order),
    [state.prizes]
  );

  // Count pinned participants across all prizes to detect duplicate pinning
  const pinnedUsageMap = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const prize of sortedPrizes) {
      const arr = state.riggedAssignments[prize.id] ?? [];
      for (let i = 0; i < prize.quantity; i++) {
        const pid = arr[i];
        if (pid) {
          const list = map.get(pid) ?? [];
          list.push(`${prize.name} (#${i + 1})`);
          map.set(pid, list);
        }
      }
    }
    return map;
  }, [sortedPrizes, state.riggedAssignments]);

  const wonIdSet = useMemo(
    () => new Set(state.winners.map((w) => w.participantId)),
    [state.winners]
  );

  if (!open) return null;

  const needsPin = Boolean(state.settings.adminPin) && !unlockedPin;

  const handleClose = () => {
    setUnlockedPin(false);
    setPinInput('');
    setPinError(false);
    onClose();
  };

  if (needsPin) {
    return (
      <div
        data-modal-open="true"
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
      >
        <div className="gold-card w-full max-w-sm rounded-2xl p-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-amber-300/40 bg-amber-400/15 text-amber-300">
            <Lock className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold text-amber-100">
            Khu Vực Ban Tổ Chức
          </h3>
          <p className="mt-1 text-xs text-slate-300">
            Nhập mã PIN để mở bảng cấu hình chương trình
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (pinInput === state.settings.adminPin) {
                setUnlockedPin(true);
                setPinError(false);
              } else {
                setPinError(true);
              }
            }}
            className="mt-4 space-y-3"
          >
            <input
              type="password"
              autoFocus
              value={pinInput}
              onChange={(e) => {
                setPinInput(e.target.value);
                setPinError(false);
              }}
              placeholder="Nhập mã PIN..."
              className="w-full rounded-xl border border-amber-300/35 bg-slate-900/90 px-4 py-2.5 text-center text-base tracking-widest text-white outline-none focus:border-amber-300"
            />
            {pinError && (
              <p className="text-xs text-rose-400">Mã PIN chưa chính xác.</p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 rounded-xl border border-slate-600 bg-slate-800 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-700 cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="submit"
                className="gold-button flex-1 rounded-xl py-2 text-sm font-bold cursor-pointer"
              >
                Mở khóa
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // --- Prize handlers ---
  const addPrize = () => {
    const nextOrder =
      state.prizes.reduce((max, p) => Math.max(max, p.order), 0) + 1;
    const newPrize: Prize = {
      id: `prize-${Date.now()}`,
      name: `GIẢI THƯỞNG MỚI #${nextOrder}`,
      giftName: 'Phần quà chương trình',
      giftValue: '',
      quantity: 1,
      spinMode: 'single',
      colorAccent: 'gold',
      order: nextOrder,
    };
    onUpdateState((prev) => ({ ...prev, prizes: [...prev.prizes, newPrize] }));
  };

  const updatePrize = (id: string, patch: Partial<Prize>) => {
    onUpdateState((prev) => ({
      ...prev,
      prizes: prev.prizes.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }));
  };

  const deletePrize = (id: string) => {
    onUpdateState((prev) => {
      const nextRigged = { ...prev.riggedAssignments };
      delete nextRigged[id];
      return {
        ...prev,
        prizes: prev.prizes.filter((p) => p.id !== id),
        riggedAssignments: nextRigged,
      };
    });
  };

  const movePrize = (id: string, dir: -1 | 1) => {
    const idx = sortedPrizes.findIndex((p) => p.id === id);
    const swapIdx = idx + dir;
    if (idx < 0 || swapIdx < 0 || swapIdx >= sortedPrizes.length) return;
    const a = sortedPrizes[idx];
    const b = sortedPrizes[swapIdx];
    onUpdateState((prev) => ({
      ...prev,
      prizes: prev.prizes.map((p) => {
        if (p.id === a.id) return { ...p, order: b.order };
        if (p.id === b.id) return { ...p, order: a.order };
        return p;
      }),
    }));
  };

  // --- Participant handlers ---
  const addSingleParticipant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const num = String(state.participants.length + 1).padStart(3, '0');
    const item: Participant = {
      id: `p-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      code: newCode.trim() || `IT-${num}`,
      name: newName.trim(),
      department: newDept.trim() || 'Trung tâm CNTT Agribank',
      eligible: true,
    };
    onUpdateState((prev) => ({
      ...prev,
      participants: [item, ...prev.participants],
    }));
    setNewCode('');
    setNewName('');
    setNewDept('');
  };

  const parseAndImportLines = (text: string, replaceAll: boolean) => {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) return;

    const parsed: Participant[] = [];
    lines.forEach((line, idx) => {
      // Support Tab (Excel paste), comma, or semicolon
      const parts = line.includes('\t')
        ? line.split('\t')
        : line.includes(';')
          ? line.split(';')
          : line.split(',');

      const clean = parts.map((s) => s.trim().replace(/^"|"$/g, ''));
      // Skip obvious header line
      if (
        idx === 0 &&
        /họ.*tên|full\s*name|mã/i.test(clean.join(' '))
      ) {
        return;
      }

      let code = '';
      let name = '';
      let dept = 'Trung tâm CNTT Agribank';

      if (clean.length === 1) {
        name = clean[0];
      } else if (clean.length === 2) {
        // Could be Code + Name OR Name + Dept
        if (/^[A-Za-z0-9_-]{2,12}$/.test(clean[0]) && clean[0].length <= 12) {
          code = clean[0];
          name = clean[1];
        } else {
          name = clean[0];
          dept = clean[1];
        }
      } else {
        code = clean[0];
        name = clean[1];
        dept = clean[2] || dept;
      }

      if (!name) return;
      const seq = String((replaceAll ? 0 : state.participants.length) + parsed.length + 1).padStart(3, '0');
      parsed.push({
        id: `p-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 5)}`,
        code: code || `IT-${seq}`,
        name,
        department: dept,
        eligible: true,
      });
    });

    if (parsed.length === 0) return;

    onUpdateState((prev) => ({
      ...prev,
      participants: replaceAll ? parsed : [...prev.participants, ...parsed],
    }));
    setBulkText('');
    setShowBulkBox(false);
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');
      setBulkText(text);
      setShowBulkBox(true);
    };
    reader.readAsText(file, 'utf-8');
    e.target.value = '';
  };

  const downloadSampleCsv = () => {
    const sample =
      '\uFEFFMã NV,Họ và Tên,Phòng Ban\r\n' +
      state.participants
        .slice(0, 10)
        .map((p) => `"${p.code}","${p.name}","${p.department}"`)
        .join('\r\n');
    const blob = new Blob([sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mau-danh-sach-100-nguoi.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // --- Rigging handlers ---
  const setRiggedSlot = (prizeId: string, slotIndex: number, participantId: string | null) => {
    onUpdateState((prev) => {
      const prize = prev.prizes.find((p) => p.id === prizeId);
      const len = prize ? prize.quantity : slotIndex + 1;
      const current = [...(prev.riggedAssignments[prizeId] ?? Array(len).fill(null))];
      while (current.length < len) current.push(null);
      current[slotIndex] = participantId;
      return {
        ...prev,
        riggedAssignments: {
          ...prev.riggedAssignments,
          [prizeId]: current,
        },
      };
    });
  };

  const clearAllRigging = () => {
    onUpdateState((prev) => ({ ...prev, riggedAssignments: {} }));
  };

  // --- Settings / Audio handlers ---
  const updateAudio = (patch: Partial<AudioConfig>) => {
    onUpdateState((prev) => ({ ...prev, audio: { ...prev.audio, ...patch } }));
  };

  const updateSettings = (patch: Partial<EventSettings>) => {
    onUpdateState((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }));
  };

  const handleAudioFileUpload = (
    key: 'customAmbientUrl' | 'customSpinUrl' | 'customWinUrl',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      updateAudio({ [key]: String(reader.result ?? '') });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const exportFullBackup = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agribank-gala-config-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importFullBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result ?? '')) as AppState;
        if (Array.isArray(parsed.participants) && Array.isArray(parsed.prizes)) {
          onUpdateState(() => parsed);
        }
      } catch {
        alert('File JSON cấu hình không hợp lệ.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const totalPrizesCount = state.prizes.reduce((sum, p) => sum + p.quantity, 0);

  return (
    <div
      data-modal-open="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-5 backdrop-blur-md"
    >
      <div className="gold-card relative flex h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl">
        {/* Top Modal Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-300/25 px-5 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-300/35 bg-amber-400/15 text-amber-300">
              <Settings2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-amber-100">
                Bảng Cấu Hình Ban Tổ Chức
              </h2>
              <p className="text-[11px] text-slate-300">
                {state.participants.length} người tham gia • {state.prizes.length} hạng mục ({totalPrizesCount} phần quà)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-1.5 text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Bar */}
        <div className="flex overflow-x-auto border-b border-amber-300/20 bg-slate-950/60 px-4">
          {[
            { key: 'prizes', label: 'Cơ cấu giải thưởng', icon: Gift },
            { key: 'participants', label: `Người tham gia (${state.participants.length})`, icon: Users },
            { key: 'rigging', label: 'Chỉ định người trúng', icon: Target },
            { key: 'settings', label: 'Thời gian, Nhạc & Giao diện', icon: Sliders },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key as TabKey)}
                className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-xs sm:text-sm font-semibold transition cursor-pointer ${
                  active
                    ? 'border-amber-300 text-amber-200 bg-amber-400/5'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* TAB 1: PRIZES */}
          {activeTab === 'prizes' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs sm:text-sm text-slate-300">
                  Cấu hình tên giải, phần quà, số lượng người trúng giải và chế độ quay cho từng hạng mục.
                </p>
                <button
                  type="button"
                  onClick={addPrize}
                  className="gold-button inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>Thêm hạng mục giải</span>
                </button>
              </div>

              <div className="space-y-3">
                {sortedPrizes.map((prize, idx) => {
                  const wonCount = state.winners.filter((w) => w.prizeId === prize.id).length;
                  return (
                    <div
                      key={prize.id}
                      className="rounded-xl border border-amber-300/25 bg-slate-950/70 p-4"
                    >
                      <div className="grid gap-3 sm:grid-cols-12 items-end">
                        <div className="sm:col-span-3">
                          <label className="mb-1 block text-[11px] font-semibold uppercase text-amber-200/80">
                            Tên giải thưởng
                          </label>
                          <input
                            type="text"
                            value={prize.name}
                            onChange={(e) => updatePrize(prize.id, { name: e.target.value })}
                            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-bold text-white outline-none focus:border-amber-300"
                          />
                        </div>

                        <div className="sm:col-span-4">
                          <label className="mb-1 block text-[11px] font-semibold uppercase text-amber-200/80">
                            Tên phần quà
                          </label>
                          <input
                            type="text"
                            value={prize.giftName}
                            onChange={(e) => updatePrize(prize.id, { giftName: e.target.value })}
                            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-amber-300"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="mb-1 block text-[11px] font-semibold uppercase text-amber-200/80">
                            SL phần quà / người
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={100}
                            value={prize.quantity}
                            onChange={(e) =>
                              updatePrize(prize.id, {
                                quantity: Math.max(1, Number(e.target.value) || 1),
                              })
                            }
                            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-bold text-amber-300 outline-none focus:border-amber-300"
                          />
                        </div>

                        <div className="sm:col-span-3">
                          <label className="mb-1 block text-[11px] font-semibold uppercase text-amber-200/80">
                            Cách thức quay
                          </label>
                          <select
                            value={prize.spinMode}
                            onChange={(e) =>
                              updatePrize(prize.id, {
                                spinMode: e.target.value as 'batch' | 'single',
                              })
                            }
                            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs sm:text-sm text-white outline-none focus:border-amber-300"
                          >
                            <option value="single">Quay từng người (15s/lượt)</option>
                            <option value="batch">Quay 1 lần ra tất cả</option>
                          </select>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-2.5">
                        <div className="flex items-center gap-3">
                          <input
                            type="text"
                            placeholder="Giá trị giải (VD: 10.000.000 VNĐ)"
                            value={prize.giftValue ?? ''}
                            onChange={(e) => updatePrize(prize.id, { giftValue: e.target.value })}
                            className="w-56 rounded-lg border border-slate-700/80 bg-slate-900/70 px-2.5 py-1 text-xs text-slate-200 outline-none focus:border-amber-300"
                          />
                          {wonCount > 0 && (
                            <span className="text-xs text-emerald-300">
                              Đã trao: {wonCount}/{prize.quantity}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => movePrize(prize.id, -1)}
                            title="Di chuyển lên"
                            className="rounded-lg border border-slate-700 bg-slate-900 p-1.5 text-slate-300 hover:text-white disabled:opacity-35 cursor-pointer"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === sortedPrizes.length - 1}
                            onClick={() => movePrize(prize.id, 1)}
                            title="Di chuyển xuống"
                            className="rounded-lg border border-slate-700 bg-slate-900 p-1.5 text-slate-300 hover:text-white disabled:opacity-35 cursor-pointer"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={sortedPrizes.length <= 1}
                            onClick={() => deletePrize(prize.id)}
                            title="Xóa giải"
                            className="rounded-lg border border-rose-500/30 bg-rose-950/40 p-1.5 text-rose-300 hover:bg-rose-900/60 disabled:opacity-35 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: PARTICIPANTS */}
          {activeTab === 'participants' && (
            <div className="space-y-4">
              {/* Top actions */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="relative flex-1 min-w-[220px] max-w-sm">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Tìm mã số, họ tên, đơn vị..."
                    className="w-full rounded-xl border border-slate-700 bg-slate-900/90 py-2 pl-9 pr-3 text-sm text-white outline-none focus:border-amber-300"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowBulkBox((v) => !v)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300/40 bg-amber-400/15 px-3 py-2 text-xs font-semibold text-amber-200 hover:bg-amber-400/25 cursor-pointer"
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    <span>Dán từ Excel / CSV</span>
                  </button>

                  <label className="inline-flex items-center gap-1.5 rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 cursor-pointer">
                    <Upload className="h-4 w-4" />
                    <span>Nạp file CSV</span>
                    <input
                      type="file"
                      accept=".csv,.txt"
                      onChange={handleCsvUpload}
                      className="hidden"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={downloadSampleCsv}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 cursor-pointer"
                  >
                    <Download className="h-4 w-4" />
                    <span>File mẫu</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      onUpdateState((prev) => ({
                        ...prev,
                        participants: generateSampleParticipants(100),
                      }))
                    }
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 cursor-pointer"
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span>Tạo 100 mẫu</span>
                  </button>
                </div>
              </div>

              {/* Bulk Paste Box */}
              {showBulkBox && (
                <div className="rounded-xl border border-amber-300/40 bg-slate-950/85 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-amber-200">
                      Dán danh sách từ Excel (cột: Mã số | Họ và tên | Đơn vị — hoặc mỗi dòng một tên)
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowBulkBox(false)}
                      className="text-slate-400 hover:text-white cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <textarea
                    rows={5}
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    placeholder={`IT-001\tNguyễn Văn An\tPhòng Phát triển Phần mềm\nIT-002\tTrần Thị Bình\tPhòng An ninh thông tin`}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 p-3 text-xs text-white outline-none focus:border-amber-300"
                  />
                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => parseAndImportLines(bulkText, false)}
                      className="rounded-lg border border-amber-300/40 bg-amber-400/15 px-3.5 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-400/25 cursor-pointer"
                    >
                      Thêm nối tiếp vào danh sách
                    </button>
                    <button
                      type="button"
                      onClick={() => parseAndImportLines(bulkText, true)}
                      className="gold-button rounded-lg px-4 py-1.5 text-xs font-bold cursor-pointer"
                    >
                      Thay thế toàn bộ danh sách
                    </button>
                  </div>
                </div>
              )}

              {/* Quick Add Single Participant */}
              <form
                onSubmit={addSingleParticipant}
                className="grid gap-2 rounded-xl border border-slate-700/80 bg-slate-950/60 p-3 sm:grid-cols-12"
              >
                <input
                  type="text"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  placeholder="Mã (VD: IT-101)"
                  className="sm:col-span-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white outline-none focus:border-amber-300"
                />
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Họ và tên người tham gia *"
                  className="sm:col-span-4 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white outline-none focus:border-amber-300"
                />
                <input
                  type="text"
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                  placeholder="Phòng / Đơn vị"
                  className="sm:col-span-4 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white outline-none focus:border-amber-300"
                />
                <button
                  type="submit"
                  className="gold-button sm:col-span-2 inline-flex items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-bold cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Thêm</span>
                </button>
              </form>

              {/* Repeat winner toggle */}
              <label className="inline-flex items-center gap-2.5 text-xs sm:text-sm text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={state.settings.allowRepeatWinners}
                  onChange={(e) =>
                    updateSettings({ allowRepeatWinners: e.target.checked })
                  }
                  className="h-4 w-4 accent-amber-400"
                />
                <span>
                  Cho phép một người trúng nhiều giải (Mặc định tắt: mỗi người chỉ trúng tối đa 1 giải)
                </span>
              </label>

              {/* Participant Table */}
              <div className="max-h-[42vh] overflow-y-auto rounded-xl border border-slate-700/80 bg-slate-950/70">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-slate-900 text-amber-200/90 border-b border-slate-700">
                    <tr>
                      <th className="px-3 py-2.5">Mã số</th>
                      <th className="px-3 py-2.5">Họ và tên</th>
                      <th className="px-3 py-2.5">Đơn vị</th>
                      <th className="px-3 py-2.5 text-center">Trạng thái</th>
                      <th className="px-3 py-2.5 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {filteredParticipants.map((p) => {
                      const hasWon = wonIdSet.has(p.id);
                      return (
                        <tr key={p.id} className="hover:bg-slate-900/50">
                          <td className="px-3 py-2 font-mono font-bold text-amber-300">
                            {p.code}
                          </td>
                          <td className="px-3 py-2 font-semibold text-white">{p.name}</td>
                          <td className="px-3 py-2 text-slate-300">{p.department}</td>
                          <td className="px-3 py-2 text-center">
                            {hasWon ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                                <Check className="h-3 w-3" /> Đã trúng giải
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  onUpdateState((prev) => ({
                                    ...prev,
                                    participants: prev.participants.map((item) =>
                                      item.id === p.id
                                        ? { ...item, eligible: !item.eligible }
                                        : item
                                    ),
                                  }))
                                }
                                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold cursor-pointer ${
                                  p.eligible
                                    ? 'bg-sky-500/20 text-sky-200'
                                    : 'bg-slate-700 text-slate-400'
                                }`}
                              >
                                {p.eligible ? 'Tham gia' : 'Tạm ẩn'}
                              </button>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateState((prev) => ({
                                  ...prev,
                                  participants: prev.participants.filter((x) => x.id !== p.id),
                                }))
                              }
                              className="rounded p-1 text-slate-400 hover:bg-rose-950/60 hover:text-rose-300 cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: EXACT WINNER CONFIGURATION */}
          {activeTab === 'rigging' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300/30 bg-amber-400/10 p-3.5">
                <div className="space-y-0.5">
                  <p className="text-xs sm:text-sm font-bold text-amber-200 flex items-center gap-1.5">
                    <Target className="h-4 w-4" />
                    Chỉ định chính xác người trúng giải theo từng vị trí
                  </p>
                  <p className="text-[11px] sm:text-xs text-slate-300">
                    Các ô để <strong>Ngẫu nhiên công bằng</strong> sẽ quay tự động. Ô được chỉ định sẽ vẫn chạy hiệu ứng quay {state.settings.spinDurationSec}s tự nhiên và dừng chính xác vào người đã chọn.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={clearAllRigging}
                  className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 cursor-pointer"
                >
                  Đặt tất cả về Ngẫu nhiên
                </button>
              </div>

              <div className="relative max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={rigSearch}
                  onChange={(e) => setRigSearch(e.target.value)}
                  placeholder="Lọc nhanh tên người trong danh sách chọn..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-900/90 py-2 pl-9 pr-3 text-xs sm:text-sm text-white outline-none focus:border-amber-300"
                />
              </div>

              <div className="space-y-4">
                {sortedPrizes.map((prize) => {
                  const prizeWinners = state.winners.filter((w) => w.prizeId === prize.id);
                  const arr: (string | null)[] = state.riggedAssignments[prize.id] ?? [];

                  const candidateOptions = state.participants.filter((p) => {
                    if (!p.eligible) return false;
                    if (!rigSearch.trim()) return true;
                    const q = rigSearch.toLowerCase();
                    return (
                      p.name.toLowerCase().includes(q) ||
                      p.code.toLowerCase().includes(q) ||
                      p.department.toLowerCase().includes(q)
                    );
                  });

                  return (
                    <div
                      key={prize.id}
                      className="rounded-xl border border-amber-300/25 bg-slate-950/75 p-4"
                    >
                      <div className="mb-3 flex items-center justify-between border-b border-slate-800 pb-2">
                        <div>
                          <h4 className="text-sm font-bold text-amber-200">{prize.name}</h4>
                          <p className="text-xs text-slate-400">{prize.giftName}</p>
                        </div>
                        <span className="text-xs font-semibold text-slate-300">
                          {prize.quantity} vị trí
                        </span>
                      </div>

                      <div className="grid gap-2.5 sm:grid-cols-2">
                        {Array.from({ length: prize.quantity }).map((_, slotIdx) => {
                          const alreadyWon = prizeWinners.find(
                            (w) => w.slotIndex === slotIdx
                          );
                          const selectedId = arr[slotIdx] ?? '';
                          const usage = selectedId ? pinnedUsageMap.get(selectedId) ?? [] : [];
                          const isDuplicatePin = usage.length > 1;
                          const isAlreadyWonElsewhere =
                            Boolean(selectedId) &&
                            !alreadyWon &&
                            wonIdSet.has(selectedId) &&
                            !state.settings.allowRepeatWinners;

                          const selectedPerson = state.participants.find(
                            (p) => p.id === selectedId
                          );

                          return (
                            <div
                              key={slotIdx}
                              className="rounded-lg border border-slate-800 bg-slate-900/70 p-2.5"
                            >
                              <div className="mb-1.5 flex items-center justify-between text-[11px]">
                                <span className="font-bold text-amber-300">
                                  Người trúng #{slotIdx + 1}
                                </span>
                                {alreadyWon ? (
                                  <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                                    Đã quay: {alreadyWon.participantCode} - {alreadyWon.participantName}
                                  </span>
                                ) : selectedPerson ? (
                                  <span className="text-[10px] text-amber-200 font-semibold">
                                    Đã chỉ định
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-400">Ngẫu nhiên</span>
                                )}
                              </div>

                              <select
                                disabled={Boolean(alreadyWon)}
                                value={selectedId}
                                onChange={(e) =>
                                  setRiggedSlot(
                                    prize.id,
                                    slotIdx,
                                    e.target.value ? e.target.value : null
                                  )
                                }
                                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-white outline-none focus:border-amber-300 disabled:opacity-50"
                              >
                                <option value="">🎲 [Ngẫu nhiên công bằng]</option>
                                {selectedPerson &&
                                  !candidateOptions.some((c) => c.id === selectedPerson.id) && (
                                    <option value={selectedPerson.id}>
                                      {selectedPerson.code} — {selectedPerson.name} ({selectedPerson.department})
                                    </option>
                                  )}
                                {candidateOptions.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.code} — {p.name} ({p.department})
                                  </option>
                                ))}
                              </select>

                              {(isDuplicatePin || isAlreadyWonElsewhere) && (
                                <p className="mt-1 flex items-center gap-1 text-[10px] text-amber-400">
                                  <AlertTriangle className="h-3 w-3 shrink-0" />
                                  <span>
                                    {isAlreadyWonElsewhere
                                      ? 'Người này đã trúng giải trước đó.'
                                      : `Đang trùng chỉ định ở: ${usage.join(', ')}`}
                                  </span>
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: SETTINGS & AUDIO */}
          {activeTab === 'settings' && (
            <div className="space-y-5">
              {/* Spin Timing & Security */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-amber-300/25 bg-slate-950/70 p-4 space-y-3">
                  <h4 className="flex items-center gap-2 text-sm font-bold text-amber-200">
                    <Sparkles className="h-4 w-4" />
                    Thời gian quay &amp; An toàn sân khấu
                  </h4>

                  <div>
                    <label className="mb-1 flex justify-between text-xs text-slate-300">
                      <span>Thời gian mỗi lượt quay</span>
                      <span className="font-bold text-amber-300">
                        {state.settings.spinDurationSec} giây
                      </span>
                    </label>
                    <input
                      type="range"
                      min={5}
                      max={30}
                      step={1}
                      value={state.settings.spinDurationSec}
                      onChange={(e) =>
                        updateSettings({ spinDurationSec: Number(e.target.value) })
                      }
                      className="w-full accent-amber-400"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs text-slate-300">
                      Mã PIN bảo vệ Bảng Cấu Hình (để trống nếu không cần)
                    </label>
                    <input
                      type="text"
                      value={state.settings.adminPin}
                      onChange={(e) => updateSettings({ adminPin: e.target.value })}
                      placeholder="VD: 2026"
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white outline-none focus:border-amber-300"
                    />
                  </div>
                </div>

                {/* Visual Backdrop Settings */}
                <div className="rounded-xl border border-amber-300/25 bg-slate-950/70 p-4 space-y-3">
                  <h4 className="text-sm font-bold text-amber-200">
                    Giao diện &amp; Thông tin sự kiện
                  </h4>

                  <div>
                    <label className="mb-1 flex justify-between text-xs text-slate-300">
                      <span>Độ hòa trộn ảnh Backdrop gốc</span>
                      <span className="font-bold text-amber-300">
                        {Math.round(state.settings.backdropOpacity * 100)}%
                      </span>
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={0.65}
                      step={0.05}
                      value={state.settings.backdropOpacity}
                      onChange={(e) =>
                        updateSettings({ backdropOpacity: Number(e.target.value) })
                      }
                      className="w-full accent-amber-400"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={state.settings.eventTimeText}
                      onChange={(e) => updateSettings({ eventTimeText: e.target.value })}
                      className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white outline-none focus:border-amber-300"
                    />
                    <input
                      type="text"
                      value={state.settings.eventLocationText}
                      onChange={(e) => updateSettings({ eventLocationText: e.target.value })}
                      className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white outline-none focus:border-amber-300"
                    />
                  </div>

                  <label className="inline-flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={state.settings.showEventFooter}
                      onChange={(e) =>
                        updateSettings({ showEventFooter: e.target.checked })
                      }
                      className="accent-amber-400"
                    />
                    <span>Hiển thị dòng Thời gian &amp; Địa điểm ở cuối trang</span>
                  </label>
                </div>
              </div>

              {/* Audio Controls */}
              <div className="rounded-xl border border-amber-300/25 bg-slate-950/70 p-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="flex items-center gap-2 text-sm font-bold text-amber-200">
                    <Music className="h-4 w-4" />
                    Âm nhạc trang trọng (Nhạc hòa tấu tích hợp &amp; Nhạc tùy chọn)
                  </h4>

                  <div className="flex items-center gap-4 text-xs">
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={state.audio.enabled}
                        onChange={(e) => updateAudio({ enabled: e.target.checked })}
                        className="accent-amber-400"
                      />
                      <span>Bật âm thanh</span>
                    </label>
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={state.audio.ambientEnabled}
                        onChange={(e) => updateAudio({ ambientEnabled: e.target.checked })}
                        className="accent-amber-400"
                      />
                      <span>Nhạc nền chờ Gala</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="mb-1 flex justify-between text-xs text-slate-300">
                    <span>Âm lượng tổng</span>
                    <span className="font-bold text-amber-300">
                      {Math.round(state.audio.masterVolume * 100)}%
                    </span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={state.audio.masterVolume}
                    onChange={(e) => updateAudio({ masterVolume: Number(e.target.value) })}
                    className="w-full accent-amber-400"
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-3 text-xs">
                  {(
                    [
                      ['customAmbientUrl', 'Nhạc nền chờ (tùy chọn MP3)'],
                      ['customSpinUrl', 'Nhạc quay 15s (tùy chọn MP3)'],
                      ['customWinUrl', 'Nhạc vinh danh (tùy chọn MP3)'],
                    ] as const
                  ).map(([key, label]) => (
                    <div
                      key={key}
                      className="rounded-lg border border-slate-800 bg-slate-900/80 p-3 space-y-2"
                    >
                      <p className="font-semibold text-slate-200">{label}</p>
                      <div className="flex items-center gap-2">
                        <label className="flex-1 rounded border border-amber-300/35 bg-amber-400/10 py-1 text-center font-semibold text-amber-200 hover:bg-amber-400/20 cursor-pointer">
                          Chọn file
                          <input
                            type="file"
                            accept="audio/*"
                            onChange={(e) => handleAudioFileUpload(key, e)}
                            className="hidden"
                          />
                        </label>
                        {state.audio[key] && (
                          <button
                            type="button"
                            onClick={() => updateAudio({ [key]: undefined })}
                            className="rounded border border-slate-700 px-2 py-1 text-slate-300 hover:text-white cursor-pointer"
                          >
                            Mặc định
                          </button>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400">
                        {state.audio[key]
                          ? 'Đang dùng file nhạc tải lên'
                          : 'Đang dùng nhạc hòa tấu tích hợp'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Backup & Reset */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-700/80 bg-slate-950/70 p-4">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={exportFullBackup}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300/40 bg-amber-400/15 px-3 py-2 text-xs font-semibold text-amber-200 hover:bg-amber-400/25 cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Sao lưu toàn bộ cấu hình (.json)</span>
                  </button>
                  <label className="inline-flex items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 cursor-pointer">
                    <Upload className="h-3.5 w-3.5" />
                    <span>Khôi phục cấu hình</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={importFullBackup}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Xóa toàn bộ kết quả đã quay để bắt đầu chương trình mới? (Danh sách người chơi và giải thưởng được giữ nguyên)')) {
                        onResetWinners();
                      }
                    }}
                    className="rounded-lg border border-amber-500/40 bg-amber-950/50 px-3 py-2 text-xs font-semibold text-amber-200 hover:bg-amber-900/60 cursor-pointer"
                  >
                    Xóa kết quả đã quay
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Khôi phục toàn bộ dữ liệu về mặc định ban đầu?')) {
                        onResetAll();
                      }
                    }}
                    className="rounded-lg border border-rose-500/40 bg-rose-950/50 px-3 py-2 text-xs font-semibold text-rose-200 hover:bg-rose-900/60 cursor-pointer"
                  >
                    Khôi phục mặc định
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
