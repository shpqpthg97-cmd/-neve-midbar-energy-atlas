# אירוח ב־Render עם מסד Supabase

האתר עצמו (כניסה, הרשאות, נתונים, מקורות) לא השתנה. התיקייה הזו מוסיפה רק דרך נוספת להריץ אותו:

- `server.mjs` – שרת Node שמריץ את ה־Worker הבנוי (`dist/cloudflare/worker.mjs`) ב־Render.
- `pg-d1.mjs` – מתאם שמאפשר לקוד שנכתב ל־D1 לעבוד מול PostgreSQL של Supabase.
- `postgres-schema.sql` – אותם 12 לוחות ו־2 אינדקסים כמו ב־`drizzle/`, בסכמה פרטית `atlas` עם RLS.
- `schedule.sql` – תזמון יומי ב־Supabase (pg_cron + pg_net) שמפעיל את שליפת המקורות הממשלתיים.

## הגדרות ב־Render

| משתנה | תוכן |
| --- | --- |
| `ATLAS_ORIGIN` | כתובת האתר ב־Render, למשל `https://neve-midbar-energy-atlas.onrender.com` |
| `DATABASE_URL` | חיבור Session pooler של Supabase עם משתמש ייעודי לאתר |
| `ATLAS_SESSION_KEY` | מפתח אקראי, 64 תווי hex. אין להחליף אחרי שנוצרו חשבונות |
| `ATLAS_ACCESS_HASH` | SHA‑256 של קוד ההקמה החד־פעמי |
| `ATLAS_INITIAL_GUEST_CODE` | קוד אורח ראשוני בן 4 ספרות |
| `ATLAS_MCP_GATEWAY_KEY` | מפתח אקראי פנימי לשליפה המתוזמנת |
| `ATLAS_SYNC_KEY` | מפתח אקראי שהתזמון ב־Supabase שולח ל־`/internal/source-sync` |

## שליפה אוטומטית

`POST /internal/source-sync` עם `Authorization: Bearer $ATLAS_SYNC_KEY` מריץ את אותו תהליך שהמנהל מריץ במסך **מקורות וסנכרון**: מפת יכולת החיבור של חברת החשמל (ArcGIS) ובדיקת המטא־דאטה של שכבת החלקות ב־data.gov.il. השרת פועל כשער מהימן: הוא מסיר כותרות זהות שהגיעו מהדפדפן ומזהה את עצמו כמנהל הקיים בלבד. התוצאות נשמרות במסד ומוצגות באתר בלי פרסום מחדש. נתוני הגגות של GovMap נשארים סטטיים כמו קודם.

## בדיקות

`npm test` מריץ את כל הבדיקות המקוריות מול SQLite. `ATLAS_TEST_PG=postgresql://... npm run test:pg` מריץ את בדיקות הכניסה, הפרויקטים, ההערות, הסנכרון והמקורות החיצוניים מול PostgreSQL (מסד בדיקה ריק בלבד).

## ארכיון

`archive/v28-offline/` שומר את החומרים מחבילת גרסה 28 שלא היו במאגר: מסמכי הייחוס ב־PDF, מסד הידע `energy-knowledge.sqlite`, תמונת המסד ודף העיון `START-HERE.html`.
