import {test,expect,request} from '@playwright/test';
import pg from 'pg';
import {demoPayers} from '../../lib/payer';
const base=process.env.TEST_BASE_URL||'http://localhost:3100';
const db=new pg.Pool({connectionString:process.env.DATABASE_URL});
test.beforeEach(async()=>{await db.query('TRUNCATE payment_events,idempotency,rate_limits,payments');});
test.afterAll(async()=>db.end());
const headers=()=>({Origin:base,'Idempotency-Key':crypto.randomUUID()});

for(const payerType of ['raast-id','iban'] as const) for(const scenario of ['success','failure','no-confirmation','late-success']) {
 test(`${payerType}: ${scenario}, private context and persisted outcome`,async()=>{
  const client=await request.newContext({baseURL:base});await client.get('/api/session');
  const data={amountPkr:'10',scenario,payerType,payerValue:demoPayers[payerType]};
  const h=headers();const response=await client.post('/api/payments/title-fetch',{headers:h,data});expect(response.status()).toBe(201);
  const context=await response.json();expect(context.accountTitle).toBe('Simulated Demo Payer');
  expect(JSON.stringify(context)).not.toContain(data.payerValue);expect(context.rtpId).toBeUndefined();
  const row=(await db.query('SELECT * FROM payments WHERE id=$1',[context.paymentId])).rows[0];
  expect(row.simulated_rtp_id).toBeTruthy();expect(row.payer_type).toBe(payerType);expect(row.payer_id).toBeNull();
  const stored=await db.query('SELECT row_to_json(p) AS value FROM payments p WHERE id=$1',[context.paymentId]);
  expect(JSON.stringify(stored.rows)).not.toContain(data.payerValue);
  expect(JSON.stringify((await db.query('SELECT * FROM idempotency')).rows)).not.toContain(data.payerValue);
  const retryData=payerType==='iban'?{...data,payerValue:data.payerValue.toLowerCase().match(/.{1,4}/g)!.join(' ')}:data;
  expect((await(await client.post('/api/payments/title-fetch',{headers:h,data:retryData})).json()).contextId).toBe(context.contextId);
  expect((await client.post('/api/payments/title-fetch',{headers:h,data:{...data,amountPkr:'11'}})).status()).toBe(409);
  const start=await client.post('/api/payments/rtp',{headers:headers(),data:{contextId:context.contextId}});expect(start.status()).toBe(201);
  expect((await db.query('SELECT simulated_rtp_id FROM payments WHERE id=$1',[context.paymentId])).rows[0].simulated_rtp_id).toBe(row.simulated_rtp_id);
  if(scenario==='no-confirmation'||scenario==='late-success'){
   await db.query("UPDATE payments SET started_at=now()-interval '121 seconds' WHERE id=$1",[context.paymentId]);
   const waiting=await(await client.get('/api/payments/'+context.paymentId)).json();expect(waiting.status).toBe('PENDING');expect(waiting.expiresAt).toBeNull();
  }
  if(scenario!=='no-confirmation')await db.query("UPDATE payments SET due_at=now()-interval '1 second' WHERE id=$1",[context.paymentId]);
  const result=await(await client.get('/api/payments/'+context.paymentId)).json();
  expect(result.status).toBe(scenario==='no-confirmation'?'PENDING':scenario==='failure'?'FAILED':'SUCCEEDED');
  await client.dispose();
 });
}
test('invalid input, expired context and missing RTP ID cannot initiate',async()=>{
 const client=await request.newContext({baseURL:base});await client.get('/api/session');
 for(const [payerType,payerValue] of [['raast-id','+923000000000'],['iban','PK00DEMO0000000000000001']])expect((await client.post('/api/payments/title-fetch',{headers:headers(),data:{amountPkr:'5',scenario:'success',payerType,payerValue}})).status()).toBe(400);
 for(const fault of ['expired','missing-id']){
  const context=await(await client.post('/api/payments/title-fetch',{headers:headers(),data:{amountPkr:'5',scenario:'success',payerType:'raast-id',payerValue:demoPayers['raast-id']}})).json();
  await db.query(fault==='expired'?"UPDATE payments SET context_expires_at=now()-interval '1 second' WHERE id=$1":"UPDATE payments SET simulated_rtp_id=NULL WHERE id=$1",[context.paymentId]);
  expect((await client.post('/api/payments/rtp',{headers:headers(),data:{contextId:context.contextId}})).status()).toBe(fault==='expired'?409:503);
  expect((await db.query('SELECT status FROM payments WHERE id=$1',[context.paymentId])).rows[0].status).toBe('AWAITING_CONFIRMATION');
 }
 await client.dispose();
});
test('responsive input validation, both entry paths and confirmation reset',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');await page.getByRole('button',{name:'Request to Pay'}).click();
 await page.getByRole('button',{name:'Fetch account title'}).click();await expect(page.locator('#payer-error')).toBeVisible();
 await page.getByRole('button',{name:'Use demo example'}).click();await page.getByRole('button',{name:'Fetch account title'}).click();await expect(page.getByText('CONFIRM YOUR DEMO PAYER')).toBeVisible();
 await page.locator('#amount').fill('12');await expect(page.getByText('CONFIRM YOUR DEMO PAYER')).toHaveCount(0);
 await page.getByRole('button',{name:'Fetch account title'}).click();await expect(page.getByText('CONFIRM YOUR DEMO PAYER')).toBeVisible();
 await page.selectOption('#scenario','failure');await expect(page.getByText('CONFIRM YOUR DEMO PAYER')).toHaveCount(0);
 await page.getByRole('button',{name:'Fetch account title'}).click();await expect(page.getByText('CONFIRM YOUR DEMO PAYER')).toBeVisible();
 await page.locator('#payer-value').fill('03000000001');await expect(page.getByText('CONFIRM YOUR DEMO PAYER')).toHaveCount(0);
 await page.getByRole('button',{name:'Fetch account title'}).click();await expect(page.getByText('CONFIRM YOUR DEMO PAYER')).toBeVisible();
 await page.getByRole('button',{name:'IBAN',exact:true}).click();await expect(page.getByText('CONFIRM YOUR DEMO PAYER')).toHaveCount(0);
 await page.getByRole('button',{name:'Use demo example'}).click();await page.getByRole('button',{name:'Fetch account title'}).click();await expect(page.getByText('CONFIRM YOUR DEMO PAYER')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:'test-results/rtp-iban-mobile.png',fullPage:true});
 await page.setViewportSize({width:1440,height:1100});await page.screenshot({path:'test-results/rtp-iban-desktop.png',fullPage:true});
 await page.getByRole('button',{name:'Confirm & request payment'}).click();await expect(page).toHaveURL(/payments\//);
});
