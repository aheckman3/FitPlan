export function stripHtml(value = '') {
  return String(value ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function getLogSearchText(log = {}) {
  if (!log) return '';

  const values = [
    log.workout,
    log.notes,
    log.description,
    log.planDescription,
    log.details
  ].filter((value) => value != null && String(value).trim() !== '');

  return values.map((value) => stripHtml(String(value))).join(' ');
}

export function getLogText(log = {}) {
  return getLogSearchText(log);
}

export function extractCountFromLogEntry(log = {}) {
  if (!log) return 0;

  const sourceText = getLogSearchText(log);
  const countMatches = [...sourceText.matchAll(/(\d+)\s*(pushup|pushups|rep|reps|situp|situps|squat|squats|burpee|burpees|round|rounds|set|sets|minute|minutes)/gi)];

  if (!countMatches.length) {
    return Number.isFinite(Number(log.count)) ? Number(log.count) : 0;
  }

  const uniqueValues = new Set();
  return countMatches.reduce((sum, match) => {
    const value = Number.parseInt(match[1], 10);
    if (Number.isFinite(value) && !uniqueValues.has(value)) {
      uniqueValues.add(value);
      return sum + value;
    }
    return sum;
  }, 0);
}

export function shouldCountLogForGoal(log = {}, goal = {}) {
  if (!log || !goal) return false;

  const goalCreatedAt = Number(goal.createdAt || goal.startedAt || 0);
  const completedAt = Number(goal.completedAt || 0);
  const logTimestamp = Number(log.loggedAt ?? log.timestamp ?? Date.parse(log.date) ?? 0);
  const safeLogTimestamp = Number.isFinite(logTimestamp) ? logTimestamp : 0;

  if (goalCreatedAt > 0 && safeLogTimestamp > 0 && safeLogTimestamp < goalCreatedAt) {
    return false;
  }

  if (completedAt > 0 && safeLogTimestamp > 0 && safeLogTimestamp >= completedAt) {
    return false;
  }

  return true;
}
