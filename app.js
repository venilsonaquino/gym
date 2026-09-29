import { STORAGE_KEY, blankPlan, validatePlan, filterCatalog, moveExercise, selectVariant, isUntouchedPlan, addMissingStarterLegs } from './model.mjs';

const $ = selector => document.querySelector(selector);
let catalog = [], byId = new Map(), plan, starterPlan, activeWorkout = 'A', editing = null, pendingImport = null, pageSize = 30, storageBlocked = false, mediaAvailable = false;
let toastTimer;
const workout = () => plan.workouts.find(w => w.id === activeWorkout);
const asset = path => path;
const cap = text => text.charAt(0).toUpperCase() + text.slice(1);
const exerciseCount = count => `${count} exercise${count === 1 ? '' : 's'}`;
const node = (tag, className, text) => { const el = document.createElement(tag); if (className) el.className = className; if (text !== undefined) el.textContent = text; return el; };
function toast(message) { const notice = $('#toast'); const dialogs = [...document.querySelectorAll('dialog[open]')]; (dialogs.at(-1) || document.body).append(notice); notice.textContent = message; notice.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { notice.hidden = true; }, 3500); }
function error(message) { $('#error-banner').textContent = message; $('#error-banner').hidden = false; }
function open(dialog) { if (!dialog.open) dialog.showModal(); }
function save(next) {
  if (storageBlocked) { toast('The saved data could not be read. Export this plan before continuing.'); return false; }
  try {
    const clean = validatePlan(next, catalog);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
    plan = clean;
    $('#error-banner').hidden = true;
    renderPlan();
    return true;
  } catch (e) { error(`Could not save your changes. ${e.message} Your previous plan has been kept.`); toast('Changes were not saved. Check the message on your plan.'); return false; }
}
function updatePlan(change) { const next = structuredClone(plan); change(next); return save(next); }
function image(ex, gif = false) {
  if (!mediaAvailable) {
    const fallback = node('span', gif ? 'media-fallback detail-fallback' : 'exercise-thumb media-fallback', '◉');
    fallback.setAttribute('role', 'img'); fallback.setAttribute('aria-label', 'Preview unavailable');
    return fallback;
  }
  const img = node('img', gif ? '' : 'exercise-thumb');
  img.src = asset(gif ? ex.gif : ex.image); img.alt = ex.name; img.width = gif ? 180 : 78; img.height = gif ? 180 : 78;
  if (!gif) img.loading = 'lazy';
  img.addEventListener('error', () => { const fallback = node('span', gif ? 'media-fallback detail-fallback' : 'exercise-thumb media-fallback', '◉'); fallback.setAttribute('role', 'img'); fallback.setAttribute('aria-label', 'Preview unavailable'); img.replaceWith(fallback); });
  return img;
}
function renderPlan() {
  $('#plan-title').textContent = plan.name;
  $('#workout-tabs').replaceChildren(...plan.workouts.map(w => {
    const btn = node('button', 'workout-tab'); btn.type = 'button'; btn.setAttribute('aria-pressed', String(w.id === activeWorkout)); btn.setAttribute('aria-label', `Workout ${w.id}, ${exerciseCount(w.exercises.length)}`);
    const labels = node('span'); labels.append(node('span', 'tab-label', `Workout ${w.id}`), node('span', 'tab-count', exerciseCount(w.exercises.length)));
    btn.append(node('span', 'tab-letter', w.id), labels); btn.onclick = () => { activeWorkout = w.id; renderPlan(); }; return btn;
  }));
  const w = workout(); $('#workout-title').textContent = w.name;
  $('#workout-summary').textContent = w.exercises.length ? `${exerciseCount(w.exercises.length)} · ${w.exercises.reduce((sum, e) => sum + e.sets, 0)} sets · Your own pace` : 'A fresh start. Build it your way.';
  const list = $('#exercise-list'); list.replaceChildren();
  if (!w.exercises.length) {
    const empty = node('div', 'empty-state'); empty.append(node('div', 'empty-symbol', '＋'), node('h4', '', 'Your workout starts here.'), node('p', '', plan.equipment.length ? 'Add your exercises, set your reps, and keep your plan close at hand.' : 'First, choose the equipment at your gym. Then build a workout that works for you.'));
    if (!plan.equipment.length) { const btn = node('button', 'secondary-button', 'Choose gym equipment ↗'); btn.onclick = showSettings; empty.append(btn); }
    list.append(empty);
  }
  w.exercises.forEach((entry, index) => {
    const ex = byId.get(entry.exerciseId), btn = node('button', 'exercise-card'); btn.type = 'button'; btn.setAttribute('aria-label', `${ex.name}, ${entry.sets} sets, ${entry.reps} reps. View or edit.`);
    const info = node('div', 'exercise-info'); info.append(node('h4', '', entry.label || ex.name), node('p', '', `${ex.target} · ${ex.equipment}`));
    const prescription = node('div', 'prescription'); const sets = node('span'), reps = node('span'); sets.append(node('b', '', entry.sets), ' sets'); reps.append(node('b', '', entry.reps), ' reps'); prescription.append(sets, node('span', 'separator'), reps); info.append(prescription);
    if (entry.variantIds?.length > 1) info.append(node('span', 'variant-hint', `${entry.variantIds.length} variations available`));
    btn.append(node('span', 'exercise-number', String(index + 1).padStart(2, '0')), image(ex), info, node('span', 'card-arrow', '↗')); btn.onclick = () => showExercise(ex, entry.key); list.append(btn);
  });
  if (w.exercises.length && mediaAvailable) { const credit = node('p', 'media-credit', 'Exercise media © Gym visual — '); const link = node('a', '', 'gymvisual.com'); link.href = 'https://gymvisual.com/'; link.target = '_blank'; link.rel = 'noopener noreferrer'; credit.append(link); list.append(credit); }
  $('#add-exercise').disabled = false;
}
function showLibrary() {
  if (!plan.equipment.length) { showSettings(); return; }
  $('#exercise-search').value = ''; $('#category-filter').value = ''; pageSize = 30;
  renderLibrary(); open($('#library-dialog'));
}
function renderLibrary() {
  const results = filterCatalog(catalog, plan.equipment, $('#exercise-search').value, $('#category-filter').value);
  $('#library-count').textContent = `${results.length} exercises · Your gym equipment`;
  $('#library-results').replaceChildren(...results.slice(0, pageSize).map(ex => {
    const btn = node('button', 'library-card'); btn.type = 'button';
    const info = node('span'); info.append(node('strong', '', ex.name), node('small', '', `${ex.target} · ${ex.equipment}`));
    btn.append(image(ex), info, node('span', '', '＋')); btn.setAttribute('aria-label', `Add ${ex.name}`); btn.onclick = () => showExercise(ex); return btn;
  }));
  if (!results.length) { const empty = node('div', 'empty-state'); empty.append(node('h4', '', 'No matching exercises.'), node('p', '', 'Try a different search or update your gym equipment.')); $('#library-results').append(empty); }
  $('#load-more').hidden = results.length <= pageSize;
  if (results.length && mediaAvailable) { const credit = node('p', 'media-credit', 'Exercise media © Gym visual — https://gymvisual.com/'); $('#library-results').append(credit); }
}
function showExercise(ex, key = null, draft = null) {
  editing = { exerciseId: ex.id, key };
  const entry = key ? workout().exercises.find(e => e.key === key) : null;
  const detail = $('#exercise-detail'); detail.replaceChildren(); const media = node('div', 'detail-image'); media.append(image(ex, true));
  const title = node('h2', 'detail-title', ex.name); title.id = 'detail-title';
  const tags = node('div', 'detail-tags'); [ex.category, ex.target, ex.equipment].forEach(value => tags.append(node('span', '', value)));
  const credit = node('p', 'media-credit', '© Gym visual — '); const link = node('a', '', 'https://gymvisual.com/'); link.href = 'https://gymvisual.com/'; link.target = '_blank'; link.rel = 'noopener noreferrer'; credit.append(link);
  const instructions = node('details', 'instructions'); instructions.append(node('summary', '', 'How to do it')); const steps = node('ol'); ex.steps.forEach(step => steps.append(node('li', '', step))); instructions.append(steps);
  detail.append(media, ...(mediaAvailable ? [credit] : []), title, tags, instructions);
  $('#detail-eyebrow').textContent = entry ? `WORKOUT ${activeWorkout} · EXERCISE DETAILS` : `ADD TO WORKOUT ${activeWorkout}`;
  $('#sets-input').value = draft?.sets ?? entry?.sets ?? 3; $('#reps-input').value = draft?.reps ?? entry?.reps ?? '10';
  const variants = entry?.variantIds || [];
  $('#variation-field').hidden = variants.length < 2;
  $('#variation-select').replaceChildren(...variants.map(id => { const variant = byId.get(id); const option = node('option', '', `${cap(variant.equipment)} — ${variant.name}`); option.value = id; return option; }));
  $('#variation-select').value = ex.id;
  syncRepPresets();
  $('#save-exercise').textContent = entry ? 'Save changes' : `Add to workout ${activeWorkout}`;
  $('#edit-actions').hidden = !entry;
  const index = workout().exercises.findIndex(e => e.key === key); $('#move-up').disabled = index <= 0; $('#move-first').disabled = index <= 0; $('#move-down').disabled = index >= workout().exercises.length - 1;
  open($('#exercise-dialog'));
}
function showSettings() {
  if (!plan) return;
  $('#plan-name-input').value = plan.name;
  $('#equipment-options').replaceChildren(...[...new Set(catalog.map(ex => ex.equipment))].sort().map(equipment => {
    const label = node('label', 'equipment-option'); const input = node('input'); input.type = 'checkbox'; input.value = equipment; input.name = 'equipment'; input.checked = plan.equipment.includes(equipment); label.append(input, node('span', '', equipment)); return label;
  })); open($('#settings-dialog'));
}

document.querySelectorAll('[data-close]').forEach(button => { button.onclick = () => button.closest('dialog').close(); });
document.querySelectorAll('dialog').forEach(dialog => { dialog.addEventListener('click', event => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } }); });
$('#exercise-dialog').addEventListener('close', () => { $('#exercise-detail').replaceChildren(); });
$('#settings-button').onclick = showSettings; $('#share-button').onclick = () => { showSettings(); $('.transfer-section').scrollIntoView({ block: 'center' }); };
$('#add-exercise').onclick = showLibrary; $('#library-equipment').onclick = showSettings;
$('#exercise-search').oninput = $('#category-filter').onchange = () => { pageSize = 30; renderLibrary(); };
$('#load-more').onclick = () => { pageSize += 30; renderLibrary(); };
function syncRepPresets() { document.querySelectorAll('[data-reps]').forEach(button => button.setAttribute('aria-pressed', String($('#sets-input').value === '3' && $('#reps-input').value === button.dataset.reps))); }
document.querySelectorAll('[data-reps]').forEach(button => { button.onclick = () => { $('#sets-input').value = 3; $('#reps-input').value = button.dataset.reps; syncRepPresets(); }; });
$('#sets-input').oninput = $('#reps-input').oninput = syncRepPresets;
$('#variation-select').onchange = event => { const draft = { sets: $('#sets-input').value, reps: $('#reps-input').value }; showExercise(byId.get(event.target.value), editing.key, draft); };
$('#settings-form').onsubmit = event => {
  event.preventDefault(); const name = $('#plan-name-input').value.trim(); if (!name) { $('#plan-name-input').focus(); return; }
  const equipment = [...document.querySelectorAll('input[name="equipment"]:checked')].map(input => input.value);
  if (updatePlan(next => { next.name = name; next.equipment = equipment; })) { $('#settings-dialog').close(); if ($('#library-dialog').open) renderLibrary(); toast('Settings saved on this device.'); }
};
$('#rename-workout').onclick = () => { if (!plan) return; $('#workout-name-input').value = workout().name; open($('#rename-dialog')); };
$('#rename-form').onsubmit = event => { event.preventDefault(); const name = $('#workout-name-input').value.trim(); if (!name) return; if (updatePlan(next => { next.workouts.find(w => w.id === activeWorkout).name = name; })) $('#rename-dialog').close(); };
$('#exercise-form').onsubmit = event => {
  event.preventDefault(); const sets = Number($('#sets-input').value), reps = $('#reps-input').value.trim(); if (!reps) { $('#reps-input').focus(); return; }
  const wasEditing = !!editing.key;
  if (updatePlan(next => {
    const w = next.workouts.find(w => w.id === activeWorkout);
    if (editing.key) { const entry = w.exercises.find(e => e.key === editing.key); entry.sets = sets; entry.reps = reps; if (entry.exerciseId !== editing.exerciseId) selectVariant(entry, editing.exerciseId); }
    else w.exercises.push({ key: `e-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`, exerciseId: editing.exerciseId, sets, reps });
  })) { $('#exercise-dialog').close(); toast(wasEditing ? 'Exercise updated.' : `Added to workout ${activeWorkout}.`); }
};
for (const [selector, delta] of [['#move-up', -1], ['#move-down', 1]]) $(selector).onclick = () => {
  if (updatePlan(next => moveExercise(next.workouts.find(w => w.id === activeWorkout), editing.key, delta))) { $('#exercise-dialog').close(); toast('Exercise order updated.'); }
};
$('#move-first').onclick = () => {
  if (updatePlan(next => { const w = next.workouts.find(w => w.id === activeWorkout); moveExercise(w, editing.key, -w.exercises.findIndex(e => e.key === editing.key)); })) { $('#exercise-dialog').close(); toast('Moved to the top. Follow the order that fits your day.'); }
};
$('#remove-exercise').onclick = () => {
  if (updatePlan(next => { const w = next.workouts.find(w => w.id === activeWorkout); w.exercises = w.exercises.filter(e => e.key !== editing.key); })) { $('#exercise-dialog').close(); toast('Exercise removed.'); }
};
$('#export-plan').onclick = () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(plan, null, 2)], { type: 'application/json' }));
  const link = node('a'); link.href = url; link.download = 'pocket-plan.json'; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); toast('Plan exported. Send the file to your training partner.');
};
$('#import-plan').onclick = () => $('#import-file').click();
$('#import-file').onchange = async event => {
  const file = event.target.files[0]; event.target.value = ''; if (!file) return;
  try {
    if (file.size > 1024 * 1024) throw new Error('Choose a plan file smaller than 1 MB.');
    pendingImport = validatePlan(JSON.parse(await file.text()), catalog);
    $('#import-summary').textContent = `Import “${pendingImport.name}” with ${pendingImport.workouts.reduce((sum, w) => sum + w.exercises.length, 0)} exercises across workouts A, B and C?`;
    open($('#import-dialog'));
  } catch (e) { pendingImport = null; toast(`Import failed: ${e.message}`); }
};
$('#cancel-import').onclick = () => $('#import-dialog').close();
$('#load-starter').onclick = () => {
  pendingImport = structuredClone(starterPlan);
  $('#import-summary').textContent = 'Use the shared starter plan: A with 11 exercises, B with 6, and C with 6? All exercises start at 3 × 10, with a shortcut to 3 × 12.';
  open($('#import-dialog'));
};
$('#import-dialog').addEventListener('close', () => { pendingImport = null; });
$('#confirm-import').onclick = () => { if (pendingImport && save(pendingImport)) { $('#import-dialog').close(); $('#settings-dialog').close(); if ($('#library-dialog').open) { $('#library-dialog').close(); } toast('Plan imported and saved on this device.'); } };

async function init() {
  try {
    const response = await fetch('./data/catalog.json'); if (!response.ok) throw new Error('The exercise catalog is unavailable.');
    catalog = await response.json(); byId = new Map(catalog.map(ex => [ex.id, ex]));
    mediaAvailable = await fetch(asset(catalog[0].image), { method: 'HEAD' }).then(res => res.ok).catch(() => false);
    [...new Set(catalog.map(ex => ex.category))].sort().forEach(category => { const option = node('option', '', cap(category)); option.value = category; $('#category-filter').append(option); });
    const starterResponse = await fetch('./data/starter-plan.json'); if (!starterResponse.ok) throw new Error('The starter plan is unavailable.');
    starterPlan = validatePlan(await starterResponse.json(), catalog);
    let needsStarterSave = false;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      plan = saved ? validatePlan(JSON.parse(saved), catalog) : structuredClone(starterPlan);
      needsStarterSave = !saved || isUntouchedPlan(plan);
      if (needsStarterSave) plan = structuredClone(starterPlan);
      else needsStarterSave = addMissingStarterLegs(plan, starterPlan);
    }
    catch { plan = blankPlan(); storageBlocked = true; error('The saved plan could not be read. Existing browser data has been preserved. Editing is disabled to avoid overwriting it.'); }
    renderPlan();
    if (needsStarterSave && !storageBlocked) save(plan);
  } catch (e) { error(`${e.message} Start the local server and reload this page.`); $('#exercise-list').textContent = 'Your plan could not be loaded.'; }
}
init();
