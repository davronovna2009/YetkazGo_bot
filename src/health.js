/* ===== Sog'liq (health) HTTP serveri =====
   Render "Web Service" MAJBURAN `$PORT` da HTTP tinglashini talab qiladi — aks
   holda deploy "port topilmadi" deb muvaffaqiyatsiz bo'ladi. Polling bot esa
   o'zi HTTP bermaydi, shuning uchun shu kichik server qo'shiladi.

   Ikkinchi vazifasi — KEEP-ALIVE: bepul Render 15 daqiqa harakatsizlikdan keyin
   "uxlaydi". Tashqi pinger (cron-job.org / UptimeRobot) shu `/` yoki `/health`
   manzilini har ~10 daqiqada ochib, botni uyg'oq saqlaydi.

   MUHIM: server FAQAT `PORT` muhit o'zgaruvchisi bor bo'lganда ishga tushadi
   (Render uni beradi). Lokal ishda PORT bo'lmaydi — server ochilmaydi, bot
   oddiy polling qiladi. */
import http from 'node:http';

export function startHealthServer() {
  const port = process.env.PORT;
  if (!port) return null; // lokal — kerak emas

  const startedAt = new Date().toISOString();
  const server = http.createServer((req, res) => {
    // Har qanday yo'l — sodda "tirik" javobi (pinger uchun yetarli)
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: true, service: 'yetkazgo-bot', startedAt, now: new Date().toISOString() }));
  });

  server.listen(port, () => {
    console.log(`🩺 Health server ${port}-portда tinglayapti (Render keep-alive).`);
  });
  server.on('error', (e) => console.error('⚠️ Health server xatosi:', e.message));
  return server;
}
