/* Add a lazy React island to the existing authenticated dashboard navigation. */
(() => {
  const KNOWLEDGE_TAB = 15;
  let bundlePromise = null;

  function loadComponent() {
    if (window.neveSolarModels) return Promise.resolve(window.neveSolarModels);
    if (!bundlePromise) {
      bundlePromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'knowledge-models.bundle.js';
        script.onload = () => window.neveSolarModels ? resolve(window.neveSolarModels) : reject(new Error('component_missing'));
        script.onerror = () => { script.remove(); reject(new Error('component_load_failed')); };
        document.head.append(script);
      }).catch(error => { bundlePromise = null; throw error; });
    }
    return bundlePromise;
  }

  async function mountKnowledge(container) {
    container.innerHTML = '<p class="notice" role="status">טוען את מאגר הידע…</p>';
    try {
      const component = await loadComponent();
      if (container.isConnected) component.mount(container);
    } catch {
      if (!container.isConnected) return;
      container.innerHTML = '<p class="notice" role="alert">לא ניתן לטעון את מאגר הידע כרגע.</p><button type="button">ניסיון נוסף</button>';
      container.querySelector('button').onclick = () => mountKnowledge(container);
    }
  }

  tabs[KNOWLEDGE_TAB] = 'מאגר ידע';
  $('nav').insertAdjacentHTML('beforeend', '<button data-tab="15">מאגר ידע</button>');
  const previousTab = tab;
  tab = function (index) {
    previousTab(index);
    // Respect the project editor's existing unsaved-change navigation guard.
    const active = document.querySelector('[data-tab="15"].active');
    if (!active) { window.neveSolarModels?.unmount(); return; }
    if (index !== KNOWLEDGE_TAB) return;
    $('title').textContent = 'מאגר ידע';
    $('subtitle').textContent = 'מודלים עסקיים, אסדרות, תעריפים ואגירה בנכסי המועצה';
    $('stats').hidden = true;
    $('other').innerHTML = '<div id="solarModelsRoot"></div>';
    mountKnowledge($('solarModelsRoot'));
  };
})();
