export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function padPage(pageNumber: number): string {
  if (!Number.isInteger(pageNumber) || pageNumber < 0) {
    throw new Error(`Invalid page number: ${pageNumber}`);
  }
  return String(pageNumber).padStart(3, "0");
}

export function bookPrefix(bookNumber = 1): string {
  return `book${String(bookNumber).padStart(2, "0")}`;
}

export function seekPageBaseName(pageNumber: number, location: string, bookNumber = 1): string {
  return `${bookPrefix(bookNumber)}-page${padPage(pageNumber)}-${slugify(location)}`;
}

export function datedSessionLogName(date = new Date()): string {
  return `${date.toISOString().slice(0, 10)}-session.md`;
}
