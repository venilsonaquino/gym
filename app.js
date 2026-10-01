import { STORAGE_KEY, blankPlan, validatePlan, filterCatalog, moveExercise, selectVariant, isUntouchedPlan, addMissingStarterLegs, addLaraBandVariants } from './model.mjs';

const $ = selector => document.querySelector(selector);
let catalog = [], byId = new Map(), plan, starterPlan, laraPlan, activeAthlete = 'venilson', activeWorkout = 'A', editing = null, pendingImport = null, pageSize = 30, storageBlocked = false, mediaAvailable = false;
const LARA_STORAGE_KEY = 'pocket-plan.lara.v1';
const LOCALE_KEY = 'pocket-plan.locale.v1';
let locale = localStorage.getItem(LOCALE_KEY) === 'en' ? 'en' : 'pt-BR';
const strings = {
  'pt-BR': { tagline:'TREINO NO SEU RITMO',heroLine1:'Um plano simples.',heroLine2:'Do seu jeito.',introCopy:'Escolha uma ficha e encaixe o treino na sua rotina.',myPlan:'MINHA FICHA',thisDevice:'Neste aparelho',rename:'Renomear',loading:'Preparando sua ficha…',addExercise:'Adicionar exercício',flexTitle:'Sem dias fixos. Sem compensações.',flexCopy:'Suas fichas estão aqui quando você puder treinar.',footer:'Feito para o seu jeito de treinar.',transfer:'Transferir ficha',library:'BIBLIOTECA DE EXERCÍCIOS',makeItYours:'PERSONALIZE SUA FICHA',workout:'Treino', exercises:'exercícios', exercise:'exercício', sets:'séries', reps:'repetições', pace:'No seu ritmo', fresh:'Comece do seu jeito. Monte sua ficha.', emptyTitle:'Seu treino começa aqui.', emptyEquipment:'Escolha os equipamentos da academia e monte uma ficha que funcione para você.', emptyAdd:'Adicione exercícios e ajuste as repetições para ter sua ficha sempre à mão.', choose:'Escolher equipamentos ↗', edit:'Ver ou editar.', variations:'variações disponíveis', libraryCount:'Equipamentos da sua academia', noResults:'Nenhum exercício encontrado.', trySearch:'Tente outra busca ou atualize seus equipamentos.', detail:'DETALHES DO EXERCÍCIO', add:'ADICIONAR AO TREINO', how:'Como fazer', variation:'Máquina ocupada? Escolha uma variação', chooseVariation:'Selecione uma opção para este exercício e salve para confirmar.', orCustom:'Ou personalize abaixo', addTo:'Adicionar ao treino', save:'Salvar alterações', settingsSaved:'Configurações salvas neste aparelho.', updated:'Exercício atualizado.', added:'Adicionado ao treino', reordered:'Ordem dos exercícios atualizada.', first:'Movido para o início. Siga a ordem que funciona no seu dia.', removed:'Exercício removido.', exported:'Ficha exportada. Envie o arquivo para seu parceiro de treino.', failed:'Falha ao importar:', invalidFile:'Escolha um arquivo com menos de 1 MB.', imported:'Ficha importada e salva neste aparelho.', media:'Mídia dos exercícios © Gym visual — ', preview:'Prévia indisponível', toggle:'EN', toggleAria:'Mudar para inglês', language:'Mudar idioma', searchCount:'exercícios', chooseNext:'Escolha seu próximo exercício.', search:'Buscar exercícios ou músculos', searchAria:'Buscar exercícios', categories:'Todas as partes do corpo', categoryFilter:'Parte do corpo', chooseWorkout:'Escolher treino', localBadge:'Salvo somente neste navegador', myEquipment:'Meus equipamentos ↗', more:'Ver mais exercícios', variationAria:'Variação do exercício', presetAria:'Atalhos de séries e repetições', firstMove:'⇡ Levar ao início', moveUp:'↑ Subir', moveDown:'↓ Descer', remove:'Remover', settingsTitle:'Configurações da ficha', closeLibrary:'Fechar biblioteca', closeDetails:'Fechar detalhes do exercício', closeSettings:'Fechar configurações', closeRename:'Fechar edição do nome', cancel:'Cancelar', replace:'Substituir esta ficha?', caution:'Isso substituirá os três treinos e os equipamentos salvos neste aparelho. Exporte uma cópia da ficha atual antes, se quiser guardá-la.', confirm:'Substituir ficha', export:'↓ Exportar ficha', import:'↑ Importar ficha', starter:'Carregar ficha inicial A/B/C ↗', planName:'Nome da ficha', equipment:'Equipamentos da academia', equipHelp:'Selecione o que está disponível. A biblioteca mostrará exercícios com esses equipamentos.', equipNote:'Alterar os equipamentos filtra a biblioteca. Seus exercícios atuais continuam na ficha.', saveSettings:'Salvar configurações', transferTitle:'Leve sua ficha com você.', transferCopy:'Baixe uma cópia e envie ao seu parceiro de treino. Importe-a em outro aparelho.', storageNote:'A ficha fica salva neste navegador. Limpar os dados do navegador remove a ficha. As alterações não sincronizam entre aparelhos.', renameWorkout:'Nome do treino', saveName:'Salvar nome', source:'Dados:', license:'Licença dos dados', notice:'Aviso sobre mídia', errorLoad:'Não foi possível carregar sua ficha.', server:'Inicie o servidor local e recarregue a página.', repsHelp:'Digite um número ou intervalo, como 8–12.',setsPlaceholder:'ex.: 3',repsPlaceholder:'ex.: 8–12' },
  en: {tagline:'TRAIN AT YOUR OWN PACE',heroLine1:'A simple plan.',heroLine2:'Your way.',introCopy:'Choose a plan and fit your workout into your routine.',myPlan:'MY PLAN',thisDevice:'On this device',rename:'Rename',loading:'Preparing your plan…',addExercise:'Add exercise',flexTitle:'No fixed days. No catch-up workouts.',flexCopy:'Your plan is here when you have time to train.',footer:'Made for the way you train.',transfer:'Transfer plan',library:'EXERCISE LIBRARY',makeItYours:'MAKE IT YOURS', workout:'Workout', exercises:'exercises', exercise:'exercise', sets:'sets', reps:'reps', pace:'Your own pace', fresh:'A fresh start. Build it your way.', emptyTitle:'Your workout starts here.', emptyEquipment:'Choose your gym equipment and build a plan that works for you.', emptyAdd:'Add exercises and set your reps to keep your plan close at hand.', choose:'Choose gym equipment ↗', edit:'View or edit.', variations:'variations available', libraryCount:'Your gym equipment', noResults:'No matching exercises.', trySearch:'Try another search or update your equipment.', detail:'EXERCISE DETAILS', add:'ADD TO WORKOUT', how:'How to do it', variation:'Machine busy? Choose a variation', chooseVariation:'Select an option for this exercise and save to confirm.', orCustom:'Or customize below', addTo:'Add to workout', save:'Save changes', settingsSaved:'Settings saved on this device.', updated:'Exercise updated.', added:'Added to workout', reordered:'Exercise order updated.', first:'Moved to the top. Follow the order that fits your day.', removed:'Exercise removed.', exported:'Plan exported. Send the file to your training partner.', failed:'Import failed:', invalidFile:'Choose a file smaller than 1 MB.', imported:'Plan imported and saved on this device.', media:'Exercise media © Gym visual — ', preview:'Preview unavailable', toggle:'PT', toggleAria:'Switch to Portuguese', language:'Change language', searchCount:'exercises', chooseNext:'Choose your next exercise.', search:'Search exercises or muscles', searchAria:'Search exercises', categories:'All body parts',categoryFilter:'Body part',chooseWorkout:'Choose a workout',localBadge:'Saved only in this browser',myEquipment:'My equipment ↗', more:'Show more exercises', variationAria:'Exercise variation', presetAria:'Sets and reps shortcuts', firstMove:'⇡ Move to top', moveUp:'↑ Move up', moveDown:'↓ Move down', remove:'Remove', settingsTitle:'Plan settings', closeLibrary:'Close exercise library', closeDetails:'Close exercise details', closeSettings:'Close settings', closeRename:'Close rename', cancel:'Cancel', replace:'Replace this plan?', caution:'This replaces the three workouts and equipment saved on this device. Export a copy first if you want to keep the current plan.', confirm:'Replace plan', export:'↓ Export plan', import:'↑ Import plan', starter:'Load the starter A/B/C plan ↗', planName:'Plan name', equipment:'Gym equipment', equipHelp:'Select available equipment. The library will show exercises that use it.', equipNote:'Changing equipment filters the library. Current exercises remain in your plan.', saveSettings:'Save settings', transferTitle:'Take your plan with you.', transferCopy:'Download a copy and send it to your training partner. Import it on another device.', storageNote:'Your plan is saved in this browser. Clearing browser data removes it. Changes do not sync across devices.', renameWorkout:'Workout name', saveName:'Save name', source:'Data:', license:'Data license', notice:'Media notice', errorLoad:'Your plan could not be loaded.', server:'Start the local server and reload the page.',repsHelp:'Enter a number or range, such as 8–12.',setsPlaceholder:'e.g., 3',repsPlaceholder:'e.g., 8–12' }
};
const t = key => strings[locale][key] || strings.en[key] || key;
const all = selector => [...document.querySelectorAll(selector)];
const ptWorkoutNames = { 'Our A/B/C plan':'Nossa ficha A/B/C', 'Our training plan':'Nossa ficha A/B/C', 'Our plan':'Nossa ficha A/B/C', 'Chest, shoulders, triceps & traps':'Peito, ombros, tríceps e trapézio', 'Back & biceps':'Costas e bíceps', 'Legs':'Pernas', 'Workout A':'Treino A', 'Workout B':'Treino B', 'Workout C':'Treino C' };
const ptExerciseNames = { 'Flat bench press':'Supino reto', 'Pec deck':'Peck deck', 'Chest fly':'Crucifixo', 'Incline bench press':'Supino inclinado', 'Decline bench press':'Supino declinado', 'Front raise':'Elevação frontal', 'Lateral raise':'Elevação lateral', 'Overhead triceps extension':'Tríceps francês', 'Lying triceps extension':'Tríceps testa', 'Triceps pushdown':'Tríceps na polia', 'Shrug · traps':'Encolhimento para trapézio', 'Wide-grip pulldown':'Puxada aberta na polia alta', 'V-bar pulldown':'Puxada fechada com triângulo V', 'Row to chest':'Remada alta para o peito', 'Low row':'Remada baixa', 'T-bar row':'Remada cavalinho', 'Biceps curl':'Rosca bíceps com barra W', 'Leg extension':'Cadeira extensora', 'Leg press':'Leg press', 'Hack squat':'Agachamento hack', 'Lying leg curl':'Mesa flexora', 'Hip adduction':'Cadeira adutora', 'Hip abduction':'Cadeira abdutora' };
const ptTerms = { 'Dumbbell':'Halteres','Barbell':'Barra','Body weight':'Peso corporal','Cable':'Polia','Leverage machine':'Máquina de alavanca','Ez barbell':'Barra EZ','Sled machine':'Máquina de trilho','Rope':'Corda','Smith machine':'Máquina Smith','Resistance band':'Faixa elástica','Pectorals':'Peitorais','Delts':'Ombros','Traps':'Trapézio','Lats':'Costas','Middle back':'Meio das costas','Lower back':'Região lombar','Abs':'Abdominais','Quads':'Quadríceps','Hamstrings':'Posteriores da coxa','Abductors':'Abdutores','Adductors':'Adutores','Medicine ball':'Bola medicinal' };
function exerciseName(ex, entry) {
  const showLabel = entry?.label && !entry.key?.startsWith('lara-') && (!entry.variantIds || entry.variantIds[0] === ex.id);
  return locale === 'pt-BR' ? (showLabel ? ptExerciseNames[entry.label] || entry.label : ex.ptBR?.name || ex.name) : (showLabel ? entry.label : ex.name);
}
function workoutName(name) { return locale === 'pt-BR' ? ptWorkoutNames[name] || name : name; }
function planName(name) { return locale==='pt-BR' && ['Our A/B/C plan','Our training plan'].includes(name)?'Nossa ficha A/B/C':name; }
Object.assign(ptTerms, { 'chest':'Peito','waist':'Cintura','upper legs':'Coxas','lower legs':'Panturrilhas','lower arms':'Antebraços','upper arms':'Braços','shoulders':'Ombros','back':'Costas','cardio':'Cardio','neck':'Pescoço','other':'Outros','weighted':'Com peso','assisted':'Assistido','olympic barbell':'Barra olímpica','stability ball':'Bola suíça','medicine ball':'Bola medicinal','kettlebell':'Kettlebell','band':'Faixa elástica','bosu ball':'Bola BOSU','elliptical machine':'Elíptico','hammer':'Máquina Hammer','roller':'Rolo de exercícios','skierg machine':'Máquina SkiErg','stationary bike':'Bicicleta ergométrica','stepmill machine':'Escada ergométrica','tire':'Pneu','trap bar':'Barra hexagonal','upper body ergometer':'Ergômetro de braços','wheel roller':'Roda abdominal' });
function translated(ex, field) { if (locale !== 'pt-BR') return ex[field]; const value = ex.ptBR?.[field] || ex[field]; return ptTerms[value] || value; }
function exerciseCount(count) { const noun = locale === 'pt-BR' ? (count === 1 ? t('exercise') : t('exercises')) : (count === 1 ? 'exercise' : 'exercises'); return `${count} ${noun}`; }
const node = (tag, className, text) => { const el = document.createElement(tag); if (className) el.className = className; if (text !== undefined) el.textContent = text; return el; };
function fillCategories() {
  const filter=$('#category-filter'), selected=filter.value;
  const categories=[...new Set(catalog.map(ex=>ex.category))].sort();
  filter.replaceChildren(new Option(t('categories'),''),...categories.map(category=>new Option(locale==='pt-BR'?(ptTerms[category]||catalog.find(ex=>ex.category===category)?.ptBR?.category||cap(category)):cap(category),category)));
  filter.value=selected;
}
function applyLocale() {
  document.documentElement.lang = locale;
  document.title = locale === 'pt-BR' ? 'Pocket Plan — Treine no seu ritmo' : 'Pocket Plan — Train at your own pace';
  $('#language-toggle').textContent = t('toggle'); $('#language-toggle').setAttribute('aria-label', t('toggleAria')); $('#language-toggle').title = t('language');
  all('[data-i18n]').forEach(el => { const key=el.dataset.i18n; el.textContent=strings[locale][key] || el.textContent; });
  $('#library-title').textContent=t('chooseNext'); $('#exercise-search').placeholder=t('search'); $('#exercise-search').setAttribute('aria-label',t('searchAria'));
  $('#category-filter').options[0].textContent=t('categories'); $('#library-equipment').textContent=t('myEquipment'); $('#load-more').textContent=t('more');
  $('#variation-select').setAttribute('aria-label',t('variationAria')); $('.rep-presets').setAttribute('aria-label',t('presetAria'));
  $('#move-first').textContent=t('firstMove'); $('#move-up').textContent=t('moveUp'); $('#move-down').textContent=t('moveDown'); $('#remove-exercise').textContent=t('remove');
  $('#settings-title').textContent=t('settingsTitle'); $('#settings-dialog [data-close]').setAttribute('aria-label',t('closeSettings')); $('#library-dialog [data-close]').setAttribute('aria-label',t('closeLibrary')); $('#exercise-dialog [data-close]').setAttribute('aria-label',t('closeDetails')); $('#rename-dialog [data-close]').setAttribute('aria-label',t('closeRename')); $('#import-dialog [data-close]').setAttribute('aria-label',t('cancel'));
  $('#settings-form > label').firstChild.textContent=t('planName'); $('#settings-form legend').textContent=t('equipment'); $('#settings-form fieldset .field-hint').textContent=t('equipHelp'); $('#settings-form > .field-hint').textContent=t('equipNote'); $('#settings-form > button').textContent=t('saveSettings');
  $('.transfer-section h3').textContent=t('transferTitle'); $('.transfer-section>p').textContent=t('transferCopy'); $('#export-plan').textContent=t('export'); $('#import-plan').textContent=t('import'); $('.transfer-section>.field-hint').textContent=t('storageNote'); $('#load-starter').textContent=t('starter');
  $('#rename-title').textContent=t('renameWorkout'); $('#rename-form>label').firstChild.textContent=t('renameWorkout'); $('#rename-form button').textContent=t('saveName'); $('#import-title').textContent=t('replace'); $('#import-dialog .field-hint').textContent=t('caution'); $('#cancel-import').textContent=t('cancel'); $('#confirm-import').textContent=t('confirm');
  $('#settings-dialog .media-credit a:nth-of-type(1)').textContent=t('source'); $('#settings-dialog .media-credit a:nth-of-type(2)').textContent=t('license'); $('#settings-dialog .media-credit a:nth-of-type(4)').textContent=t('notice');
  $('#settings-button').setAttribute('aria-label', t('settingsTitle')); $('#settings-button').title=t('settingsTitle');
  $('#workout-tabs').setAttribute('aria-label', t('chooseWorkout'));
  $('#category-filter-label').textContent=t('categoryFilter');
  $('.local-badge').title=t('localBadge'); $('#detail-eyebrow').textContent=t('detail');
  $('#variation-field [data-i18n="variation"]').textContent=t('variation'); $('#variation-field .field-hint').textContent=t('chooseVariation');
  $('.rep-presets span').textContent=t('orCustom');
  $('.fields-row label:nth-child(1)').firstChild.textContent=t('sets'); $('.fields-row label:nth-child(2)').firstChild.textContent=t('reps');
  $('#sets-input').placeholder=t('setsPlaceholder'); $('#reps-input').placeholder=t('repsPlaceholder');
  $('#exercise-form > .field-hint').textContent=t('repsHelp');
  all('.media-fallback, .detail-fallback').forEach(el=>el.setAttribute('aria-label',t('preview')));
  $('#error-banner').textContent=$('#error-banner').hidden?'':t('errorLoad');
  if (catalog.length) fillCategories(); if (plan) renderPlan();
}
let toastTimer;
const workout = () => plan.workouts.find(w => w.id === activeWorkout);
const asset = path => path;
const cap = text => text.charAt(0).toUpperCase() + text.slice(1);
function toast(message) { const notice = $('#toast'); const dialogs = [...document.querySelectorAll('dialog[open]')]; (dialogs.at(-1) || document.body).append(notice); notice.textContent = message; notice.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { notice.hidden = true; }, 3500); }
function error(message) { $('#error-banner').textContent = message; $('#error-banner').hidden = false; }
function open(dialog) { if (!dialog.open) dialog.showModal(); }
function save(next) {
  if (storageBlocked) { toast(locale==='pt-BR'?'Não foi possível ler a ficha salva. Exporte uma cópia antes de continuar.':'The saved data could not be read. Export this plan before continuing.'); return false; }
  try {
    const clean = validatePlan(next, catalog);
    localStorage.setItem(activeAthlete === 'lara' ? LARA_STORAGE_KEY : STORAGE_KEY, JSON.stringify(clean));
    plan = clean;
    $('#error-banner').hidden = true;
    renderPlan();
    return true;
  } catch (e) { error(locale==='pt-BR'?`Não foi possível salvar as alterações. ${e.message} A ficha anterior foi mantida.`:`Could not save your changes. ${e.message} Your previous plan has been kept.`); toast(locale==='pt-BR'?'As alterações não foram salvas. Confira o aviso na ficha.':'Changes were not saved. Check the message on your plan.'); return false; }
}
function updatePlan(change) { const next = structuredClone(plan); change(next); return save(next); }
function image(ex, gif = false) {
  if (!mediaAvailable) {
    const fallback = node('span', gif ? 'media-fallback detail-fallback' : 'exercise-thumb media-fallback', '◉');
    fallback.setAttribute('role', 'img'); fallback.setAttribute('aria-label', t('preview'));
    return fallback;
  }
  const img = node('img', gif ? '' : 'exercise-thumb');
  img.src = asset(gif ? ex.gif : ex.image); img.alt = exerciseName(ex); img.width = gif ? 180 : 78; img.height = gif ? 180 : 78;
  if (!gif) img.loading = 'lazy';
  img.addEventListener('error', () => { const fallback = node('span', gif ? 'media-fallback detail-fallback' : 'exercise-thumb media-fallback', '◉'); fallback.setAttribute('role', 'img'); fallback.setAttribute('aria-label', t('preview')); img.replaceWith(fallback); });
  return img;
}
function renderPlan() {
  $('#plan-title').textContent = locale==='pt-BR'?planName(plan.name):(['Our A/B/C plan','Our training plan','Nossa ficha A/B/C'].includes(plan.name)?'Our A/B/C plan':plan.name);
  $('#workout-tabs').replaceChildren(...plan.workouts.map(w => {
    const btn = node('button', 'workout-tab'); btn.type = 'button'; btn.setAttribute('aria-pressed', String(w.id === activeWorkout)); btn.setAttribute('aria-label', `${t('workout')} ${w.id}, ${exerciseCount(w.exercises.length)}`);
    const labels = node('span'); labels.append(node('span', 'tab-label', `${t('workout')} ${w.id}`), node('span', 'tab-count', exerciseCount(w.exercises.length)));
    btn.append(node('span', 'tab-letter', w.id), labels); btn.onclick = () => { activeWorkout = w.id; renderPlan(); }; return btn;
  }));
  const w = workout(); $('#workout-title').textContent = workoutName(w.name);
  $('#workout-summary').textContent = w.exercises.length ? `${exerciseCount(w.exercises.length)} · ${w.exercises.reduce((sum, e) => sum + e.sets, 0)} ${t('sets')} · ${t('pace')}` : t('fresh');
  const list = $('#exercise-list'); list.replaceChildren();
  if (!w.exercises.length) {
    const empty = node('div', 'empty-state'); empty.append(node('div', 'empty-symbol', '＋'), node('h4', '', t('emptyTitle')), node('p', '', plan.equipment.length ? t('emptyAdd') : t('emptyEquipment')));
    if (!plan.equipment.length) { const btn = node('button', 'secondary-button', t('choose')); btn.onclick = showSettings; empty.append(btn); }
    list.append(empty);
  }
  w.exercises.forEach((entry, index) => {
    const ex = byId.get(entry.exerciseId), btn = node('button', 'exercise-card'); btn.type = 'button'; btn.setAttribute('aria-label', `${exerciseName(ex,entry)}, ${entry.sets} ${t('sets')}, ${entry.reps} ${t('reps')}. ${t('edit')}`);
    const info = node('div', 'exercise-info'); info.append(node('h4', '', exerciseName(ex,entry)), node('p', '', `${translated(ex,'target')} · ${translated(ex,'equipment')}`));
    const prescription = node('div', 'prescription'); const sets = node('span'), reps = node('span'); sets.append(node('b', '', entry.sets), ` ${t('sets')}`); reps.append(node('b', '', entry.reps), ` ${t('reps')}`); prescription.append(sets, node('span', 'separator'), reps); info.append(prescription);
    if (entry.variantIds?.length > 1) info.append(node('span', 'variant-hint', `${entry.variantIds.length} ${t('variations')}`));
    btn.append(node('span', 'exercise-number', String(index + 1).padStart(2, '0')), image(ex), info, node('span', 'card-arrow', '↗')); btn.onclick = () => showExercise(ex, entry.key); list.append(btn);
  });
  if (w.exercises.length && mediaAvailable) { const credit = node('p', 'media-credit', t('media')); const link = node('a', '', 'gymvisual.com'); link.href = 'https://gymvisual.com/'; link.target = '_blank'; link.rel = 'noopener noreferrer'; credit.append(link); list.append(credit); }
  $('#add-exercise').disabled = false;
}
function showLibrary() {
  if (!plan.equipment.length) { showSettings(); return; }
  $('#exercise-search').value = ''; $('#category-filter').value = ''; pageSize = 30;
  renderLibrary(); open($('#library-dialog'));
}
function renderLibrary() {
  const results = filterCatalog(catalog, plan.equipment, $('#exercise-search').value, $('#category-filter').value);
  $('#library-count').textContent = `${results.length} ${t('searchCount')} · ${t('libraryCount')}`;
  $('#library-results').replaceChildren(...results.slice(0, pageSize).map(ex => {
    const btn = node('button', 'library-card'); btn.type = 'button';
    const info = node('span'); info.append(node('strong', '', exerciseName(ex)), node('small', '', `${translated(ex,'target')} · ${translated(ex,'equipment')}`));
    btn.append(image(ex), info, node('span', '', '＋')); btn.setAttribute('aria-label', `${t('add')} ${exerciseName(ex)}`); btn.onclick = () => showExercise(ex); return btn;
  }));
  if (!results.length) { const empty = node('div', 'empty-state'); empty.append(node('h4', '', t('noResults')), node('p', '', t('trySearch'))); $('#library-results').append(empty); }
  $('#load-more').hidden = results.length <= pageSize;
  if (results.length && mediaAvailable) { const credit = node('p', 'media-credit', `${t('media')}https://gymvisual.com/`); $('#library-results').append(credit); }
}
function showExercise(ex, key = null, draft = null) {
  editing = { exerciseId: ex.id, key };
  const entry = key ? workout().exercises.find(e => e.key === key) : null;
  const detail = $('#exercise-detail'); detail.replaceChildren(); const media = node('div', 'detail-image'); media.append(image(ex, true));
  const title = node('h2', 'detail-title', exerciseName(ex,entry)); title.id = 'detail-title';
  const tags = node('div', 'detail-tags'); [translated(ex,'category'), translated(ex,'target'), translated(ex,'equipment')].forEach(value => tags.append(node('span', '', value)));
  const credit = node('p', 'media-credit', t('media')); const link = node('a', '', 'https://gymvisual.com/'); link.href = 'https://gymvisual.com/'; link.target = '_blank'; link.rel = 'noopener noreferrer'; credit.append(link);
  const instructions = node('details', 'instructions'); instructions.append(node('summary', '', t('how'))); const steps = node('ol'); translated(ex,'steps').forEach(step => steps.append(node('li', '', step))); instructions.append(steps);
  detail.append(media, ...(mediaAvailable ? [credit] : []), title, tags, instructions);
  $('#detail-eyebrow').textContent = entry ? `${t('workout').toLocaleUpperCase(locale)} ${activeWorkout} · ${t('detail')}` : `${t('add')} ${activeWorkout}`;
  $('#sets-input').value = draft?.sets ?? entry?.sets ?? 3; $('#reps-input').value = draft?.reps ?? entry?.reps ?? '10';
  const variants = entry?.variantIds || [];
  $('#variation-field').hidden = variants.length < 2;
  $('#variation-select').replaceChildren(...variants.map(id => { const variant = byId.get(id); const option = node('option', '', `${cap(translated(variant, 'equipment'))} — ${exerciseName(variant)}`); option.value = id; return option; }));
  $('#variation-select').value = ex.id;
  syncRepPresets();
  $('#save-exercise').textContent = entry ? t('save') : `${t('addTo')} ${activeWorkout}`;
  $('#edit-actions').hidden = !entry;
  const index = workout().exercises.findIndex(e => e.key === key); $('#move-up').disabled = index <= 0; $('#move-first').disabled = index <= 0; $('#move-down').disabled = index >= workout().exercises.length - 1;
  open($('#exercise-dialog'));
}
function showSettings() {
  if (!plan) return;
  $('#plan-name-input').value = planName(plan.name);
  $('#equipment-options').replaceChildren(...[...new Set(catalog.map(ex => ex.equipment))].sort().map(equipment => {
    const label = node('label', 'equipment-option'); const input = node('input'); input.type = 'checkbox'; input.value = equipment; input.name = 'equipment'; input.checked = plan.equipment.includes(equipment); label.append(input, node('span', '', translated(catalog.find(ex => ex.equipment === equipment) || {},'equipment') || equipment)); return label;
  })); open($('#settings-dialog'));
}

all('[data-close]').forEach(button => { button.onclick = () => button.closest('dialog').close(); });
all('dialog').forEach(dialog => { dialog.addEventListener('click', event => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } }); });
$('#exercise-dialog').addEventListener('close', () => { $('#exercise-detail').replaceChildren(); });
$('#language-toggle').onclick = () => { locale = locale === 'pt-BR' ? 'en' : 'pt-BR'; localStorage.setItem(LOCALE_KEY, locale); applyLocale(); };
function selectAthlete(id) {
  activeAthlete = id;
  plan = structuredClone(id === 'lara' ? laraPlan : starterPlan);
  const key = id === 'lara' ? LARA_STORAGE_KEY : STORAGE_KEY;
  storageBlocked = false;
  $('#error-banner').hidden = true;
  let needsSave = false;
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      plan = validatePlan(JSON.parse(saved), catalog);
      if (id === 'lara') needsSave = addLaraBandVariants(plan, laraPlan);
    }
  } catch { storageBlocked = true; error('A ficha salva não pôde ser lida. Os dados existentes foram preservados e a edição foi bloqueada.'); }
  activeWorkout = 'A';
  $('.plan-section').hidden = false;
  renderPlan();
  const savedOk = !needsSave || storageBlocked || save(plan);
  document.querySelector('.plan-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
  if (!storageBlocked && savedOk) toast(id === 'lara' ? 'Ficha da Lara carregada' : 'Ficha do Venilson carregada');
}
$('#athlete-lara').onclick = () => selectAthlete('lara');
$('#athlete-venilson').onclick = () => selectAthlete('venilson');
$('#settings-button').onclick = showSettings; $('#share-button').onclick = () => { showSettings(); $('.transfer-section').scrollIntoView({ block: 'center' }); };
$('#add-exercise').onclick = showLibrary; $('#library-equipment').onclick = showSettings;
$('#exercise-search').oninput = $('#category-filter').onchange = () => { pageSize = 30; renderLibrary(); };
$('#load-more').onclick = () => { pageSize += 30; renderLibrary(); };
function syncRepPresets() { all('[data-reps]').forEach(button => button.setAttribute('aria-pressed', String($('#sets-input').value === '3' && $('#reps-input').value === button.dataset.reps))); }
document.querySelectorAll('[data-reps]').forEach(button => { button.onclick = () => { $('#sets-input').value = 3; $('#reps-input').value = button.dataset.reps; syncRepPresets(); }; });
$('#sets-input').oninput = $('#reps-input').oninput = syncRepPresets;
$('#variation-select').onchange = event => { const draft = { sets: $('#sets-input').value, reps: $('#reps-input').value }; showExercise(byId.get(event.target.value), editing.key, draft); };
$('#settings-form').onsubmit = event => {
  event.preventDefault(); const name = $('#plan-name-input').value.trim(); if (!name) { $('#plan-name-input').focus(); return; }
  const equipment = all('input[name="equipment"]:checked').map(input => input.value);
  if (updatePlan(next => { next.name = name; next.equipment = equipment; })) { $('#settings-dialog').close(); if ($('#library-dialog').open) renderLibrary(); toast(t('settingsSaved')); }
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
  })) { $('#exercise-dialog').close(); toast(wasEditing ? t('updated') : `${t('added')} ${t('workout').toLocaleLowerCase(locale)} ${activeWorkout}.`); }
};
for (const [selector, delta] of [['#move-up', -1], ['#move-down', 1]]) $(selector).onclick = () => {
  if (updatePlan(next => moveExercise(next.workouts.find(w => w.id === activeWorkout), editing.key, delta))) { $('#exercise-dialog').close(); toast(t('reordered')); }
};
$('#move-first').onclick = () => {
  if (updatePlan(next => { const w = next.workouts.find(w => w.id === activeWorkout); moveExercise(w, editing.key, -w.exercises.findIndex(e => e.key === editing.key)); })) { $('#exercise-dialog').close(); toast(t('first')); }
};
$('#remove-exercise').onclick = () => {
  if (updatePlan(next => { const w = next.workouts.find(w => w.id === activeWorkout); w.exercises = w.exercises.filter(e => e.key !== editing.key); })) { $('#exercise-dialog').close(); toast(t('removed')); }
};
$('#export-plan').onclick = () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(plan, null, 2)], { type: 'application/json' }));
  const link = node('a'); link.href = url; link.download = 'pocket-plan.json'; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); toast(t('exported'));
};
$('#import-plan').onclick = () => $('#import-file').click();
$('#import-file').onchange = async event => {
  const file = event.target.files[0]; event.target.value = ''; if (!file) return;
  try {
    if (file.size > 1024 * 1024) throw new Error(t('invalidFile'));
    pendingImport = validatePlan(JSON.parse(await file.text()), catalog);
    const total=pendingImport.workouts.reduce((sum,w)=>sum+w.exercises.length,0);
    $('#import-summary').textContent = locale==='pt-BR'?`Importar “${pendingImport.name}” com ${total} exercícios divididos entre os treinos A, B e C?`:`Import “${pendingImport.name}” with ${total} exercises across workouts A, B and C?`;
    open($('#import-dialog'));
  } catch (e) { pendingImport = null; toast(`${t('failed')} ${e.message}`); }
};
$('#cancel-import').onclick = () => $('#import-dialog').close();
$('#load-starter').onclick = () => {
  pendingImport = structuredClone(starterPlan);
  $('#import-summary').textContent = locale==='pt-BR'?'Usar a ficha inicial: A com 11 exercícios, B com 6 e C com 6? Todos começam em 3 × 10, com atalho para 3 × 12.':'Use the starter plan: A with 11 exercises, B with 6, and C with 6? All exercises start at 3 × 10, with a shortcut to 3 × 12.';
  open($('#import-dialog'));
};
$('#import-dialog').addEventListener('close', () => { pendingImport = null; });
$('#confirm-import').onclick = () => { if (pendingImport && save(pendingImport)) { $('#import-dialog').close(); $('#settings-dialog').close(); if ($('#library-dialog').open) { $('#library-dialog').close(); } toast(t('imported')); } };

async function init() {
  try {
    const response = await fetch('./data/catalog.json'); if (!response.ok) throw new Error('The exercise catalog is unavailable.');
    catalog = await response.json(); byId = new Map(catalog.map(ex => [ex.id, ex]));
    mediaAvailable = await fetch(asset(catalog[0].image), { method: 'HEAD' }).then(res => res.ok).catch(() => false);
    fillCategories();
    const starterResponse = await fetch('./data/starter-plan.json'); if (!starterResponse.ok) throw new Error('The starter plan is unavailable.');
    starterPlan = validatePlan(await starterResponse.json(), catalog);
    const laraResponse = await fetch('./data/lara-plan.json'); if (!laraResponse.ok) throw new Error('The Lara plan is unavailable.');
    laraPlan = validatePlan(await laraResponse.json(), catalog);
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
  } catch { error(`${t('errorLoad')} ${t('server')}`); $('#exercise-list').textContent = t('errorLoad'); }
}
applyLocale();
init();
