function normalizeWorkoutBody(body) {
  const clone = { ...body };
  if (Array.isArray(clone.exerciseIds) && !clone.plan) {
    clone.plan = clone.exerciseIds.map((id) => ({ exerciseId: id, series: 3 }));
    delete clone.exerciseIds;
  }
  return clone;
}

export { normalizeWorkoutBody };
