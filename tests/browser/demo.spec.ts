import {test,expect,request} from '@playwright/test';
import pg from 'pg';
const db=new pg.Pool({connectionString:process.env.DATABASE_URL});
test.afterAll(async()=>db.end());
test.beforeEach(async()=>{await db.query('TRUNCATE payment_events,idempotency,rate_limits,payments');});
test('desktop checkout, QR success, and no external traffic',async({page})=>{
 const external:string[]=[];page.on('request',r=>{if(!r.url().startsWith('http://localhost:3100')&&!r.url().startsWith('data:'))external.push(r.url())});
 await page.goto('/');await expect(page.getByRole('button',{name:'Generate demo QR'})).toBeEnabled();
 await page.screenshot({path:'test-results/checkout-desktop.png',fullPage:true});
 await page.getByRole('button',{name:'Generate demo QR'}).click();await expect(page).toHaveURL(/payments\//);
 await expect(page.getByAltText('Synthetic demo QR — not a payment instruction')).toBeVisible();
 await expect(page.getByText('DEMO QR · NOT PAYABLE')).toBeVisible();
 await expect(page.getByRole('heading',{name:'Payment complete'})).toBeVisible({timeout:18000});
 expect(external).toEqual([]);
});
test('RTP title confirmation and failure',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Request to Pay'}).click();await page.selectOption('#scenario','failure');
 await page.getByRole('button',{name:'Fetch demo account title'}).click();await expect(page.getByText('CONFIRM YOUR DEMO PAYER')).toBeVisible();
 await page.getByRole('button',{name:'Confirm & request payment'}).click();await expect(page.getByRole('heading',{name:'Waiting for demo approval'})).toBeVisible();
 await expect(page.getByRole('heading',{name:'Payment unsuccessful'})).toBeVisible({timeout:18000});
});
test('QR expiry, reload persistence and late success',async({page})=>{
 await page.goto('/');await page.selectOption('#scenario','late-success');await page.getByRole('button',{name:'Generate demo QR'}).click();await expect(page).toHaveURL(/payments\//);
 const id=page.url().split('/').pop();
 await db.query("UPDATE payments SET expires_at=now()-interval '1 second',due_at=now()+interval '1 hour' WHERE id=$1",[id]);
 await page.reload();await expect(page.getByText('Payment window expired—confirmation pending')).toBeVisible();await expect(page.getByAltText('Synthetic demo QR — not a payment instruction')).toHaveCount(0);
 await db.query("UPDATE payments SET due_at=now()-interval '1 second' WHERE id=$1",[id]);
 await page.getByRole('button',{name:'Refresh status'}).click();await expect(page.getByRole('heading',{name:'Payment complete'})).toBeVisible();
});
test('mobile no-confirmation view',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');await page.screenshot({path:'test-results/checkout-mobile.png',fullPage:true});await page.selectOption('#scenario','no-confirmation');await page.getByRole('button',{name:'Generate demo QR'}).click();await expect(page).toHaveURL(/payments\//);await expect(page.getByAltText('Synthetic demo QR — not a payment instruction')).toBeVisible();
 const id=page.url().split('/').pop();expect((await db.query('SELECT due_at,status FROM payments WHERE id=$1',[id])).rows[0]).toMatchObject({due_at:null,status:'PENDING'});
 await page.screenshot({path:'test-results/qr-mobile.png',fullPage:true});
});
test('API isolation, idempotency, origin checks, limits and live callback guard',async()=>{
 const a=await request.newContext({baseURL:'http://localhost:3100'}),b=await request.newContext({baseURL:'http://localhost:3100'});await a.get('/api/session');await b.get('/api/session');
 const headers={Origin:'http://localhost:3100','Idempotency-Key':crypto.randomUUID()};const data={amountPkr:'10.00',scenario:'success'};
 const r=await a.post('/api/payments/qr',{headers,data});expect(r.status()).toBe(201);const payment=await r.json();
 expect((await (await a.post('/api/payments/qr',{headers,data})).json()).paymentId).toBe(payment.paymentId);
 expect((await a.post('/api/payments/qr',{headers,data:{...data,amountPkr:'11'}})).status()).toBe(409);
 expect((await b.get('/api/payments/'+payment.paymentId)).status()).toBe(404);
 expect((await a.post('/api/payments/qr',{headers:{...headers,Origin:'https://evil.invalid'},data})).status()).toBe(403);
 expect((await a.post('/api/payments/qr',{headers:{...headers,'Idempotency-Key':crypto.randomUUID()},data:{...data,amountPkr:'100.01'}})).status()).toBe(400);
 for(let i=0;i<4;i++)expect((await a.post('/api/payments/qr',{headers:{...headers,'Idempotency-Key':crypto.randomUUID()},data})).status()).toBe(201);
 expect((await a.post('/api/payments/qr',{headers:{...headers,'Idempotency-Key':crypto.randomUUID()},data})).status()).toBe(429);
 expect((await a.post('/api/webhooks/tapsys/payment-notification',{data:{}})).status()).toBe(503);
 expect(JSON.stringify(await (await a.get('/api/payments/'+payment.paymentId)).json())).not.toMatch(/SESSION_SECRET|DATABASE_URL|simulated_rtp_id|context_id|token/);
 await a.dispose();await b.dispose();
});
test('RTP context concurrent claim and foreign ownership',async()=>{
 const a=await request.newContext({baseURL:'http://localhost:3100'}),b=await request.newContext({baseURL:'http://localhost:3100'});await a.get('/api/session');await b.get('/api/session');
 const headers=()=>({Origin:'http://localhost:3100','Idempotency-Key':crypto.randomUUID()});
 const context=await(await a.post('/api/payments/title-fetch',{headers:headers(),data:{amountPkr:'5',scenario:'success',payerId:'demo-01'}})).json();
 expect((await b.post('/api/payments/rtp',{headers:headers(),data:{contextId:context.contextId}})).status()).toBe(404);
 const responses=await Promise.all([a.post('/api/payments/rtp',{headers:headers(),data:{contextId:context.contextId}}),a.post('/api/payments/rtp',{headers:headers(),data:{contextId:context.contextId}})]);
 expect(responses.map(r=>r.status()).sort()).toEqual([201,409]);await a.dispose();await b.dispose();
});
