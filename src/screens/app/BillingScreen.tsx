import BusinessPicker from "@/components/app/BusinessPicker";
import Page from "@/components/app/Page";
import { EmptyState, ErrorState, LoadingState } from "@/components/app/States";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/SelectTag";
import { colors, radii, spacing, typography } from "@/constants/theme";
import {
  extendBillingDueDate,
  generateBilling,
  getBillings,
  recordBillingPayment,
} from "@/lib/api/billings";
import { getApiError } from "@/lib/api/errors";
import { useAuthStore } from "@/stores/authStore";
import type { Billing } from "@/types/models";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SymbolView } from "expo-symbols";
import { useState } from "react";
import { Alert, Modal, Pressable, StyleSheet, Text, View } from "react-native";

const formatAmount = (amount: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount);

const formatMonth = (date: string) =>
  new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${date}T00:00:00Z`),
  );

const formatDate = (date: string) =>
  new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(date),
  );

type DueDateAction = { billing: Billing; mode: "generate" | "extend" };
type BusinessBillingView = "receivable" | "payable";

const isValidDateOnly = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

const addDays = (value: string, days: number) => {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const MONTH_OPTIONS = [
  { label: "All months", value: "all" },
  ...Array.from({ length: 12 }, (_, index) => ({
    label: new Intl.DateTimeFormat("en-IN", { month: "long", timeZone: "UTC" }).format(
      new Date(Date.UTC(2026, index, 1)),
    ),
    value: String(index + 1),
  })),
];

const CURRENT_YEAR = Math.max(2026, new Date().getFullYear());
const CURRENT_MONTH = String(new Date().getMonth() + 1);
const YEAR_OPTIONS = Array.from({ length: CURRENT_YEAR + 5 - 2026 + 1 }, (_, index) => ({
  label: String(2026 + index),
  value: String(2026 + index),
}));

export default function BillingScreen() {
  const queryClient = useQueryClient();
  const role = useAuthStore((state) => state.user?.user_role?.slug);
  const activeBusiness = useAuthStore((state) => state.activeBusiness);
  const businessMode = role === "business";
  const [customBilling, setCustomBilling] = useState<Billing | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [dueDateAction, setDueDateAction] = useState<DueDateAction | null>(null);
  const [dueDateValue, setDueDateValue] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(CURRENT_MONTH);
  const [selectedYear, setSelectedYear] = useState(String(CURRENT_YEAR));
  const [businessBillingView, setBusinessBillingView] =
    useState<BusinessBillingView>("receivable");
  const queryKey = [
    "billings",
    businessMode ? activeBusiness?.uuid : "user",
    selectedYear,
    selectedMonth,
  ] as const;
  const billingsQuery = useQuery({
    queryKey,
    queryFn: () =>
      getBillings(businessMode ? activeBusiness?.uuid : undefined, {
        year: Number(selectedYear),
        ...(selectedMonth !== "all" ? { month: Number(selectedMonth) } : {}),
      }),
    enabled: !businessMode || Boolean(activeBusiness?.uuid),
  });
  const paymentMutation = useMutation({
    mutationFn: ({ uuid, amount }: { uuid: string; amount: number }) =>
      recordBillingPayment(uuid, amount),
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["billings"] }),
        queryClient.invalidateQueries({ queryKey: ["transitions"] }),
        queryClient.invalidateQueries({ queryKey: ["transition-summary"] }),
      ]);
      setCustomBilling(null);
      setCustomAmount("");
      Alert.alert("Payment recorded", result.message ?? "Outstanding balance updated.");
    },
    onError: (error) => Alert.alert("Could not record payment", getApiError(error).message),
  });
  const dueDateMutation = useMutation({
    mutationFn: ({ uuid, date, mode }: { uuid: string; date: string; mode: DueDateAction["mode"] }) =>
      mode === "generate" ? generateBilling(uuid, date) : extendBillingDueDate(uuid, date),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["billings"] });
      setDueDateAction(null);
      setDueDateValue("");
      Alert.alert("Billing updated", result.message ?? "The billing due date was updated.");
    },
    onError: (error) => Alert.alert("Could not update billing", getApiError(error).message),
  });

  const bills = billingsQuery.data?.data ?? [];
  const receivableBills = businessMode
    ? bills.filter((billing) => billing.business?.uuid === activeBusiness?.uuid)
    : bills;
  const payableBills = businessMode
    ? bills.filter((billing) => billing.customer_business?.uuid === activeBusiness?.uuid)
    : [];
  const visibleBills = businessMode
    ? businessBillingView === "receivable"
      ? receivableBills
      : payableBills
    : bills;
  const submitCustomPayment = () => {
    if (!customBilling) return;
    const amount = Number(customAmount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > customBilling.current_outstanding) {
      Alert.alert(
        "Invalid amount",
        `Enter an amount between ₹0.01 and ${formatAmount(customBilling.current_outstanding)}.`,
      );
      return;
    }
    paymentMutation.mutate({ uuid: customBilling.uuid, amount });
  };

  const receiveFullPayment = (billing: Billing) => {
    Alert.alert(
      "Receive full payment?",
      `Record ${formatAmount(billing.current_outstanding)} as received?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Record payment",
          onPress: () =>
            paymentMutation.mutate({
              uuid: billing.uuid,
              amount: billing.current_outstanding,
            }),
        },
      ],
    );
  };

  const openDueDate = (billing: Billing, mode: DueDateAction["mode"]) => {
    setDueDateAction({ billing, mode });
    setDueDateValue(
      mode === "generate"
        ? billing.due_date
        : (billing.extend_due_date ?? addDays(billing.due_date, 7)),
    );
  };

  const submitDueDate = () => {
    if (!dueDateAction || !isValidDateOnly(dueDateValue)) {
      Alert.alert("Invalid date", "Enter a valid date in YYYY-MM-DD format.");
      return;
    }
    const { billing, mode } = dueDateAction;
    if (mode === "generate" && dueDateValue < billing.end_date_of_month) {
      Alert.alert("Invalid due date", "The due date cannot be before the end of the billing month.");
      return;
    }
    if (mode === "extend" && dueDateValue <= billing.due_date) {
      Alert.alert("Invalid extension", "The extended due date must be later than the original due date.");
      return;
    }
    dueDateMutation.mutate({ uuid: billing.uuid, date: dueDateValue, mode });
  };

  return (
    <Page
      eyebrow="CONFIGURATION"
      title="Monthly billing"
      subtitle="Track monthly statements, partial payments, and outstanding balances."
      backTitle="Configuration"
      headerAction={businessMode ? <BusinessPicker /> : undefined}
      refreshing={billingsQuery.isRefetching}
      onRefresh={() => void billingsQuery.refetch()}
    >
      <View style={styles.filters}>
        <View style={styles.filterField}>
          <Select
            label="Month"
            size="sm"
            options={MONTH_OPTIONS}
            value={selectedMonth}
            onChange={setSelectedMonth}
          />
        </View>
        <View style={styles.filterField}>
          <Select
            label="Year"
            size="sm"
            options={YEAR_OPTIONS}
            value={selectedYear}
            onChange={setSelectedYear}
          />
        </View>
      </View>

      {businessMode && activeBusiness ? (
        <View style={styles.billingTabs} accessibilityRole="tablist">
          <BillingTab
            active={businessBillingView === "receivable"}
            count={receivableBills.length}
            label="Bills to receive"
            onPress={() => setBusinessBillingView("receivable")}
          />
          <BillingTab
            active={businessBillingView === "payable"}
            count={payableBills.length}
            label="Bills to pay"
            onPress={() => setBusinessBillingView("payable")}
          />
        </View>
      ) : null}

      {businessMode && !activeBusiness ? (
        <EmptyState title="Select a business" message="Choose a business to view its billing." />
      ) : billingsQuery.isPending ? (
        <LoadingState label="Loading monthly bills…" />
      ) : billingsQuery.isError ? (
        <ErrorState message={getApiError(billingsQuery.error).message} retry={() => void billingsQuery.refetch()} />
      ) : visibleBills.length === 0 ? (
        <EmptyState
          title="No bills for this period"
          message={
            businessMode && businessBillingView === "payable"
              ? "No other business has created a bill for this business in the selected period."
              : "Try another month or year. A bill is created when the first transition is added."
          }
        />
      ) : (
        <View style={styles.list}>
          {visibleBills.map((billing) => {
            const activeBusinessIsCreditor = activeBusiness?.uuid === billing.business?.uuid;
            const canManage = businessMode && activeBusinessIsCreditor;
            const canReceive = canManage && billing.current_outstanding > 0;
            const customerName = billing.customer
              ? `${billing.customer.first_name} ${billing.customer.last_name ?? ""}`.trim()
              : "Customer";
            const counterpartyName = billing.customer_business
              ? activeBusinessIsCreditor
                ? billing.customer_business.name
                : (billing.business?.name ?? "Business")
              : customerName;
            return (
              <View key={billing.uuid} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.iconBox}>
                    <SymbolView
                      name={{ ios: "calendar", android: "calendar_month", web: "calendar_month" }}
                      size={20}
                      tintColor={colors.brand600}
                    />
                  </View>
                  <View style={styles.grow}>
                    <Text style={styles.month}>{formatMonth(billing.start_date_of_month)}</Text>
                    <Text style={styles.party}>
                      {businessMode ? counterpartyName : (billing.business?.name ?? "Business")}
                    </Text>
                  </View>
                  <Text style={[styles.status, styles[`status_${billing.payment_status}`]]}>
                    {billing.payment_status === "partial"
                      ? "Partially paid"
                      : billing.payment_status === "paid"
                        ? "Paid"
                        : "Unpaid"}
                  </Text>
                </View>

                <View style={styles.amountGrid}>
                  <Amount label="Monthly total" value={billing.total_amount} />
                  <Amount
                    label={activeBusinessIsCreditor ? "Received" : "Paid"}
                    value={billing.amount_received}
                  />
                  <Amount label="Outstanding" value={billing.current_outstanding} strong />
                </View>
                {billing.generated_at ? (
                  <Text style={styles.due}>
                    Due {formatDate(billing.extend_due_date ?? billing.due_date)}
                    {billing.extend_due_date ? " (extended)" : ""}
                  </Text>
                ) : null}

                {canManage ? (
                  <View style={styles.billActions}>
                    <Button
                      label={billing.generated_at ? "Edit bill" : "Generate bill"}
                      size="sm"
                      variant="outline"
                      onPress={() => openDueDate(billing, "generate")}
                    />
                    {billing.generated_at ? (
                      <Button
                        label={billing.extend_due_date ? "Edit extension" : "Extend due date"}
                        size="sm"
                        variant="ghost"
                        onPress={() => openDueDate(billing, "extend")}
                      />
                    ) : null}
                  </View>
                ) : null}

                {billing.payments.length > 0 ? (
                  <View style={styles.history}>
                    <Text style={styles.historyTitle}>Recent payments</Text>
                    {billing.payments.slice(0, 3).map((payment) => (
                      <View key={payment.uuid} style={styles.paymentRow}>
                        <View style={styles.grow}>
                          <Text numberOfLines={1} style={styles.paymentName}>{payment.product_name}</Text>
                          <Text style={styles.paymentDate}>{formatDate(payment.created_at)}</Text>
                        </View>
                        <Text style={styles.paymentAmount}>+{formatAmount(payment.amount_received)}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}

                {canReceive ? (
                  <View style={styles.actions}>
                    <Button
                      label="Receive full payment"
                      size="sm"
                      loading={paymentMutation.isPending && paymentMutation.variables?.uuid === billing.uuid}
                      onPress={() => receiveFullPayment(billing)}
                    />
                    <Button
                      label="Custom amount"
                      size="sm"
                      variant="outline"
                      onPress={() => {
                        setCustomBilling(billing);
                        setCustomAmount("");
                      }}
                    />
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      )}

      <Modal
        visible={Boolean(customBilling)}
        transparent
        animationType="fade"
        onRequestClose={() => setCustomBilling(null)}
      >
        <Pressable style={styles.backdrop} onPress={() => setCustomBilling(null)}>
          <Pressable style={styles.modal} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.modalTitle}>Receive custom payment</Text>
            <Text style={styles.modalCopy}>
              Outstanding: {formatAmount(customBilling?.current_outstanding ?? 0)}
            </Text>
            <Input
              label="Amount received"
              value={customAmount}
              keyboardType="decimal-pad"
              placeholder="0.00"
              onChangeText={setCustomAmount}
            />
            <View style={styles.actions}>
              <Button label="Cancel" variant="ghost" onPress={() => setCustomBilling(null)} />
              <Button label="Record payment" loading={paymentMutation.isPending} onPress={submitCustomPayment} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={Boolean(dueDateAction)}
        transparent
        animationType="fade"
        onRequestClose={() => setDueDateAction(null)}
      >
        <Pressable style={styles.backdrop} onPress={() => setDueDateAction(null)}>
          <Pressable style={styles.modal} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.modalTitle}>
              {dueDateAction?.mode === "generate"
                ? dueDateAction.billing.generated_at
                  ? "Edit monthly bill"
                  : "Generate monthly bill"
                : "Extend due date"}
            </Text>
            <Text style={styles.modalCopy}>
              {dueDateAction?.mode === "generate"
                ? "Choose the payment due date for this monthly statement. Generating again updates the date."
                : `Original due date: ${dueDateAction ? formatDate(dueDateAction.billing.due_date) : ""}`}
            </Text>
            <Input
              label={dueDateAction?.mode === "generate" ? "Due date" : "Extended due date"}
              value={dueDateValue}
              placeholder="YYYY-MM-DD"
              autoCapitalize="none"
              onChangeText={setDueDateValue}
            />
            <View style={styles.actions}>
              <Button label="Cancel" variant="ghost" onPress={() => setDueDateAction(null)} />
              <Button
                label={
                  dueDateAction?.mode === "generate"
                    ? dueDateAction.billing.generated_at
                      ? "Save bill"
                      : "Generate bill"
                    : "Save extension"
                }
                loading={dueDateMutation.isPending}
                onPress={submitDueDate}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Page>
  );
}

function Amount({ label, value, strong = false }: { label: string; value: number; strong?: boolean }) {
  return (
    <View style={styles.amountCell}>
      <Text style={styles.amountLabel}>{label}</Text>
      <Text style={[styles.amountValue, strong && styles.amountStrong]}>{formatAmount(value)}</Text>
    </View>
  );
}

function BillingTab({
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
      style={[styles.billingTab, active && styles.billingTabActive]}
    >
      <Text style={[styles.billingTabText, active && styles.billingTabTextActive]}>{label}</Text>
      <View style={[styles.billingTabCount, active && styles.billingTabCountActive]}>
        <Text style={[styles.billingTabCountText, active && styles.billingTabCountTextActive]}>
          {count}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  filters: { backgroundColor: colors.white, borderColor: colors.line, borderRadius: radii.lg, borderWidth: 1, flexDirection: "row", gap: spacing.sm, padding: spacing.md },
  filterField: { flex: 1 },
  billingTabs: { backgroundColor: colors.white, borderColor: colors.line, borderRadius: radii.lg, borderWidth: 1, flexDirection: "row", gap: spacing.xs, padding: spacing.xs },
  billingTab: { alignItems: "center", borderRadius: radii.md, flex: 1, flexDirection: "row", gap: spacing.xs, justifyContent: "center", paddingHorizontal: spacing.sm, paddingVertical: spacing.sm },
  billingTabActive: { backgroundColor: colors.brand600 },
  billingTabText: { color: colors.slate700, fontFamily: typography.fontFamilyBold, fontSize: 11 },
  billingTabTextActive: { color: colors.white },
  billingTabCount: { alignItems: "center", backgroundColor: colors.surface, borderRadius: radii.full, justifyContent: "center", minWidth: 20, paddingHorizontal: 6, paddingVertical: 2 },
  billingTabCountActive: { backgroundColor: colors.white },
  billingTabCountText: { color: colors.slate700, fontFamily: typography.fontFamilyExtraBold, fontSize: 9 },
  billingTabCountTextActive: { color: colors.brand700 },
  list: { gap: spacing.md },
  card: { backgroundColor: colors.white, borderColor: colors.line, borderRadius: radii.lg, borderWidth: 1, padding: spacing.lg },
  cardHeader: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  iconBox: { alignItems: "center", backgroundColor: colors.brand50, borderRadius: radii.md, height: 44, justifyContent: "center", width: 44 },
  grow: { flex: 1 },
  month: { color: colors.ink, fontFamily: typography.fontFamilyExtraBold, fontSize: 15 },
  party: { color: colors.slate500, fontFamily: typography.fontFamilyRegular, fontSize: 11, marginTop: 2 },
  status: { borderRadius: radii.full, fontFamily: typography.fontFamilyBold, fontSize: 9, overflow: "hidden", paddingHorizontal: 9, paddingVertical: 5 },
  status_paid: { backgroundColor: "#ecfdf3", color: "#047857" },
  status_partial: { backgroundColor: "#fff7ed", color: "#c2410c" },
  status_unpaid: { backgroundColor: colors.surface, color: colors.slate500 },
  amountGrid: { borderColor: colors.line, borderTopWidth: 1, flexDirection: "row", marginTop: spacing.lg, paddingTop: spacing.md },
  amountCell: { flex: 1 },
  amountLabel: { color: colors.slate500, fontFamily: typography.fontFamilyRegular, fontSize: 9 },
  amountValue: { color: colors.slate700, fontFamily: typography.fontFamilyBold, fontSize: 12, marginTop: 3 },
  amountStrong: { color: colors.ink, fontFamily: typography.fontFamilyExtraBold },
  due: { color: colors.slate500, fontFamily: typography.fontFamilyMedium, fontSize: 10, marginTop: spacing.md },
  billActions: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginTop: spacing.sm },
  history: { backgroundColor: colors.surface, borderRadius: radii.md, gap: spacing.sm, marginTop: spacing.md, padding: spacing.md },
  historyTitle: { color: colors.slate700, fontFamily: typography.fontFamilyBold, fontSize: 10 },
  paymentRow: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  paymentName: { color: colors.slate700, fontFamily: typography.fontFamilySemiBold, fontSize: 10 },
  paymentDate: { color: colors.slate400, fontFamily: typography.fontFamilyRegular, fontSize: 9 },
  paymentAmount: { color: "#047857", fontFamily: typography.fontFamilyBold, fontSize: 10 },
  actions: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, justifyContent: "flex-end", marginTop: spacing.lg },
  backdrop: { alignItems: "center", backgroundColor: "rgba(15, 23, 42, 0.45)", flex: 1, justifyContent: "center", padding: spacing.xl },
  modal: { backgroundColor: colors.white, borderRadius: radii.lg, maxWidth: 440, padding: spacing.xl, width: "100%" },
  modalTitle: { color: colors.ink, fontFamily: typography.fontFamilyExtraBold, fontSize: 18 },
  modalCopy: { color: colors.slate500, fontFamily: typography.fontFamilyRegular, fontSize: 12, marginBottom: spacing.lg, marginTop: spacing.xs },
});
