"use client";

import React, { useId } from "react";
import DesignIcon from './DesignIcon.jsx';
import gridEnergyTopics from "./grid-energy-topics.json";

export { gridEnergyTopics };

const THEMES = {
  "market-regulation": { stripe: "bg-indigo-600", badge: "bg-indigo-50 text-indigo-800" },
  "battery-storage": { stripe: "bg-teal-600", badge: "bg-teal-50 text-teal-800" },
  "statutory-safety": { stripe: "bg-sky-600", badge: "bg-sky-50 text-sky-800" },
};

function Symbol({ warning = false, className = "h-5 w-5" }) {
  return <DesignIcon name={warning?'triangle-alert':'chevron-down'} className={className} />;
}

function SourceLink({ source, compact = false }) {
  return (
    <a href={source.url} target="_blank" rel="noopener noreferrer" className={`rounded text-teal-800 underline decoration-teal-300 underline-offset-4 hover:text-teal-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 ${compact ? "text-xs" : "text-sm font-semibold"}`}>
      {source.publisher} — {source.title}<span aria-hidden="true"> ↗</span><span className="sr-only"> (נפתח בחלון חדש)</span>
    </a>
  );
}

function TopicCard({ topic, index, idPrefix, defaultExpanded }) {
  const theme = THEMES[topic.id] ?? THEMES["market-regulation"];
  const titleId = `${idPrefix}-${topic.id}`;
  const cautionId = `${titleId}-caution`;
  return (
    <article aria-labelledby={titleId} className="min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className={`h-1.5 ${theme.stripe}`} />
      <div className="space-y-5 p-5 sm:p-6">
        <header className="block h-auto space-y-3 border-0 bg-transparent p-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-bold text-slate-500">נושא {index + 1}</span>
            <bdi className={`rounded-full px-3 py-1 text-xs font-bold ${theme.badge}`}>{topic.abbreviation}</bdi>
          </div>
          <h3 id={titleId} className="text-xl font-bold leading-8 text-slate-950">{topic.title}</h3>
          <p className="text-sm font-semibold text-slate-600">{topic.tagline}</p>
          <p className="text-sm leading-7 text-slate-700">{topic.description}</p>
        </header>

        <section aria-labelledby={cautionId} className="space-y-3 rounded-2xl border-2 border-amber-300 bg-amber-50 p-4">
          <h4 id={cautionId} className="flex items-start gap-2 text-sm font-bold leading-6 text-amber-950"><Symbol warning className="mt-0.5 h-5 w-5 shrink-0 text-amber-800" />{topic.caution.title}</h4>
          <p className="text-sm leading-7 text-amber-950">{topic.caution.body}</p>
        </section>

        <div className="space-y-3">
          {topic.keyElements.map((item) => (
            <details key={item.id} open={defaultExpanded} className="group rounded-2xl border border-slate-200 print:break-inside-avoid">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-3 rounded-2xl p-4 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
                <span className="min-w-0 space-y-2"><span className="block text-sm font-bold leading-6 text-slate-900">{item.title}</span><span className="block text-sm leading-7 text-slate-600">{item.summary}</span></span>
                <Symbol className="mt-1 h-4 w-4 shrink-0 text-slate-500 transition-transform group-open:rotate-180 motion-reduce:transition-none" />
              </summary>
              <div className="space-y-4 border-t border-slate-100 px-4 pb-5 pt-4">
                <p className="text-sm leading-7 text-slate-700">{item.detail}</p>
                <p className="rounded-xl bg-teal-50 p-3 text-sm leading-7 text-teal-950"><strong>מה בודקים במועצה? </strong>{item.action}</p>
                <ul aria-label={`מקורות: ${item.title}`} className="space-y-3 leading-6">
                  {topic.sources.filter(source => item.sourceIds.includes(source.id)).map(source => <li key={source.id}><SourceLink source={source} compact /></li>)}
                </ul>
              </div>
            </details>
          ))}
        </div>

        {topic.unitsNote && <p className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-xs leading-6 text-sky-950"><strong>יחידות שכדאי להבחין ביניהן: </strong>{topic.unitsNote}</p>}

        <section className="rounded-2xl bg-slate-900 p-4 text-white" aria-label={`צעדים ראשונים: ${topic.title}`}>
          <h4 className="mb-3 text-sm font-bold text-teal-200">הצעד הבא בנכס</h4>
          <ul className="list-disc space-y-3 ps-5 text-sm leading-7 text-slate-100">
            {topic.nextSteps.map(step => <li key={step}>{step}</li>)}
          </ul>
        </section>

        <details className="rounded-2xl border border-slate-200 p-4">
          <summary className="cursor-pointer text-sm font-bold text-teal-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700">מקורות רשמיים והיקף השימוש ({topic.sources.length})</summary>
          <ul className="mt-4 space-y-5 leading-7">
            {topic.sources.map(source => <li key={source.id} className="space-y-1"><SourceLink source={source} /><p className="text-xs leading-6 text-slate-600">{source.note}</p></li>)}
          </ul>
        </details>
        <p className="text-xs leading-6 text-slate-500">בדיקת תוכן ומקורות: <time dateTime={topic.checkedAt}>{topic.checkedAt.split("-").reverse().join(".")}</time>. העדכון ידני; מועד זה אינו מועד תחולת ההחלטות.</p>
      </div>
    </article>
  );
}

/** React 18+; Tailwind 3.3+ or 4. No component-library dependencies. */
export default function GridEnergyKnowledge({ topics = gridEnergyTopics, defaultExpanded = false, className = "" }) {
  const idPrefix = useId();
  const headingId = `${idPrefix}-grid-heading`;
  return (
    <section dir="rtl" lang="he" aria-labelledby={headingId} className={`w-full min-w-0 rounded-3xl bg-slate-50 p-4 text-start font-sans sm:p-6 lg:p-8 ${className}`}>
      <header className="mb-6 block h-auto rounded-3xl border-0 bg-gradient-to-bl from-slate-950 via-slate-900 to-indigo-950 p-6 text-white sm:p-8">
        <p className="mb-4 text-sm font-medium text-sky-200">מאגר ידע · מהכללים להחלטה בשטח</p>
        <h2 id={headingId} className="text-2xl font-bold leading-tight sm:text-3xl">אסדרות, תעריפים ואגירה</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-200 sm:text-base">הידע הדרוש לבחינת פרויקט אנרגיה בנכסי נווה מדבר: מנגנוני התשלום, שימושי האגירה והתנאים לחיבור ולהקמה.</p>
        <div className="mt-5 flex flex-wrap gap-2 text-xs text-slate-100">
          {["אסדרה והתחשבנות", "אגירה וחוסן", "רישוי ובטיחות"].map(label => <span key={label} className="rounded-full border border-white/20 bg-white/10 px-3 py-2">{label}</span>)}
        </div>
      </header>

      {topics.length ? <div className="grid items-start gap-6 xl:grid-cols-3">{topics.map((topic, index) => <TopicCard key={topic.id} topic={topic} index={index} idPrefix={idPrefix} defaultExpanded={defaultExpanded} />)}</div> : <p className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-600">לא הוגדרו נושאים להצגה.</p>}

      <footer className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-7 text-slate-600"><strong className="text-slate-900">לפני החלטת הנהלה: </strong>חברו את הידע לנתוני המבנה, לחוזים ולתשובות הגורמים המוסמכים. הפרק מסביר עקרונות ואינו קובע תעריף, זכאות או אישור לנכס מסוים. יש לאמת את הנוסח שבתוקף; פרסום לשימוע הוא הצעה ואינו החלטה מחייבת.</footer>
    </section>
  );
}
