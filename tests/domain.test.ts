import {test} from 'node:test';
import assert from 'node:assert/strict';
import {amountPaisa,schedule,applyEvent,windowExpired} from '../lib/domain';
test('money parsed exactly and bounded',()=>{assert.equal(amountPaisa('1'),100);assert.equal(amountPaisa('10.09'),1009);assert.equal(amountPaisa('100.00'),10000);for(const value of ['0','100.01','-1','1e1','1.001','NaN',10])assert.throws(()=>amountPaisa(value));});
test('four scenarios have absolute deadlines',()=>{assert.equal(schedule('success',1000).dueAt,11000);assert.equal(schedule('failure',1000).outcome,'FAILED');assert.equal(schedule('no-confirmation',1000).dueAt,null);assert.equal(schedule('late-success',1000).dueAt,131000);});
test('expiry is not payment failure; terminal outcomes cannot be overwritten',()=>{assert.equal(windowExpired(120000,120000),true);assert.equal(applyEvent('PENDING','SUCCEEDED'),'SUCCEEDED');assert.equal(applyEvent('SUCCEEDED','FAILED'),'SUCCEEDED');assert.equal(applyEvent('FAILED','SUCCEEDED'),'FAILED');});
