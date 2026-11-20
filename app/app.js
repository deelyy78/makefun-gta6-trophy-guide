// Leonida Legend — GTA VI trophy guide & tracker.
// Loads the trophy data file, renders three views (checklist with per-trophy guides,
// the platinum roadmap, the missables page), and keeps the player's progress in
// localStorage with export/import. Everything runs from this folder; no network calls.

const EARNED_KEY = 'leonida-legend-earned-v1';
const SETTINGS_KEY = 'leonida-legend-settings-v1';
const GRADE_ORDER = ['platinum', 'gold', 'silver', 'bronze'];
const KIND_LABELS = {
  story: 'Story',
  side: 'Side strand',
  collectibles: 'Collectibles',
  activities: 'Activities',
  platinum: 'Platinum',
};

const state = {
  data: null,
  earned: loadEarned(),
  spoiler: loadSpoilerSetting(),
  view: 'checklist',
  kind: 'all',
  grade: 'all',
  status: 'all',
  query: '',
  selectedId: 28,
};

function loadEarned() {
  try {
    const raw = JSON.parse(localStorage.getItem(EARNED_KEY) ?? '[]');
    return new Set(Array.isArray(raw) ? raw.filter((n) => Number.isInteger(n)) : []);
  } catch {
    return new Set();
  }
}

function saveEarned() {
  localStorage.setItem(EARNED_KEY, JSON.stringify([...state.earned]));
}

function loadSpoilerSetting() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}').spoiler === true;
  } catch {
    return false;
  }
}

function saveSpoilerSetting() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({ spoiler: state.spoiler }));
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function trophyById(id) {
  return state.data.trophies.find((t) => t.id === id);
}

function isMasked(trophy) {
  return state.spoiler && trophy.kind === 'story' && !state.earned.has(trophy.id);
}

function displayName(trophy) {
  return isMasked(trophy) ? 'Hidden story trophy' : trophy.name;
}

function displayDescription(trophy) {
  return isMasked(trophy)
    ? 'Name and description hidden by the spoiler setting until this story trophy is earned.'
    : trophy.description;
}

function gradeBadge(trophy) {
  return el('span', `grade-badge grade-${trophy.grade}`, trophy.grade);
}

function kindLabel(trophy) {
  return KIND_LABELS[trophy.kind] ?? trophy.kind;
}

function countText(trophy) {
  if (!trophy.countLabel) return '';
  const amount = trophy.count >= 1000 ? `$${trophy.count.toLocaleString('en-US')}` : `${trophy.count}`;
  return `Target: ${amount} — ${trophy.countLabel}`;
}

/* ---------------- progress header ---------------- */

function renderProgress() {
  const trophies = state.data.trophies;
  const total = trophies.length;
  const done = state.earned.size;
  document.getElementById('progress-count').textContent = `${done} of ${total} earned`;
  document.getElementById('progress-pct').textContent = `${Math.round((done / total) * 100)}%`;
  document.getElementById('progress-fill').style.width = `${(done / total) * 100}%`;
  const box = document.getElementById('grade-progress');
  box.replaceChildren();
  for (const grade of GRADE_ORDER) {
    const inGrade = trophies.filter((t) => t.grade === grade);
    const got = inGrade.filter((t) => state.earned.has(t.id)).length;
    const pill = el('span', 'grade-pill');
    pill.append(`${grade}: `, el('b', null, `${got}/${inGrade.length}`));
    box.append(pill);
  }
}

/* ---------------- checklist view ---------------- */

function matchesFilters(trophy) {
  if (state.kind === 'missable' && !trophy.missable) return false;
  if (state.kind !== 'all' && state.kind !== 'missable' && trophy.kind !== state.kind) return false;
  if (state.grade !== 'all' && trophy.grade !== state.grade) return false;
  if (state.status === 'earned' && !state.earned.has(trophy.id)) return false;
  if (state.status === 'open' && state.earned.has(trophy.id)) return false;
  if (state.query) {
    const hay = `${trophy.name} ${trophy.description} ${trophy.guide} ${kindLabel(trophy)}`.toLowerCase();
    if (!hay.includes(state.query)) return false;
  }
  return true;
}

function buildCard(trophy) {
  const masked = isMasked(trophy);
  const card = el('article', 'card');
  if (state.earned.has(trophy.id)) card.classList.add('is-earned');
  if (trophy.id === state.selectedId) card.classList.add('is-selected');
  if (masked) card.classList.add('is-masked');
  card.dataset.trophyId = `${trophy.id}`;

  const checkWrap = el('label', 'card-check');
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = state.earned.has(trophy.id);
  box.setAttribute('aria-label', `Mark ${trophy.name} as earned`);
  box.addEventListener('change', () => toggleEarned(trophy.id));
  checkWrap.append(box);

  const top = el('div', 'card-top');
  top.append(el('span', 'card-name', displayName(trophy)), gradeBadge(trophy));
  if (trophy.hidden && !masked) top.append(el('span', 'tag', 'Hidden on PSN'));
  if (trophy.missable) top.append(el('span', 'tag tag-missable', 'MISSABLE'));

  const desc = el('div', 'card-desc', displayDescription(trophy));

  const meta = el('div', 'card-meta');
  meta.append(el('span', 'tag', kindLabel(trophy)), el('span', 'tag tag-stage', `Roadmap step ${trophy.stage}`));
  if (trophy.countLabel) meta.append(el('span', 'tag', countText(trophy)));

  const open = el('span', 'card-open', 'Guide ›');

  card.append(checkWrap, top, open, desc, meta);
  card.addEventListener('click', (event) => {
    if (event.target.closest('.card-check')) return;
    state.selectedId = trophy.id;
    renderList();
    renderDetail();
  });
  return card;
}

function renderList() {
  const list = document.getElementById('trophy-list');
  list.replaceChildren();
  const visible = state.data.trophies.filter(matchesFilters);
  for (const trophy of visible) list.append(buildCard(trophy));
  if (visible.length === 0) {
    list.append(el('p', 'detail-empty', 'No trophies match the current filters.'));
  }
  document.getElementById('result-line').textContent =
    `Showing ${visible.length} of ${state.data.trophies.length} trophies` +
    (state.spoiler ? ' · spoiler setting on: unearned story trophies are masked' : '');
}

function renderDetail() {
  const panel = document.getElementById('detail');
  panel.replaceChildren();
  const trophy = trophyById(state.selectedId) ?? state.data.trophies[0];
  if (!trophy) {
    panel.append(el('p', 'detail-empty', 'Select a trophy to read its guide.'));
    return;
  }
  if (isMasked(trophy)) {
    panel.append(gradeBadge(trophy), el('h2', null, 'Hidden story trophy'));
    panel.append(el('p', 'official-desc',
      'The spoiler setting is on, so this story trophy stays masked until you earn it. ' +
      'Turn the setting off in the toolbar to read its name, description and guide now.'));
    return;
  }
  panel.append(gradeBadge(trophy), el('h2', null, trophy.name));
  panel.append(el('p', 'official-desc', trophy.description));

  const meta = el('div', 'card-meta');
  meta.append(el('span', 'tag', kindLabel(trophy)), el('span', 'tag tag-stage', `Roadmap step ${trophy.stage}`));
  if (trophy.hidden) meta.append(el('span', 'tag', 'Hidden on PSN until earned'));
  panel.append(meta);

  if (trophy.missable && trophy.missableNote) {
    const callout = el('div', 'callout');
    callout.append(el('b', null, 'Missable — read before you play on. '), document.createTextNode(trophy.missableNote));
    panel.append(callout);
  }

  if (trophy.countLabel) {
    panel.append(el('h3', null, 'Target'));
    panel.append(el('p', 'target', countText(trophy)));
  }

  panel.append(el('h3', null, 'Guide'));
  panel.append(el('p', null, trophy.guide));

  panel.append(el('h3', null, 'Steps'));
  const steps = el('ol');
  for (const step of trophy.steps) steps.append(el('li', null, step));
  panel.append(steps);

  panel.append(el('h3', null, 'Sources'));
  const sources = el('ul', 'sources');
  for (const source of trophy.sources) {
    const item = el('li');
    if (source.url) {
      const link = el('a', null, source.name);
      link.href = source.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      item.append(link);
    } else {
      item.textContent = source.name;
    }
    sources.append(item);
  }
  panel.append(sources);

  const earnBtn = el('button', 'earn-btn', state.earned.has(trophy.id) ? 'Earned ✓ — tap to undo' : 'Mark as earned');
  earnBtn.type = 'button';
  if (state.earned.has(trophy.id)) earnBtn.classList.add('is-earned');
  earnBtn.addEventListener('click', () => toggleEarned(trophy.id));
  panel.append(earnBtn);
}

/* ---------------- roadmap view ---------------- */

function renderRoadmap() {
  const intro = document.getElementById('roadmap-intro');
  intro.replaceChildren();
  intro.append(el('h2', null, 'The road to Vice Got a Price!'));
  intro.append(el('p', null,
    'Five steps, in the order the published roadmaps recommend: story first (with the one missable moment handled inside Chapter 1), ' +
    'then the people of Leonida, the skill activities, the crime and money block, and finally the collectibles and the 100% checklist. ' +
    'Published estimates for the full platinum run at about 200 hours and a 4-out-of-10 difficulty (PowerPyx, cited below).'));
  const rules = el('ul');
  for (const line of [
    'Cheats disable trophies and saving — never use them on a platinum run.',
    'There is no mission replay, so save manually at the start and end of every chapter.',
    'Free-roam continues after the story and every trophy quest giver returns; only one trophy on the list is missable.',
    'The 100% checklist (Progress → Stats → 100% Completion) appears after the story, but progress made during it already counts.',
  ]) rules.append(el('li', null, line));
  intro.append(rules);

  const stagesBox = document.getElementById('roadmap-stages');
  stagesBox.replaceChildren();
  for (const stage of state.data.roadmap) {
    const card = el('section', 'stage-card');
    const head = el('div', 'stage-head');
    head.append(
      el('span', 'stage-num', `Step ${stage.stage}`),
      el('h3', null, stage.title),
      el('span', 'stage-hours', stage.hours),
    );
    card.append(head, el('p', null, stage.summary));
    const rows = el('div', 'stage-rows');
    for (const id of stage.trophyIds) {
      const trophy = trophyById(id);
      const row = el('button', 'stage-row');
      row.type = 'button';
      if (state.earned.has(id)) row.classList.add('is-earned');
      const box = document.createElement('input');
      box.type = 'checkbox';
      box.checked = state.earned.has(id);
      box.setAttribute('aria-label', `Mark ${trophy.name} as earned`);
      box.addEventListener('change', () => toggleEarned(id));
      row.append(box, gradeBadge(trophy), el('span', 'row-name', displayName(trophy)));
      row.append(el('span', 'row-count', trophy.missable ? 'MISSABLE' : (trophy.countLabel ?? '')));
      row.addEventListener('click', (event) => {
        if (event.target === box) return;
        state.selectedId = id;
        setView('checklist');
      });
      rows.append(row);
    }
    card.append(rows);
    stagesBox.append(card);
  }
}

/* ---------------- missables view ---------------- */

function renderMissables() {
  const body = document.getElementById('missables-body');
  body.replaceChildren();
  const missables = state.data.trophies.filter((t) => t.missable);
  document.getElementById('missable-count').textContent = `${missables.length}`;

  for (const trophy of missables) {
    const card = el('section', 'missable-card');
    card.append(gradeBadge(trophy), el('h3', null, trophy.name));
    card.append(el('p', 'warn-line', trophy.missableNote ?? 'This trophy can be missed.'));
    card.append(el('p', null, trophy.guide));
    const steps = el('ol');
    for (const step of trophy.steps) steps.append(el('li', null, step));
    card.append(steps);
    card.append(el('h3', 'sources-head', 'Sources'));
    const sources = el('ul', 'sources');
    for (const source of trophy.sources) {
      const item = el('li');
      if (source.url) {
        const link = el('a', null, source.name);
        link.href = source.url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        item.append(link);
      } else {
        item.textContent = source.name;
      }
      sources.append(item);
    }
    card.append(sources);
    const open = el('button', 'earn-btn', 'Open the full guide');
    open.type = 'button';
    open.addEventListener('click', () => {
      state.selectedId = trophy.id;
      state.kind = 'all';
      syncKindChips();
      setView('checklist');
    });
    card.append(open);
    body.append(card);
  }

  const safe = el('section', 'safe-panel');
  safe.append(el('h2', null, 'Everything else can wait — and why'));
  safe.append(el('p', null,
    'Only one of the 55 trophies is flagged missable by the published roadmaps this guide cites. The rest are protected by how the game is built:'));
  const reasons = el('ul');
  for (const line of [
    'Story and chapter trophies are automatic: they unlock by playing the missions, with no medals, choices or performance conditions.',
    'Free-roam continues after the final mission, and quest givers tied to trophies return to the map, so strands and activities stay open.',
    'Counters never reset: stunts, vehicles, choices, dollars and areas all accumulate across the whole run.',
    'Activities can be retried freely — shooting ranges, races and drone courses included.',
    'Watch-outs that are not missables: cheats disable trophies and saving; Andy\u2019s strand is Lucia-only and Tyrone\u2019s and Bret\u2019s are Jason-only, so switch protagonist if a marker will not appear; some timed side quests expire, but they do not count toward trophies.',
  ]) reasons.append(el('li', null, line));
  safe.append(reasons);
  body.append(safe);
}

/* ---------------- state changes & views ---------------- */

function toggleEarned(id) {
  if (state.earned.has(id)) state.earned.delete(id);
  else state.earned.add(id);
  saveEarned();
  renderProgress();
  renderList();
  renderDetail();
  renderRoadmap();
  renderMissables();
}

function setView(view) {
  state.view = view;
  for (const tab of document.querySelectorAll('.tab')) {
    tab.classList.toggle('is-active', tab.dataset.view === view);
  }
  for (const section of document.querySelectorAll('.view')) {
    section.classList.toggle('is-active', section.id === `view-${view}`);
  }
  if (location.hash !== `#/${view}`) history.replaceState(null, '', `#/${view}`);
  window.scrollTo({ top: 0 });
}

function syncKindChips() {
  for (const chip of document.querySelectorAll('#kind-chips .chip')) {
    chip.classList.toggle('is-active', chip.dataset.kind === state.kind);
  }
}

/* ---------------- export & import ---------------- */

function exportProgress() {
  const payload = {
    game: 'Grand Theft Auto VI',
    tracker: 'Leonida Legend',
    exportedAt: new Date().toISOString(),
    earned: [...state.earned],
  };
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
  link.download = 'gta6-trophy-progress.json';
  link.click();
  URL.revokeObjectURL(link.href);
}

async function importProgress(file) {
  const parsed = JSON.parse(await file.text());
  const entries = Array.isArray(parsed) ? parsed : parsed.earned;
  if (!Array.isArray(entries)) throw new Error('no earned list in file');
  const next = new Set();
  for (const entry of entries) {
    if (Number.isInteger(entry) && trophyById(entry)) next.add(entry);
    if (typeof entry === 'string') {
      const byName = state.data.trophies.find((t) => t.name === entry);
      if (byName) next.add(byName.id);
    }
  }
  state.earned = next;
  saveEarned();
  renderProgress();
  renderList();
  renderDetail();
  renderRoadmap();
  renderMissables();
}

/* ---------------- wiring ---------------- */

function wireControls() {
  document.getElementById('search').addEventListener('input', (event) => {
    state.query = event.target.value.trim().toLowerCase();
    renderList();
  });
  document.getElementById('kind-chips').addEventListener('click', (event) => {
    const chip = event.target.closest('.chip');
    if (!chip) return;
    state.kind = chip.dataset.kind;
    syncKindChips();
    renderList();
  });
  document.getElementById('grade-filter').addEventListener('change', (event) => {
    state.grade = event.target.value;
    renderList();
  });
  document.getElementById('status-filter').addEventListener('change', (event) => {
    state.status = event.target.value;
    renderList();
  });
  const spoiler = document.getElementById('spoiler-toggle');
  spoiler.checked = state.spoiler;
  spoiler.addEventListener('change', () => {
    state.spoiler = spoiler.checked;
    saveSpoilerSetting();
    renderList();
    renderDetail();
    renderRoadmap();
  });
  document.getElementById('export-btn').addEventListener('click', exportProgress);
  document.getElementById('import-input').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      await importProgress(file);
    } catch {
      document.getElementById('result-line').textContent = 'That file could not be read as a progress export.';
    }
    event.target.value = '';
  });
  for (const tab of document.querySelectorAll('.tab')) {
    tab.addEventListener('click', () => setView(tab.dataset.view));
  }
  window.addEventListener('hashchange', () => {
    const view = location.hash.replace('#/', '');
    if (['checklist', 'roadmap', 'missables'].includes(view) && view !== state.view) setView(view);
  });
}

async function main() {
  const response = await fetch('data/trophies.json');
  state.data = await response.json();
  wireControls();
  renderProgress();
  renderList();
  renderDetail();
  renderRoadmap();
  renderMissables();
  const initial = location.hash.replace('#/', '');
  if (['roadmap', 'missables'].includes(initial)) setView(initial);
}

main();
