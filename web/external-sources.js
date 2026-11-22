(() => {
  const rootUrl = '/api/external-sources';
  async function request(path = '', body) {
    const options = body === undefined ? {} : {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    };
    const response = await fetch(rootUrl + path, { ...options, cache: 'no-store' });
    const result = await response.json();
    if (!response.ok) throw Error(result.error || 'הפעולה נכשלה.');
    return result;
  }

  function showRows(box, result) {
    box.replaceChildren();
    const summary = document.createElement('p');
    const when = new Date(result.fetchedAt).toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' });
    summary.textContent = result.rows.length
      ? 'נשלפו ' + result.rows.length + ' רשומות' + (result.truncated ? ' ראשונות' : '') + ' · ' + when
      : 'השליפה הצליחה. המקור החזיר אפס רשומות · ' + when;
    box.append(summary);
    if (!result.rows.length) return;
    const names = [...new Set(result.rows.flatMap(row => Object.keys(row)))];
    const columns = names.slice(0, 40);
    if (names.length > columns.length) summary.textContent += ' · מוצגות 40 עמודות ראשונות';
    if (!columns.length) return;
    const table = document.createElement('table');
    table.setAttribute('aria-label', 'רשומות מהמקור החיצוני');
    const heading = table.createTHead().insertRow();
    for (const name of columns) {
      const th = document.createElement('th');
      th.scope = 'col';
      th.textContent = name;
      heading.append(th);
    }
    const tbody = table.createTBody();
    for (const row of result.rows) {
      const tr = tbody.insertRow();
      for (const name of columns) {
        const value = Object.hasOwn(row, name) ? row[name] : null;
        tr.insertCell().textContent = value == null ? '—' : typeof value === 'object' ? JSON.stringify(value) : String(value);
      }
    }
    const scroll = document.createElement('div');
    scroll.className = 'tablebox';
    scroll.tabIndex = 0;
    scroll.append(table);
    box.append(scroll);
  }

  function card(initial) {
    let saved = initial;
    const api = saved.kind === 'api';
    const form = document.createElement('form');
    form.className = 'panel pm-form external-source-form';
    form.innerHTML = (api
      ? '<h4>שרת נתונים (API)</h4><label>כתובת הנתונים (HTTPS)<input name="endpoint" type="url" dir="ltr" maxlength="1000" placeholder="https://data.example.org/energy"></label><label>נתיב לרשומות בתוך JSON<input name="recordsPath" dir="ltr" maxlength="128" placeholder="result.records"></label><small>אם התשובה עצמה היא מערך, השאירו את נתיב הרשומות ריק.</small>'
      : '<h4>מסד נתונים (SQL)</h4><label>מנוע המסד<select name="driver"><option value="postgres">PostgreSQL (Neon)</option><option value="libsql">libSQL / Turso</option></select></label><label>שם טבלה או תצוגה לקריאה<input name="relation" dir="ltr" maxlength="127" placeholder="energy_assets"></label><small>ב־PostgreSQL אפשר לציין גם סכמה, לדוגמה public.energy_assets.</small>')
      + '<details><summary>הגדרות לחיבור בשרת</summary><p class="external-help"></p></details>'
      + '<p class="external-state"></p><div class="pm-actions"><button type="submit">שמירת הגדרות</button><button class="primary" type="button" data-read>שליפת רשומות</button></div>'
      + '<p role="status" class="pm-small"></p><div data-result></div>';
    for (const [name, value] of Object.entries(saved.config)) form.elements.namedItem(name).value = value;
    const read = form.querySelector('[data-read]');
    const save = form.querySelector('[type="submit"]');
    const output = form.querySelector('[data-result]');
    const status = form.querySelector('[role="status"]');
    const state = form.querySelector('.external-state');
    let dirty = false;
    let busy = false;

    function update() {
      state.textContent = dirty ? 'שינויים ממתינים לשמירה' : saved.ready ? 'מוכן לשליפה'
        : saved.revision ? 'טיוטה שמורה · ממתין להשלמת החיבור' : 'טרם הוגדר חיבור';
      form.querySelector('.external-help').textContent = api
        ? 'יש להגדיר בשרת את ATLAS_EXTERNAL_API_URL לכתובת המדויקת. אם נדרש אסימון Bearer, שומרים אותו בסוד ATLAS_EXTERNAL_API_TOKEN. פרמטרים קבועים בכתובת מגדירים רק בשרת.'
        : form.elements.driver.value === 'postgres'
          ? 'שומרים בסוד השרת ATLAS_EXTERNAL_POSTGRES_URL את כתובת החיבור של משתמש Neon בעל הרשאת קריאה לטבלה או לתצוגה.'
          : 'מגדירים בשרת ATLAS_EXTERNAL_LIBSQL_URL ושומרים אסימון קריאה בסוד ATLAS_EXTERNAL_LIBSQL_TOKEN.';
      read.disabled = busy || dirty || !saved.ready;
      save.disabled = busy || (!dirty && saved.revision > 0);
      for (const field of form.querySelectorAll('input,select')) field.disabled = busy;
    }
    form.addEventListener('input', () => {
      dirty = true;
      status.textContent = '';
      output.replaceChildren();
      update();
    });
    async function run(action) {
      const config = Object.fromEntries(new FormData(form));
      busy = true;
      output.replaceChildren();
      status.textContent = action === 'save' ? 'שומר הגדרות…' : 'שולף רשומות…';
      update();
      try {
        const payload = { revision: saved.revision };
        if (action === 'save') payload.config = config;
        const result = await request('/' + saved.kind + '/' + action, payload);
        if (action === 'save') {
          saved = result;
          dirty = false;
          status.textContent = 'ההגדרות נשמרו.';
        } else {
          showRows(output, result);
          status.textContent = 'השליפה הושלמה.';
        }
      } catch (error) {
        status.textContent = error.message;
      } finally {
        busy = false;
        update();
      }
    }
    form.onsubmit = e => { e.preventDefault(); if (!busy) run('save'); };
    read.onclick = () => { if (!busy && !dirty && saved.ready) run('read'); };
    update();
    return form;
  }

  async function mount() {
    const root = document.getElementById('externalSources');
    if (!root || !roleIsAdmin() || root.dataset.mounted) return;
    root.dataset.mounted = 'true';
    root.hidden = false;
    root.innerHTML = '<h3>חיבורים חיצוניים</h3><p>אפשר לשמור הגדרות כבר עכשיו. לאחר חיבור המקור לשרת ניתן להציג עד 100 רשומות בשליפה לקריאה בלבד.</p><div class="sync-source-grid" data-cards></div><p role="status">טוען חיבורים…</p>';
    const status = root.querySelector('[role="status"]');
    try {
      const { sources } = await request();
      root.querySelector('[data-cards]').replaceChildren(...sources.map(card));
      status.remove();
    } catch (error) {
      status.textContent = error.message + ' ';
      const retry = document.createElement('button');
      retry.type = 'button';
      retry.textContent = 'ניסיון נוסף';
      retry.onclick = () => { delete root.dataset.mounted; mount(); };
      status.append(retry);
    }
  }
  document.addEventListener('atlas-sync-opened', mount);
  document.addEventListener('account-ready', mount);
})();
