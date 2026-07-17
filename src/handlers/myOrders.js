/* ===== Buyurtmalarim: ro'yxat, holat kuzatish, bekor qilish ===== */
import { ordersListKb, trackKb, mainMenuKb } from '../keyboards.js';
import { getUserOrders, findOrder, updateOrder } from '../storage.js';
import { getOrder, cancelOrder, confirmReceived } from '../api.js';
import { statusLabel, canCancel, som, esc } from '../format.js';
import { render, showMainMenu } from '../ui.js';

export function registerMyOrders(bot) {
  /* Ro'yxat */
  bot.callbackQuery('myorders', async (ctx) => {
    await ctx.answerCallbackQuery();
    await showMyOrders(ctx);
  });

  /* Bitta buyurtma holati */
  bot.callbackQuery(/^track:(\d+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    await showTrack(ctx, ctx.match[1]);
  });

  /* Bekor qilish */
  bot.callbackQuery(/^cancel:(\d+)$/, async (ctx) => {
    const id = ctx.match[1];
    const o = await findOrder(ctx.from.id, id);
    if (!o) {
      await ctx.answerCallbackQuery({ text: 'Buyurtma topilmadi' });
      return showMyOrders(ctx);
    }
    try {
      const r = await cancelOrder(id, o.token);
      await updateOrder(ctx.from.id, id, { status: (r && r.status) || 'cancelled' });
      await ctx.answerCallbackQuery({ text: '❌ Buyurtma bekor qilindi' });
    } catch (e) {
      await ctx.answerCallbackQuery({
        text: (e.data && e.data.error) || e.message || 'Bekor qilib bo\'lmadi',
        show_alert: true,
      });
    }
    await showTrack(ctx, id);
  });

  /* Mijoz "Qabul qildim" — yetib kelgan buyurtmani tasdiqlaydi (arrived -> done) */
  bot.callbackQuery(/^receive:(\d+)$/, async (ctx) => {
    const id = ctx.match[1];
    const o = await findOrder(ctx.from.id, id);
    if (!o) {
      await ctx.answerCallbackQuery({ text: 'Buyurtma topilmadi' });
      return showMyOrders(ctx);
    }
    try {
      const r = await confirmReceived(id, o.token);
      await updateOrder(ctx.from.id, id, { status: (r && r.status) || 'done' });
      await ctx.answerCallbackQuery({ text: '✅ Rahmat! Qabul qilinganini tasdiqladingiz' });
    } catch (e) {
      await ctx.answerCallbackQuery({
        text: (e.data && e.data.error) || e.message || 'Tasdiqlab bo\'lmadi',
        show_alert: true,
      });
    }
    await showTrack(ctx, id);
  });
}

/* --- Yordamchilar --- */

async function showMyOrders(ctx) {
  const orders = await getUserOrders(ctx.from.id);
  if (!orders.length) {
    return render(ctx, '📦 Sizda hali buyurtmalar yo\'q.', mainMenuKb());
  }
  const shown = orders.slice(0, 10);
  const lines = shown
    .map((o) => `#${o.id} — ${esc(o.rest)} — ${som(o.amount)} — ${statusLabel(o.status)}`)
    .join('\n');
  await render(
    ctx,
    `📦 <b>Buyurtmalarim</b>\n\n${lines}\n\nBatafsil ko'rish uchun tanlang:`,
    ordersListKb(shown)
  );
}

async function showTrack(ctx, id) {
  let o = await findOrder(ctx.from.id, id);
  if (!o) return showMyOrders(ctx);

  // Backenddan yangi holatni olamiz
  try {
    const r = await getOrder(id);
    if (r && r.status) {
      o = (await updateOrder(ctx.from.id, id, { status: r.status, reason: r.reason || '' })) || o;
    }
  } catch { /* offline — saqlangan holat qoladi */ }

  let text =
    `🧾 <b>Buyurtma #${o.id}</b>\n\n` +
    `🏪 ${esc(o.rest)}\n` +
    `🍽 ${esc(o.item)}\n` +
    `💰 ${som(o.amount)}\n` +
    `📍 ${esc(o.addr || '')}\n\n` +
    `Holat: <b>${statusLabel(o.status)}</b>`;
  if (o.status === 'cancelled' && o.reason) text += `\nSabab: ${esc(o.reason)}`;
  if (o.status === 'arrived') text += `\n\n📍 <b>Buyurtmangiz yetib keldi!</b> Qabul qilib olganingizni tasdiqlang:`;
  if (o.status === 'done') text += `\n\n✅ Qabul qilinganini tasdiqladingiz. Rahmat!`;

  await render(ctx, text, trackKb(id, canCancel(o.status), o.status === 'arrived'));
}
