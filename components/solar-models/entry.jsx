import React from 'react';
import { createRoot } from 'react-dom/client';
import KnowledgeBase from './KnowledgeBase.jsx';

let currentRoot = null;
let currentContainer = null;

window.neveSolarModels = {
  mount(container) {
    if (!container?.isConnected) return;
    if (container !== currentContainer) {
      currentRoot?.unmount();
      currentRoot = createRoot(container);
      currentContainer = container;
    }
    currentRoot.render(<KnowledgeBase />);
  },
  unmount() {
    currentRoot?.unmount();
    currentRoot = null;
    currentContainer = null;
  },
};
