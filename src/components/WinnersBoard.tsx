import React from 'react';
import { Award, Download, Printer, Trash2, Trophy, X } from 'lucide-react';
import { Prize, WinnerRecord } from '../types';

interface WinnersBoardProps {
  open: boolean;
  onClose: () => void;
  prizes: Prize[];
  winners: WinnerRecord[];
  onRemoveWinner: (winnerId: string) => void;
}

export const WinnersBoard: React.FC<WinnersBoardProps> = ({
  open,
  onClose,
  prizes,
  winners,
  onRemoveWinner,
}) => {
  if (!open) return null;

  const sortedPrizes = [...prizes].sort((a, b) => b.order - a.order);

  const exportCsv = () => {
    const header = ['STT', 'Giải thưởng', 'Phần quà', 'Mã số', 'Họ và tên', 'Đơn vị', 'Thời gian trúng'];
    const rows = winners.map((w, idx) => [
      String(idx + 1),
      w.prizeName,
      w.giftName,
      w.participantCode,
      w.participantName,
      w.participantDepartment,
      new Date(w.wonAt).toLocaleString('vi-VN'),
    ]);
    const csvContent =
      '\uFEFF' +
      [header, ...rows]
        .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ket-qua-lucky-draw-agribank-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      data-modal-open="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
    >
      <div className="gold-card relative flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-amber-300/25 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/15 text-amber-300 border border-amber-300/35">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-amber-100">
                Bảng Vàng Vinh Danh Trúng Giải
              </h2>
              <p className="text-xs text-slate-300">
                Tổng cộng {winners.length} giải thưởng đã được trao
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {winners.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={exportCsv}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300/40 bg-amber-400/15 px-3 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-400/25 cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Xuất Excel (CSV)</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-slate-500/40 bg-slate-800/70 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>In danh sách</span>
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {winners.length === 0 ? (
            <div className="py-14 text-center text-slate-400">
              <Award className="mx-auto h-12 w-12 text-amber-300/40 mb-3" />
              <p className="text-base font-medium text-slate-200">
                Chưa có kết quả quay thưởng nào
              </p>
              <p className="text-xs mt-1">
                Hãy bắt đầu quay số trên sân khấu để ghi nhận danh sách trúng giải.
              </p>
            </div>
          ) : (
            sortedPrizes.map((prize) => {
              const list = winners.filter((w) => w.prizeId === prize.id);
              if (list.length === 0) return null;
              return (
                <div
                  key={prize.id}
                  className="rounded-xl border border-amber-300/25 bg-slate-950/60 p-4"
                >
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-amber-300/15 pb-2">
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-amber-300">
                        {prize.name} — {prize.giftName}
                      </h3>
                    </div>
                    <span className="rounded-full bg-amber-400/15 px-2.5 py-0.5 text-xs font-semibold text-amber-200">
                      {list.length} / {prize.quantity} người trúng
                    </span>
                  </div>

                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {list.map((w, idx) => (
                      <div
                        key={w.id}
                        className="flex items-center justify-between rounded-lg border border-slate-700/70 bg-slate-900/75 px-3.5 py-2.5"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-amber-400">
                              #{idx + 1}
                            </span>
                            <span className="rounded bg-amber-400/15 px-1.5 py-0.5 font-mono text-[11px] font-bold text-amber-200">
                              {w.participantCode}
                            </span>
                            <span className="truncate text-sm font-bold text-white">
                              {w.participantName}
                            </span>
                          </div>
                          <p className="mt-0.5 truncate text-xs text-slate-400">
                            {w.participantDepartment}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => onRemoveWinner(w.id)}
                          title="Xóa kết quả này"
                          className="ml-2 rounded p-1.5 text-slate-400 hover:bg-rose-950/70 hover:text-rose-300 cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
