import * as XLSX from 'xlsx';
import { Participant } from '../types';

const HEADER_ALIASES: Record<'code' | 'name' | 'department' | 'title', string[]> = {
  code: ['mã', 'ma', 'mã số', 'ma so', 'mã nv', 'code', 'id', 'stt'],
  name: [
    'họ và tên',
    'ho va ten',
    'họ tên',
    'ho ten',
    'tên',
    'ten',
    'name',
    'full name',
    'tên khách mời',
    'ten khach moi',
  ],
  department: [
    'đơn vị',
    'don vi',
    'đơn vị / công ty',
    'don vi / cong ty',
    'công ty',
    'cong ty',
    'tên cty',
    'ten cty',
    'phòng ban',
    'phong ban',
    'department',
    'company',
  ],
  title: ['chức vụ', 'chuc vu', 'title', 'role', 'vị trí', 'vi tri'],
};

function normalizeHeader(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function matchField(header: string): keyof typeof HEADER_ALIASES | null {
  for (const [field, aliases] of Object.entries(HEADER_ALIASES) as [
    keyof typeof HEADER_ALIASES,
    string[],
  ][]) {
    if (aliases.some((a) => header === a || header.includes(a))) {
      return field;
    }
  }
  return null;
}

function cellText(value: unknown): string {
  if (value == null) return '';
  return String(value).trim();
}

function looksLikeHeaderRow(cells: string[]): boolean {
  const joined = cells.join(' ').toLowerCase();
  return /họ.*tên|ho va ten|full\s*name|mã|đơn vị|don vi|công ty|cong ty|name|department/.test(
    joined
  );
}

export interface ExcelImportResult {
  participants: Participant[];
  sheetName: string;
  totalRows: number;
}

/**
 * Parse .xlsx / .xls ArrayBuffer into participants.
 * Prefers sheet named LuckyDraw_Import when present.
 */
export function parseParticipantsFromExcel(buffer: ArrayBuffer): ExcelImportResult {
  const workbook = XLSX.read(buffer, { type: 'array' });
  if (!workbook.SheetNames.length) {
    throw new Error('File Excel không có sheet nào.');
  }

  const preferred =
    workbook.SheetNames.find((n) => /luckydraw|lucky.?draw|import/i.test(n)) ??
    workbook.SheetNames[0];

  const sheet = workbook.Sheets[preferred];
  const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    defval: '',
    raw: false,
  }) as unknown[][];

  if (!rows.length) {
    throw new Error(`Sheet «${preferred}» trống.`);
  }

  // Find header row within first 8 rows
  let headerRowIdx = -1;
  let mapping: Partial<Record<'code' | 'name' | 'department' | 'title', number>> = {};

  for (let i = 0; i < Math.min(rows.length, 8); i++) {
    const cells = (rows[i] ?? []).map((c) => normalizeHeader(c));
    if (!looksLikeHeaderRow(cells)) continue;
    const map: typeof mapping = {};
    cells.forEach((h, idx) => {
      const field = matchField(h);
      if (field && map[field] == null) map[field] = idx;
    });
    if (map.name != null) {
      headerRowIdx = i;
      mapping = map;
      break;
    }
  }

  const participants: Participant[] = [];
  const start = headerRowIdx >= 0 ? headerRowIdx + 1 : 0;

  for (let i = start; i < rows.length; i++) {
    const raw = rows[i] ?? [];
    const cells = raw.map((c) => cellText(c));
    if (cells.every((c) => !c)) continue;

    // Skip summary / formula label rows
    const joined = cells.join(' ').toLowerCase();
    if (
      /tổng số|tong so|ghi chú|huong dan|hướng dẫn|công thức|cong thuc/.test(joined)
    ) {
      continue;
    }

    let code = '';
    let name = '';
    let department = 'Trung tâm CNTT Agribank';
    let title = '';

    if (headerRowIdx >= 0) {
      if (mapping.code != null) code = cells[mapping.code] ?? '';
      if (mapping.name != null) name = cells[mapping.name] ?? '';
      if (mapping.department != null) {
        department = cells[mapping.department] || department;
      }
      if (mapping.title != null) title = cells[mapping.title] ?? '';
    } else {
      // Fallback: STT | Mã | Họ tên | Đơn vị | Chức vụ  OR  Mã | Họ tên | Đơn vị
      const nonEmpty = cells.filter(Boolean);
      if (nonEmpty.length === 1) {
        name = nonEmpty[0];
      } else if (nonEmpty.length === 2) {
        if (/^[A-Za-z]{0,4}-?\d{1,6}$/.test(nonEmpty[0]) || /^[A-Za-z0-9_-]{2,12}$/.test(nonEmpty[0])) {
          code = nonEmpty[0];
          name = nonEmpty[1];
        } else {
          name = nonEmpty[0];
          department = nonEmpty[1];
        }
      } else {
        // Prefer columns B/C/D style when col A is STT number
        if (/^\d+$/.test(cells[0] ?? '') && cells[2]) {
          code = cells[1] || '';
          name = cells[2];
          department = cells[3] || department;
          title = cells[4] || '';
        } else {
          code = cells[0] || '';
          name = cells[1] || '';
          department = cells[2] || department;
          title = cells[3] || '';
        }
      }
    }

    name = name.trim();
    if (!name) continue;
    // Skip if name is a number (STT misread)
    if (/^\d+$/.test(name)) continue;
    if (/^tổng/i.test(name)) continue;

    if (title && department && !department.includes(title)) {
      // keep title out of department; Lucky Draw Participant has no title field
    }

    const seq = String(participants.length + 1).padStart(3, '0');
    participants.push({
      id: `p-xlsx-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
      code: (code || `IT-${seq}`).trim(),
      name,
      department: department.trim() || 'Trung tâm CNTT Agribank',
      eligible: true,
    });
  }

  if (participants.length === 0) {
    throw new Error(
      `Không đọc được người tham gia từ sheet «${preferred}». ` +
        'Cần cột «Họ và tên» (hoặc Name).'
    );
  }

  return {
    participants,
    sheetName: preferred,
    totalRows: participants.length,
  };
}
