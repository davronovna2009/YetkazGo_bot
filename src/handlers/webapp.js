/* ===== Mini saytdan kelgan buyurtma (Telegram Mini App -> bot) =====
   Mini sayt `tg.sendData(JSON)` chaqiradi va O'ZI yopiladi. Telegram bu ma'lumotni
   `message.web_app_data` sifatida shu botga yetkazadi. Bu kanal ishonchli:
   ma'lumot Telegram serverlari orqali keladi, foydalanuvchi uni soxtalashtira
   olmaydi — shuning uchun initData/HMAC tekshiruvi kerak emas.

   MUHIM: sendData faqat REPLY klaviaturadagi web_app tugmasidan ochilgan mini
   appda ishlaydi (keyboards.js:restaurantsWebAppKb). */
import { mainMenuKb, orderResultKb } from '../keyboards.js';
import { createOrder, getBootstrap } from '../api.js';
import { saveOrder } from '../storage.js';
import { som, esc, prettyPhone, validPhone, FREE_DELIVERY } from '../format.js';
import { activeRestaurants, dishIndexForRest } from '../menu.js';
import { isRestOpen, hoursText } from '../hours.js';

/* Backend cheklovlari bilan bir xil (server/src/pricing.js) */
const MAX_LINES = 30;
const MAX_QTY = 50;

export function registerWebApp(bot) {
  bot.on('message:web_app_data', async (ctx) => {
    let p;
    try {
      p = JSON.parse(ctx.message.web_app_data.data);
    } catch {
      return ctx.reply('⚠️ Buyurtma ma\'lumoti buzilgan. Qaytadan urinib ko\'ring.', {
        reply_markup: mainMenuKb(),
      });
    }

    const bad = validate(p);
    if (bad) {
      return ctx.reply(`⚠️ ${esc(bad)}`, { reply_markup: mainMenuKb() });
    }

    /* ===== Sayt bilan bir xil qoidalar (ikkinchi qatlam himoya) =====
       Mini sayt allaqachon yopiq restoran/tugagan taomni bloklaydi, lekin bu
       yerда ham tekshiramiz: restoran hali faolmi, ochiqmi, taomlar bormi.
       Bootstrap olib bo'lmasa — bloklamaymiz (server baribir o'zi tekshiradi). */
    try {
      const data = await getBootstrap();
      const rest = activeRestaurants(data.restaurants).find((r) => r.name === p.rest);

      if (!rest) {
        return ctx.reply(
          `⚠️ «${esc(p.rest)}» hozir buyurtma qabul qilmayapti. /start bosib boshqa restoranni tanlang.`,
          { reply_markup: mainMenuKb() }
        );
      }
      if (!isRestOpen(rest)) {
        return ctx.reply(
          `🔴 «${esc(p.rest)}» hozir yopiq (${esc(hoursText(rest))}). Ish vaqtida qayta urinib ko'ring.`,
          { reply_markup: mainMenuKb() }
        );
      }

      const idx = dishIndexForRest(p.rest, data.overrides);
      for (const it of p.items) {
        const d = idx.get(Number(it.id));
        if (!d || d.removed) {
          return ctx.reply('⚠️ Ba\'zi taomlar menyudan olib tashlangan. /start bosib qaytadan tanlang.', {
            reply_markup: mainMenuKb(),
          });
        }
        if (d.soldout) {
          return ctx.reply(`⚠️ «${esc(d.name)}» hozir sotuvda yo'q (tugagan). Uni savatdan olib tashlang.`, {
            reply_markup: mainMenuKb(),
          });
        }
      }
    } catch {
      /* bootstrap olinmadi — jim o'tamiz, server o'zi tekshiradi */
    }

    // Reply klaviaturani (restoranlar ro'yxatini) olib tashlaymiz
    await ctx.reply('⏳ Buyurtmangiz yuborilmoqda…', { reply_markup: { remove_keyboard: true } });

    const order = {
      user: [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' ')
        || ctx.from.username || 'Telegram mijoz',
      phone: p.phone,
      /* Faqat NIMA va NECHTA yuboriladi — summani backend dish id bo'yicha
         o'zi hisoblaydi. Mini saytdagi narx faqat ko'rsatish uchun edi. */
      items: p.items.map((i) => ({ id: i.id, qty: i.qty })),
      addr: p.addr,
      pay: p.pay,
      source: 'telegram',
    };

    let saved;
    try {
      saved = await createOrder(order);
    } catch (e) {
      const msg = e.offline
        ? '⚠️ Serverga ulanib bo\'lmadi. Birozdan so\'ng qayta urinib ko\'ring.'
        : `⚠️ Buyurtma qabul qilinmadi: ${esc((e.data && e.data.error) || e.message)}`;
      return ctx.reply(msg, { reply_markup: mainMenuKb() });
    }

    /* Hamma qiymat SERVER javobidan — u yagona ishonchli manba
       (narx savat to'ldirilgandan keyin o'zgargan bo'lishi mumkin). */
    await saveOrder(ctx.from.id, {
      id: saved.id,
      token: saved.token,
      rest: saved.rest || p.rest,
      item: saved.item || '',
      emoji: saved.emoji || '🍽️',
      amount: saved.amount || 0,
      addr: saved.addr || p.addr,
      pay: saved.pay || p.pay,
      courier: saved.courier || '',
      eta: saved.eta || 0,
      status: saved.status || 'new',
      createdAt: new Date().toISOString(),
    });

    const lines = (saved.items || [])
      .map((l) => `${l.emoji} ${esc(l.name)} × ${l.qty} — ${som(l.sum)}`)
      .join('\n') || esc(saved.item || '');

    const text =
      `🎉 <b>Buyurtmangiz qabul qilindi!</b>\n\n` +
      `🧾 Raqam: <b>#${saved.id}</b>\n` +
      `🏪 ${esc(saved.rest || p.rest)}\n\n` +
      `${lines}\n\n` +
      `💰 Jami: <b>${som(saved.amount)}</b>\n` +
      `${FREE_DELIVERY}\n` +
      `📞 ${esc(prettyPhone(saved.phone || p.phone))}\n` +
      `📍 ${esc(saved.addr || p.addr)}\n` +
      `💳 ${(saved.pay || p.pay) === 'cash' ? '💵 Naqd' : '💳 Karta'}\n` +
      `🛵 Eng yaqin bo'sh kuryer avtomatik biriktiriladi\n` +
      `⏱ Yetkazish: ~${saved.eta || 15} daqiqa\n\n` +
      `✅ Buyurtma restoranga yuborildi.\n` +
      `🔔 <b>Yetib kelgach sizga xabar boradi</b> — o'shanda qabul qilganingizni tasdiqlaysiz.`;

    await ctx.reply(text, { reply_markup: orderResultKb(saved.id) });
  });
}

/* Mini saytdan kelgan ma'lumotni tekshirish.
   Xato bo'lsa — o'zbekcha sabab, to'g'ri bo'lsa — null. */
function validate(p) {
  if (!p || typeof p !== 'object') return 'Buyurtma ma\'lumoti noto\'g\'ri.';
  if (!Array.isArray(p.items) || !p.items.length) return 'Savat bo\'sh.';
  if (p.items.length > MAX_LINES) return `Savatda ${MAX_LINES} tadan ko'p turdagi taom bo'lmasligi kerak.`;

  for (const i of p.items) {
    const id = Number(i && i.id);
    const qty = Number(i && i.qty);
    if (!Number.isInteger(id) || id <= 0) return 'Taom aniqlanmadi — menyuni yangilang.';
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) return `Miqdor 1 dan ${MAX_QTY} gacha bo'lishi kerak.`;
  }
  if (!validPhone(p.phone)) return 'Telefon raqami noto\'g\'ri. Namuna: +998 90 123 45 67';
  if (!p.addr || String(p.addr).trim().length < 4) return 'Yetkazish manzili juda qisqa.';
  if (!['cash', 'card'].includes(p.pay)) return 'To\'lov turi tanlanmagan.';
  return null;
}
