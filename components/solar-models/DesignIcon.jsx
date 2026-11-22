import React from 'react';
import paths from '../../design/assets/icons/lucide/paths.json';
// Trusted, vendored Lucide SVG paths only; no source/user HTML is accepted.
export default function DesignIcon({name,className=''}) {
  return <svg className={`ds-icon ${className}`} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" dangerouslySetInnerHTML={{__html:paths[name]||''}} />;
}
