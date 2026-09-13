import BusinessPicker from "@/components/app/BusinessPicker";
import Page from "@/components/app/Page";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/app/States";
import { colors, radii, spacing, typography } from "@/constants/theme";
import { getBusinesses } from "@/lib/api/businesses";
import {
  getBusinessConnections,
  getConnectedUsers,
} from "@/lib/api/connections";
import { getApiError } from "@/lib/api/errors";
import {
  getBusinessTransitions,
  getTransitions,
} from "@/lib/api/transitions";
import { useAuthStore } from "@/stores/authStore";
import type { ApiSuccess } from "@/types/api";
import type {
  Business,
  BusinessConnection,
  Transition,
} from "@/types/models";
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
    queryKey: ["business-connections"],
    queryFn: getBusinessConnections,
  });
  const usersQuery = useQuery({
    queryKey: ["connected-users", activeBusiness?.uuid],
    queryFn: () => getConnectedUsers(activeBusiness?.uuid ?? ""),
    enabled: businessMode && Boolean(activeBusiness?.uuid),
  });
  const transitionsQuery = useQuery({
    queryKey: [
      "transitions",
      businessMode ? activeBusiness?.uuid : "user",
    ],
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
  const payable = transitions
    .filter((transition) => transition.created_by !== transition.user_id)
    .reduce((sum, transition) => sum + Number(transition.total_price), 0);
  const receivable = transitions
    .filter((transition) => transition.created_by === transition.user_id)
    .reduce((sum, transition) => sum + Number(transition.total_price), 0);
  const recentRecords = [...transitions]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    .slice(0, 10);

  return (
    <>
      <View style={styles.balanceGrid}>
        <BalanceCard
          icon={{ ios: "arrow.up.right", android: "north_east", web: "north_east" }}
          label="Payable"
          value={formatAmount(payable)}
          tone="orange"
        />
        <BalanceCard
          icon={{ ios: "arrow.down.left", android: "south_west", web: "south_west" }}
          label="Receivable"
          value={formatAmount(receivable)}
          tone="green"
        />
      </View>

      <View style={styles.connectionCard}>
        <View style={styles.connectionIcon}>
          <SymbolView
            name={{ ios: "building.2", android: "business", web: "business" }}
            size={21}
            tintColor={colors.brand600}
          />
        </View>
        <View style={styles.grow}>
          <Text style={styles.connectionLabel}>Connected businesses</Text>
          <Text style={styles.connectionCopy}>
            Active businesses linked with your account
          </Text>
        </View>
        <Text style={styles.connectionValue}>{connections.length}</Text>
      </View>

      <View style={styles.recordsSection}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>RECENT ACTIVITY</Text>
            <Text style={styles.sectionTitle}>Top 10 records</Text>
          </View>
          <Text style={styles.recordCount}>{recentRecords.length}</Text>
        </View>
        {recentRecords.length === 0 ? (
          <EmptyState
            title="No records yet"
            message="Your latest ledger records will appear here."
          />
        ) : (
          <View style={styles.recordList}>
            {recentRecords.map((record) => (
              <RecordRow
                key={record.uuid}
                name={
                  connections.find(
                    (connection) =>
                      connection.business_id === record.business_id,
                  )?.business?.name ?? "Connected business"
                }
                perspective="user"
                record={record}
              />
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

  const customers = usersQuery.data?.data ?? [];
  const transitions = transitionsQuery.data?.data ?? [];
  const payable = transitions
    .filter((transition) => transition.created_by === transition.user_id)
    .reduce((sum, transition) => sum + Number(transition.total_price), 0);
  const receivable = transitions
    .filter((transition) => transition.created_by !== transition.user_id)
    .reduce((sum, transition) => sum + Number(transition.total_price), 0);
  const recentRecords = [...transitions]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    .slice(0, 10);

  return (
    <>
      <View style={styles.businessPanel}>
        <Text style={styles.businessPanelEyebrow}>CURRENT BUSINESS</Text>
        <Text style={styles.businessPanelTitle}>
          {activeBusiness?.name ?? "No business selected"}
        </Text>
        <Text style={styles.businessPanelCopy}>
          {activeBusiness
            ? `${activeBusiness.city}, ${activeBusiness.state}`
            : "Create a business or connect with one to get started."}
        </Text>
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

          <View style={styles.countGrid}>
            <CountCard
              icon={{ ios: "person.2", android: "group", web: "group" }}
              label="Connected customers"
              value={customers.length}
            />
            <CountCard
              icon={{ ios: "link", android: "link", web: "link" }}
              label="Connected businesses"
              value={connectionsQuery.data.data.length}
            />
          </View>

          <View style={styles.recordsSection}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionEyebrow}>RECENT ACTIVITY</Text>
                <Text style={styles.sectionTitle}>Top 10 transitions</Text>
              </View>
              <Text style={styles.recordCount}>{recentRecords.length}</Text>
            </View>
            {recentRecords.length === 0 ? (
              <EmptyState
                title="No transitions yet"
                message="The latest customer transitions will appear here."
              />
            ) : (
              <View style={styles.recordList}>
                {recentRecords.map((record) => {
                  const connection = customers.find(
                    (customer) =>
                      getCustomerId(customer) === record.user_id,
                  );
                  return (
                    <RecordRow
                      key={record.uuid}
                      name={getCustomerName(connection)}
                      perspective="business"
                      record={record}
                    />
                  );
                })}
              </View>
            )}
          </View>
        </>
      ) : null}
    </>
  );
}

function BalanceCard({ icon, label, value, tone }: { icon: SymbolViewProps["name"]; label: string; value: string; tone: "orange" | "green" }) {
  const positive = tone === "green";
  return (
    <View style={styles.balanceCard}>
      <View style={[styles.balanceIcon, positive ? styles.greenBg : styles.orangeBg]}>
        <SymbolView name={icon} size={19} tintColor={positive ? "#059669" : "#ea580c"} />
      </View>
      <Text style={styles.balanceLabel}>{label}</Text>
      <Text numberOfLines={1} adjustsFontSizeToFit style={styles.balanceValue}>{value}</Text>
    </View>
  );
}

function CountCard({
  icon,
  label,
  value,
}: {
  icon: SymbolViewProps["name"];
  label: string;
  value: number;
}) {
  return (
    <View style={styles.countCard}>
      <View style={styles.icon}>
        <SymbolView name={icon} size={19} tintColor={colors.brand600} />
      </View>
      <View style={styles.grow}>
        <Text style={styles.countLabel}>{label}</Text>
        <Text style={styles.countValue}>{value}</Text>
      </View>
    </View>
  );
}

function RecordRow({
  record,
  name,
  perspective,
}: {
  record: Transition;
  name: string;
  perspective: "user" | "business";
}) {
  const createdByUser = record.created_by === record.user_id;
  const receivable =
    perspective === "user" ? createdByUser : !createdByUser;
  return (
    <View style={styles.recordRow}>
      <View style={[styles.recordIcon, receivable ? styles.greenBg : styles.orangeBg]}>
        <SymbolView
          name={receivable
            ? { ios: "arrow.down.left", android: "south_west", web: "south_west" }
            : { ios: "arrow.up.right", android: "north_east", web: "north_east" }}
          size={17}
          tintColor={receivable ? "#059669" : "#ea580c"}
        />
      </View>
      <View style={styles.grow}>
        <Text numberOfLines={1} style={styles.recordTitle}>{record.product_name}</Text>
        <Text numberOfLines={1} style={styles.recordMeta}>
          {name} · {formatDate(record.created_at)}
        </Text>
      </View>
      <View style={styles.recordAmountWrap}>
        <Text style={[styles.recordAmount, receivable ? styles.greenText : styles.orangeText]}>
          {receivable ? "+" : "−"}{formatAmount(record.total_price)}
        </Text>
        <Text style={styles.recordType}>{receivable ? "RECEIVABLE" : "PAYABLE"}</Text>
      </View>
    </View>
  );
}

function getCustomerId(connection: BusinessConnection) {
  return connection.role === "business"
    ? connection.connect_user_id
    : connection.created_by;
}

function getCustomerName(connection?: BusinessConnection) {
  const customer =
    connection?.role === "business"
      ? connection.connected_user
      : connection?.creator;
  return customer
    ? [customer.first_name, customer.last_name].filter(Boolean).join(" ")
    : "Connected customer";
}

function formatAmount(value: number) {
  return `₹${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(new Date(value));
}

const styles = StyleSheet.create({
  grow: { flex: 1 },
  balanceGrid: { flexDirection: "row", gap: spacing.md },
  balanceCard: { backgroundColor: colors.white, borderColor: colors.line, borderRadius: radii.lg, borderWidth: 1, flex: 1, minWidth: 0, padding: spacing.lg },
  balanceIcon: { alignItems: "center", borderRadius: radii.md, height: 38, justifyContent: "center", width: 38 },
  orangeBg: { backgroundColor: "#fff7ed" },
  greenBg: { backgroundColor: "#ecfdf5" },
  orangeText: { color: "#ea580c" },
  greenText: { color: "#059669" },
  balanceLabel: { color: colors.slate500, fontFamily: typography.fontFamilyMedium, fontSize: 10, marginTop: spacing.md },
  balanceValue: { color: colors.ink, fontFamily: typography.fontFamilyExtraBold, fontSize: 20, letterSpacing: -0.6, marginTop: spacing.xs },
  countGrid: { flexDirection: "row", gap: spacing.md },
  countCard: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: radii.lg,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minWidth: 0,
    padding: spacing.md,
  },
  countLabel: {
    color: colors.slate500,
    fontFamily: typography.fontFamilyMedium,
    fontSize: 9,
    lineHeight: 13,
  },
  countValue: {
    color: colors.ink,
    fontFamily: typography.fontFamilyExtraBold,
    fontSize: 20,
    marginTop: 2,
  },
  connectionCard: { alignItems: "center", backgroundColor: colors.ink, borderRadius: radii.lg, flexDirection: "row", gap: spacing.md, padding: spacing.lg },
  connectionIcon: { alignItems: "center", backgroundColor: colors.white, borderRadius: radii.md, height: 44, justifyContent: "center", width: 44 },
  connectionLabel: { color: colors.white, fontFamily: typography.fontFamilyBold, fontSize: 13 },
  connectionCopy: { color: colors.slate400, fontFamily: typography.fontFamilyRegular, fontSize: 9, marginTop: 3 },
  connectionValue: { color: colors.white, fontFamily: typography.fontFamilyExtraBold, fontSize: 25 },
  recordsSection: { gap: spacing.md },
  sectionHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  sectionEyebrow: { color: colors.brand600, fontFamily: typography.fontFamilyExtraBold, fontSize: 9, letterSpacing: 1.1 },
  sectionTitle: { color: colors.ink, fontFamily: typography.fontFamilyExtraBold, fontSize: 18, marginTop: 3 },
  recordCount: { backgroundColor: colors.brand50, borderRadius: radii.full, color: colors.brand700, fontFamily: typography.fontFamilyBold, fontSize: 10, paddingHorizontal: 10, paddingVertical: 6 },
  recordList: { backgroundColor: colors.white, borderColor: colors.line, borderRadius: radii.lg, borderWidth: 1, overflow: "hidden", paddingHorizontal: spacing.lg },
  recordRow: { alignItems: "center", borderBottomColor: colors.line, borderBottomWidth: 1, flexDirection: "row", gap: spacing.md, minHeight: 72, paddingVertical: spacing.md },
  recordIcon: { alignItems: "center", borderRadius: radii.md, height: 40, justifyContent: "center", width: 40 },
  recordTitle: { color: colors.ink, fontFamily: typography.fontFamilyBold, fontSize: 12 },
  recordMeta: { color: colors.slate500, fontFamily: typography.fontFamilyRegular, fontSize: 9, marginTop: 4 },
  recordAmountWrap: { alignItems: "flex-end" },
  recordAmount: { fontFamily: typography.fontFamilyExtraBold, fontSize: 12 },
  recordType: { color: colors.slate400, fontFamily: typography.fontFamilyBold, fontSize: 7, marginTop: 4 },
  icon: { alignItems: "center", backgroundColor: colors.brand50, borderRadius: radii.md, height: 44, justifyContent: "center", width: 44 },
  businessPanel: { backgroundColor: colors.ink, borderRadius: radii.lg, padding: spacing.xl },
  businessPanelEyebrow: { color: colors.brand200, fontFamily: typography.fontFamilyBold, fontSize: 9, letterSpacing: 1.1 },
  businessPanelTitle: { color: colors.white, fontFamily: typography.fontFamilyExtraBold, fontSize: 20, marginTop: spacing.sm },
  businessPanelCopy: { color: colors.slate400, fontFamily: typography.fontFamilyRegular, fontSize: 12, marginTop: spacing.sm },
});
