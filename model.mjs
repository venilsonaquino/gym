export const STORAGE_KEY = 'pocket-plan.v1';
export const blankPlan = () => ({ version: 1, name: 'Our training plan', equipment: [], workouts: ['A', 'B', 'C'].map(id => ({ id, name: `Workout ${id}`, exercises: [] })) });

export function validatePlan(value, catalog) {
  const fail = message => { throw new Error(message); };
  const text = (v, max) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
  if (!value || value.version !== 1) fail('This file is not a supported Pocket Plan backup.');
  if (value.starterRevision !== undefined && (!Number.isInteger(value.starterRevision) || value.starterRevision < 1 || value.starterRevision > 2)) fail('The starter plan version is invalid.');
  if (!text(value.name, 80)) fail('The plan needs a name (up to 80 characters).');
  const equipment = new Set(catalog.map(e => e.equipment));
  if (!Array.isArray(value.equipment) || value.equipment.length > equipment.size || value.equipment.some(e => !equipment.has(e))) fail('The equipment list is invalid.');
  if (!Array.isArray(value.workouts) || value.workouts.length !== 3) fail('The plan must contain workouts A, B and C.');
  const ids = new Set(catalog.map(e => e.id));
  const seen = new Set();
  const workouts = value.workouts.map((w, index) => {
    if (!w || w.id !== ['A', 'B', 'C'][index] || !text(w.name, 60) || !Array.isArray(w.exercises) || w.exercises.length > 100) fail('A workout is invalid.');
    return { id: w.id, name: w.name.trim(), exercises: w.exercises.map(e => {
      if (!e || !text(e.key, 80) || seen.has(e.key) || !ids.has(e.exerciseId)) fail('An exercise is unknown or duplicated in the backup.');
      if (!Number.isInteger(e.sets) || e.sets < 1 || e.sets > 99 || !text(e.reps, 40)) fail('Each exercise needs 1–99 sets and a repetition target.');
      if (e.variantIds !== undefined && (!Array.isArray(e.variantIds) || !e.variantIds.length || e.variantIds.length > 20 || e.variantIds.some(id => !ids.has(id)) || !e.variantIds.includes(e.exerciseId))) fail('The exercise variations are invalid.');
      if (e.label !== undefined && !text(e.label, 60)) fail('The exercise label is invalid.');
      seen.add(e.key);
      return { key: e.key, exerciseId: e.exerciseId, sets: e.sets, reps: e.reps.trim(),
        ...(e.variantIds ? { variantIds: [...new Set(e.variantIds)] } : {}),
        ...(e.label ? { label: e.label.trim() } : {}) };
    }) };
  });
  return { version: 1, ...(value.starterRevision ? { starterRevision: value.starterRevision } : {}), name: value.name.trim(), equipment: [...new Set(value.equipment)], workouts };
}

export function selectVariant(entry, exerciseId) {
  if (!entry.variantIds?.includes(exerciseId)) throw new Error('Choose one of this exercise’s variations.');
  entry.exerciseId = exerciseId;
}

export function isUntouchedPlan(plan) {
  return JSON.stringify(plan) === JSON.stringify(blankPlan());
}

export function addMissingStarterLegs(plan, starter) {
  if (plan.starterRevision >= 2 || plan.workouts[2].exercises.length) return false;
  const hasStarterWorkouts = [0, 1].every(index => {
    const actual = plan.workouts[index].exercises;
    const expected = starter.workouts[index].exercises;
    return actual.length === expected.length && actual.every((entry, i) => entry.key === expected[i].key);
  });
  if (!hasStarterWorkouts) return false;
  plan.workouts[2].exercises = structuredClone(starter.workouts[2].exercises);
  plan.equipment = [...new Set([...plan.equipment, 'sled machine'])];
  plan.starterRevision = 2;
  return true;
}

export function filterCatalog(catalog, equipment, query = '', category = '') {
  const normalize = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const terms = normalize(query).trim().split(/\s+/).filter(Boolean);
  return catalog.filter(ex => equipment.includes(ex.equipment) && (!category || ex.category === category)
    && terms.every(term => normalize(`${ex.name} ${ex.target} ${ex.equipment} ${ex.ptBR?.name || ''} ${ex.ptBR?.category || ''} ${ex.ptBR?.target || ''} ${ex.ptBR?.equipment || ''}`).includes(term)));
}

export function moveExercise(workout, key, delta) {
  const from = workout.exercises.findIndex(ex => ex.key === key);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= workout.exercises.length) return;
  const [entry] = workout.exercises.splice(from, 1);
  workout.exercises.splice(to, 0, entry);
}
