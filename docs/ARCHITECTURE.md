# مستندات معماری و API پلتفرم بازی و چت (GameChat Platform)

## ۱. نمای کلی سیستم (System Overview)

پلتفرم **GameChat** یک وب‌اپلیکیشن چت تیمی و مینی‌گیم‌های چندنفره همزمان (Real-time Multiplayer) است که با الهام از رابط‌های کاربری مدرن (مانند دیسکورد و تلگرام) طراحی شده است. کاربران می‌توانند اتاق‌های گفتگوی عمومی، خصوصی یا موقت بسازند، پیام ارسال کنند و مستقیماً داخل چت بازی‌های چندنفره را آغاز نمایند.

```
┌────────────────────────────────────────────────────────┐
│                   Frontend (Next.js 14)                │
│  - Three-column Layout (Rooms, Chat, Room Info)        │
│  - Real-time Game Boards (Chess, Uno, TicTacToe, ...)  │
│  - Socket.IO Client + Tailwind CSS + RTL Support       │
└───────────────▲────────────────────────▲───────────────┘
                │                        │
       HTTP Rewrites (/rooms,           Socket.IO WebSockets
       /auth, /profile, /avatars)       (Events, Moves, Chat)
                │                        │
┌───────────────▼────────────────────────▼───────────────┐
│               Backend Server (Express 4)               │
│  - Socket.IO Server (Rooms, Sessions, Turns, Forfeit)  │
│  - REST API (Auth, Profile, Avatars, Game Configs)     │
│  - Game Engines (server/games/*.js)                    │
│  - SQLite Database (better-sqlite3, WAL mode)          │
└────────────────────────────────────────────────────────┘
```

---

## ۲. پشته فناوری (Tech Stack)

### ۲.۱. بخش فرانت‌اند (Frontend)
- **فریم‌ورک:** Next.js 14.2.5 (App Router, Client Components, Output Standalone)
- **کتابخانه UI:** React 18.3.1
- **استایل‌دهی:** Tailwind CSS 3.4.10 با پشتیبانی کامل از چینش راست‌به‌چپ (RTL) و فونت وزیرمتن (Vazirmatn)
- **ارتباط بلادرنگ:** `socket.io-client` 4.7.5
- **آیکون‌ها و ابزارها:** `lucide-react`, `emoji-picker-react`, `@lichess-org/chessground`

### ۲.۲. بخش بک‌اند (Backend)
- **محیط اجرا:** Node.js (ES Modules, `type: module`)
- **سرور HTTP و وب‌سوکت:** Express 4.19.2 + Socket.IO 4.7.5
- **دیتابیس:** SQLite 3 با درایور پرسرعت `better-sqlite3` (همگام با حالت WAL)
- **مدیریت فایل‌ها:** Multer برای آپلود آواتارهای کاربران و اتاق‌ها
- **تست‌ها:** Node.js Native Test Runner (`node --test`)

---

## ۳. مدل داده و ساختار دیتابیس (Database Schema)

دیتابیس در مسیر `server/data/mazi.db` قرار دارد و جداول زیر را شامل می‌شود:

| نام جدول | وظیفه و توضیحات |
| :--- | :--- |
| `users` | ذخیره اطلاعات کاربر (شناسه، نام کاربری، هش رمزعبور، آواتار، سطح/XP، بردها، نشان‌ها، تگ‌ها و نقش ادمین) |
| `rooms` | ذخیره اتاق‌ها (شناسه، نام، آیکون، موضوع، نوع دسترسی public/private/temporary، آواتار اختصاصی) |
| `room_members` | عضویت کاربران در اتاق‌ها و نقش آن‌ها (`owner`, `member`, `moderator`) |
| `messages` | پیام‌های چت و کارت‌های شروع بازی (با پشتیبانی از پیام‌های سیستمی و کارت بازی) |
| `invites` | کدهای دعوت معتبر برای اتاق‌های خصوصی به همراه مهلت انقضا |
| `user_wins` | آمار بردهای هر کاربر به تفکیک نوع بازی |
| `game_configs` | پیکربندی بازی‌ها (حداقل و حداکثر بازیکن، وضعیت فعال/غیرفعال، توضیحات و آیکون) |

---

## ۴. موتور بازی‌ها و وضعیت نشست‌ها (Game Engine)

تمام بازی‌های فعال در پوشه `server/games/` با معماری داده‌محور پیاده‌سازی شده‌اند:
1. **Tic Tac Toe (دوز):** ۲ نفره، بررسی برنده در ۸ حالت برد و تساوی.
2. **Uno (اوونو):** ۲ تا ۴ نفره، کارت‌های رنگی، کارت‌های ویژه (Skip، Reverse، Draw Two، Wild، Wild Draw Four) و بررسی حرکت معتبر.
3. **Chess (شطرنج):** ۲ نفره، اعتبارسنجی حرکات قانونی در بک‌اند و رندرینگ تخته با Chessground در فرانت‌اند.
4. **LockPick (قفل‌گشا):** ۲ نفره سرعتی، مکانیزم تطابق حلقه‌ها و گوی‌های رنگی، تایمر ۴۵ ثانیه‌ای و تعیین برنده بر اساس تعداد قفل‌های باز شده.
5. **Dots & Boxes (نقطه‌بازی):** ۲ نفره، ترسیم خطوط افقی/عمودی و تصاحب جعبه‌ها.

### مدیریت نشست‌ها و خطاها (Disconnections & Forfeit):
- **تایمر ۶۰ ثانیه‌ای قطعی:** در صورت قطع ارتباط سوکت بازیکن، یک تایمر ۶۰ ثانیه‌ای آغاز می‌شود. در صورت عدم بازگشت، بازی به نفع حریف تمام می‌شود (`handlePlayerForfeit`).
- **خروج همگانی (All Left):** در صورتی که همه بازیکنان تب بازی را ببندند، بعد از ۶۰ ثانیه بازی لغو می‌شود تا حافظه سرور اشغال نماند.
- **رای‌گیری اتمام بازی (End Game Vote):** امکان اعلام توافق برای مساوی و پایان بازی.

---

## ۵. راهنمای ایونت‌های وب‌سوکت (Socket.IO Events API)

### ۵.۱. ایونت‌های اتاق‌ها و چت
| رویداد ورودی (Client -> Server) | رویداد خروجی (Server -> Client) | شرح عملکرد |
| :--- | :--- | :--- |
| `create_room` | `room_created`, `room_joined` | ایجاد اتاق جدید و ورود سازنده به عنوان Owner |
| `join_room` | `room_joined`, `member_update` / `room_join_error` | ورود به اتاق با بررسی کد دعوت در اتاق‌های خصوصی |
| `leave_room` | `member_update`, `room_removed` | ترک اتاق و پاکسازی اتاق در صورت موقت بودن |
| `delete_room` | `room_removed`, `room_deleted` | حذف اتاق توسط سازنده یا ادمین |
| `send_message` | `message_received`, `room_new_message` | ارسال پیام در اتاق و ذخیره در دیتابیس |
| `create_invite` | `invite_created` | ایجاد کد دعوت دارای زمان انقضا برای اتاق خصوصی |
| `update_status` | `status_updated` | تغییر وضعیت کاربر (`online`, `idle`, `in-game`) |

### ۵.۲. ایونت‌های بازی‌ها
| رویداد ورودی (Client -> Server) | رویداد خروجی (Server -> Client) | شرح عملکرد |
| :--- | :--- | :--- |
| `start_game` | `game_started`, `game_state`, `message_received` | ایجاد نشست بازی و ارسال کارت بازی به چت |
| `join_game` | `game_joined`, `game_players`, `game_state` | پیوستن به بازی منتظر بازیکن |
| `start_session` | `game_status`, `game_state` | آغاز بازی توسط هاست پس از تکمیل ظرفیت |
| `game_move` | `game_state`, `game_ended` | ارسال حرکت بازی و بررسی وضعیت برد/باخت/مساوی |
| `leave_game` / `reopen_game` | `player_left_game` | بستن یا باز کردن مجدد پنجره بازی |
| `request_end_game` | `end_game_requested`, `game_ended` | درخواست پایان زودهنگام و مساوی |
| `identify` | `player_reconnected`, `game_state` | بازیابی وضعیت بازیکن پس از قطع و وصل شدن |

---

## ۶. راهنمای اندپوینت‌های REST API

- `GET /health`: بررسی سلامت سرور
- `GET /rooms`: دریافت لیست اتاق‌های فعال
- `GET /profile/:userId`: دریافت اطلاعات عمومی پروفایل کاربر
- `POST /auth/guest`: ورود یا ثبت‌نام مهمان
- `POST /auth/login`: لاگین کاربر ثبت‌نامی با نام کاربری و پسورد
- `POST /auth/change-password`: تغییر رمز عبور
- `POST /profile/avatar`: آپلود عکس آواتار کاربر
- `POST /profile/tags`: به‌روزرسانی تگ‌های علاقه‌مندی کاربر (حداکثر ۳ تگ)
- `GET /games/config`: دریافت لیست بازی‌ها و تنظیمات آن‌ها
- `PUT /games/config/:gameId`: ویرایش وضعیت فعال/غیرفعال و محدودیت‌های بازی (ویژه ادمین)
- `POST /games/config/avatar/:gameId`: آپلود کاور بازی (ویژه ادمین)
