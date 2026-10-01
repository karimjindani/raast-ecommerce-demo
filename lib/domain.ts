export const scenarios = ['success', 'failure', 'no-confirmation', 'late-success'] as const;
export type Scenario = typeof scenarios[number];
export const fixtures = [
  { id: 'demo-01', title: 'Ayesha Demo', bank: 'Demo Bank One', reference: 'DEMO •••• 1001' },
  { id: 'demo-02', title: 'Bilal Example', bank: 'Demo Bank Two', reference: 'DEMO •••• 1002' }
] as const;
export function amountPaisa(value: unknown): number {
  if (typeof value !== 'string' || !/^\d{1,3}(\.\d{1,2})?$/.test(value)) throw new Error('Enter a PKR amount with up to two decimal places.');
  const [whole, fraction = ''] = value.split('.');
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (amount < 100 || amount > 10000) throw new Error('Enter an amount between PKR 1 and PKR 100.');
  return amount;
}
export function schedule(scenario: Scenario, now: number) {
  return { dueAt: scenario === 'no-confirmation' ? null : now + (scenario === 'late-success' ? 130000 : 10000),
    outcome: scenario === 'failure' ? 'FAILED' : 'SUCCEEDED' };
}
export function applyEvent(status: string, outcome: string): string {
  // Same processor for normalized events; no unverified external events enter it.
  return ['SUCCEEDED', 'FAILED', 'ABANDONED'].includes(status) ? status : outcome;
}
export function windowExpired(expiresAt: number | null, now: number) { return expiresAt !== null && now >= expiresAt; }
