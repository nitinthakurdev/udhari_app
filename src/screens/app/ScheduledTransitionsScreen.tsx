import Page from "@/components/app/Page";
import { EmptyState, ErrorState, LoadingState } from "@/components/app/States";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { colors, radii, spacing, typography } from "@/constants/theme";
import { getApiError } from "@/lib/api/errors";
import {
  getMyRecurringConfigs,
  getRecurringConfigs,
  sendRecurringConfig,
} from "@/lib/api/recurring-configs";
import { getBusinessTransitions, getTransitions } from "@/lib/api/transitions";
import { secureStorage } from "@/lib/storage";
import { useAuthStore } from "@/stores/authStore";
import type { RecurringConfig, Transition } from "@/types/models";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SymbolView } from "expo-symbols";
import { useEffect, useState } from "react";
import { Alert, Modal, ScrollView, StyleSheet, Text, View } from "react-native";

interface ScheduledOccurrence {
  config: RecurringConfig;
  occurrenceKey: string;
  startTime: string;
  endTime: string;
}

interface EditForm {
  name: string;
  quantity: string;
  unitPrice: string;
  comment: string;
}

const initialTimestamp = Date.now();

const scheduleParts = (timestamp: number) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(timestamp));
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return {
    date: `${value("year")}-${value("month")}-${value("day")}`,
    weekday: value("weekday").toLowerCase(),
    time: `${value("hour")}:${value("minute")}`,
  };
};

const counterpartyName = (config: RecurringConfig) => {
  if (config.is_creator) {
    return (
      config.customer_business?.name ??
      `${config.customer?.first_name ?? ""} ${config.customer?.last_name ?? ""}`.trim()
    );
  }
  return (
    config.business?.name ??
    `${config.creator?.first_name ?? ""} ${config.creator?.last_name ?? ""}`.trim()
  );
};

const money = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);

export default function ScheduledTransitionsScreen() {
  const queryClient = useQueryClient();
  const role = useAuthStore((state) => state.user?.user_role?.slug);
  const currentUserUuid = useAuthStore((state) => state.user?.uuid);
  const activeBusiness = useAuthStore((state) => state.activeBusiness);
  const businessMode = role === "business";
  const scope = businessMode ? activeBusiness?.uuid : currentUserUuid;
  const [cachedConfigs, setCachedConfigs] = useState<RecurringConfig[]>([]);
  const [timestamp, setTimestamp] = useState(initialTimestamp);
  const [editing, setEditing] = useState<ScheduledOccurrence | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    name: "",
    quantity: "1",
    unitPrice: "",
    comment: "",
  });

  const configsQuery = useQuery({
    queryKey: ["recurring-configs", scope],
    queryFn: () =>
      businessMode
        ? getRecurringConfigs(activeBusiness?.uuid ?? "")
        : getMyRecurringConfigs(),
    enabled: Boolean(scope),
    staleTime: Number.POSITIVE_INFINITY,
  });
  const transitionsQuery = useQuery({
    queryKey: ["scheduled-transition-records", scope],
    queryFn: () =>
      businessMode
        ? getBusinessTransitions(activeBusiness?.uuid ?? "", {
            page: 1,
            limit: 50,
            view: "all",
          })
        : getTransitions({ page: 1, limit: 50, view: "all" }),
    enabled: Boolean(scope),
  });

  useEffect(() => {
    if (!scope) return;
    let mounted = true;
    void Promise.resolve(
      secureStorage.getItem(`scheduled-configs:${scope}`),
    ).then((stored) => {
      if (!mounted || !stored) return;
      try {
        const parsed = JSON.parse(stored) as RecurringConfig[];
        if (Array.isArray(parsed)) setCachedConfigs(parsed);
      } catch {
        // Ignore an invalid cache and use the API response.
      }
    });
    return () => {
      mounted = false;
    };
  }, [scope]);

  useEffect(() => {
    const timer = setInterval(() => setTimestamp(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const configs = configsQuery.data?.data ?? cachedConfigs;
  const transitions: Transition[] = transitionsQuery.data?.data ?? [];
  const current = scheduleParts(timestamp);
  const occurrences: ScheduledOccurrence[] = configs.flatMap((config) => {
    if (
      !config.week_days.includes(
        current.weekday as RecurringConfig["week_days"][number],
      )
    ) {
      return [];
    }
    return config.time_ranges
      .filter(
        (range) =>
          current.time >= range.start_time && current.time < range.end_time,
      )
      .map((range) => ({
        config,
        occurrenceKey: `${current.date}:${range.start_time}`,
        startTime: range.start_time,
        endTime: range.end_time,
      }))
      .filter(
        (occurrence) =>
          !transitions.some(
            (transition) =>
              transition.recurring_config_id === config.id &&
              transition.schedule_occurrence_key === occurrence.occurrenceKey,
          ),
      );
  });

  const actionMutation = useMutation({
    mutationFn: ({
      occurrence,
      action,
      form,
    }: {
      occurrence: ScheduledOccurrence;
      action: "edit" | "approved" | "rejected";
      form?: EditForm;
    }) => {
      const quantity =
        occurrence.config.type === "product"
          ? Number(form?.quantity ?? occurrence.config.quantity)
          : null;
      const unitPrice = Number(form?.unitPrice ?? occurrence.config.unit_price);
      return sendRecurringConfig(occurrence.config.uuid, {
        type: occurrence.config.type,
        name: form?.name.trim() || occurrence.config.name,
        unit_id:
          occurrence.config.type === "product"
            ? occurrence.config.unit_id
            : null,
        quantity,
        unit_price: unitPrice,
        total_price:
          occurrence.config.type === "service"
            ? unitPrice
            : Number(quantity) * unitPrice,
        comment: form?.comment.trim() || null,
        occurrence_key: occurrence.occurrenceKey,
        action,
      });
    },
    onSuccess: async () => {
      setEditing(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["transitions"] }),
        queryClient.invalidateQueries({
          queryKey: ["scheduled-transition-records"],
        }),
        queryClient.invalidateQueries({ queryKey: ["transition-summary"] }),
        queryClient.invalidateQueries({ queryKey: ["billings"] }),
      ]);
    },
    onError: (error) =>
      Alert.alert("Action failed", getApiError(error).message),
  });

  const openEdit = (occurrence: ScheduledOccurrence) => {
    setEditing(occurrence);
    setEditForm({
      name: occurrence.config.name,
      quantity: String(occurrence.config.quantity ?? 1),
      unitPrice: String(occurrence.config.unit_price),
      comment: "",
    });
  };

  const submitEdit = () => {
    if (!editing) return;
    const quantity = Number(editForm.quantity);
    const unitPrice = Number(editForm.unitPrice);
    if (
      editForm.name.trim().length < 2 ||
      !Number.isFinite(unitPrice) ||
      unitPrice < 0 ||
      (editing.config.type === "product" &&
        (!Number.isFinite(quantity) || quantity <= 0))
    ) {
      Alert.alert("Invalid details", "Enter a valid name, quantity and price.");
      return;
    }
    actionMutation.mutate({
      occurrence: editing,
      action: "edit",
      form: editForm,
    });
  };

  return (
    <Page
      backTitle="Transitions"
      eyebrow="SCHEDULED"
      title="Scheduled transitions"
      subtitle="Cards appear only during their configured weekday and time range."
      refreshing={configsQuery.isFetching || transitionsQuery.isFetching}
      onRefresh={() => {
        void configsQuery.refetch();
        void transitionsQuery.refetch();
      }}
    >
      {configsQuery.isPending && cachedConfigs.length === 0 ? (
        <LoadingState label="Loading scheduled transitions…" />
      ) : (configsQuery.isError && cachedConfigs.length === 0) ||
        transitionsQuery.isError ? (
        <ErrorState
          message={
            getApiError(configsQuery.error ?? transitionsQuery.error).message
          }
          retry={() => {
            void configsQuery.refetch();
            void transitionsQuery.refetch();
          }}
        />
      ) : occurrences.length === 0 ? (
        <EmptyState
          title="No transition scheduled now"
          message={
            configs.length === 0
              ? "No related scheduled configuration is available."
              : `Today is ${current.weekday} and the current time is ${current.time}. No configuration matches both this weekday and time.`
          }
        />
      ) : (
        <View style={styles.list}>
          {occurrences.map((occurrence) => (
            <View
              style={styles.card}
              key={occurrence.occurrenceKey + occurrence.config.uuid}
            >
              <View style={styles.header}>
                <View style={styles.icon}>
                  <SymbolView
                    name={{
                      ios: "clock",
                      android: "schedule",
                      web: "schedule",
                    }}
                    size={20}
                    tintColor={colors.brand600}
                  />
                </View>
                <View style={styles.grow}>
                  <Text style={styles.name}>{occurrence.config.name}</Text>
                  <Text style={styles.meta}>
                    {counterpartyName(occurrence.config) || "Connected account"}
                  </Text>
                </View>
                <Text style={styles.amount}>
                  {money(occurrence.config.total_price)}
                </Text>
              </View>
              <View style={styles.details}>
                <Text style={styles.meta}>
                  {occurrence.startTime}–{occurrence.endTime}
                </Text>
                <Text style={styles.badge}>
                  {occurrence.config.is_creator ? "Receivable" : "Payable"}
                </Text>
              </View>
              {occurrence.config.type === "product" ? (
                <Text style={styles.meta}>
                  Qty: {occurrence.config.quantity}{" "}
                  {occurrence.config.unit?.code ?? ""} · Each:{" "}
                  {money(occurrence.config.unit_price)}
                </Text>
              ) : (
                <Text style={styles.meta}>Service</Text>
              )}
              <View style={styles.actions}>
                <Button
                  label="Approve"
                  size="sm"
                  loading={actionMutation.isPending}
                  onPress={() =>
                    actionMutation.mutate({ occurrence, action: "approved" })
                  }
                />
                <Button
                  label="Reject"
                  size="sm"
                  variant="danger"
                  disabled={actionMutation.isPending}
                  onPress={() =>
                    actionMutation.mutate({ occurrence, action: "rejected" })
                  }
                />
                <Button
                  label="Edit"
                  size="sm"
                  variant="outline"
                  disabled={actionMutation.isPending}
                  onPress={() => openEdit(occurrence)}
                />
              </View>
            </View>
          ))}
        </View>
      )}

      <Modal
        visible={Boolean(editing)}
        transparent
        animationType="slide"
        onRequestClose={() => setEditing(null)}
      >
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <ScrollView
              contentContainerStyle={styles.form}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.dialogTitle}>Edit scheduled transition</Text>
              <Input
                label={
                  editing?.config.type === "service" ? "Service" : "Product"
                }
                value={editForm.name}
                onChangeText={(name) =>
                  setEditForm((value) => ({ ...value, name }))
                }
              />
              {editing?.config.type === "product" ? (
                <Input
                  label="Quantity"
                  value={editForm.quantity}
                  keyboardType="decimal-pad"
                  onChangeText={(quantity) =>
                    setEditForm((value) => ({ ...value, quantity }))
                  }
                />
              ) : null}
              <Input
                label="Price"
                value={editForm.unitPrice}
                keyboardType="decimal-pad"
                onChangeText={(unitPrice) =>
                  setEditForm((value) => ({ ...value, unitPrice }))
                }
              />
              <Input
                label="Comment"
                value={editForm.comment}
                onChangeText={(comment) =>
                  setEditForm((value) => ({ ...value, comment }))
                }
              />
              <View style={styles.actions}>
                <Button
                  label="Cancel"
                  variant="ghost"
                  onPress={() => setEditing(null)}
                />
                <Button
                  label="Send for approval"
                  loading={actionMutation.isPending}
                  onPress={submitEdit}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Page>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md },
  card: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  header: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  icon: {
    alignItems: "center",
    backgroundColor: colors.brand50,
    borderRadius: radii.md,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  grow: { flex: 1 },
  name: {
    color: colors.ink,
    fontFamily: typography.fontFamilyExtraBold,
    fontSize: 16,
  },
  meta: {
    color: colors.slate500,
    fontFamily: typography.fontFamilyRegular,
    fontSize: 12,
  },
  amount: {
    color: colors.ink,
    fontFamily: typography.fontFamilyExtraBold,
    fontSize: 15,
  },
  details: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  badge: {
    backgroundColor: colors.brand50,
    borderRadius: radii.full,
    color: colors.brand600,
    fontFamily: typography.fontFamilyBold,
    fontSize: 11,
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "flex-end",
  },
  overlay: {
    backgroundColor: "rgba(15,23,42,.55)",
    flex: 1,
    justifyContent: "center",
    padding: spacing.lg,
  },
  dialog: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    maxHeight: "90%",
  },
  form: { gap: spacing.md, padding: spacing.xl },
  dialogTitle: {
    color: colors.ink,
    fontFamily: typography.fontFamilyExtraBold,
    fontSize: 20,
  },
});
