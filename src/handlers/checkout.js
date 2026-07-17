/* ===== Rasmiylashtirish: telefon -> manzil -> to'lov -> tasdiq -> POST /orders ===== */
import { phoneKb, addressKb, payKb, confirmKb, orderResultKb, mainMenuKb, CANCEL_LABEL } from '../keyboards.js';
import { showMainMenu, showCart } from '../ui.js';
import {
  validPhone, apiPhone, prettyPhone,
  cartTotal, cartSummary, cartLines, som, esc, FREE_DELIVERY,
} from '../format.js';
import { createOrder } from '../api.js';
import { saveOrder } from '../storage.js';

export function registerCheckout(bot) {
  /* Rasmiylashtirishni boshlash -> telefon so'rash */
  bot.callbackQuery('checkout', async (ctx) => {
    await ctx.answerCallbackQuery();
    if (!(ctx.session.cart || []).length) return showCart(ctx);
    ctx.session.step = 'phone';
    ctx.session.draft = {};
    await ctx.reply(
      '📞 Telefon raqamingizni yuboring.\n\n' +
      'Pastdagi tugma orqali kontaktni ulashing yoki qo\'lda yozing: <b>+998 XX XXX XX XX</b>',
      { reply_markup: phoneKb() }
    );
  });

  /* Kontakt ulashildi (telefon bosqichi) */
  bot.on('message:contact', async (ctx) => {
    if (ctx.session.step !== 'phone') return;
    await handlePhone(ctx, ctx.message.contact.phone_number);
  });

  /* Lokatsiya yuborildi (manzil bosqichi) */
  bot.on('message:location', async (ctx) => {
    if (ctx.session.step !== 'address') return;
    const { latitude, longitude } = ctx.message.location;
    await handleAddress(ctx, `📍 Lokatsiya: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
  });

  /* Matnli javob — bosqichga qarab telefon yoki manzil; aks holda keyingi handlerga */
  bot.on('message:text', async (ctx, next) => {
    const step = ctx.session.step;
    // Bekor qilish tugmasi (reply klaviaturadan)
    if (ctx.message.text === CANCEL_LABEL && step) {
      resetFlow(ctx);
      await ctx.reply('❌ Buyurtma bekor qilindi.', { reply_markup: { remove_keyboard: true } });
      return showMainMenu(ctx);
    }
    if (step === 'phone') return handlePhone(ctx, ctx.message.text);
    if (step === 'address') return handleAddress(ctx, ctx.message.text);
    return next();
  });

  /* To'lov turi tanlandi */
  bot.callbackQuery(/^pay:(cash|card)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    if (ctx.session.step !== 'pay') return;
    ctx.session.draft.pay = ctx.match[1];
    ctx.session.step = 'confirm';
    await showConfirm(ctx);
  });

  /* Yakuniy tasdiq -> buyurtmani yuborish */
  bot.callbackQuery('confirm', async (ctx) => {
    await ctx.answerCallbackQuery();
    if (ctx.session.step !== 'confirm') return;
    await placeOrder(ctx);
  });

  /* Oqimni bekor qilish */
  bot.callbackQuery('flow:cancel', async (ctx) => {
    await ctx.answerCallbackQuery({ text: 'Bekor qilindi' });
    resetFlow(ctx);
    await showMainMenu(ctx);
  });
}

/* --- Bosqich yordamchilari --- */

async function handlePhone(ctx, raw) {
  if (!validPhone(raw)) {
    return ctx.reply(
      '❌ Raqam noto\'g\'ri. Namuna: <b>+998 90 123 45 67</b>.\nQayta yuboring:',
      { reply_markup: phoneKb() }
    );
  }
  ctx.session.draft.phone = apiPhone(raw);
  ctx.session.draft.phonePretty = prettyPhone(raw);
  ctx.session.step = 'address';
  await ctx.reply(`✅ Raqam: ${esc(ctx.session.draft.phonePretty)}`, { reply_markup: { remove_keyboard: true } });
  await ctx.reply(
    '📍 Yetkazish manzilini yuboring.\n\n' +
    'Lokatsiya tugmasi orqali yoki matn bilan (masalan: <i>Chilonzor 5-kvartal, 12-uy, 34-xonadon</i>).',
    { reply_markup: addressKb() }
  );
}

async function handleAddress(ctx, addr) {
  addr = String(addr || '').trim();
  if (addr.length < 4) {
    return ctx.reply('❌ Manzil juda qisqa. Aniqroq yozing:', { reply_markup: addressKb() });
  }
  ctx.session.draft.addr = addr;
  ctx.session.step = 'pay';
  await ctx.reply('✅ Manzil qabul qilindi.', { reply_markup: { remove_keyboard: true } });
  await ctx.reply('💳 To\'lov turini tanlang:', { reply_markup: payKb() });
}

async function showConfirm(ctx) {
  const c = ctx.session;
  const payLabel = c.draft.pay === 'cash' ? '💵 Naqd' : '💳 Karta';
  const text =
    `🧾 <b>Buyurtmani tasdiqlang</b>\n\n` +
    `🏪 Restoran: <b>${esc(c.rest)}</b>\n\n` +
    `${cartLines(c.cart)}\n\n` +
    `💰 Jami: <b>${som(cartTotal(c.cart))}</b>\n` +
    `${FREE_DELIVERY}\n` +
    `📞 Telefon: ${esc(c.draft.phonePretty)}\n` +
    `📍 Manzil: ${esc(c.draft.addr)}\n` +
    `💳 To'lov: ${payLabel}`;
  await ctx.reply(text, { reply_markup: confirmKb() });
}

async function placeOrder(ctx) {
  const c = ctx.session;
  const cart = c.cart || [];
  if (!cart.length) {
    resetFlow(ctx);
    return showMainMenu(ctx);
  }

  const order = {
    user: [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' ')
      || ctx.from.username || 'Telegram mijoz',
    phone: c.draft.phone,            // 998XXXXXXXXX
    /* MUHIM: summani BACKEND o'zi hisoblaydi (bazadagi haqiqiy narx bo'yicha).
       Biz faqat NIMA va NECHTA olinayotganini aytamiz. Quyidagi rest/item/amount
       backendда e'tiborsiz qoldiriladi — javobда server hisoblagani qaytadi. */
    items: cart.map((i) => ({ id: i.id, qty: i.qty })),
    rest: c.rest,
    item: cartSummary(cart),         // "Lag'mon x2, Somsa x3"
    emoji: cart[0].emoji || '🍽️',
    addr: c.draft.addr,
    pay: c.draft.pay || 'cash',
    source: 'telegram',   // buyurtma bot orqali berildi (saytda belgi ko'rinadi)
  };

  let saved;
  try {
    saved = await createOrder(order);
  } catch (e) {
    const msg = e.offline
      ? '⚠️ Serverga ulanib bo\'lmadi. Birozdan so\'ng qayta urinib ko\'ring.'
      : `⚠️ Buyurtma yuborilmadi: ${esc((e.data && e.data.error) || e.message)}`;
    return ctx.reply(msg, { reply_markup: mainMenuKb() });
  }

  /* Summa/yorliq — SERVER hisoblagani (mijoz savatidagi emas). Chegirma yoki narx
     savat to'ldirilганdan keyin o'zgarган bo'lsa, haqiqiy qiymat shu. */
  const amount = saved.amount != null ? saved.amount : cartTotal(cart);

  // Buyurtma id + maxfiy token'ni saqlaymiz (holat kuzatish / bekor qilish uchun)
  await saveOrder(ctx.from.id, {
    id: saved.id,
    token: saved.token,
    rest: c.rest,
    item: order.item,
    emoji: order.emoji,
    amount,
    addr: order.addr,
    pay: order.pay,
    courier: saved.courier || '',
    eta: saved.eta || 0,
    status: saved.status || 'new',
    createdAt: new Date().toISOString(),
  });

  const eta = saved.eta ? `${saved.eta} daqiqa` : '15 daqiqa';
  const text =
    `🎉 <b>Buyurtma qabul qilindi!</b>\n\n` +
    `🧾 Raqam: <b>#${saved.id}</b>\n` +
    `🏪 ${esc(c.rest)}\n` +
    `💰 Jami: <b>${som(amount)}</b>\n` +
    `${FREE_DELIVERY}\n` +
    `🛵 Eng yaqin bo'sh kuryer avtomatik biriktiriladi\n` +
    `⏱ Yetkazish: ~${eta}\n\n` +
    `Rahmat! Holatni «📦 Holatni tekshirish» orqali kuzatib boring.`;

  resetFlow(ctx);
  await ctx.reply(text, { reply_markup: orderResultKb(saved.id) });
}

function resetFlow(ctx) {
  ctx.session.step = null;
  ctx.session.draft = {};
  ctx.session.cart = [];
}
