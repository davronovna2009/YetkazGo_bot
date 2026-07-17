/* ===== Matn formatlash yordamchilari (barchasi o'zbekcha) ===== */

/* HTML parse_mode uchun xavfli belgilarni ekranlash (dinamik matnlar uchun) */
export function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

/* Narxni chiroyli ko'rsatish: 45000 -> "45 000 so'm" */
export const som = (n) => Number(n || 0).toLocaleString('ru-RU') + " so'm";

/* Yetkazib berish barcha buyurtmalar uchun bepul */
export const FREE_DELIVERY = '🚚 Yetkazib berish: <b>BEPUL</b>';

/* Faqat raqamlarni qoldirib, 9 xonali milliy raqamga keltirish */
export function normalizePhone(raw) {
  let d = String(raw == null ? '' : raw).replace(/\D/g, '');
  if (d.startsWith('998')) d = d.slice(3);
  if (d.length > 9) d = d.slice(-9); // oxirgi 9 ta raqam
  return d;
}

/* O'zbekiston rasmiy mobil operator kodlari (backend bilan bir xil) */
const UZ_OPERATORS = ['20', '33', '50', '55', '77', '88', '90', '91', '93', '94', '95', '97', '98', '99'];

/* Raqam to'g'rimi? (9 xona + rasmiy operator kodi) */
export function validPhone(raw) {
  const d = normalizePhone(raw);
  return /^\d{9}$/.test(d) && UZ_OPERATORS.includes(d.slice(0, 2));
}

/* Backendga yuboriladigan format: 998XXXXXXXXX */
export function apiPhone(raw) {
  return '998' + normalizePhone(raw);
}

/* Ko'rsatish uchun: "+998 90 123 45 67" */
export function prettyPhone(raw) {
  const d = normalizePhone(raw);
  if (!/^\d{9}$/.test(d)) return String(raw || '');
  return `+998 ${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 7)} ${d.slice(7, 9)}`;
}

/* Buyurtma holatlari — o'zbekcha nom + emoji */
export const STATUS_UZ = {
  new: '🆕 Yangi',
  accepted: '✅ Qabul qilindi',
  ready: '🍳 Tayyor',
  ontheway: '🛵 Yo\'lda',
  arrived: '📍 Yetib keldi',
  done: '🎉 Yetkazildi',
  cancelled: '❌ Bekor qilindi',
};

export function statusLabel(status) {
  return STATUS_UZ[status] || status || '—';
}

/* Bu holatda mijoz bekor qila oladimi? (backend: new/accepted/ready) */
export function canCancel(status) {
  return ['new', 'accepted', 'ready'].includes(status);
}

/* Savat ko'rinishi (ko'p qatorli) */
export function cartLines(cart) {
  return cart
    .map((i) => {
      const line = `${i.emoji} ${esc(i.name)} × ${i.qty} = ${som(i.eff * i.qty)}`;
      return i.discount ? `${line}  (−${i.discount}%)` : line;
    })
    .join('\n');
}

/* Backendga yuboriladigan qisqa "item" matni: "Lag'mon x2, Somsa x3" */
export function cartSummary(cart) {
  return cart.map((i) => `${i.name} x${i.qty}`).join(', ');
}

/* Umumiy summa (chegirmali narxlar bo'yicha) */
export function cartTotal(cart) {
  return cart.reduce((s, i) => s + i.eff * i.qty, 0);
}

/* Savatdagi umumiy dona soni */
export function cartCount(cart) {
  return cart.reduce((s, i) => s + i.qty, 0);
}
