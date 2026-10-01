import { randomUUID, createHash } from 'node:crypto';
import { demoIban, maskedReference, type Payer } from './payer';

// Entirely local simulation: no provider transport or real account lookup.
export async function aliasToIban(alias: string) {
  const digits = [...createHash('sha256').update(alias).digest()].map(n => n % 10).join('').slice(0, 16);
  return demoIban(digits);
}
export async function preRtpTitleFetch(iban: string): Promise<{accountTitle: string; payerReference: string; rtpId: string}> {
  return { accountTitle: 'Simulated Demo Payer', payerReference: maskedReference(iban), rtpId: randomUUID() };
}
export async function lookupPayer(payer: Payer, provider = { aliasToIban, preRtpTitleFetch }) {
  const iban = payer.payerType === 'raast-id' ? await provider.aliasToIban(payer.payerValue) : payer.payerValue;
  const result = await provider.preRtpTitleFetch(iban);
  if (!result.rtpId || !result.accountTitle) throw new Error('Incomplete simulated title response');
  return result;
}
export async function initiateRtp(rtpId: string) {
  if (!/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(rtpId)) throw new Error('Missing simulated RTP identifier');
  return { accepted: true };
}
