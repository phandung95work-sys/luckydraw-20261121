import { AppState, Participant, Prize } from '../types';

const DEPARTMENTS = [
  'Phòng Phát triển Phần mềm 1',
  'Phòng Phát triển Phần mềm 2',
  'Phòng Hạ tầng & Điện toán đám mây',
  'Phòng An ninh & Bảo mật thông tin',
  'Phòng Dữ liệu lớn & AI',
  'Phòng Vận hành Hệ thống CoreBanking',
  'Phòng Ngân hàng Số & Thanh toán',
  'Phòng Kiểm thử & Đảm bảo chất lượng',
  'Phòng Hỗ trợ Kỹ thuật & Dịch vụ CNTT',
  'Văn phòng Trung tâm CNTT',
];

const FIRST_NAMES = [
  'Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng',
  'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý', 'Đào', 'Đinh', 'Lâm', 'Trịnh',
];

const MIDDLE_NAMES = [
  'Văn', 'Thị', 'Minh', 'Hoàng', 'Anh', 'Đức', 'Thanh', 'Quốc', 'Ngọc', 'Phương',
  'Hữu', 'Gia', 'Tuấn', 'Khánh', 'Thùy', 'Hải', 'Bảo', 'Xuân', 'Quang', 'Duy',
];

const GIVEN_NAMES = [
  'An', 'Bình', 'Chi', 'Dũng', 'Đạt', 'Giang', 'Hà', 'Hải', 'Hằng', 'Hiếu',
  'Hoà', 'Hùng', 'Huy', 'Huyền', 'Khang', 'Khánh', 'Khoa', 'Lâm', 'Lan', 'Linh',
  'Long', 'Mai', 'Minh', 'Nam', 'Nga', 'Ngân', 'Ngọc', 'Nhung', 'Phong', 'Phúc',
  'Phương', 'Quân', 'Quang', 'Quỳnh', 'Sơn', 'Tâm', 'Thái', 'Thành', 'Thảo', 'Thắng',
  'Thịnh', 'Thu', 'Thủy', 'Tiên', 'Toàn', 'Trang', 'Trung', 'Tú', 'Tuấn', 'Tùng',
  'Uyên', 'Vân', 'Việt', 'Vinh', 'Vũ', 'Yến',
];

export function generateSampleParticipants(count = 100): Participant[] {
  const list: Participant[] = [];
  const usedNames = new Set<string>();

  for (let i = 0; i < count; i++) {
    let fullName = '';
    let attempt = 0;
    do {
      const f = FIRST_NAMES[(i * 7 + attempt * 3) % FIRST_NAMES.length];
      const m = MIDDLE_NAMES[(i * 5 + attempt * 11) % MIDDLE_NAMES.length];
      const g = GIVEN_NAMES[(i * 13 + attempt * 17) % GIVEN_NAMES.length];
      fullName = `${f} ${m} ${g}`;
      attempt++;
    } while (usedNames.has(fullName) && attempt < 40);

    usedNames.add(fullName);
    const num = String(i + 1).padStart(3, '0');
    list.push({
      id: `p-${num}`,
      code: `IT-${num}`,
      name: fullName,
      department: DEPARTMENTS[i % DEPARTMENTS.length],
      eligible: true,
    });
  }
  return list;
}

export const DEFAULT_PRIZES: Prize[] = [
  {
    id: 'prize-khuyen-khich',
    name: 'GIẢI KHUYẾN KHÍCH',
    giftName: 'Pin Sạc Dự Phòng Cao Cấp & Quà Lưu Niệm Agribank',
    giftValue: '1.000.000 VNĐ',
    quantity: 10,
    spinMode: 'batch',
    colorAccent: 'sapphire',
    order: 1,
  },
  {
    id: 'prize-ba',
    name: 'GIẢI BA',
    giftName: 'Tai Nghe Bluetooth Chống Ồn Cao Cấp',
    giftValue: '3.000.000 VNĐ',
    quantity: 5,
    spinMode: 'batch',
    colorAccent: 'emerald',
    order: 2,
  },
  {
    id: 'prize-nhi',
    name: 'GIẢI NHÌ',
    giftName: 'Đồng Hồ Thông Minh Apple Watch Series 10',
    giftValue: '10.000.000 VNĐ',
    quantity: 3,
    spinMode: 'single',
    colorAccent: 'crimson',
    order: 3,
  },
  {
    id: 'prize-nhat',
    name: 'GIẢI NHẤT',
    giftName: 'iPad Air M3 Wi-Fi 256GB',
    giftValue: '18.000.000 VNĐ',
    quantity: 2,
    spinMode: 'single',
    colorAccent: 'gold',
    order: 4,
  },
  {
    id: 'prize-dac-biet',
    name: 'GIẢI ĐẶC BIỆT',
    giftName: 'iPhone 17 Pro Max 256GB Titan Sa Mạc',
    giftValue: '35.000.000 VNĐ',
    quantity: 1,
    spinMode: 'single',
    colorAccent: 'gold',
    order: 5,
  },
];

export const DEFAULT_APP_STATE: AppState = {
  participants: generateSampleParticipants(100),
  prizes: DEFAULT_PRIZES,
  winners: [],
  riggedAssignments: {},
  audio: {
    enabled: true,
    ambientEnabled: false,
    masterVolume: 0.72,
  },
  settings: {
    spinDurationSec: 15,
    allowRepeatWinners: false,
    backdropOpacity: 0,
    showEventFooter: true,
    eventTimeText: 'Thời gian: 21-22/11/2026',
    eventLocationText: 'Địa điểm: Hòa Bình',
    adminPin: '',
  },
};
