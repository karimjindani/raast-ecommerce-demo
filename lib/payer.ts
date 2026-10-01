export type PayerType = 'raast-id' | 'iban';
export type Payer = { payerType: PayerType; payerValue: string };

function remainder(value: string) {
  return [...value].reduce((n, c) => {
    const digits = /[A-Z]/.test(c) ? String(c.charCodeAt(0) - 55) : c;
    return [...digits].reduce((r, d) => (r * 10 + Number(d)) % 97, n);
  }, 0);
}
export function demoIban(account = '0000000000000001') {
  const bban = 'DEMO' + account;
  return 'PK' + String(98 - remainder(bban + 'PK00')).padStart(2, '0') + bban;
}
export const demoPayers = { 'raast-id': '03000000000', iban: demoIban() };

export function normalizePayer(type: unknown, value: unknown): Payer {
  if (type !== 'raast-id' && type !== 'iban') throw new Error('Choose RAAST ID or IBAN.');
  if (typeof value !== 'string' || value.length > 100) throw new Error('Enter a valid payer identifier.');
  const normalized = type === 'iban' ? value.replace(/\s/g, '').toUpperCase() : value.trim();
  if (type === 'raast-id' && !/^03\d{9}$/.test(normalized)) throw new Error('Enter an 11-digit RAAST ID starting with 03.');
  if (type === 'iban') {
    if (!/^PK\d{2}[A-Z]{4}[A-Z0-9]{16}$/.test(normalized)) throw new Error('Enter a 24-character Pakistan IBAN: PK, two check digits, four bank letters, and 16 account characters.');
    if (remainder(normalized.slice(4) + normalized.slice(0, 4)) !== 1) throw new Error('The IBAN checksum is invalid. Check the entered IBAN.');
  }
  return { payerType: type, payerValue: normalized };
}
export function maskedReference(iban: string) { return `Simulated account •••• ${iban.slice(-4)}`; }
