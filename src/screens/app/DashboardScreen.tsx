import BusinessPicker from "@/components/app/BusinessPicker";
import Page from "@/components/app/Page";
import { EmptyState, ErrorState, LoadingState } from "@/components/app/States";
import { colors, radii, spacing, typography } from "@/constants/theme";
import { getBusinesses } from "@/lib/api/businesses";
import {
  getBusinessConnections,
  getConnectedUsers,
} from "@/lib/api/connections";
import { getApiError } from "@/lib/api/errors";
import { getBusinessTransitions, getTransitions } from "@/lib/api/transitions";
import { useAuthStore } from "@/stores/authStore";
import type { ApiSuccess } from "@/types/api";
import type { Business, BusinessConnection, Transition } from "@/types/models";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { StyleSheet, Text, View } from "react-native";

export default function DashboardScreen() {
  const user = useAuthStore((state) => state.user);
  const activeBusiness = useAuthStore((state) => state.activeBusiness);
  const businessMode = user?.user_role?.slug === "business";
  const businessesQuery = useQuery({
    queryKey: ["businesses"],
    queryFn: getBusinesses,
    enabled: businessMode,
  });
  const connectionsQuery = useQuery({
    queryKey: ["business-connections", businessMode ? activeBusiness?.uuid : "user"],
    queryFn: () =>
      getBusinessConnections(businessMode ? activeBusiness?.uuid : undefined),
    enabled: !businessMode || Boolean(activeBusiness?.uuid),
  });
  const usersQuery = useQuery({
    queryKey: ["connected-users", activeBusiness?.uuid],
    queryFn: () => getConnectedUsers(activeBusiness?.uuid ?? ""),
    enabled: businessMode && Boolean(activeBusiness?.uuid),
  });
  const transitionsQuery = useQuery({
    queryKey: ["transitions", businessMode ? activeBusiness?.uuid : "user"],
    queryFn: () =>
      businessMode
        ? getBusinessTransitions(activeBusiness?.uuid ?? "")
        : getTransitions(),
    enabled: !businessMode || Boolean(activeBusiness?.uuid),
  });

  const refreshing =
    connectionsQuery.isFetching ||
    transitionsQuery.isFetching ||
    (businessMode
      ? businessesQuery.isFetching || usersQuery.isFetching
      : false);
  const refresh = () => {
    void connectionsQuery.refetch();
    if (businessMode) {
      void businessesQuery.refetch();
      if (activeBusiness) {
        void usersQuery.refetch();
        void transitionsQuery.refetch();
      }
    } else {
      void transitionsQuery.refetch();
    }
  };

  return (
    <Page
      eyebrow="OVERVIEW"
      title={`Hello, ${user?.first_name ?? "there"}`}
      subtitle={
        businessMode
          ? "Your Udhari workspace at a glance."
          : "Your balances and latest records at a glance."
      }
      headerAction={businessMode ? <BusinessPicker /> : undefined}
      refreshing={refreshing}
      onRefresh={refresh}
    >
      {businessMode ? (
        <BusinessDashboard
          activeBusiness={activeBusiness}
          businessesQuery={businessesQuery}
          connectionsQuery={connectionsQuery}
          transitionsQuery={transitionsQuery}
          usersQuery={usersQuery}
          retry={refresh}
        />
      ) : (
        <UserDashboard
          connectionsQuery={connectionsQuery}
          transitionsQuery={transitionsQuery}
          retry={refresh}
        />
      )}
    </Page>
  );
}

function UserDashboard({
  connectionsQuery,
  transitionsQuery,
  retry,
}: {
  connectionsQuery: UseQueryResult<ApiSuccess<BusinessConnection[]>, Error>;
  transitionsQuery: UseQueryResult<ApiSuccess<Transition[]>, Error>;
  retry: () => void;
}) {
  if (connectionsQuery.isPending || transitionsQuery.isPending) {
    return <LoadingState label="Loading your account…" />;
  }
  if (connectionsQuery.isError || transitionsQuery.isError) {
    return (
      <ErrorState
        message={
          getApiError(connectionsQuery.error ?? transitionsQuery.error).message
        }
        retry={retry}
      />
    );
  }

  const connections = connectionsQuery.data.data as BusinessConnection[];
  const transitions = transitionsQuery.data.data as Transition[];
  const approvedTransitions = transitions.filter(
    (transition) =>
      transition.request_status === "approved" &&
      transition.payment_status === "unpaid",
  );
  const payable = approvedTransitions.reduce(
    (sum, transition) =>
      transition.account_type === "payable"
        ? sum + Number(transition.total_price)
        : sum,
    0,
  );
  const receivable = approvedTransitions.reduce(
    (sum, transition) =>
      transition.account_type === "receivable"
        ? sum + Number(transition.total_price)
        : sum,
    0,
  );
  const businessBalances = connections.map((connection) => ({
    amount: approvedTransitions
      .filter(
        (transition) =>
          transition.business_id === connection.business_id &&
          transition.account_type === "payable",
      )
      .reduce((sum, transition) => sum + Number(transition.total_price), 0),
    name: connection.business?.name ?? "Connected business",
    uuid: connection.uuid,
  }));

  return (
    <>
      <View style={styles.heroCard}>
        <View style={styles.heroGlowLarge} />
        <View style={styles.heroGlowSmall} />
        <View style={styles.heroTopRow}>
          <View style={styles.heroAccountIcon}>
            <SymbolView
              name={{ ios: "person.crop.circle", android: "account_circle", web: "account_circle" }}
              size={21}
              tintColor={colors.white}
            />
          </View>
          <Text style={styles.heroEyebrow}>PERSONAL ACCOUNT</Text>
        </View>
        <Text style={styles.heroLabel}>Outstanding payable</Text>
        <Text numberOfLines={1} adjustsFontSizeToFit style={styles.heroValue}>
          {formatAmount(payable)}
        </Text>
        <View style={styles.heroFooter}>
          <Text style={styles.heroFooterCopy}>
            Across {connections.length} connected {connections.length === 1 ? "business" : "businesses"}
          </Text>
          <View style={styles.heroPill}>
            <SymbolView
              name={{ ios: "arrow.down.left", android: "south_west", web: "south_west" }}
              size={12}
              tintColor="#86efac"
            />
            <Text style={styles.heroPillText}>{formatAmount(receivable)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.balanceGrid}>
        <BalanceCard
          icon={{
            ios: "arrow.up.right",
            android: "north_east",
            web: "north_east",
          }}
          label="Payable"
          value={formatAmount(payable)}
          tone="orange"
        />
        <BalanceCard
          icon={{
            ios: "arrow.down.left",
            android: "south_west",
            web: "south_west",
          }}
          label="Receivable"
          value={formatAmount(receivable)}
          tone="green"
        />
      </View>

      <View style={styles.recordsSection}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>OUTSTANDING BY BUSINESS</Text>
            <Text style={styles.sectionTitle}>Business amounts remaining</Text>
          </View>
          <View style={styles.sectionCount}>
            <SymbolView
              name={{ ios: "building.2", android: "business", web: "business" }}
              size={13}
              tintColor={colors.brand600}
            />
            <Text style={styles.sectionCountText}>{connections.length}</Text>
          </View>
        </View>
        {businessBalances.length === 0 ? (
          <EmptyState
            title="No connected businesses"
            message="Connect a business to see its remaining amount."
          />
        ) : (
          <View style={styles.recordList}>
            {businessBalances.map((business) => (
              <View style={styles.businessBalanceRow} key={business.uuid}>
                <View style={styles.businessBalanceIcon}>
                  <SymbolView
                    name={{ ios: "building.2.fill", android: "business", web: "business" }}
                    size={17}
                    tintColor={colors.brand600}
                  />
                </View>
                <View style={styles.grow}>
                  <Text numberOfLines={1} style={styles.businessBalanceName}>
                    {business.name}
                  </Text>
                  <Text style={styles.businessBalanceMeta}>
                    {business.amount > 0 ? "Payment outstanding" : "No payment due"}
                  </Text>
                </View>
                <View style={styles.businessBalanceValueWrap}>
                  <Text
                    style={[
                      styles.businessBalanceAmount,
                      business.amount === 0 && styles.settledAmount,
                    ]}
                  >
                    {formatAmount(business.amount)}
                  </Text>
                  <View
                    style={[
                      styles.statusDot,
                      business.amount === 0 ? styles.statusDotGreen : styles.statusDotOrange,
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </>
  );
}

function BusinessDashboard({
  activeBusiness,
  businessesQuery,
  connectionsQuery,
  transitionsQuery,
  usersQuery,
  retry,
}: {
  activeBusiness: Business | null;
  businessesQuery: UseQueryResult<ApiSuccess<Business[]>, Error>;
  connectionsQuery: UseQueryResult<ApiSuccess<BusinessConnection[]>, Error>;
  transitionsQuery: UseQueryResult<ApiSuccess<Transition[]>, Error>;
  usersQuery: UseQueryResult<ApiSuccess<BusinessConnection[]>, Error>;
  retry: () => void;
}) {
  if (
    businessesQuery.isPending ||
    connectionsQuery.isPending ||
    (activeBusiness && (transitionsQuery.isPending || usersQuery.isPending))
  ) {
    return <LoadingState label="Loading your workspace…" />;
  }
  if (
    businessesQuery.isError ||
    connectionsQuery.isError ||
    usersQuery.isError ||
    transitionsQuery.isError
  ) {
    return (
      <ErrorState
        message={
          getApiError(
            businessesQuery.error ??
              connectionsQuery.error ??
              usersQuery.error ??
              transitionsQuery.error,
          ).message
        }
        retry={retry}
      />
    );
  }

  const transitions = transitionsQuery.data?.data ?? [];
  const approvedTransitions = transitions.filter(
    (transition) =>
      transition.request_status === "approved" &&
      transition.payment_status === "unpaid",
  );
  const payable = approvedTransitions.reduce(
    (sum, transition) =>
      transition.account_type === "payable"
        ? sum + Number(transition.total_price)
        : sum,
    0,
  );
  const receivable = approvedTransitions.reduce(
    (sum, transition) =>
      transition.account_type === "receivable"
        ? sum + Number(transition.total_price)
        : sum,
    0,
  );
  const payableBusinessCount = new Set(
    approvedTransitions
      .filter(
        (transition) =>
          transition.customer_business_id !== null &&
          transition.account_type === "payable",
      )
      .map((transition) =>
        transition.account_type === transition.balance_type
          ? transition.business_id
          : transition.customer_business_id,
      ),
  ).size;
  const receivableBusinessCount = new Set(
    approvedTransitions
      .filter(
        (transition) =>
          transition.customer_business_id !== null &&
          transition.account_type === "receivable",
      )
      .map((transition) =>
        transition.account_type === transition.balance_type
          ? transition.business_id
          : transition.customer_business_id,
      ),
  ).size;
  const unpaidCustomerCount = new Set(
    approvedTransitions
      .filter(
        (transition) =>
          transition.customer_business_id === null &&
          transition.account_type === "receivable",
      )
      .map((transition) => transition.customer_user_id),
  ).size;
  const paidCustomerCount = new Set(
    transitions
      .filter(
        (transition) =>
          transition.request_status === "approved" &&
          transition.payment_status === "paid" &&
          transition.customer_business_id === null &&
          transition.account_type === "receivable",
      )
      .map((transition) => transition.customer_user_id),
  ).size;

  return (
    <>
      <View style={styles.businessPanel}>
        <View style={styles.heroGlowLarge} />
        <View style={styles.businessPanelTop}>
          <View style={styles.businessPanelIcon}>
            <SymbolView
              name={{ ios: "building.2.fill", android: "business", web: "business" }}
              size={22}
              tintColor={colors.white}
            />
          </View>
          <View style={styles.grow}>
            <Text style={styles.businessPanelEyebrow}>CURRENT BUSINESS</Text>
            <Text numberOfLines={1} style={styles.businessPanelTitle}>
              {activeBusiness?.name ?? "No business selected"}
            </Text>
          </View>
        </View>
        <View style={styles.businessLocationRow}>
          <SymbolView
            name={{ ios: "location.fill", android: "location_on", web: "location_on" }}
            size={13}
            tintColor={colors.brand200}
          />
          <Text style={styles.businessPanelCopy}>
            {activeBusiness
              ? `${activeBusiness.city}, ${activeBusiness.state}`
              : "Create a business or connect with one to get started."}
          </Text>
        </View>
      </View>

      {activeBusiness ? (
        <>
          <View style={styles.balanceGrid}>
            <BalanceCard
              icon={{
                ios: "arrow.up.right",
                android: "north_east",
                web: "north_east",
              }}
              label="Payable"
              value={formatAmount(payable)}
              tone="orange"
            />
            <BalanceCard
              icon={{
                ios: "arrow.down.left",
                android: "south_west",
                web: "south_west",
              }}
              label="Receivable"
              value={formatAmount(receivable)}
              tone="green"
            />
          </View>

          <View style={styles.relationshipSection}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionEyebrow}>RELATIONSHIPS</Text>
                <Text style={styles.sectionTitle}>Who needs attention</Text>
              </View>
            </View>
            <View style={styles.countGrid}>
              <CountCard
                icon={{ ios: "arrow.up.right", android: "north_east", web: "north_east" }}
                label="Businesses to pay"
                value={payableBusinessCount}
                tone="orange"
              />
              <CountCard
                icon={{ ios: "arrow.down.left", android: "south_west", web: "south_west" }}
                label="Businesses to receive from"
                value={receivableBusinessCount}
                tone="green"
              />
              <CountCard
                icon={{ ios: "clock", android: "schedule", web: "schedule" }}
                label="Customers yet to pay"
                value={unpaidCustomerCount}
                tone="orange"
              />
              <CountCard
                icon={{ ios: "checkmark.circle", android: "check_circle", web: "check_circle" }}
                label="Customers paid"
                value={paidCustomerCount}
                tone="green"
              />
            </View>
          </View>
        </>
      ) : null}
    </>
  );
}

function BalanceCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: SymbolViewProps["name"];
  label: string;
  value: string;
  tone: "orange" | "green";
}) {
  const positive = tone === "green";
  return (
    <View style={styles.balanceCard}>
      <View
        style={[
          styles.balanceIcon,
          positive ? styles.greenBg : styles.orangeBg,
        ]}
      >
        <SymbolView
          name={icon}
          size={19}
          tintColor={positive ? "#059669" : "#ea580c"}
        />
      </View>
      <Text style={styles.balanceLabel}>{label}</Text>
      <Text numberOfLines={1} adjustsFontSizeToFit style={styles.balanceValue}>
        {value}
      </Text>
    </View>
  );
}

function CountCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: SymbolViewProps["name"];
  label: string;
  value: number;
  tone: "orange" | "green" | "blue";
}) {
  const toneStyle =
    tone === "orange"
      ? styles.orangeBg
      : tone === "green"
        ? styles.greenBg
        : styles.blueBg;
  const tintColor =
    tone === "orange" ? "#ea580c" : tone === "green" ? "#059669" : colors.brand600;
  return (
    <View style={styles.countCard}>
      <View style={[styles.icon, toneStyle]}>
        <SymbolView name={icon} size={19} tintColor={tintColor} />
      </View>
      <View style={styles.grow}>
        <Text style={styles.countLabel}>{label}</Text>
        <Text style={styles.countValue}>
          {value} {value === 1 ? "account" : "accounts"}
        </Text>
      </View>
      <SymbolView
        name={{ ios: "chevron.right", android: "chevron_right", web: "chevron_right" }}
        size={16}
        tintColor={colors.slate400}
      />
    </View>
  );
}

function formatAmount(value: number) {
  return `₹${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

const styles = StyleSheet.create({
  grow: { flex: 1 },
  businessBalanceRow: {
    alignItems: "center",
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    minHeight: 72,
    paddingVertical: spacing.md,
  },
  businessBalanceIcon: {
    alignItems: "center",
    backgroundColor: colors.brand50,
    borderRadius: radii.md,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  businessBalanceName: {
    color: colors.ink,
    flex: 1,
    fontFamily: typography.fontFamilySemiBold,
    fontSize: 12,
  },
  businessBalanceMeta: {
    color: colors.slate500,
    fontFamily: typography.fontFamilyRegular,
    fontSize: 9,
    marginTop: 3,
  },
  businessBalanceValueWrap: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  businessBalanceAmount: {
    color: "#ea580c",
    fontFamily: typography.fontFamilyExtraBold,
    fontSize: 13,
  },
  settledAmount: { color: "#059669" },
  statusDot: { borderRadius: radii.full, height: 7, width: 7 },
  statusDotGreen: { backgroundColor: "#10b981" },
  statusDotOrange: { backgroundColor: "#f97316" },
  balanceGrid: { flexDirection: "row", gap: spacing.md },
  balanceCard: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: radii.lg,
    borderWidth: 1,
    flex: 1,
    minWidth: 0,
    padding: spacing.lg,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
  },
  balanceIcon: {
    alignItems: "center",
    borderRadius: radii.md,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  orangeBg: { backgroundColor: "#fff7ed" },
  greenBg: { backgroundColor: "#ecfdf5" },
  blueBg: { backgroundColor: colors.brand50 },
  orangeText: { color: "#ea580c" },
  greenText: { color: "#059669" },
  balanceLabel: {
    color: colors.slate500,
    fontFamily: typography.fontFamilyMedium,
    fontSize: 10,
    marginTop: spacing.md,
  },
  balanceValue: {
    color: colors.ink,
    fontFamily: typography.fontFamilyExtraBold,
    fontSize: 20,
    letterSpacing: -0.6,
    marginTop: spacing.xs,
  },
  relationshipSection: { gap: spacing.md },
  countGrid: { gap: spacing.sm },
  countCard: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 68,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  countLabel: {
    color: colors.slate500,
    fontFamily: typography.fontFamilyMedium,
    fontSize: 10,
    lineHeight: 14,
  },
  countValue: {
    color: colors.ink,
    fontFamily: typography.fontFamilyExtraBold,
    fontSize: 14,
    marginTop: 2,
  },
  recordsSection: { gap: spacing.md },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sectionEyebrow: {
    color: colors.brand600,
    fontFamily: typography.fontFamilyExtraBold,
    fontSize: 9,
    letterSpacing: 1.1,
  },
  sectionTitle: {
    color: colors.ink,
    fontFamily: typography.fontFamilyExtraBold,
    fontSize: 18,
    marginTop: 3,
  },
  sectionCount: {
    alignItems: "center",
    backgroundColor: colors.brand50,
    borderRadius: radii.full,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  sectionCountText: {
    color: colors.brand700,
    fontFamily: typography.fontFamilyExtraBold,
    fontSize: 10,
  },
  recordCount: {
    backgroundColor: colors.brand50,
    borderRadius: radii.full,
    color: colors.brand700,
    fontFamily: typography.fontFamilyBold,
    fontSize: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  recordList: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: radii.lg,
    borderWidth: 1,
    overflow: "hidden",
    paddingHorizontal: spacing.lg,
  },
  recordRow: {
    alignItems: "center",
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 72,
    paddingVertical: spacing.md,
  },
  recordIcon: {
    alignItems: "center",
    borderRadius: radii.md,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  recordTitle: {
    color: colors.ink,
    fontFamily: typography.fontFamilyBold,
    fontSize: 12,
  },
  recordMeta: {
    color: colors.slate500,
    fontFamily: typography.fontFamilyRegular,
    fontSize: 9,
    marginTop: 4,
  },
  recordAmountWrap: { alignItems: "flex-end" },
  recordAmount: { fontFamily: typography.fontFamilyExtraBold, fontSize: 12 },
  recordType: {
    color: colors.slate400,
    fontFamily: typography.fontFamilyBold,
    fontSize: 7,
    marginTop: 4,
  },
  icon: {
    alignItems: "center",
    borderRadius: radii.md,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  businessPanel: {
    backgroundColor: colors.ink,
    borderRadius: radii.lg,
    overflow: "hidden",
    padding: spacing.xl,
  },
  businessPanelTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  businessPanelIcon: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderColor: "rgba(255,255,255,0.16)",
    borderRadius: radii.md,
    borderWidth: 1,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  businessPanelEyebrow: {
    color: colors.brand200,
    fontFamily: typography.fontFamilyBold,
    fontSize: 9,
    letterSpacing: 1.1,
  },
  businessPanelTitle: {
    color: colors.white,
    fontFamily: typography.fontFamilyExtraBold,
    fontSize: 20,
    marginTop: 3,
  },
  businessLocationRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  businessPanelCopy: {
    color: colors.slate400,
    fontFamily: typography.fontFamilyRegular,
    fontSize: 12,
  },
  heroCard: {
    backgroundColor: colors.brand700,
    borderRadius: 22,
    overflow: "hidden",
    padding: spacing.xl,
  },
  heroGlowLarge: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: radii.full,
    height: 150,
    position: "absolute",
    right: -55,
    top: -65,
    width: 150,
  },
  heroGlowSmall: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: radii.full,
    bottom: -32,
    height: 90,
    position: "absolute",
    right: 58,
    width: 90,
  },
  heroTopRow: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  heroAccountIcon: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: radii.full,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  heroEyebrow: {
    color: colors.brand200,
    fontFamily: typography.fontFamilyExtraBold,
    fontSize: 9,
    letterSpacing: 1.1,
  },
  heroLabel: {
    color: colors.brand100,
    fontFamily: typography.fontFamilyMedium,
    fontSize: 11,
    marginTop: spacing.xl,
  },
  heroValue: {
    color: colors.white,
    fontFamily: typography.fontFamilyExtraBold,
    fontSize: 32,
    letterSpacing: -1.2,
    marginTop: spacing.xs,
  },
  heroFooter: {
    alignItems: "center",
    borderTopColor: "rgba(255,255,255,0.12)",
    borderTopWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    marginTop: spacing.lg,
    paddingTop: spacing.md,
  },
  heroFooterCopy: {
    color: colors.brand100,
    flex: 1,
    fontFamily: typography.fontFamilyMedium,
    fontSize: 10,
  },
  heroPill: {
    alignItems: "center",
    backgroundColor: "rgba(5,150,105,0.28)",
    borderRadius: radii.full,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  heroPillText: {
    color: "#d1fae5",
    fontFamily: typography.fontFamilyBold,
    fontSize: 9,
  },
});
