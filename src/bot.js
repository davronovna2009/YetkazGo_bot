/* ===== YetkazGo Telegram bot — kirish nuqtasi (grammY, polling) ===== */
import { Bot, session, GrammyError, HttpError } from 'grammy';
import { BOT_TOKEN, API_BASE, WEBAPP_URL, WEBAPP_READY } from './config.js';
import { mainMenuKb, CLOSE_LABEL } from './keyboards.js';
import { startWatcher } from './watcher.js';

import { registerStart } from './handlers/start.js';
import { registerOrder } from './handlers/order.js';
import { registerCheckout } from './handlers/checkout.js';
import { registerMyOrders } from './handlers/myOrders.js';
import { registerWebApp } from './handlers/webapp.js';

const bot = new Bot(BOT_TOKEN);

/* Barcha xabarlar uchun standart parse_mode = HTML (agar aniq ko'rsatilmagan bo'lsa) */
const HTML_METHODS = ['sendMessage', 'editMessageText', 'sendPhoto', 'editMessageCaption'];
bot.api.config.use((prev, method, payload, signal) => {
  if (HTML_METHODS.includes(method) && payload && payload.parse_mode === undefined) {
    payload.parse_mode = 'HTML';
  }
  return prev(method, payload, signal);
});

/* Sessiya — savat va oqim holati xotirada (chat bo'yicha) */
function initial() {
  return {
    cart: [],          // [{ name, emoji, price, eff, discount, qty }]
    rest: null,        // tanlangan restoran nomi
    restEmoji: '',
    menu: [],          // joriy restoran taomlari (callback indekslari uchun)
    restaurants: [],   // faol restoranlar (callback indekslari uchun)
    overrides: {},     // bootstrap.overrides keshi
    step: null,        // null | 'phone' | 'address' | 'pay' | 'confirm'
    draft: {},         // { phone, phonePretty, addr, pay }
  };
}
bot.use(session({ initial }));

/* Handlerlarni ro'yxatdan o'tkazamiz (tartib muhim: buyruqlar -> callbacklar -> matn) */
registerStart(bot);
registerWebApp(bot);     // mini saytdan kelgan buyurtma (message:web_app_data)
registerOrder(bot);
registerMyOrders(bot);
registerCheckout(bot);

/* Restoranlar reply klaviaturasini yopish */
bot.hears(CLOSE_LABEL, async (ctx) => {
  await ctx.reply('Bosh menyu 🏠', { reply_markup: { remove_keyboard: true } });
  await ctx.reply('Quyidagidan tanlang:', { reply_markup: mainMenuKb() });
});

/* Boshqa matnlar uchun yumshoq eslatma (oqimga tegishli bo'lmasa) */
bot.on('message:text', async (ctx) => {
  await ctx.reply('Tugmalardan foydalaning yoki /start bosing. 🍽', { reply_markup: mainMenuKb() });
});

/* Global xatolarni ushlash */
bot.catch((err) => {
  const e = err.error;
  if (e instanceof GrammyError) console.error('❌ Telegram API xato:', e.description);
  else if (e instanceof HttpError) console.error('❌ Tarmoq xato:', e);
  else console.error('❌ Kutilmagan xato:', e);
});

/* Telegram menyusidagi buyruqlar */
await bot.api.setMyCommands([
  { command: 'start', description: 'Bosh menyu / qayta boshlash' },
  { command: 'help', description: 'Yordam' },
]).catch(() => {});

/* Buyurtma holatini kuzatish (arrived -> "yetib keldi" xabari) */
startWatcher(bot);

/* Polling (getUpdates) — backend faqat sendMessage qiladi, konflikt yo'q */
bot.start({
  onStart: (me) => {
    console.log(`\n🤖 @${me.username} ishga tushdi (polling).`);
    console.log(`   Backend API: ${API_BASE}`);
    console.log(`   Mini sayt:   ${WEBAPP_READY ? WEBAPP_URL : 'o\'chiq (WEBAPP_URL yo\'q) — eski tugmali oqim'}\n`);
  },
});
