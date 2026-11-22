import React, { useId } from "react";
import SolarProjectModels from "./SolarProjectModels.jsx";
import GridEnergyKnowledge from "./GridEnergyKnowledge.jsx";

export default function KnowledgeBase() {
  const prefix = useId();
  const businessId = `${prefix}-business`;
  const gridId = `${prefix}-regulations`;
  const linkClass = "inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-teal-900 no-underline hover:border-teal-400 hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2";
  return (
    <div dir="rtl" lang="he" className="space-y-6 text-start">
      <nav aria-label="פרקי מאגר הידע" className="flex h-auto flex-wrap items-center gap-3 overflow-visible border-0 bg-transparent p-1">
        <span className="text-sm font-semibold text-slate-600">מעבר מהיר</span>
        <a href={`#${businessId}`} className={linkClass}><span className="text-teal-600">01</span>מודלים עסקיים</a>
        <a href={`#${gridId}`} className={linkClass}><span className="text-indigo-600">02</span>אסדרות, תעריפים ואגירה</a>
      </nav>
      <div id={businessId} tabIndex={-1} className="scroll-mt-24 rounded-3xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-700"><SolarProjectModels /></div>
      <div id={gridId} tabIndex={-1} className="scroll-mt-24 rounded-3xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-700"><GridEnergyKnowledge /></div>
    </div>
  );
}
