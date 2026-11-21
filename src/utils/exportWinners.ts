import * as XLSX from 'xlsx';
import { Prize, WinnerRecord } from '../types';

const HEADERS = [
  'STT',
  'Giải thưởng',
  'Phần quà',
  'Mã số',
  'Họ và tên',
  'Chức vụ',
  'Đơn vị',
  'Thời gian trúng',
] as const;

function buildRows(winners: WinnerRecord[]): (string | number)[][] {
  return winners.map((w, idx) => [
    idx + 1,
    w.prizeName,
    w.giftName,
    w.participantCode,
    w.participantName,
    w.participantTitle ?? '',
    w.participantDepartment,
    new Date(w.wonAt).toLocaleString('vi-VN'),
  ]);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function fileStamp() {
  return new Date().toISOString().slice(0, 10);
}

/** Xuất CSV (UTF-8 BOM) — mở được bằng Excel */
export function exportWinnersCsv(winners: WinnerRecord[]) {
  if (winners.length === 0) return;

  const rows = buildRows(winners).map((r) => r.map(String));
  const csvContent =
    '\uFEFF' +
    [HEADERS as unknown as string[], ...rows]
      .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\r\n');

  downloadBlob(
    new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }),
    `ket-qua-trung-thuong-agribank-${fileStamp()}.csv`
  );
}

/** Xuất Excel .xlsx — sheet tổng + sheet theo từng giải */
export function exportWinnersExcel(winners: WinnerRecord[], prizes: Prize[]) {
  if (winners.length === 0) return;

  const wb = XLSX.utils.book_new();
  const allRows = [HEADERS as unknown as (string | number)[], ...buildRows(winners)];
  const allSheet = XLSX.utils.aoa_to_sheet(allRows);
  allSheet['!cols'] = [
    { wch: 5 },
    { wch: 18 },
    { wch: 28 },
    { wch: 12 },
    { wch: 24 },
    { wch: 22 },
    { wch: 28 },
    { wch: 20 },
  ];
  XLSX.utils.book_append_sheet(wb, allSheet, 'Tất cả');

  const sortedPrizes = [...prizes].sort((a, b) => b.order - a.order);
  for (const prize of sortedPrizes) {
    const list = winners.filter((w) => w.prizeId === prize.id);
    if (list.length === 0) continue;

    const prizeRows = [
      HEADERS as unknown as (string | number)[],
      ...list.map((w, idx) => [
        idx + 1,
        w.prizeName,
        w.giftName,
        w.participantCode,
        w.participantName,
        w.participantTitle ?? '',
        w.participantDepartment,
        new Date(w.wonAt).toLocaleString('vi-VN'),
      ]),
    ];
    const sheet = XLSX.utils.aoa_to_sheet(prizeRows);
    sheet['!cols'] = allSheet['!cols'];
    const safeName = prize.name.replace(/[\\/?*[\]]/g, ' ').slice(0, 28) || 'Giai';
    XLSX.utils.book_append_sheet(wb, sheet, safeName);
  }

  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  downloadBlob(
    new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    `ket-qua-trung-thuong-agribank-${fileStamp()}.xlsx`
  );
}
