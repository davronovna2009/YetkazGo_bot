/* ===== Buyurtma holatini kuzatuvchi (fon jarayoni) =====
   Backendda push kanali yo'q (sayt paneli ham har 5 soniyada so'rab turadi —
   assets/js/store.js), shuning uchun bot ham tugallanmagan buyurtmalarni
   `GET /orders/:id` orqali davriy so'raydi.

   Vazifasi: kuryer "Yetkazdim ✓" bosib holat `arrived` bo'lganda foydalanuvchiga
   "buyurtmangiz yetib keldi, tasdiqlang" xabarini AVTOMATIK yuborish.
   Tasdiqlash tugmasi -> handlers/myOrders.js:receive -> POST /orders/:id/received
   -> status `done` -> kuryer va restoran panellarida darhol ko'rinadi. */
import { getActiveOrders, updateOrder } from './storage.js';
import { getOrder } from './api.js';
import { arrivedKb } from './keyboards.js';
import { POLL_MS } from './config.js';
import { som, esc } from './format.js';

export function startWatcher(bot) {
  let busy = false;

  const run = async () => {
    if (busy) return;            // oldingi tsikl tugamagan bo'lsa — o'tkazib yuboramiz
    busy = true;
    try {
      await tick(bot);
    } catch (e) {
      console.error('⚠️ watcher xatosi:', e.message);
    } finally {
      busy = false;
    }
  };

  /* Bot o'chiq bo'lgan paytda o'zgargan holatlarni ushlash uchun darhol bir marta */
  run();
  setInterval(run, POLL_MS);
  console.log(`👀 Buyurtma kuzatuvchisi yoqildi (har ${Math.round(POLL_MS / 1000)} soniyada).`);
}

async function tick(bot) {
  const active = await getActiveOrders();
  for (const { userId, order } of active) {
    try {
      await check(bot, userId, order);
    } catch (e) {
      // Bitta buyurtmadagi xato qolganlarini to'xtatmasin
      console.error(`⚠️ #${order.id} kuzatib bo'lmadi:`, e.message);
    }
  }
}

async function check(bot, userId, order) {
  let r;
  try {
    r = await getOrder(order.id);
  } catch {
    return;   // backend o'chiq / tarmoq — keyingi tsiklda qayta urinamiz
  }
  if (!r || !r.status || r.status === order.status) return;   // o'zgarish yo'q

  /* Xabarni AVVAL yuboramiz, holatni KEYIN saqlaymiz. Yuborish uzilib qolsa,
     holat eski qoladi va keyingi tsiklda qayta uriniladi — ya'ni xabar
     yo'qolmaydi va ikki marta ham ketmaydi. */
  if (r.status === 'arrived') {
    await notifyArrived(bot, userId, order);
  } else if (r.status === 'cancelled') {
    await notifyCancelled(bot, userId, order, r.reason);
  }

  await updateOrder(userId, order.id, { status: r.status, reason: r.reason || '' });
}

/* 📍 Kuryer yetkazdi — mijoz tasdig'i kutilmoqda */
async function notifyArrived(bot, userId, o) {
  const text =
    `📍 <b>Buyurtmangiz yetib keldi!</b>\n\n` +
    `🧾 Raqam: <b>#${o.id}</b>\n` +
    `🏪 ${esc(o.rest)}\n` +
    `🍽 ${esc(o.item)}\n` +
    `💰 To'lov: <b>${som(o.amount)}</b> (${o.pay === 'cash' ? '💵 Naqd' : '💳 Karta'})\n\n` +
    `🛵 Kuryer keldi. Iltimos, buyurtmani qabul qilib oling va quyidagi tugma orqali <b>tasdiqlang</b> 👇`;
  await bot.api.sendMessage(userId, text, { reply_markup: arrivedKb(o.id) });
}

/* ❌ Restoran bekor qildi — mijoz kutib qolmasligi uchun xabar beramiz */
async function notifyCancelled(bot, userId, o, reason) {
  const text =
    `❌ <b>Buyurtma #${o.id} bekor qilindi</b>\n\n` +
    `🏪 ${esc(o.rest)}\n` +
    (reason ? `Sabab: ${esc(reason)}\n` : '') +
    `\nUzr so'raymiz. Boshqa restorandan buyurtma berib ko'rishingiz mumkin — /start`;
  await bot.api.sendMessage(userId, text);
}
