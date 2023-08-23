function dateAt4PM(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 16);
}

export { dateAt4PM };
