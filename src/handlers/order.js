/* ===== Buyurtma oqimi: restoran -> taom -> miqdor -> savat ===== */
import { showRestaurants, showMenu, showDish, showCart, showMainMenu, render } from '../ui.js';
import { InlineKeyboard } from 'grammy';
import { cartTotal, cartCount, som, esc } from '../format.js';

/* Savatga qo'shilgach — taomlar QAYTA chiqmaydi; xarid/ortga tugmalari */
async function showAddedConfirm(ctx, d, qty) {
  const cart = ctx.session.cart || [];
  const kb = new InlineKeyboard()
    .text(`🧺 Savat (${cartCount(cart)}) · ${som(cartTotal(cart))}`, 'cart').row()
    .text('✅ Rasmiylashtirish', 'checkout').row()
    .text('⬅️ Menyuga qaytish', 'back:menu').row()
    .text('🏪 Restoranlar', 'back:rests');
  const text =
    `✅ <b>${esc(d.name)} × ${qty}</b> savatga qo'shildi.\n\n` +
    `🧺 Savatda: <b>${cartCount(cart)}</b> ta · Jami: <b>${som(cartTotal(cart))}</b>\n\n` +
    `Xarid qilasizmi yoki yana taom qo'shasizmi?`;
  await render(ctx, text, kb);
}

export function registerOrder(bot) {
  /* Buyurtmani boshlash */
  bot.callbackQuery('order:start', async (ctx) => {
    await ctx.answerCallbackQuery();
    await showRestaurants(ctx);
  });

  /* Bosh menyuga qaytish */
  bot.callbackQuery('home', async (ctx) => {
    await ctx.answerCallbackQuery();
    await showMainMenu(ctx);
  });

  /* Restoranlar ro'yxatiga qaytish */
  bot.callbackQuery('back:rests', async (ctx) => {
    await ctx.answerCallbackQuery();
    await showRestaurants(ctx);
  });

  /* Restoran tanlash */
  bot.callbackQuery(/^rest:(\d+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const r = (ctx.session.restaurants || [])[Number(ctx.match[1])];
    if (!r) return showRestaurants(ctx);
    ctx.session.rest = r.name;
    ctx.session.restEmoji = r.emoji || '🏪';
    await showMenu(ctx);
  });

  /* Menyuga qaytish */
  bot.callbackQuery('back:menu', async (ctx) => {
    await ctx.answerCallbackQuery();
    await showMenu(ctx);
  });

  /* Taom tanlash -> miqdor ekrani */
  bot.callbackQuery(/^dish:(\d+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    await showDish(ctx, Number(ctx.match[1]), 1);
  });

  /* Miqdorni o'zgartirish (➖ / ➕) */
  bot.callbackQuery(/^qty:(\d+):(-?\d+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const idx = Number(ctx.match[1]);
    let qty = Number(ctx.match[2]);
    if (qty < 1) qty = 1;
    if (qty > 50) qty = 50;
    await showDish(ctx, idx, qty);
  });

  /* Savatga qo'shish */
  bot.callbackQuery(/^add:(\d+):(\d+)$/, async (ctx) => {
    const idx = Number(ctx.match[1]);
    const qty = Math.max(1, Math.min(50, Number(ctx.match[2])));
    const d = (ctx.session.menu || [])[idx];
    if (!d) {
      await ctx.answerCallbackQuery();
      return showMenu(ctx);
    }
    const cart = ctx.session.cart;
    // Bir xil taom (bir xil narx) bo'lsa — miqdorni oshiramiz
    const existing = cart.find((x) => x.name === d.name && x.eff === d.eff);
    if (existing) existing.qty += qty;
    else cart.push({ id: d.id, name: d.name, emoji: d.emoji, price: d.price, eff: d.eff, discount: d.discount, qty });

    await ctx.answerCallbackQuery({ text: `✅ ${d.name} × ${qty} savatga qo'shildi` });
    /* Taomlar QAYTA CHIQMAYDI — xarid/ortga tugmalari ko'rsatiladi */
    await showAddedConfirm(ctx, d, qty);
  });

  /* Savatni ko'rish */
  bot.callbackQuery('cart', async (ctx) => {
    await ctx.answerCallbackQuery();
    await showCart(ctx);
  });

  /* Savatni tozalash */
  bot.callbackQuery('cart:clear', async (ctx) => {
    ctx.session.cart = [];
    await ctx.answerCallbackQuery({ text: '🗑 Savat tozalandi' });
    await showMenu(ctx);
  });

  /* Miqdor ko'rsatkichi tugmasi (harakatsiz) */
  bot.callbackQuery('noop', (ctx) => ctx.answerCallbackQuery());
}
