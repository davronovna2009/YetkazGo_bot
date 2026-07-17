# YetkazGo — Telegram buyurtma boti

YetkazGo sayti bilan **bir xil backend**ga ulanadigan Telegram bot. Bot faqat
Telegram interfeysini beradi — barcha menyu va buyurtma mantig'i backendda qoladi.
Botdan berilgan buyurtma restoran/admin panelida darhol ko'rinadi (xuddi saytdagidek).

- **Texnologiya:** Node.js 22, [grammY](https://grammy.dev), ESM
- **Ulanish:** faqat HTTP orqali backendga (`API_BASE`). Bazaga to'g'ridan-to'g'ri ULANMAYDI.
- **Holat:** savat/oqim — xotirada (session); joylashgan buyurtmalar — `data/orders.json`.

## Foydalanuvchi oqimi (mini sayt — asosiy)

`/start` → 🍽 Buyurtma berish → **restoranlar pastda tugma bo'lib chiqadi** →
restoran tanlanadi → **mini sayt pastdan ochiladi** (taomlar rasmi va narxi bilan,
xuddi saytdagidek) → savatga qo'shish → 📱 telefon + 📍 manzil + 💵/💳 to'lov →
✅ tasdiq → **mini sayt yopiladi va botga avtomatik xabar keladi**:
«Buyurtmangiz qabul qilindi, yetib kelgach xabar boradi».

Kuryer «Yetkazdim ✓» bosgach (holat `arrived`) bot **o'zi xabar yuboradi**:
«Buyurtmangiz yetib keldi — tasdiqlang». Mijoz ✅ Qabul qildim bosadi →
`POST /orders/:id/received` → holat `done` → **kuryer va restoran panelida ham
darhol ko'rinadi**.

📦 Buyurtmalarim orqali holat kuzatiladi va bekor qilinadi.

> **Zaxira:** `WEBAPP_URL` sozlanmagan bo'lsa bot avtomatik eski tugmali oqimga
> tushadi (restoran → taom → savat → telefon → manzil → to'lov → tasdiq).

## O'rnatish va ishga tushirish

### 1. Backendni ishga tushiring (5050-portda)

```bash
cd ../yetkaz-FINAL/server
npm install
npm start            # http://localhost:5050
```

### 2. Botni sozlang

```bash
cd YetkazGo_bot
npm install
cp .env.example .env      # Windows: copy .env.example .env
```

`.env` faylini oching va to'ldiring:

```
BOT_TOKEN=<@BotFather bergan token>
API_BASE=http://localhost:5050/api
WEBAPP_URL=<https manzil>/tg-app.html
```

### 3. Mini sayt uchun HTTPS manzil oching

Mini sayt (`yetkaz-FINAL/tg-app.html`) backend tomonidan `/tg-app.html` da
tarqatiladi. **Telegram faqat `https://` ni qabul qiladi — `http://localhost`
ISHLAMAYDI.** Sinash uchun tunnel oching (backend ishlab turgan holda):

```bash
cloudflared tunnel --url http://localhost:5050
```

U bergan manzilga `/tg-app.html` qo'shib `.env` ga yozing:

```
WEBAPP_URL=https://abcd-1234.trycloudflare.com/tg-app.html
```

> Bepul tunnel manzili har safar o'zgaradi — `.env` ni yangilab, botni qayta
> ishga tushiring. Doimiy manzil uchun: `yetkaz-FINAL/DEPLOY.md` (Render.com).

### 4. Botni ishga tushiring

```bash
npm start          # yoki `npm run dev` (avtomatik qayta yuklash bilan)
```

Konsolda `🤖 @bot_username ishga tushdi (polling)` chiqsa — tayyor. Telegramda
botga `/start` yuboring.

## Muhim eslatmalar

- **Bir xil tokendan foydalanish mumkin.** Backend `.env`dagi `TG_TOKEN` yangi
  buyurtma kelganda operator guruhiga xabar yuboradi (`sendMessage`). Bu bot esa
  `getUpdates` (polling) qiladi. Ikkalasi turli operatsiya — konflikt yo'q.
  Xohlasangiz bot uchun alohida token ham ishlatishingiz mumkin.
- Bot operator guruhiga xabar yuborishni **takrorlamaydi** — buni backend qiladi.
- Backend o'chiq bo'lsa, bot foydalanuvchiga tushunarli xatolik ko'rsatadi.

## Papka tuzilishi

```
YetkazGo_bot/
├── src/
│   ├── bot.js            # kirish nuqtasi (session, polling, watcher)
│   ├── config.js         # .env (BOT_TOKEN, API_BASE, WEBAPP_URL, POLL_MS)
│   ├── api.js            # backend HTTP klient
│   ├── watcher.js        # ⭐ fon kuzatuvchi: arrived -> "yetib keldi" xabari
│   ├── menu.js           # bootstrap.overrides -> menyu (chegirma/soldout)
│   ├── storage.js        # data/orders.json (id + token)
│   ├── format.js         # narx/telefon/holat formatlash
│   ├── keyboards.js      # inline + reply (web_app) klaviaturalar
│   ├── ui.js             # ekran chizish yordamchilari
│   └── handlers/
│       ├── start.js
│       ├── webapp.js     # ⭐ mini saytdan kelgan buyurtma (web_app_data)
│       ├── order.js      # zaxira oqim: restoran/taom/savat
│       ├── checkout.js   # zaxira oqim: telefon/manzil/to'lov/tasdiq
│       └── myOrders.js   # holat/bekor qilish/qabul qildim
├── data/orders.json      # avtomatik yaratiladi
├── .env                  # SIZ yaratasiz
└── package.json

yetkaz-FINAL/
└── tg-app.html           # ⭐ MINI SAYT (backend /tg-app.html da tarqatadi)
```

## Mini sayt qanday ishlaydi (texnik)

1. Bot restoranlarni **reply klaviaturada** `web_app` tugmasi qilib chiqaradi:
   `<WEBAPP_URL>?rest=<restoran nomi>`.
   **MUHIM:** `sendData` (mini sayt → bot) faqat **reply** klaviaturadagi
   `web_app` tugmasida ishlaydi — inline tugmada ishlamaydi. Shuning uchun
   `keyboards.js:restaurantsWebAppKb()` `Keyboard()` ishlatadi.
2. Mini sayt `GET /api/bootstrap` dan menyuni oladi va sayt (`store.js:mergeDishes`)
   hamda bot (`menu.js`) bilan **bir xil mantiqni** takrorlaydi: `removed`/`soldout`
   chiqariladi, `discounts["rest|nom"]` qo'llanadi.
3. Foydalanuvchi tasdiqlaganda `tg.sendData(JSON)` chaqiriladi — mini sayt **o'zi
   yopiladi**, ma'lumot Telegram orqali botga `message.web_app_data` bo'lib keladi.
   Bu kanal ishonchli (foydalanuvchi soxtalashtira olmaydi) — initData/HMAC
   tekshiruvi shart emas.
4. Bot `POST /api/orders` qiladi. **Summani mini sayt EMAS, backend hisoblaydi**
   (`server/src/pricing.js`, dish `id` bo'yicha) — mini saytdagi narx faqat
   ko'rsatish uchun.
5. `watcher.js` tugallanmagan buyurtmalarni har `POLL_MS` da `GET /orders/:id`
   orqali so'raydi (backendda push kanali yo'q — sayt paneli ham shunday qiladi).
   `arrived` bo'lganda "yetib keldi, tasdiqlang" xabari ketadi.
