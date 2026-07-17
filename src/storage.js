/* ===== Joylashtirilgan buyurtmalarni saqlash (data/orders.json) =====
   Bot restartdan keyin ham "Buyurtmalarim" ishlashi uchun har foydalanuvchining
   buyurtma id + maxfiy token'i kichik JSON faylda saqlanadi. Bu SQLite EMAS —
   shunchaki botning o'z yordamchi keshi. */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, '..', 'data');
const FILE = resolve(DATA_DIR, 'orders.json');

/* Xotira keshi: { [telegramUserId]: [ order, ... ] } */
let store = null;

async function load() {
  if (store) return store;
  try {
    store = JSON.parse(await readFile(FILE, 'utf8'));
    if (!store || typeof store !== 'object') store = {};
  } catch {
    store = {};
  }
  return store;
}

async function persist() {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(FILE, JSON.stringify(store, null, 2), 'utf8');
}

/* Yangi buyurtmani saqlash (eng oxirgi 30 tasi qoladi) */
export async function saveOrder(userId, order) {
  await load();
  const uid = String(userId);
  const list = (store[uid] = store[uid] || []);
  list.unshift(order);
  if (list.length > 30) list.length = 30;
  await persist();
}

/* Foydalanuvchining barcha saqlangan buyurtmalari (eng yangisi birinchi) */
export async function getUserOrders(userId) {
  await load();
  return store[String(userId)] || [];
}

/* ===== Kuzatuvdagi buyurtmalar (watcher uchun) =====
   Tugallanmagan (done/cancelled emas) va hali eski bo'lmagan buyurtmalar —
   barcha foydalanuvchilar bo'yicha. `maxAgeH` dan eski buyurtmalar tashlab
   ketiladi, aks holda "osilib qolgan" buyurtma abadiy so'raladi. */
export async function getActiveOrders(maxAgeH = 24) {
  await load();
  const cutoff = Date.now() - maxAgeH * 3600 * 1000;
  const out = [];
  for (const [userId, list] of Object.entries(store)) {
    for (const order of list) {
      if (['done', 'cancelled'].includes(order.status)) continue;
      const t = Date.parse(order.createdAt || '');
      if (Number.isFinite(t) && t < cutoff) continue;
      out.push({ userId, order });
    }
  }
  return out;
}

/* Bitta buyurtma (id bo'yicha) */
export async function findOrder(userId, id) {
  await load();
  return (store[String(userId)] || []).find((o) => String(o.id) === String(id)) || null;
}

/* Saqlangan buyurtma holatini yangilash (status/reason) */
export async function updateOrder(userId, id, patch) {
  await load();
  const o = (store[String(userId)] || []).find((x) => String(x.id) === String(id));
  if (o) {
    Object.assign(o, patch);
    await persist();
  }
  return o;
}
