/* ===== YetkazGo bot — sozlamalar (.env dan o'qiladi) ===== */
import 'dotenv/config';

/* @BotFather bergan token — foydalanuvchi .env ga qo'yadi */
export const BOT_TOKEN = (process.env.BOT_TOKEN || '').trim();

/* Backend API manzili. Oxiridagi slash(lar) olib tashlanadi. */
export const API_BASE = (process.env.API_BASE || 'http://localhost:5050/api').replace(/\/+$/, '');

/* Backend "origin" (rasm URL'lari uchun): .../api -> ... (masalan http://localhost:5050) */
export const API_ORIGIN = API_BASE.replace(/\/api$/, '');

/* ===== Mini sayt (Telegram Mini App) =====
   Backend `tg-app.html` ni static tarqatadi, shuning uchun bu odatda:
     <ochiq HTTPS manzil>/tg-app.html
   MUHIM: Telegram faqat HTTPS'ni qabul qiladi — http://localhost ISHLAMAYDI.
   Sinash uchun: `cloudflared tunnel --url http://localhost:5050` */
export const WEBAPP_URL = (process.env.WEBAPP_URL || '').trim().replace(/\/+$/, '');

/* Mini sayt yoqilganmi? (URL yo'q yoki https emas -> eski tugmali oqimga tushamiz) */
export const WEBAPP_READY = /^https:\/\//i.test(WEBAPP_URL);

/* Buyurtma holatini kuzatish oralig'i (ms) — "yetib keldi" xabari uchun */
export const POLL_MS = Math.max(3000, Number(process.env.POLL_MS) || 10000);

if (!BOT_TOKEN) {
  console.error('❌ BOT_TOKEN topilmadi. `.env.example` ni `.env` ga nusxalab, tokenni qo\'ying.');
  process.exit(1);
}

if (WEBAPP_URL && !WEBAPP_READY) {
  console.warn(`⚠️  WEBAPP_URL https:// bilan boshlanishi kerak (hozir: ${WEBAPP_URL}).`);
  console.warn('   Mini sayt o\'chirildi — bot eski tugmali oqimda ishlaydi.');
} else if (!WEBAPP_URL) {
  console.warn('⚠️  WEBAPP_URL sozlanmagan — mini sayt o\'chiq, eski tugmali oqim ishlaydi.');
}
