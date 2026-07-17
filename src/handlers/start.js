/* ===== /start va yordam ===== */
import { showMainMenu } from '../ui.js';

export function registerStart(bot) {
  bot.command('start', async (ctx) => {
    // Yangi /start — oqimni tozalab, bosh menyuni ko'rsatamiz
    ctx.session.step = null;
    await showMainMenu(ctx);
  });

  bot.command('help', async (ctx) => {
    await ctx.reply(
      '🤖 <b>YetkazGo bot</b>\n\n' +
      '• /start — bosh menyu\n' +
      '• 🍽 Buyurtma berish — restoran → taom → savat → yetkazish\n' +
      '• 📦 Buyurtmalarim — holatni kuzatish va bekor qilish',
      { reply_markup: { remove_keyboard: true } }
    );
  });
}
