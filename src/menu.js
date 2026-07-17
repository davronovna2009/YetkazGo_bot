/* ===== Menyu yig'ish =====
   Backend `/bootstrap` faqat `overrides` beradi (bazaviy katalog frontendda,
   lekin bu loyihada u bo'sh — hamma taom `overrides.added` da). Bu yerda sayt
   store.js:mergeDishes() bilan bir xil mantiq takrorlanadi:
     - removed / soldout taomlar chiqarib tashlanadi
     - discounts["rest|name"] foizi qo'llanib, `eff` (chegirmali narx) hisoblanadi */

const key = (rest, name) => `${rest}|${name}`;

/* Berilgan restoranning sotuvdagi taomlari */
export function menuForRest(restName, overrides) {
  const o = overrides || {};
  const removed = new Set(o.removed || []);
  const soldout = new Set(o.soldout || []);
  const discounts = o.discounts || {};

  return (o.added || [])
    .filter((d) => d.rest === restName)
    .filter((d) => !removed.has(key(restName, d.name)))
    .filter((d) => !soldout.has(key(restName, d.name)))
    .map((d) => {
      const pct = discounts[key(restName, d.name)] || 0;
      const eff = pct ? Math.round(d.price * (1 - pct / 100)) : d.price;
      return {
        id: d.id,            // MUHIM: backend narxni shu id bo'yicha o'zi hisoblaydi
        name: d.name,
        emoji: d.emoji || '🍽️',
        price: d.price,      // asl narx (faqat ko'rsatish uchun)
        discount: pct,       // chegirma foizi (0 bo'lsa yo'q)
        eff,                 // to'lanadigan narx (faqat ko'rsatish uchun)
        photo: d.photo || '', // taom rasmi (URL yoki /uploads/...)
      };
    });
}

/* Faqat faol restoranlar (bootstrap allaqachon faol beradi — zaxira filtr) */
export function activeRestaurants(list) {
  return (list || []).filter((r) => r && r.active !== false);
}

/* ===== Buyurtmani tekshirish uchun: id -> taom (soldout bilan) =====
   menuForRest() soldout taomlarni yashiradi (eski oqim ko'rsatmaydi), lekin
   buyurtmani tekshirishда bizga soldout/removed holati ham kerak. Bu funksiya
   restoranning BARCHA taomlarini `id` bo'yicha map qilib beradi. */
export function dishIndexForRest(restName, overrides) {
  const o = overrides || {};
  const removed = new Set(o.removed || []);
  const soldout = new Set(o.soldout || []);
  const map = new Map();
  for (const d of o.added || []) {
    if (d.rest !== restName) continue;
    map.set(Number(d.id), {
      id: Number(d.id),
      name: d.name,
      removed: removed.has(key(restName, d.name)),
      soldout: soldout.has(key(restName, d.name)),
    });
  }
  return map;
}
