import assert from 'node:assert/strict';
import test from 'node:test';

import {
  FOUND_IT_PLUS_ENTITLEMENT_ID,
  hasActivePlus,
  purchaseMonthlyPackage,
  resolveMonthlyOffering,
  restorePlusEntitlement,
  type CustomerInfoLike,
} from '@/lib/revenuecat-core';

const freeCustomer: CustomerInfoLike = {
  entitlements: { active: {} },
};
const plusCustomer: CustomerInfoLike = {
  entitlements: {
    active: {
      [FOUND_IT_PLUS_ENTITLEMENT_ID]: {
        identifier: FOUND_IT_PLUS_ENTITLEMENT_ID,
      },
    },
  },
};
const monthlyPackage = {
  identifier: '$rc_monthly',
  product: { priceString: '$4.99' },
};

test('a customer without the plus entitlement remains free', () => {
  assert.equal(hasActivePlus(freeCustomer), false);
});

test('the centralized foundit_plus entitlement unlocks Plus', () => {
  assert.equal(hasActivePlus(plusCustomer), true);
});

test('a missing current offering is unavailable', () => {
  assert.deepEqual(resolveMonthlyOffering({ current: null }), {
    currentOfferingLoaded: false,
    monthlyPackage: null,
    reason: 'missing-current-offering',
  });
});

test('only the current default monthly package is accepted', () => {
  assert.deepEqual(
    resolveMonthlyOffering({
      current: { identifier: 'default', monthly: monthlyPackage },
    }),
    {
      currentOfferingLoaded: true,
      monthlyPackage,
      reason: null,
    },
  );
  assert.equal(
    resolveMonthlyOffering({
      current: { identifier: 'seasonal', monthly: monthlyPackage },
    }).monthlyPackage,
    null,
  );
});

test('a cancelled purchase does not grant Plus', async () => {
  const outcome = await purchaseMonthlyPackage(async () => {
    throw { code: '1', userCancelled: true };
  });

  assert.deepEqual(outcome, { status: 'cancelled' });
});

test('a failed purchase does not grant Plus', async () => {
  const outcome = await purchaseMonthlyPackage(async () => {
    throw new Error('store unavailable');
  });

  assert.deepEqual(outcome, { status: 'failed' });
});

test('a purchase is successful only when returned CustomerInfo has Plus', async () => {
  assert.deepEqual(
    await purchaseMonthlyPackage(async () => ({ customerInfo: freeCustomer })),
    { status: 'failed' },
  );

  const outcome = await purchaseMonthlyPackage(async () => ({
    customerInfo: plusCustomer,
  }));
  assert.equal(outcome.status, 'successful');
});

test('restore reports an active Plus entitlement', async () => {
  const outcome = await restorePlusEntitlement(async () => plusCustomer);

  assert.equal(outcome.status, 'restored');
  if (outcome.status === 'restored') {
    assert.equal(hasActivePlus(outcome.customerInfo), true);
  }
});

test('restore without an entitlement keeps the customer free', async () => {
  const outcome = await restorePlusEntitlement(async () => freeCustomer);

  assert.equal(outcome.status, 'not-found');
});
