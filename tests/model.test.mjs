import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { blankPlan, validatePlan, filterCatalog, moveExercise, selectVariant, isUntouchedPlan, addMissingStarterLegs } from '../model.mjs';
const catalog = JSON.parse(await readFile(new URL('../data/catalog.json', import.meta.url), 'utf8'));

test('a plan round-trip keeps A/B/C, exercise IDs, ranges and equipment', () => {
  const plan = blankPlan(); plan.equipment = [catalog[0].equipment];
  plan.workouts[0].exercises.push({ key: 'first', exerciseId: '0001', sets: 3, reps: '8–12' });
  assert.deepEqual(validatePlan(JSON.parse(JSON.stringify(plan)), catalog), plan);
});
test('invalid imports cannot replace a valid plan', () => {
  for (const mutate of [p => { p.version = 99; }, p => { p.equipment = ['invented machine']; }, p => { p.workouts.pop(); }, p => { p.workouts[0].exercises = [{ key: 'x', exerciseId: 'missing', sets: 3, reps: '12' }]; }, p => { p.workouts[0].exercises = [{ key: 'x', exerciseId: '0001', sets: -1, reps: '12' }]; }, p => { p.workouts[0].exercises = [{ key: 'x', exerciseId: '0001', sets: 3, reps: ' ' }]; }]) {
    const plan = blankPlan(); mutate(plan); assert.throws(() => validatePlan(plan, catalog));
  }
});
test('same-name source exercises remain distinct by ID', () => {
  const duplicates = catalog.filter(e => e.name === 'barbell seated calf raise');
  assert.equal(duplicates.length, 2); assert.notEqual(duplicates[0].id, duplicates[1].id);
});
test('equipment and body filters combine with case-insensitive multiword search', () => {
  const results = filterCatalog(catalog, ['dumbbell'], 'CURL biceps', 'upper arms');
  assert.ok(results.length > 0); assert.ok(results.every(ex => ex.equipment === 'dumbbell' && ex.category === 'upper arms'));
  assert.equal(filterCatalog(catalog, []).length, 0);
});
test('moving exercises respects boundaries and preserves the other entries', () => {
  const workout = { exercises: [{ key: 'a' }, { key: 'b' }, { key: 'c' }] };
  moveExercise(workout, 'a', -1); assert.deepEqual(workout.exercises.map(e => e.key), ['a', 'b', 'c']);
  moveExercise(workout, 'b', -1); assert.deepEqual(workout.exercises.map(e => e.key), ['b', 'a', 'c']);
  moveExercise(workout, 'c', 1); assert.deepEqual(workout.exercises.map(e => e.key), ['b', 'a', 'c']);
});
test('duplicate instance keys are rejected, repeated exercises with unique keys are valid', () => {
  const plan = blankPlan(); const entry = { key: 'one', exerciseId: '0001', sets: 3, reps: '12' };
  plan.workouts[0].exercises = [entry, { ...entry }]; assert.throws(() => validatePlan(plan, catalog));
  plan.workouts[0].exercises[1].key = 'two'; assert.equal(validatePlan(plan, catalog).workouts[0].exercises.length, 2);
});

const starter = JSON.parse(await readFile(new URL('../data/starter-plan.json', import.meta.url), 'utf8'));
test('the starter maps all workouts and defaults to the requested 3 x 10', () => {
  const plan = validatePlan(starter, catalog);
  assert.deepEqual(plan, starter);
  assert.deepEqual(plan.workouts.map(w => w.exercises.length), [11, 6, 6]);
  assert.ok(plan.workouts.flatMap(w => w.exercises).every(e => e.sets === 3 && e.reps === '10'));
  assert.deepEqual(plan.workouts[1].exercises.slice(0, 2).map(e => e.exerciseId), ['0198', '2616']);
  const row = catalog.find(e => e.id === plan.workouts[1].exercises[2].exerciseId);
  assert.equal(row.target, 'upper back');
  assert.deepEqual(plan.workouts[2].exercises.map(e => e.exerciseId), ['0585', '1463', '0743', '0586', '0598', '0597']);
});
test('a variation swaps the slot without adding volume, and survives export/import', () => {
  const plan = structuredClone(starter);
  const first = plan.workouts[0].exercises[0]; first.reps = '12';
  selectVariant(first, '0289');
  assert.equal(plan.workouts[0].exercises.length, 11);
  assert.equal(first.key, 'starter-a-flat'); assert.equal(first.sets, 3); assert.equal(first.reps, '12');
  assert.throws(() => selectVariant(first, '0447'));
  assert.equal(first.exerciseId, '0289');
  assert.deepEqual(validatePlan(JSON.parse(JSON.stringify(plan)), catalog), plan);
});
test('invalid variants cannot be imported or silently dropped', () => {
  for (const variants of [[], ['unknown'], ['0289'], '0025']) {
    const plan = structuredClone(starter); plan.workouts[0].exercises[0].variantIds = variants;
    assert.throws(() => validatePlan(plan, catalog));
  }
});
test('moving a later exercise to the top preserves all exercises and prescriptions', () => {
  const w = structuredClone(starter.workouts[0]); const before = structuredClone(w.exercises);
  moveExercise(w, 'starter-a-traps', -10);
  assert.deepEqual(w.exercises, [before[10], ...before.slice(0, 10)]);
});
test('only the completely untouched original blank plan can receive the starter automatically', () => {
  assert.equal(isUntouchedPlan(blankPlan()), true);
  const configured = blankPlan(); configured.equipment = ['dumbbell']; assert.equal(isUntouchedPlan(configured), false);
  const renamed = blankPlan(); renamed.workouts[0].name = 'My workout'; assert.equal(isUntouchedPlan(renamed), false);
  const emptied = structuredClone(starter); emptied.workouts.forEach(w => { w.exercises = []; }); assert.equal(isUntouchedPlan(emptied), false);
});

test('adding C to the previous starter preserves edits to A and B and runs once', () => {
  const previous = structuredClone(starter); previous.workouts[2].exercises = []; delete previous.starterRevision;
  previous.workouts[0].exercises[0].exerciseId = '0289'; previous.workouts[0].exercises[0].reps = '12';
  assert.equal(addMissingStarterLegs(previous, starter), true);
  assert.equal(previous.workouts[0].exercises[0].exerciseId, '0289');
  assert.equal(previous.workouts[0].exercises[0].reps, '12');
  assert.equal(previous.workouts[2].exercises.length, 6);
  assert.equal(addMissingStarterLegs(previous, starter), false);
});
test('adding C never replaces a customized legs workout', () => {
  const previous = structuredClone(starter); delete previous.starterRevision;
  previous.workouts[2].exercises = [previous.workouts[2].exercises[0]];
  assert.equal(addMissingStarterLegs(previous, starter), false);
  assert.equal(previous.workouts[2].exercises.length, 1);
});
