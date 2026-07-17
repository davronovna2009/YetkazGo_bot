/* ===== Klaviaturalar (inline tugmalar + reply klaviaturalar) ===== */
import { InlineKeyboard, Keyboard } from 'grammy';
import { isRestOpen } from './hours.js';

/* Reply klaviaturadagi "bekor qilish" tugmasi matni (checkout bosqichlarida) */
export const CANCEL_LABEL = '❌ Bekor qilish';

/* Bosh menyu */
export function mainMenuKb() {
  return new InlineKeyboard()
    .text('🍽 Buyurtma berish', 'order:start')
    .row()
    .text('📦 Buyurtmalarim', 'myorders');
}

/* Reply klaviaturadagi "menyuni yopish" tugmasi */
export const CLOSE_LABEL = '❌ Yopish';

/* ===== Restoranlar — MINI SAYT tugmalari (reply klaviatura) =====
   MUHIM: `sendData` (mini sayt -> bot) FAQAT reply klaviaturadagi web_app
   tugmasidan ochilgan mini appda ishlaydi. Inline tugmada ishlamaydi —
   shuning uchun bu yerda Keyboard() ishlatilgan, InlineKeyboard() emas.
   Har bir restoran o'z URL'ini oladi: <WEBAPP_URL>?rest=<nom> */
export function restaurantsWebAppKb(rests, webappUrl) {
  const kb = new Keyboard();
  rests.forEach((r) => {
    const url = `${webappUrl}?rest=${encodeURIComponent(r.name)}`;
    /* Yopiq restoran saytdagidek belgilanadi (ro'yxatdan olib tashlanmaydi) */
    const dot = isRestOpen(r) ? '' : ' 🔴';
    kb.webApp(`${r.emoji || '🏪'} ${r.name}${dot}`, url).row();
  });
  kb.text(CLOSE_LABEL);
  return kb.resized();
}

/* Restoranlar ro'yxati (index -> session.restaurants) */
export function restaurantsKb(rests) {
  const kb = new InlineKeyboard();
  rests.forEach((r, i) => {
    kb.text(`${r.emoji || '🏪'} ${r.name}`, `rest:${i}`).row();
  });
  kb.text('🏠 Bosh menyu', 'home');
  return kb;
}

/* Restoran menyusi (index -> session.menu) */
export function menuKb(menu, count) {
  const kb = new InlineKeyboard();
  menu.forEach((d, i) => {
    const price = d.discount
      ? `${d.eff.toLocaleString('ru-RU')} so'm (−${d.discount}%)`
      : `${d.eff.toLocaleString('ru-RU')} so'm`;
    kb.text(`${d.emoji} ${d.name} — ${price}`, `dish:${i}`).row();
  });
  if (count > 0) {
    kb.text(`🧺 Savat (${count})`, 'cart').text('✅ Rasmiylashtirish', 'checkout').row();
  }
  kb.text('⬅️ Restoranlar', 'back:rests').text('🏠 Bosh menyu', 'home');
  return kb;
}

/* Miqdor tanlash (➖ N ➕) */
export function qtyKb(dishIndex, qty) {
  return new InlineKeyboard()
    .text('➖', `qty:${dishIndex}:${qty - 1}`)
    .text(`${qty} dona`, 'noop')
    .text('➕', `qty:${dishIndex}:${qty + 1}`)
    .row()
    .text('🧺 Savatga qo\'shish', `add:${dishIndex}:${qty}`)
    .row()
    .text('⬅️ Menyu', 'back:menu');
}

/* Savat ko'rinishi tugmalari */
export function cartKb() {
  return new InlineKeyboard()
    .text('✅ Rasmiylashtirish', 'checkout')
    .row()
    .text('➕ Yana qo\'shish', 'back:menu')
    .text('🗑 Tozalash', 'cart:clear');
}

/* Telefon so'rash — Telegram kontaktini ulashish (+ bekor qilish) */
export function phoneKb() {
  return new Keyboard()
    .requestContact('📱 Kontaktni ulashish')
    .row()
    .text(CANCEL_LABEL)
    .resized()
    .oneTime();
}

/* Manzil so'rash — lokatsiya yuborish (yoki matn) (+ bekor qilish) */
export function addressKb() {
  return new Keyboard()
    .requestLocation('📍 Lokatsiyani yuborish')
    .row()
    .text(CANCEL_LABEL)
    .resized()
    .oneTime();
}

/* To'lov turi (+ bekor qilish) */
export function payKb() {
  return new InlineKeyboard()
    .text('💵 Naqd', 'pay:cash')
    .text('💳 Karta', 'pay:card')
    .row()
    .text('❌ Bekor qilish', 'flow:cancel');
}

/* Yakuniy tasdiq */
export function confirmKb() {
  return new InlineKeyboard()
    .text('✅ Tasdiqlash', 'confirm')
    .row()
    .text('❌ Bekor qilish', 'flow:cancel');
}

/* Buyurtma joylashgandan keyin */
export function orderResultKb(id) {
  return new InlineKeyboard()
    .text('📦 Holatni tekshirish', `track:${id}`)
    .row()
    .text('🏠 Bosh menyu', 'home');
}

/* ===== "Buyurtmangiz yetib keldi" xabari (watcher yuboradi) =====
   Tasdiq -> POST /orders/:id/received -> status `done`.
   Bu tasdiq kuryer panelida ham, restoran panelida ham darhol ko'rinadi. */
export function arrivedKb(id) {
  return new InlineKeyboard()
    .text('✅ Qabul qildim', `receive:${id}`)
    .row()
    .text('🧾 Batafsil', `track:${id}`);
}

/* Buyurtmalarim ro'yxati */
export function ordersListKb(orders) {
  const kb = new InlineKeyboard();
  orders.forEach((o) => {
    kb.text(`#${o.id} — ${o.rest}`, `track:${o.id}`).row();
  });
  kb.text('🏠 Bosh menyu', 'home');
  return kb;
}

/* Bitta buyurtma holati ko'rinishi */
export function trackKb(id, cancellable, receivable) {
  const kb = new InlineKeyboard().text('🔄 Yangilash', `track:${id}`);
  if (receivable) kb.text('✅ Qabul qildim', `receive:${id}`);
  if (cancellable) kb.text('❌ Bekor qilish', `cancel:${id}`);
  kb.row().text('⬅️ Buyurtmalarim', 'myorders');
  return kb;
}
