import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePayer, demoIban, demoPayers } from '../lib/payer';
import { lookupPayer, initiateRtp } from '../lib/mock-provider';

test('RAAST ID validation preserves zero and rejects other phone formats', () => {
  assert.equal(normalizePayer('raast-id', '03000000000').payerValue, '03000000000');
  for (const value of ['3000000000', '+923000000000', '923000000000', '0300000000', '030000000000', '04000000000', '03a00000000', '03 00000000']) {
    assert.throws(() => normalizePayer('raast-id', value));
  }
});
test('IBAN normalization, structure and checksum', () => {
  const iban = demoIban();
  assert.equal(normalizePayer('iban', iban.toLowerCase().match(/.{1,4}/g)!.join(' ')).payerValue, iban);
  for (const value of [iban.slice(1), iban+'0', 'GB'+iban.slice(2), 'PK00'+iban.slice(4), iban.slice(0,-1)+'2', 'PK12'+ '1234'+'0'.repeat(16)]) assert.throws(() => normalizePayer('iban', value));
});
test('alias resolution precedes title fetch and the returned RTP ID is retained', async () => {
  const calls: string[]=[];
  const expected={accountTitle:'Simulated Payer',payerReference:'masked',rtpId:'returned-id'};
  const result=await lookupPayer(normalizePayer('raast-id', demoPayers['raast-id']), {
    aliasToIban:async value=>{calls.push('alias:'+value);return demoIban();},
    preRtpTitleFetch:async value=>{calls.push('title:'+value);return expected;}
  });
  assert.deepEqual(calls,['alias:'+demoPayers['raast-id'],'title:'+demoIban()]);assert.deepEqual(result,expected);
});
test('direct IBAN skips alias resolution; lookup failures and missing RTP ID fail closed', async () => {
  const payer=normalizePayer('iban',demoIban());
  const provider={aliasToIban:async()=>{throw new Error('Alias must not run');},preRtpTitleFetch:async()=>({accountTitle:'Demo',payerReference:'masked',rtpId:'id'})};
  assert.equal((await lookupPayer(payer,provider)).rtpId,'id');
  await assert.rejects(lookupPayer(normalizePayer('raast-id',demoPayers['raast-id']),provider),/Alias/);
  await assert.rejects(lookupPayer(payer,{...provider,preRtpTitleFetch:async()=>{throw new Error('Title failed');}}),/Title failed/);
  await assert.rejects(lookupPayer(payer,{...provider,preRtpTitleFetch:async()=>({accountTitle:'Demo',payerReference:'masked',rtpId:''})}),/Incomplete/);
  await assert.rejects(initiateRtp(''),/Missing/);
});
