/* ===== Backend HTTP klient =====
   Bot bazaga TO'G'RIDAN-TO'G'RI ulanmaydi — faqat shu 5 ta endpoint orqali,
   xuddi sayt (assets/js/store.js) kabi. Node 22 global `fetch` ishlatiladi. */
import { API_BASE } from './config.js';

async function req(path, { method = 'GET', body } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let res;
  try {
    res = await fetch(API_BASE + path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    // Tarmoq/ulanish xatosi — backend o'chiq bo'lishi mumkin
    const err = new Error('Serverga ulanib bo\'lmadi');
    err.offline = true;
    err.cause = e;
    throw err;
  }

  let data = null;
  try { data = await res.json(); } catch { /* bo'sh javob */ }

  if (!res.ok) {
    const err = new Error((data && data.error) || ('HTTP ' + res.status));
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

/* Bosh sahifa snapshot: { reviews, overrides, announcements, restaurants(active) } */
export const getBootstrap = () => req('/bootstrap');

/* Barcha restoranlar (faol/nofaol) — zaxira sifatida */
export const getRestaurants = () => req('/restaurants');

/* Yangi buyurtma. Javob: { id, courier, eta, status, token, ... } */
export const createOrder = (order) => req('/orders', { method: 'POST', body: order });

/* Buyurtma holati (ochiq): { id, status, reason } */
export const getOrder = (id) => req('/orders/' + id);

/* Buyurtmani bekor qilish — maxfiy token bilan */
export const cancelOrder = (id, token) =>
  req('/orders/' + id + '/cancel', { method: 'POST', body: { token } });

/* Mijoz "Qabul qildim" — yetib kelgan (arrived) buyurtmani tasdiqlaydi (-> done).
   Bu tasdiq restoran/kuryer/admin panellarida ham ko'rinadi; kuryer va restoranga
   pul (haq/daromad) shu tasdiqdan keyin yoziladi. */
export const confirmReceived = (id, token) =>
  req('/orders/' + id + '/received', { method: 'POST', body: { token } });
