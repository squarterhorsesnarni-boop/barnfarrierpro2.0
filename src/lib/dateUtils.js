export function calculateIdealNextShoeingDate(lastShoeingDate, intervalDays) {
  const date = new Date(lastShoeingDate);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + Number(intervalDays));
  return date;
}

export function calculateDaysRemaining(targetDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(targetDate);
  target.setHours(0, 0, 0, 0);

  const diffMs = target - today;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export function calculateStatus(lastShoeingDate, intervalDays) {
  const idealNextDate = calculateIdealNextShoeingDate(lastShoeingDate, intervalDays);
  const daysRemaining = calculateDaysRemaining(idealNextDate);

  if (daysRemaining < 0) return 'scaduto';
  if (daysRemaining <= 7) return 'in_scadenza';
  return 'ok';
}

export function formatDate(dateValue) {
  const date = new Date(dateValue);
  return date.toLocaleDateString('it-IT');
}