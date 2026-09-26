import Page from "@/components/app/Page";
import { EmptyState, ErrorState, LoadingState } from "@/components/app/States";
import { colors, radii, spacing, typography } from "@/constants/theme";
import { getBusinesses } from "@/lib/api/businesses";
import {
  getBusinessConnections,
  getConnectedUsers,
  getDirectUserConnections,
} from "@/lib/api/connections";
import { getApiError } from "@/lib/api/errors";
import { getTransitions, getTransitionSummary } from "@/lib/api/transitions";
import { useAuthStore } from "@/stores/authStore";
import type { ApiSuccess } from "@/types/api";
import type {
  Business,
  BusinessConnection,
  Transition,
  TransitionBalanceSummary,
} from "@/types/models";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { useRouter, type Href } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function DashboardScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const activeBusiness = useAuthStore((state) => state.activeBusiness);
  const businessMode = user?.user_role?.slug === "business";
  const businessesQuery = useQuery({
    queryKey: ["businesses"],
    queryFn: getBusinesses,
    enabled: businessMode,
  });
  const connectionsQuery = useQuery({
    queryKey: [
      "business-connections",
      businessMode ? activeBusiness?.uuid : "user",
    ],
    queryFn: () =>
      getBusinessConnections(businessMode ? activeBusiness?.uuid : undefined),
    enabled: !businessMode || Boolean(activeBusiness?.uuid),
  });
  const usersQuery = useQuery({
    queryKey: ["connected-users", activeBusiness?.uuid],
    queryFn: () => getConnectedUsers(activeBusiness?.uuid ?? ""),
    enabled: businessMode && Boolean(activeBusiness?.uuid),
  });
  const directUsersQuery = useQuery({
    queryKey: ["direct-user-connections"],
    queryFn: getDirectUserConnections,
    enabled: !businessMode,
  });
  const transitionsQuery = useQuery({
    queryKey: [
      "transition-summary",
      businessMode ? activeBusiness?.uuid : "user",
    ],
    queryFn: () =>
      getTransitionSummary(businessMode ? activeBusiness?.uuid : undefined),
    enabled: !businessMode || Boolean(activeBusiness?.uuid),
  });
  const personalSummaryNeedsRepair = Boolean(
    !businessMode &&
    transitionsQuery.data?.data.parties.some(
      (party) =>
        party.party_type === "user" &&
        (!Number.isInteger(Number(party.party_id)) ||
          Number(party.party_id) <= 0 ||
          !party.party_name?.trim()),
    ),
  );
  const directTransitionsQuery = useQuery({
    queryKey: ["transitions", "user", "dashboard-direct-parties"],
    queryFn: () => getTransitions({ view: "unpaid" }),
    enabled: personalSummaryNeedsRepair,
  });
  const openPartyTransitions = (
    partyType: "user" | "business",
    partyId: number,
    partyName: string,
  ) => {
    const rolePath = businessMode ? "(business)" : "(user)";
    router.push({
      pathname: `/(app)/${rolePath}/(tabs)/transitions`,
      params: {
        partyId: String(partyId),
        partyName,
        partyType,
      },
    } as Href);
  };

  const refreshing =
    connectionsQuery.isFetching ||
    transitionsQuery.isFetching ||
    directTransitionsQuery.isRefetching ||
    (!businessMode && directUsersQuery.isFetching) ||
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
      void directUsersQuery.refetch();
      void transitionsQuery.refetch();
      if (personalSummaryNeedsRepair) void directTransitionsQuery.refetch();
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
      refreshing={refreshing}
      onRefresh={refresh}
      showBrand
    >
      {businessMode ? (
        <BusinessDashboard
          activeBusiness={activeBusiness}
          businessesQuery={businessesQuery}
          connectionsQuery={connectionsQuery}
          transitionsQuery={transitionsQuery}
          usersQuery={usersQuery}
          retry={refresh}
          onSelectParty={openPartyTransitions}
        />
      ) : (
        <UserDashboard
          connectionsQuery={connectionsQuery}
          directUsersQuery={directUsersQuery}
          currentUserUuid={user?.uuid}
          directTransitions={directTransitionsQuery.data?.data ?? []}
          transitionsQuery={transitionsQuery}
          retry={refresh}
          onSelectParty={openPartyTransitions}
        />
      )}
    </Page>
  );
}

function UserDashboard({
  connectionsQuery,
  directUsersQuery,
  currentUserUuid,
  directTransitions,
  transitionsQuery,
  retry,
  onSelectParty,
}: {
  connectionsQuery: UseQueryResult<ApiSuccess<BusinessConnection[]>, Error>;
  directUsersQuery: UseQueryResult<ApiSuccess<BusinessConnection[]>, Error>;
  currentUserUuid?: string;
  directTransitions: Transition[];
  transitionsQuery: UseQueryResult<ApiSuccess<TransitionBalanceSummary>, Error>;
  retry: () => void;
  onSelectParty: (
    partyType: "user" | "business",
    partyId: number,
    partyName: string,
  ) => void;
}) {
  if (
    connectionsQuery.isPending ||
    directUsersQuery.isPending ||
    transitionsQuery.isPending
  ) {
    return <LoadingState label="Loading your account…" />;
  }
  if (
    connectionsQuery.isError ||
    directUsersQuery.isError ||
    transitionsQuery.isError
  ) {
    return (
      <ErrorState
        message={
          getApiError(
            connectionsQuery.error ??
              directUsersQuery.error ??
              transitionsQuery.error,
          ).message
        }
        retry={retry}
      />
    );
  }

  const connections = connectionsQuery.data.data as BusinessConnection[];
  const directUsers = directUsersQuery.data.data as BusinessConnection[];
  const summary = transitionsQuery.data.data;
  const payable = summary.payable;
  const receivable = summary.receivable;
  const summaryPartyBalances = summary.parties
    .map((party) => ({
      amount: party.amount,
      id: party.party_id,
      name:
        party.party_name?.trim() ||
        (party.party_type === "user"
          ? getDirectUserName(party.party_id, directUsers, currentUserUuid)
          : getBusinessName(party.party_id, connections)),
      partyType: party.party_type,
      accountType: party.account_type,
    }))
    .sort((left, right) => right.amount - left.amount);
  const summaryCustomers = summaryPartyBalances.filter(
    (party) => party.partyType === "user",
  );
  const repairedCustomers = getDirectUserParties(
    directTransitions,
    directUsers,
    currentUserUuid,
  );
  const customers =
    repairedCustomers.length > 0 &&
    summary.parties.some(
      (party) =>
        party.party_type === "user" &&
        (!Number.isInteger(Number(party.party_id)) ||
          Number(party.party_id) <= 0 ||
          !party.party_name?.trim()),
    )
      ? repairedCustomers
      : summaryCustomers;
  const businesses = summaryPartyBalances.filter(
    (party) => party.partyType === "business",
  );

  return (
    <>
      <View style={styles.heroCard}>
        <View style={styles.heroGlowLarge} />
        <View style={styles.heroGlowSmall} />
        <View style={styles.heroTopRow}>
          <View style={styles.heroAccountIcon}>
            <SymbolView
              name={{
                ios: "person.crop.circle",
                android: "account_circle",
                web: "account_circle",
              }}
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
            Across {connections.length} connected{" "}
            {connections.length === 1 ? "business" : "businesses"}
          </Text>
          <View style={styles.heroPill}>
            <SymbolView
              name={{
                ios: "arrow.down.left",
                android: "south_west",
                web: "south_west",
              }}
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

      <TabbedPartyList
        customers={customers}
        businesses={businesses}
        onSelect={(item) => onSelectParty(item.partyType, item.id, item.name)}
      />
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
  onSelectParty,
}: {
  activeBusiness: Business | null;
  businessesQuery: UseQueryResult<ApiSuccess<Business[]>, Error>;
  connectionsQuery: UseQueryResult<ApiSuccess<BusinessConnection[]>, Error>;
  transitionsQuery: UseQueryResult<ApiSuccess<TransitionBalanceSummary>, Error>;
  usersQuery: UseQueryResult<ApiSuccess<BusinessConnection[]>, Error>;
  retry: () => void;
  onSelectParty: (
    partyType: "user" | "business",
    partyId: number,
    partyName: string,
  ) => void;
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

  const summary = transitionsQuery.data?.data ?? {
    payable: 0,
    receivable: 0,
    parties: [],
  };
  const payable = summary.payable;
  const receivable = summary.receivable;
  const customerBalances = summary.parties
    .filter(
      (party) =>
        party.party_type === "user" && party.account_type === "receivable",
    )
    .map((party) => ({
      amount: party.amount,
      id: party.party_id,
      name:
        party.party_name?.trim() ||
        getCustomerName(party.party_id, usersQuery.data?.data ?? []),
      partyType: "user" as const,
      accountType: "receivable" as const,
    }))
    .sort((left, right) => right.amount - left.amount);
  const businessBalances = summary.parties
    .filter(
      (party) =>
        party.party_type === "business" && party.account_type === "payable",
    )
    .map((party) => ({
      amount: party.amount,
      id: party.party_id,
      name:
        party.party_name?.trim() ||
        getBusinessName(party.party_id, connectionsQuery.data?.data ?? []),
      partyType: "business" as const,
      accountType: "payable" as const,
    }))
    .sort((left, right) => right.amount - left.amount);
  const businessReceivables = summary.parties
    .filter(
      (party) =>
        party.party_type === "business" && party.account_type === "receivable",
    )
    .map((party) => ({
      amount: party.amount,
      id: party.party_id,
      name:
        party.party_name?.trim() ||
        getBusinessName(party.party_id, connectionsQuery.data?.data ?? []),
      partyType: "business" as const,
      accountType: "receivable" as const,
    }))
    .sort((left, right) => right.amount - left.amount);

  return (
    <>
      <View style={styles.businessPanel}>
        <View style={styles.heroGlowLarge} />
        <View style={styles.businessPanelTop}>
          <View style={styles.businessPanelIcon}>
            <SymbolView
              name={{
                ios: "building.2.fill",
                android: "business",
                web: "business",
              }}
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
            name={{
              ios: "location.fill",
              android: "location_on",
              web: "location_on",
            }}
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

          <TabbedPartyList
            customers={customerBalances}
            businesses={[...businessReceivables, ...businessBalances].sort(
              (left, right) => right.amount - left.amount,
            )}
            onSelect={(item) =>
              onSelectParty(item.partyType, item.id, item.name)
            }
          />
        </>
      ) : null}
    </>
  );
}

type OutstandingParty = {
  accountType: "payable" | "receivable";
  amount: number;
  id: number;
  name: string;
  partyType: "user" | "business";
};

function getDirectUserParties(
  transitions: Transition[],
  connections: BusinessConnection[],
  currentUserUuid?: string,
) {
  const grouped = new Map<string, OutstandingParty>();

  transitions.forEach((transition) => {
    if (
      transition.request_status !== "approved" ||
      transition.business_id !== null ||
      transition.customer_business_id !== null ||
      transition.outstanding_amount <= 0
    ) {
      return;
    }

    const currentIsCustomer =
      transition.account_type === transition.balance_type;
    const partyId = currentIsCustomer
      ? transition.business_user_id
      : transition.customer_user_id;
    if (!Number.isInteger(partyId) || partyId <= 0) return;

    const key = `${partyId}:${transition.account_type}`;
    const existing = grouped.get(key);
    grouped.set(key, {
      accountType: transition.account_type,
      amount: (existing?.amount ?? 0) + transition.outstanding_amount,
      id: partyId,
      name: getDirectUserName(partyId, connections, currentUserUuid),
      partyType: "user",
    });
  });

  return [...grouped.values()].sort(
    (left, right) => right.amount - left.amount,
  );
}

function TabbedPartyList({
  customers,
  businesses,
  onSelect,
}: {
  customers: OutstandingParty[];
  businesses: OutstandingParty[];
  onSelect: (item: OutstandingParty) => void;
}) {
  const [activeTab, setActiveTab] = useState<"customers" | "businesses">(
    "customers",
  );
  const items = activeTab === "customers" ? customers : businesses;
  const emptyLabel = activeTab === "customers" ? "customers" : "businesses";

  return (
    <View style={styles.partyPanel}>
      <View accessibilityRole="tablist" style={styles.partyTabs}>
        <PartyTab
          active={activeTab === "customers"}
          count={customers.length}
          label="Customers"
          onPress={() => setActiveTab("customers")}
        />
        <PartyTab
          active={activeTab === "businesses"}
          count={businesses.length}
          label="Businesses"
          onPress={() => setActiveTab("businesses")}
        />
      </View>

      {items.length === 0 ? (
        <View style={styles.partyEmpty}>
          <EmptyState
            title={`No ${emptyLabel} yet`}
            message={`Outstanding ${emptyLabel} will appear here.`}
          />
        </View>
      ) : (
        <View>
          {items.map((item) => (
            <Pressable
              accessibilityRole="button"
              key={`${item.partyType}-${item.id}-${item.accountType}`}
              onPress={() => onSelect(item)}
              style={({ pressed }) => [
                styles.partyRow,
                pressed && styles.recordRowPressed,
              ]}
            >
              <View
                style={[
                  styles.partyAvatar,
                  item.partyType === "business" && styles.businessAvatar,
                ]}
              >
                <Text style={styles.partyInitials}>
                  {getInitials(item.name)}
                </Text>
              </View>
              <View style={styles.grow}>
                <Text numberOfLines={1} style={styles.partyName}>
                  {item.name}
                </Text>
                <Text style={styles.partyType}>
                  {item.partyType === "user"
                    ? "Customer account"
                    : "Business account"}
                </Text>
              </View>
              <View style={styles.partyAmountWrap}>
                <Text
                  style={[
                    styles.partyAmount,
                    item.accountType === "receivable"
                      ? styles.greenText
                      : styles.orangeText,
                  ]}
                >
                  {formatAmount(item.amount)}
                </Text>
                <Text
                  style={[
                    styles.partyDirection,
                    item.accountType === "receivable"
                      ? styles.greenText
                      : styles.orangeText,
                  ]}
                >
                  {item.accountType === "receivable"
                    ? "will receive"
                    : "will pay"}
                </Text>
              </View>
              <SymbolView
                name={{
                  ios: "chevron.right",
                  android: "chevron_right",
                  web: "chevron_right",
                }}
                size={16}
                tintColor={colors.slate400}
              />
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

function PartyTab({
  active,
  count,
  label,
  onPress,
}: {
  active: boolean;
  count: number;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.partyTab,
        active && styles.partyTabActive,
        pressed && styles.partyTabPressed,
      ]}
    >
      <Text
        style={[styles.partyTabLabel, active && styles.partyTabLabelActive]}
      >
        {label}
      </Text>
      <View
        style={[styles.partyTabCount, active && styles.partyTabCountActive]}
      >
        <Text
          style={[
            styles.partyTabCountText,
            active && styles.partyTabCountTextActive,
          ]}
        >
          {count}
        </Text>
      </View>
    </Pressable>
  );
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function getConnectionUserId(connection: BusinessConnection) {
  return connection.role === "business"
    ? connection.connect_user_id
    : connection.created_by;
}

function getCustomerName(id: number, connections: BusinessConnection[]) {
  const connection = connections.find(
    (candidate) => getConnectionUserId(candidate) === id,
  );
  const customer =
    connection?.role === "business"
      ? connection.connected_user
      : connection?.creator;

  return customer
    ? [customer.first_name, customer.last_name].filter(Boolean).join(" ")
    : "Unavailable customer";
}

function getDirectUserName(
  id: number,
  connections: BusinessConnection[],
  currentUserUuid?: string,
) {
  const directConnections = connections.filter(
    (candidate) =>
      candidate.role === "user" &&
      Boolean(candidate.creator || candidate.connected_user),
  );
  const matchedConnection = directConnections.find((candidate) => {
    const currentCreated = candidate.creator?.uuid === currentUserUuid;
    const otherId = currentCreated
      ? candidate.connect_user_id
      : candidate.created_by;
    return otherId === id;
  });
  const connection =
    matchedConnection ??
    (directConnections.length === 1 ? directConnections[0] : undefined);
  if (!connection) return "Connected user";
  const otherUser =
    connection.connected_user?.uuid === currentUserUuid
      ? connection.creator
      : connection.connected_user;
  return otherUser
    ? [otherUser.first_name, otherUser.last_name].filter(Boolean).join(" ")
    : "Connected user";
}

function getBusinessName(id: number, connections: BusinessConnection[]) {
  const connection = connections.find(
    (candidate) =>
      candidate.business_id === id || candidate.source_business_id === id,
  );

  if (connection?.business_id === id) {
    return connection.business?.name ?? "Unavailable business";
  }
  return connection?.source_business?.name ?? "Unavailable business";
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

function formatAmount(value: number) {
  return `₹${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

const styles = StyleSheet.create({
  grow: { flex: 1 },
  partyPanel: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: radii.lg,
    borderWidth: 1,
    elevation: 2,
    overflow: "hidden",
    paddingHorizontal: spacing.lg,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
  },
  partyTabs: {
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.xl,
  },
  partyTab: {
    alignItems: "center",
    borderBottomColor: "transparent",
    borderBottomWidth: 3,
    flexDirection: "row",
    gap: 6,
    marginBottom: -1,
    minHeight: 52,
    paddingHorizontal: 2,
  },
  partyTabActive: { borderBottomColor: colors.brand600 },
  partyTabPressed: { opacity: 0.65 },
  partyTabLabel: {
    color: colors.slate500,
    fontFamily: typography.fontFamilySemiBold,
    fontSize: 13,
  },
  partyTabLabelActive: {
    color: colors.brand600,
    fontFamily: typography.fontFamilyExtraBold,
  },
  partyTabCount: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.full,
    justifyContent: "center",
    minWidth: 20,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  partyTabCountActive: { backgroundColor: colors.brand50 },
  partyTabCountText: {
    color: colors.slate500,
    fontFamily: typography.fontFamilyBold,
    fontSize: 8,
  },
  partyTabCountTextActive: { color: colors.brand700 },
  partyRow: {
    alignItems: "center",
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 74,
    paddingVertical: spacing.md,
  },
  partyAvatar: {
    alignItems: "center",
    backgroundColor: "#eef2ff",
    borderRadius: radii.full,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  businessAvatar: { backgroundColor: "#ecfdf5" },
  partyInitials: {
    color: colors.brand700,
    fontFamily: typography.fontFamilyExtraBold,
    fontSize: 12,
  },
  partyName: {
    color: colors.ink,
    fontFamily: typography.fontFamilyBold,
    fontSize: 12,
  },
  partyType: {
    color: colors.slate500,
    fontFamily: typography.fontFamilyRegular,
    fontSize: 9,
    marginTop: 4,
  },
  partyAmountWrap: { alignItems: "flex-end" },
  partyAmount: {
    fontFamily: typography.fontFamilyExtraBold,
    fontSize: 12,
  },
  partyDirection: {
    fontFamily: typography.fontFamilySemiBold,
    fontSize: 8,
    marginTop: 3,
  },
  orangeText: { color: colors.danger600 },
  partyEmpty: { paddingVertical: spacing.md },
  balanceGrid: { flexDirection: "row", gap: spacing.md },
  balanceCard: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: radii.lg,
    borderWidth: 1,
    elevation: 2,
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
  recordRowPressed: { backgroundColor: colors.brand50 },
  businessPanel: {
    backgroundColor: colors.ink,
    borderRadius: radii.lg,
    elevation: 4,
    overflow: "hidden",
    padding: spacing.xl,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
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
    elevation: 5,
    overflow: "hidden",
    padding: spacing.xl,
    shadowColor: colors.brand700,
    shadowOffset: { width: 0, height: 9 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
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
