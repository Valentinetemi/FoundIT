export const FOUND_IT_PLUS_ENTITLEMENT_ID = 'foundit_plus';
export const CURRENT_OFFERING_IDENTIFIER = 'default';

export type CustomerInfoLike = {
  entitlements: {
    active: Record<string, unknown>;
  };
};

export type RevenueCatPackageLike = {
  identifier: string;
  product: {
    priceString: string;
  };
};

export type RevenueCatOfferingLike<
  PackageType extends RevenueCatPackageLike = RevenueCatPackageLike,
> = {
  identifier: string;
  monthly: PackageType | null;
};

export type RevenueCatOfferingsLike<
  PackageType extends RevenueCatPackageLike = RevenueCatPackageLike,
> = {
  current: RevenueCatOfferingLike<PackageType> | null;
};

export type MonthlyOfferingResult<
  PackageType extends RevenueCatPackageLike = RevenueCatPackageLike,
> =
  | {
      currentOfferingLoaded: false;
      monthlyPackage: null;
      reason: 'missing-current-offering';
    }
  | {
      currentOfferingLoaded: true;
      monthlyPackage: null;
      reason: 'missing-monthly-package' | 'unexpected-current-offering';
    }
  | {
      currentOfferingLoaded: true;
      monthlyPackage: PackageType;
      reason: null;
    };

export type PurchaseOutcome =
  | { customerInfo: CustomerInfoLike; status: 'successful' }
  | { status: 'cancelled' | 'failed' };

export type RestoreOutcome =
  | { customerInfo: CustomerInfoLike; status: 'restored' }
  | { customerInfo: CustomerInfoLike; status: 'not-found' }
  | { status: 'failed' };

export function hasActivePlus(customerInfo: CustomerInfoLike): boolean {
  return Boolean(
    customerInfo.entitlements.active[FOUND_IT_PLUS_ENTITLEMENT_ID],
  );
}

export function resolveMonthlyOffering<
  PackageType extends RevenueCatPackageLike,
>(
  offerings: RevenueCatOfferingsLike<PackageType>,
): MonthlyOfferingResult<PackageType> {
  const currentOffering = offerings.current;

  if (!currentOffering) {
    return {
      currentOfferingLoaded: false,
      monthlyPackage: null,
      reason: 'missing-current-offering',
    };
  }

  if (currentOffering.identifier !== CURRENT_OFFERING_IDENTIFIER) {
    return {
      currentOfferingLoaded: true,
      monthlyPackage: null,
      reason: 'unexpected-current-offering',
    };
  }

  if (!currentOffering.monthly) {
    return {
      currentOfferingLoaded: true,
      monthlyPackage: null,
      reason: 'missing-monthly-package',
    };
  }

  return {
    currentOfferingLoaded: true,
    monthlyPackage: currentOffering.monthly,
    reason: null,
  };
}

export function isPurchaseCancellation(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const purchaseError = error as { code?: unknown; userCancelled?: unknown };
  return purchaseError.userCancelled === true || purchaseError.code === '1';
}

export async function purchaseMonthlyPackage(
  purchase: () => Promise<{ customerInfo: CustomerInfoLike }>,
): Promise<PurchaseOutcome> {
  try {
    const { customerInfo } = await purchase();

    if (!hasActivePlus(customerInfo)) {
      return { status: 'failed' };
    }

    return { customerInfo, status: 'successful' };
  } catch (error) {
    return {
      status: isPurchaseCancellation(error) ? 'cancelled' : 'failed',
    };
  }
}

export async function restorePlusEntitlement(
  restore: () => Promise<CustomerInfoLike>,
): Promise<RestoreOutcome> {
  try {
    const customerInfo = await restore();

    return hasActivePlus(customerInfo)
      ? { customerInfo, status: 'restored' }
      : { customerInfo, status: 'not-found' };
  } catch {
    return { status: 'failed' };
  }
}
