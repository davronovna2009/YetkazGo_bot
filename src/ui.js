/* ===== Umumiy ekran (UI) yordamchilari =====
   Handlerlar shu funksiyalar orqali ekran chizadi. Callback'dan kelganda
   xabar joyida tahrirlanadi (editMessageText), aks holda yangi xabar yuboriladi. */
import { InputFile } from 'grammy';
import { getBootstrap } from './api.js';
import { API_ORIGIN, WEBAPP_URL, WEBAPP_READY } from './config.js';
import { menuForRest, activeRestaurants } from './menu.js';
import {
  mainMenuKb, restaurantsKb, restaurantsWebAppKb, menuKb, qtyKb, cartKb,
} from './keyboards.js';
import { som, esc, cartCount, cartTotal, cartLines, FREE_DELIVERY } from './format.js';

/* Callback xabari media (rasm) ekanmi? Matnga tahrirlab bo'lmaydi. */
function isMediaMessage(ctx) {
  const m = ctx.callbackQuery && ctx.callbackQuery.message;
  return !!(m && (m.photo || m.video || m.animation || m.document));
}

/* Taom rasmini Telegramga yuborish uchun InputFile'ga aylantiradi.
   - to'liq http(s) URL -> grammY o'zi yuklab beradi
   - /uploads/... -> backend origin bilan to'ldiriladi (grammY localhost'dan yuklaydi)
   - data:base64 -> bufferga aylantiriladi
   Rasm bo'lmasa yoki xato bo'lsa -> null (matnli ko'rinishga tushamiz). */
function photoInputFor(photo) {
  const p = String(photo || '').trim();
  if (!p) return null;
  try {
    if (p.startsWith('data:')) {
      const b64 = p.split(',')[1] || '';
      return new InputFile(Buffer.from(b64, 'base64'));
    }
    const url = /^https?:\/\//i.test(p) ? p : API_ORIGIN + (p.startsWith('/') ? p : '/' + p);
    return new InputFile(new URL(url));
  } catch {
    return null;
  }
}

/* Callback bo'lsa — joyida tahrir; media xabar bo'lsa — o'chirib yangisini;
   aks holda yangi xabar. */
export async function render(ctx, text, keyboard) {
  const extra = { reply_markup: keyboard, disable_web_page_preview: true };
  if (ctx.callbackQuery) {
    if (isMediaMessage(ctx)) {
      // Rasm xabarini matnga tahrirlab bo'lmaydi — o'chirib, yangi matn yuboramiz
      try { await ctx.deleteMessage(); } catch { /* o'chib bo'lmadi */ }
      return ctx.reply(text, extra);
    }
    try {
      await ctx.editMessageText(text, extra);
      return;
    } catch {
      /* tahrir imkonsiz (masalan matn bir xil yoki xabar eski) — yangi yuboramiz */
    }
  }
  await ctx.reply(text, extra);
}

/* Xatolik ekrani */
export async function sendError(ctx, e) {
  const text = e && e.offline
    ? '⚠️ Serverga ulanib bo\'lmadi. Backend (localhost:5050) ishga tushirilganini tekshiring.'
    : `⚠️ Xatolik yuz berdi: ${esc((e && e.message) || 'nomaʼlum')}`;
  await render(ctx, text, mainMenuKb());
}

/* Bosh menyu */
export async function showMainMenu(ctx) {
  const name = esc(ctx.from?.first_name || 'mehmon');
  const text =
    `🚀 <b>YetkazGo</b> — xush kelibsiz, ${name}!\n\n` +
    `Sevimli taomlaringizni tez va qulay yetkazib beramiz. 🍽🛵\n\n` +
    `Quyidagidan tanlang:`;
  await render(ctx, text, mainMenuKb());
}

/* Restoranlar ro'yxati (bootstrap'dan faol restoranlar + overrides) */
export async function showRestaurants(ctx) {
  let data;
  try {
    data = await getBootstrap();
  } catch (e) {
    return sendError(ctx, e);
  }
  const rests = activeRestaurants(data.restaurants);
  ctx.session.overrides = data.overrides || {};
  ctx.session.restaurants = rests;

  if (!rests.length) {
    return render(ctx, '😔 Hozircha faol restoranlar yo\'q.', mainMenuKb());
  }

  /* ===== Mini sayt yo'li (asosiy) =====
     Restoranlar REPLY klaviaturada chiqadi — chunki mini sayt botga javob
     qaytarishi (sendData) faqat reply klaviaturadagi web_app tugmasida ishlaydi.
     Reply klaviaturani mavjud xabarga tahrirlab bo'lmaydi, shuning uchun eski
     xabarni o'chirib, yangisini yuboramiz. */
  if (WEBAPP_READY) {
    if (ctx.callbackQuery) { try { await ctx.deleteMessage(); } catch { /* mayli */ } }
    const text =
      '🍽 <b>Restoranni tanlang</b>\n\n' +
      'Pastdagi tugmani bosing — restoran menyusi <b>mini saytda</b> ochiladi. ' +
      'Taomlarni savatga qo\'shib, buyurtmani o\'sha yerda rasmiylashtirasiz. 👇';
    return ctx.reply(text, { reply_markup: restaurantsWebAppKb(rests, WEBAPP_URL) });
  }

  /* ===== Zaxira yo'l: WEBAPP_URL sozlanmagan -> eski tugmali oqim ===== */
  await render(ctx, '🍽 <b>Restoranni tanlang:</b>', restaurantsKb(rests));
}

/* Tanlangan restoran menyusi (narxlar yangilanadi) */
export async function showMenu(ctx) {
  const rest = ctx.session.rest;
  if (!rest) return showRestaurants(ctx);

  // Yangi narx/holat uchun overrides'ni qayta olamiz (xato bo'lsa eskisi qoladi)
  try {
    const data = await getBootstrap();
    if (data && data.overrides) ctx.session.overrides = data.overrides;
  } catch { /* offline — eski keshdan chizamiz */ }

  const menu = menuForRest(rest, ctx.session.overrides);
  ctx.session.menu = menu;

  if (!menu.length) {
    return render(ctx, `😔 «${esc(rest)}» da hozircha taom mavjud emas.`, restaurantsKb(ctx.session.restaurants || []));
  }
  const emoji = ctx.session.restEmoji || '🏪';
  const count = cartCount(ctx.session.cart);
  const header = `${emoji} <b>${esc(rest)}</b>\n${FREE_DELIVERY}\n\nTaomni tanlang:`;
  await render(ctx, header, menuKb(menu, count));
}

/* Bitta taom + miqdor tanlash ekrani (rasm bilan, agar mavjud bo'lsa) */
export async function showDish(ctx, index, qty) {
  const d = (ctx.session.menu || [])[index];
  if (!d) return showMenu(ctx);
  qty = Math.max(1, Math.min(50, qty || 1));

  const priceLine = d.discount
    ? `Narxi: <s>${som(d.price)}</s> → <b>${som(d.eff)}</b>  (−${d.discount}%)`
    : `Narxi: <b>${som(d.eff)}</b>`;
  const caption =
    `${d.emoji} <b>${esc(d.name)}</b>\n${priceLine}\n${FREE_DELIVERY}\n\n` +
    `Miqdor: <b>${qty}</b> dona\nJami: <b>${som(d.eff * qty)}</b>`;
  const kb = qtyKb(index, qty);
  const photo = photoInputFor(d.photo);
  const onPhoto = isMediaMessage(ctx); // joriy xabar rasm kartochkasimi?

  // 1) Rasmli taom
  if (photo) {
    // Miqdor o'zgardi va allaqachon rasm kartochkasidamiz -> faqat sarlavhani yangilaymiz
    if (onPhoto) {
      try {
        await ctx.editMessageCaption({ caption, reply_markup: kb });
        return;
      } catch { /* tahrir bo'lmadi — pastda yangi yuboramiz */ }
    }
    // Menyu (matn) dan kelindi -> matnni o'chirib, rasm kartochkasini yuboramiz
    if (ctx.callbackQuery) { try { await ctx.deleteMessage(); } catch { /* mayli */ } }
    try {
      await ctx.replyWithPhoto(photo, { caption, reply_markup: kb });
      return;
    } catch { /* rasm yuborilmadi (yuklab bo'lmadi) — matnli ko'rinishga o'tamiz */ }
  }

  // 2) Rasmsiz (yoki rasm xato) -> matnli kartochka
  await render(ctx, caption, kb);
}

/* Savat ko'rinishi */
export async function showCart(ctx) {
  const cart = ctx.session.cart || [];
  if (!cart.length) {
    return render(ctx, '🧺 Savat bo\'sh. Avval taom qo\'shing.', restaurantsKb(ctx.session.restaurants || []));
  }
  const text =
    `🧺 <b>Savat</b>\n\n${cartLines(cart)}\n\n` +
    `💰 Jami: <b>${som(cartTotal(cart))}</b>\n${FREE_DELIVERY}`;
  await render(ctx, text, cartKb());
}
