/* ===== Restoran ish vaqti — QAT'IY Toshkent vaqti =====
   Sayt (assets/js/app.js:563-570) restoran ochiqligini `new Date().getHours()`
   bilan hisoblaydi — bu foydalanuvchi brauzeri vaqti (telefon O'zbekistonda
   bo'lgani uchun to'g'ri chiqadi). Lekin BOT serverda ishlaydi va server
   ko'pincha UTC da turadi — u yerda getHours() Toshkentдан 5 soat orqada bo'lardi.

   Shu farqni yo'qotish uchun bot ham, mini sayt (tg-app.html) ham vaqtni shu
   yagona mintaqaga bog'lab hisoblaydi. Natijada bot bilan sayt AYNAN bir xil
   payt restoranni "ochiq"/"yopiq" deb ko'radi. */

const TZ = 'Asia/Tashkent';
const HOUR_FMT = new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric', hourCycle: 'h23' });

/* Hozirgi Toshkent soati (0..23) */
export function tashkentHour() {
  return Number(HOUR_FMT.format(new Date()));
}

/* Restoran hozir ochiqmi? Sayt bilan bir xil shart: h >= openH && h < closeH.
   Ish vaqti noma'lum bo'lsa — ochiq deb hisoblanadi (sayt ham shunday: app.js:566).
   Eslatma: saytdagidek tungi smena (22->06) qo'llab-quvvatlanmaydi. */
export function isRestOpen(rest) {
  if (!rest) return true;
  const o = rest.openH, c = rest.closeH;
  if (o == null || c == null) return true;
  const h = tashkentHour();
  return h >= o && h < c;
}

const pad2 = (n) => String(n).padStart(2, '0');

/* Ish vaqti matni: erkin `hours` matni ustun, aks holda "09:00–23:00" */
export function hoursText(rest) {
  if (rest && rest.hours) return String(rest.hours);
  const o = (rest && rest.openH != null) ? rest.openH : 9;
  const c = (rest && rest.closeH != null) ? rest.closeH : 23;
  return `${pad2(o)}:00–${pad2(c)}:00`;
}
