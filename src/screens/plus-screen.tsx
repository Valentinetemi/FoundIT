import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

import { Text } from '@/components/app-text';
import { BackButton } from '@/components/back-button';
import { PrimaryButton } from '@/components/primary-button';
import { ScreenContainer } from '@/components/screen-container';
import { colors, layout, radii, spacing, typography } from '@/constants/theme';
import type { RevenueCatMode } from '@/lib/revenuecat';
import {
  type RevenueCatActionStatus,
  type RevenueCatOfferingStatus,
  useRevenueCat,
} from '@/providers/revenuecat-provider';

type PlanProps = {
  benefits: string[];
  highlighted?: boolean;
  name: string;
  note: string;
};

type NoticeInput = {
  actionStatus: RevenueCatActionStatus;
  isCustomerInfoLoading: boolean;
  isExpoGoPreview: boolean;
  isPlusActive: boolean;
  mode: RevenueCatMode;
  offeringStatus: RevenueCatOfferingStatus;
};

function Plan({ benefits, highlighted = false, name, note }: PlanProps) {
  return (
    <View
      accessibilityLabel={`${name}. ${note}. ${benefits.join('. ')}.`}
      accessible
      style={[styles.plan, highlighted && styles.planHighlighted]}
    >
      <View style={styles.planHeader}>
        <Text style={styles.planName}>{name}</Text>
        <Text style={styles.planNote}>{note}</Text>
      </View>
      {benefits.map((benefit) => (
        <View key={benefit} style={styles.benefitRow}>
          <Text style={styles.benefitMark}>✓</Text>
          <Text style={styles.benefitText}>{benefit}</Text>
        </View>
      ))}
    </View>
  );
}

function getNotice({
  actionStatus,
  isCustomerInfoLoading,
  isExpoGoPreview,
  isPlusActive,
  mode,
  offeringStatus,
}: NoticeInput): {
  detail: string;
  title: string;
  tone: 'attention' | 'ready';
} {
  if (isPlusActive) {
    return {
      detail: 'Unlimited prepared spaces are available on this device.',
      title: 'Plus is active',
      tone: 'ready',
    };
  }

  if (isExpoGoPreview) {
    return {
      detail:
        'Expo Go can show the paywall and live plan details, but it cannot make a genuine Test Store purchase. No Plus access is granted in Preview API Mode.',
      title: 'Expo Go preview',
      tone: 'attention',
    };
  }

  if (mode === 'unconfigured' || mode === 'invalid-preview-key') {
    return {
      detail:
        'Add the RevenueCat Test Store public SDK key to .env, then restart Metro.',
      title: 'RevenueCat is not configured',
      tone: 'attention',
    };
  }

  if (mode === 'error') {
    return {
      detail:
        'RevenueCat could not start. Check the configuration and try again.',
      title: 'Subscriptions are unavailable',
      tone: 'attention',
    };
  }

  if (isCustomerInfoLoading || offeringStatus === 'loading') {
    return {
      detail: 'Checking the current plan and your access…',
      title: 'Loading Plus',
      tone: 'ready',
    };
  }

  if (offeringStatus === 'unavailable' || offeringStatus === 'error') {
    return {
      detail:
        'The current default offering does not have an available monthly package. Nothing has been charged.',
      title: 'Monthly plan unavailable',
      tone: 'attention',
    };
  }

  if (actionStatus === 'cancelled') {
    return {
      detail: 'Nothing was charged and your plan did not change.',
      title: 'Purchase cancelled',
      tone: 'ready',
    };
  }

  if (actionStatus === 'failed') {
    return {
      detail:
        'The purchase could not be completed. Nothing was unlocked; please try again later.',
      title: 'Purchase not completed',
      tone: 'attention',
    };
  }

  if (actionStatus === 'restore-not-found') {
    return {
      detail: 'No active Plus purchase was found for this store account.',
      title: 'Nothing to restore',
      tone: 'ready',
    };
  }

  if (actionStatus === 'successful' || actionStatus === 'restored') {
    return {
      detail:
        'RevenueCat returned the purchase, but Plus access is still being verified.',
      title: 'Verifying Plus',
      tone: 'ready',
    };
  }

  return {
    detail:
      'Free includes one prepared space. Plus lets you prepare every space you want to remember.',
    title: 'Monthly Plus plan',
    tone: 'ready',
  };
}

export function PlusScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isCompact = width < layout.compactBreakpoint;
  const {
    actionStatus,
    currentOfferingIdentifier,
    currentOfferingLoaded,
    isConfigured,
    isCustomerInfoLoading,
    isExpoGoPreview,
    isPlusActive,
    mode,
    monthlyPrice,
    offeringStatus,
    purchasePlus,
    reload,
    restorePurchases,
  } = useRevenueCat();
  const notice = getNotice({
    actionStatus,
    isCustomerInfoLoading,
    isExpoGoPreview,
    isPlusActive,
    mode,
    offeringStatus,
  });
  const isPurchasing = actionStatus === 'purchase-in-progress';
  const isRestoring = actionStatus === 'restore-in-progress';
  const isBusy = isPurchasing || isRestoring;
  const isLoading = isCustomerInfoLoading || offeringStatus === 'loading';
  const canPurchase =
    isConfigured &&
    !isExpoGoPreview &&
    !isPlusActive &&
    Boolean(monthlyPrice) &&
    offeringStatus === 'available' &&
    !isBusy;
  const purchaseLabel = isPlusActive
    ? 'Plus is active'
    : isExpoGoPreview
      ? 'Development build required'
      : isPurchasing
        ? 'Completing purchase…'
        : isLoading
          ? 'Loading monthly plan…'
          : monthlyPrice
            ? `Get Plus · ${monthlyPrice} monthly`
            : 'Monthly plan unavailable';

  return (
    <ScreenContainer>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: isCompact
              ? layout.horizontalPaddingCompact
              : layout.horizontalPadding,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentWidth}>
          <BackButton
            accessibilityLabel="Return home"
            onPress={() => router.back()}
          />

          <View style={styles.header}>
            <Text accessibilityRole="header" heading style={styles.title}>
              FoundIt Plus
            </Text>
            <Text style={styles.subtitle}>
              Room for every space you want to remember.
            </Text>
          </View>

          <Plan
            benefits={[
              'One prepared space',
              'Search memories already prepared',
            ]}
            name="Free"
            note="Included"
          />
          <Plan
            benefits={[
              'Unlimited prepared spaces',
              'Search every prepared memory',
            ]}
            highlighted
            name="Plus"
            note={monthlyPrice ? `${monthlyPrice} monthly` : 'Monthly plan'}
          />

          <View
            accessibilityLiveRegion="polite"
            style={[
              styles.notice,
              notice.tone === 'attention' && styles.noticeAttention,
            ]}
          >
            <View style={styles.noticeHeading}>
              {isLoading ? (
                <ActivityIndicator color={colors.primary} size="small" />
              ) : null}
              <Text style={styles.noticeTitle}>{notice.title}</Text>
            </View>
            <Text style={styles.noticeBody}>{notice.detail}</Text>
          </View>

          <PrimaryButton
            accessibilityHint="Starts the RevenueCat monthly Plus purchase"
            disabled={!canPurchase}
            label={purchaseLabel}
            onPress={() => void purchasePlus()}
          />

          <PrimaryButton
            accessibilityHint="Restores a previous Plus purchase for this store account"
            disabled={!isConfigured || isExpoGoPreview || isBusy}
            label={isRestoring ? 'Restoring purchases…' : 'Restore purchases'}
            onPress={() => void restorePurchases()}
            style={styles.secondaryAction}
            variant="secondary"
          />

          {offeringStatus === 'error' || offeringStatus === 'unavailable' ? (
            <PrimaryButton
              accessibilityHint="Tries loading the current RevenueCat offering again"
              disabled={!isConfigured || isBusy}
              label="Try loading plans again"
              onPress={() => void reload()}
              style={styles.secondaryAction}
              variant="secondary"
            />
          ) : null}

          <Text style={styles.disclaimer}>
            Purchases are handled by RevenueCat. Plus is granted only when the
            returned CustomerInfo contains an active “foundit_plus” entitlement.
          </Text>

          {__DEV__ ? (
            <View
              accessibilityLabel="RevenueCat development diagnostic"
              style={styles.diagnostic}
            >
              <Text style={styles.diagnosticTitle}>Development diagnostic</Text>
              <Text style={styles.diagnosticText}>
                SDK configured: {isConfigured ? 'yes' : 'no'}
              </Text>
              <Text style={styles.diagnosticText}>
                Current offering loaded: {currentOfferingLoaded ? 'yes' : 'no'}
                {currentOfferingIdentifier
                  ? ` (${currentOfferingIdentifier})`
                  : ''}
              </Text>
              <Text style={styles.diagnosticText}>
                Plus active: {isPlusActive ? 'yes' : 'no'}
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  benefitMark: {
    color: colors.primary,
    fontSize: typography.size.body,
    fontWeight: typography.weight.bold,
    lineHeight: typography.lineHeight.body,
    width: 24,
  },
  benefitRow: {
    flexDirection: 'row',
    marginTop: spacing.xs,
  },
  benefitText: {
    color: colors.text,
    flex: 1,
    fontSize: typography.size.body,
    lineHeight: typography.lineHeight.body,
  },
  contentWidth: {
    alignSelf: 'center',
    maxWidth: layout.maxContentWidth,
    width: '100%',
  },
  diagnostic: {
    backgroundColor: colors.softBlue,
    borderRadius: radii.md,
    marginTop: spacing.lg,
    padding: spacing.md,
  },
  diagnosticText: {
    color: colors.textSecondary,
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    marginTop: spacing.xxs,
  },
  diagnosticTitle: {
    color: colors.text,
    fontSize: typography.size.small,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.small,
  },
  disclaimer: {
    color: colors.textSecondary,
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    marginTop: spacing.lg,
  },
  header: {
    marginBottom: spacing.lg,
    marginTop: spacing.xs,
  },
  notice: {
    borderLeftColor: colors.secondaryBlue,
    borderLeftWidth: 2,
    marginBottom: spacing.lg,
    marginTop: spacing.lg,
    paddingLeft: spacing.md,
    paddingVertical: spacing.xxs,
  },
  noticeAttention: {
    borderLeftColor: colors.accent,
  },
  noticeBody: {
    color: colors.textSecondary,
    fontSize: typography.size.small,
    lineHeight: typography.lineHeight.small,
    marginTop: spacing.xxs,
  },
  noticeHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  noticeTitle: {
    color: colors.text,
    fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.body,
  },
  plan: {
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingBottom: spacing.md,
    paddingTop: spacing.md,
  },
  planHeader: {
    alignItems: 'baseline',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  planHighlighted: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
  },
  planName: {
    color: colors.text,
    fontSize: typography.size.lead,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.lead,
    marginRight: spacing.sm,
  },
  planNote: {
    color: colors.textSecondary,
    fontSize: typography.size.small,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.xl,
    paddingTop: spacing.xxs,
  },
  secondaryAction: {
    marginTop: spacing.sm,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.size.body,
    lineHeight: typography.lineHeight.body,
    marginTop: spacing.xs,
    maxWidth: 520,
  },
  title: {
    color: colors.text,
    fontSize: typography.size.heading,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.heading,
  },
});
