// Whole years worked from an experience's first day to its last.
export const expYears = (firstDate: Date, lastDate: Date): number => {
  let yearDiff = lastDate.getFullYear() - firstDate.getFullYear();

  if (
    lastDate.getMonth() < firstDate.getMonth() ||
    (lastDate.getMonth() === firstDate.getMonth() &&
      lastDate.getDate() < firstDate.getDate())
  ) {
    yearDiff--;
  }

  return yearDiff;
};
