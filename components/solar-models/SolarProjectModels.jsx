"use client";

import React, { useId } from "react";
import DesignIcon from './DesignIcon.jsx';
import solarProjectModels from "./solar-models.json";

export { solarProjectModels };

// Static classes allow Tailwind to detect every variant at build time.
const THEMES = {
  epc: { stripe: "bg-teal-600", badge: "bg-teal-50 text-teal-800 ring-teal-200" },
  bot: { stripe: "bg-indigo-600", badge: "bg-indigo-50 text-indigo-800 ring-indigo-200" },
  "esco-ppa": { stripe: "bg-sky-600", badge: "bg-sky-50 text-sky-800 ring-sky-200" },
};

function Icon({ type, className = "h-5 w-5" }) {
  return <DesignIcon name={{sun:'sun',risk:'triangle-alert',chevron:'chevron-down'}[type]} className={className} />;
}

function BulletList({ items }) {
  return (
    <ul className="list-disc space-y-3 ps-5 text-sm leading-7 text-slate-700 marker:text-slate-400">
      {items.map((item) => <li key={item}>{item}</li>)}
    </ul>
  );
}

function Disclosure({ title, children, open = false }) {
  return (
    <details open={open} className="group rounded-2xl border border-slate-200 bg-white print:break-inside-avoid">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-4 py-4 text-sm font-bold text-slate-900 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
        <span>{title}</span>
        <Icon type="chevron" className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none" />
      </summary>
      <div className="border-t border-slate-100 px-4 pb-5 pt-4">{children}</div>
    </details>
  );
}

function ModelCard({ model, index, idPrefix, defaultExpanded }) {
  const theme = THEMES[model.id] ?? THEMES.epc;
  const titleId = `${idPrefix}-${model.id}-title`;
  const riskId = `${idPrefix}-${model.id}-risks`;
  return (
    <article aria-labelledby={titleId} className="min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className={`h-1.5 ${theme.stripe}`} />
      <div className="space-y-5 p-5 sm:p-6">
        <header className="block h-auto space-y-3 border-0 bg-transparent p-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-bold tracking-wide text-slate-500">מודל {index + 1}</span>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ring-inset ${theme.badge}`}><bdi>{model.abbreviation}</bdi></span>
          </div>
          <h3 id={titleId} className="text-xl font-bold leading-8 text-slate-950">{model.name}</h3>
          <p className="text-sm font-medium text-slate-600">{model.tagline}</p>
          <p className="text-sm leading-7 text-slate-700">{model.description}</p>
        </header>

        <dl className="grid grid-cols-1 gap-3 rounded-2xl bg-slate-50 p-4 text-sm">
          {[["מימון", model.snapshot.funding], ["בעלות", model.snapshot.ownership], ["תועלת למועצה", model.snapshot.value]].map(([label, value]) => (
            <div key={label} className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-start gap-3">
              <dt className="text-slate-500">{label}</dt>
              <dd className="font-semibold text-slate-800">{value}</dd>
            </div>
          ))}
        </dl>

        <p className="rounded-2xl border border-slate-200 p-4 text-xs leading-6 text-slate-600"><strong className="text-slate-800">דיוק המודל: </strong>{model.clarification}</p>

        {/* Risks remain visible even when every disclosure is closed. */}
        <section aria-labelledby={riskId} className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4">
          <h4 id={riskId} className="mb-4 flex items-start gap-2 text-base font-bold text-amber-950">
            <Icon type="risk" className="mt-0.5 h-5 w-5 shrink-0 text-amber-800" />
            שיקולים אסטרטגיים וסיכונים
          </h4>
          <ul className="space-y-4">
            {model.strategicRisks.map((risk) => (
              <li key={risk.title} className="space-y-1">
                <p className="text-sm font-bold text-amber-950">{risk.title}</p>
                <p className="text-sm leading-7 text-amber-950">{risk.detail}</p>
              </li>
            ))}
          </ul>
        </section>

        <div className="space-y-3">
          <Disclosure title="יתרונות" open={defaultExpanded}><BulletList items={model.pros} /></Disclosure>
          <Disclosure title="חסרונות" open={defaultExpanded}><BulletList items={model.cons} /></Disclosure>
          <Disclosure title="תפעול ותחזוקה (O&M)" open={defaultExpanded}><BulletList items={model.operations} /></Disclosure>
        </div>

        <div className="space-y-4 rounded-2xl bg-slate-900 p-4 text-white">
          <div><h4 className="mb-1 text-sm font-bold text-teal-200">מתי כדאי לבחון?</h4><p className="text-sm leading-7 text-slate-100">{model.suitableWhen}</p></div>
          <div className="border-t border-slate-700 pt-3"><h4 className="mb-1 text-sm font-bold text-teal-200">שאלה לדיון הנהלה</h4><p className="text-sm leading-7 text-slate-100">{model.decisionQuestion}</p></div>
        </div>
      </div>
    </article>
  );
}

/**
 * React 18+ with Tailwind CSS 3.3+ or 4; no icon or UI-library dependencies.
 * models: unique id per item, using the schema in solar-models.json.
 * defaultExpanded: initial disclosure state; native keyboard interaction.
 */
export default function SolarProjectModels({
  models = solarProjectModels,
  title = "באיזה מודל מקדמים את הפרויקט?",
  subtitle = "שלושה מסלולים לניהול פרויקטים סולאריים בנכסי המועצה — מימון, אחריות, תועלת וסיכונים.",
  defaultExpanded = false,
  className = "",
}) {
  const idPrefix = useId();
  const headingId = `${idPrefix}-heading`;
  return (
    <section dir="rtl" lang="he" aria-labelledby={headingId} className={`w-full min-w-0 rounded-3xl bg-slate-50 p-4 text-start font-sans sm:p-6 lg:p-8 ${className}`}>
      <header className="mb-6 block h-auto overflow-hidden rounded-3xl border-0 bg-gradient-to-bl from-slate-950 via-slate-900 to-teal-950 p-6 text-white sm:p-8">
        <p className="mb-4 flex items-center gap-2 text-sm font-medium text-teal-200"><Icon type="sun" />מאגר ידע · כלי להחלטת הנהלה</p>
        <h2 id={headingId} className="max-w-3xl text-2xl font-bold leading-tight sm:text-3xl">{title}</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-200 sm:text-base">{subtitle}</p>
        <p className="mt-5 inline-block rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs leading-6 text-slate-100">אין מודל עדיף לכל מבנה. הבחירה תלויה בתקציב, בצריכה, בזכויות בנכס ובתוכניות הפיתוח.</p>
      </header>

      {models.length > 0 ? (
        <div className="grid items-start gap-6 xl:grid-cols-3">
          {models.map((model, index) => <ModelCard key={model.id} model={model} index={index} idPrefix={idPrefix} defaultExpanded={defaultExpanded} />)}
        </div>
      ) : (
        <p className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-600">לא הוגדרו מודלים להצגה.</p>
      )}

      <footer className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-7 text-slate-600">
        <strong className="text-slate-900">לפני בחירת מסלול: </strong>
        השלימו בדיקת גג וחיבור לרשת, נתוני צריכה ותחזית כספית נטו. תנאי המימון, הבטוחות, הביטוח וההתקשרות ייבחנו עם ההנדסה, הגזברות והייעוץ המשפטי. התוכן הוא מסגרת להשוואה ואינו אישור כדאיות או חיבור למבנה מסוים.
        <details className="mt-4 border-t border-slate-200 pt-3">
          <summary className="cursor-pointer font-bold text-teal-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-700">מקורות מקצועיים והיקף השימוש</summary>
          <ul className="mt-3 list-disc space-y-2 ps-5">
            <li><a className="text-teal-800 underline" href="https://www.gov.il/BlobFolder/generalpage/2-improving-existing-city/he/home_main_local-government_municipal-info_city-001.pdf" target="_blank" rel="noopener noreferrer">משרד הפנים — מדריך לאנרגיה מתחדשת בנכסי רשויות מקומיות ↗</a><p className="text-xs">רקע לתכנון, מכרז, הקמה ותחזוקה. התעריפים והתשואות ההיסטוריים במדריך אינם נתונים עדכניים לחישוב.</p></li>
            <li><a className="text-teal-800 underline" href="https://www.energy.gov/cmei/femp/measurement-and-verification-activities-required-energy-savings-performance-contract" target="_blank" rel="noopener noreferrer">משרד האנרגיה האמריקאי — קו בסיס ואימות חיסכון ↗</a></li>
            <li><a className="text-teal-800 underline" href="https://www.energy.gov/sites/default/files/2023-09/espc-esa-fact-sheet_2023.pdf" target="_blank" rel="noopener noreferrer">משרד האנרגיה האמריקאי — התקשרויות שירותי אנרגיה ומכירת חשמל ↗</a></li>
          </ul>
          <p className="mt-3 text-xs">מקורות נבדקו ב־17.11.2026. המקורות האמריקאיים מסייעים להבנת המודלים והמדידה; אינם מקור לדין הישראלי. תנאי הפרויקט וההסדרה בישראל מחייבים בדיקה פרטנית.</p>
        </details>
      </footer>
    </section>
  );
}
