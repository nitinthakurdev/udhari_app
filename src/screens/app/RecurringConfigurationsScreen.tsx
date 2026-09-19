import Page from "@/components/app/Page";
import { EmptyState, ErrorState, LoadingState } from "@/components/app/States";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/SelectTag";
import { colors, radii, spacing, typography } from "@/constants/theme";
import {
  getBusinessConnections,
  getConnectedUsers,
  getDirectUserConnections,
} from "@/lib/api/connections";
import { getApiError } from "@/lib/api/errors";
import {
  createRecurringConfig,
  deleteRecurringConfig,
  getMyRecurringConfigs,
  getRecurringConfigs,
  updateRecurringConfig,
} from "@/lib/api/recurring-configs";
import { getBusinessUnits, getUnits } from "@/lib/api/units";
import { useAuthStore } from "@/stores/authStore";
import type {
  BusinessConnection,
  RecurringConfig,
  RecurringConfigTimeRange,
  RecurringConfigType,
  RecurringConfigWeekday,
} from "@/types/models";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

interface FormState {
  businessUuid: string;
  customerId: string;
  customerBusinessUuid: string;
  counterpartyType: "user" | "business";
  type: RecurringConfigType;
  name: string;
  quantity: string;
  unitId: string;
  unitPrice: string;
  weekDays: RecurringConfigWeekday[];
  timeRanges: RecurringConfigTimeRange[];
}

const weekdays: RecurringConfigWeekday[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];
const emptyForm = (): FormState => ({
  businessUuid: "",
  customerId: "",
  customerBusinessUuid: "",
  counterpartyType: "user",
  type: "product",
  name: "",
  quantity: "1",
  unitId: "",
  unitPrice: "",
  weekDays: [],
  timeRanges: [{ start_time: "09:00", end_time: "10:00" }],
});
const customerFor = (connection: BusinessConnection) =>
  connection.role === "business"
    ? { id: connection.connect_user_id, user: connection.connected_user }
    : { id: connection.created_by, user: connection.creator };

export default function RecurringConfigurationsScreen() {
  const queryClient = useQueryClient();
  const business = useAuthStore((state) => state.activeBusiness);
  const roleSlug = useAuthStore((state) => state.user?.user_role?.slug);
  const currentUserUuid = useAuthStore((state) => state.user?.uuid);
  const businessMode = roleSlug === "business";
  const [editing, setEditing] = useState<RecurringConfig | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const queryKey = [
    "recurring-configs",
    businessMode ? business?.uuid : currentUserUuid,
  ] as const;
  const configsQuery = useQuery({
    queryKey,
    queryFn: () =>
      businessMode
        ? getRecurringConfigs(business?.uuid ?? "")
        : getMyRecurringConfigs(),
    enabled: !businessMode || Boolean(business?.uuid),
    staleTime: Number.POSITIVE_INFINITY,
  });
  const customersQuery = useQuery({
    queryKey: ["connected-users", business?.uuid],
    queryFn: () => getConnectedUsers(business?.uuid ?? ""),
    enabled: businessMode && Boolean(business?.uuid),
  });
  const directUsersQuery = useQuery({
    queryKey: ["direct-user-connections"],
    queryFn: getDirectUserConnections,
    enabled: !businessMode,
  });
  const businessConnectionsQuery = useQuery({
    queryKey: ["business-connections", businessMode ? business?.uuid : "user"],
    queryFn: () =>
      getBusinessConnections(businessMode ? business?.uuid : undefined),
    enabled: !businessMode || Boolean(business?.uuid),
  });
  const connectedBusinesses = (businessConnectionsQuery.data?.data ?? [])
    .map((connection) => {
      if (!businessMode) return connection.business;
      return connection.source_business?.uuid === business?.uuid
        ? connection.business
        : connection.source_business;
    })
    .filter((item) => item !== null);
  const unitsQuery = useQuery({
    queryKey: ["units", businessMode ? business?.uuid : "user"],
    queryFn: () =>
      businessMode ? getBusinessUnits(business?.uuid ?? "") : getUnits(),
    enabled: !businessMode || Boolean(business?.uuid),
  });
  const customers = (customersQuery.data?.data ?? [])
    .map(customerFor)
    .filter((item) => item.user);
  const directUsers = (directUsersQuery.data?.data ?? []).map((connection) =>
    connection.connected_user?.uuid === currentUserUuid
      ? { id: connection.created_by, user: connection.creator }
      : { id: connection.connect_user_id, user: connection.connected_user },
  );
  const configurableUsers = businessMode ? customers : directUsers;
  const units = unitsQuery.data?.data ?? [];
  const effectiveUnitId = form.unitId || String(units[0]?.id ?? "");
  const saveMutation = useMutation({
    mutationFn: () => {
      const common = {
        type: form.type,
        name: form.name.trim(),
        unit_id: form.type === "product" ? Number(effectiveUnitId) : null,
        quantity: form.type === "product" ? Number(form.quantity) : null,
        unit_price: Number(form.unitPrice),
        week_days: form.weekDays,
        time_ranges: form.timeRanges,
      };
      return editing
        ? updateRecurringConfig(editing.uuid, common)
        : createRecurringConfig({
            ...common,
            ...(businessMode ? { business_uuid: business?.uuid } : {}),
            ...(form.counterpartyType === "business"
              ? { customer_business_uuid: form.customerBusinessUuid }
              : { customer_id: Number(form.customerId) }),
          });
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey });
      setFormOpen(false);
      Alert.alert(
        "Saved",
        result.message ?? "Configuration saved successfully.",
      );
    },
    onError: (error) =>
      Alert.alert("Could not save", getApiError(error).message),
  });
  const deleteMutation = useMutation({
    mutationFn: deleteRecurringConfig,
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey });
      Alert.alert(
        "Deleted",
        result.message ?? "Configuration deleted successfully.",
      );
    },
    onError: (error) =>
      Alert.alert("Could not delete", getApiError(error).message),
  });
  const openCreate = () => {
    const next = emptyForm();
    next.businessUuid = business?.uuid ?? "";
    next.customerId = String(configurableUsers[0]?.id ?? "");
    next.customerBusinessUuid = connectedBusinesses[0]?.uuid ?? "";
    next.unitId = String(units[0]?.id ?? "");
    setEditing(null);
    setForm(next);
    setFormOpen(true);
  };
  const openEdit = (config: RecurringConfig) => {
    setEditing(config);
    setForm({
      businessUuid: config.business?.uuid ?? "",
      customerId: String(config.customer?.id ?? ""),
      customerBusinessUuid: config.customer_business?.uuid ?? "",
      counterpartyType: config.customer_business ? "business" : "user",
      type: config.type,
      name: config.name,
      quantity: String(config.quantity ?? 1),
      unitId: String(config.unit_id ?? units[0]?.id ?? ""),
      unitPrice: String(config.unit_price),
      weekDays: config.week_days,
      timeRanges: config.time_ranges,
    });
    setFormOpen(true);
  };
  const submit = () => {
    if (
      (businessMode && !form.businessUuid) ||
      (form.counterpartyType === "user" && !form.customerId) ||
      (form.counterpartyType === "business" && !form.customerBusinessUuid) ||
      form.name.trim().length < 2
    )
      return Alert.alert(
        "Invalid form",
        businessMode
          ? "Select a connected user or business and enter a name."
          : "Select a connected user or business and enter a name.",
      );
    if (form.weekDays.length === 0)
      return Alert.alert("Weekday required", "Select at least one weekday.");
    if (
      form.timeRanges.length === 0 ||
      form.timeRanges.length > 5 ||
      form.timeRanges.some(
        (range) =>
          !/^([01]\d|2[0-3]):[0-5]\d$/.test(range.start_time) ||
          !/^([01]\d|2[0-3]):[0-5]\d$/.test(range.end_time) ||
          range.end_time <= range.start_time,
      )
    )
      return Alert.alert(
        "Invalid times",
        "Add 1 to 5 time ranges. Every end time must be after its start time.",
      );
    if (!Number.isFinite(Number(form.unitPrice)) || Number(form.unitPrice) < 0)
      return Alert.alert("Invalid price", "Enter a price of zero or greater.");
    if (
      form.type === "product" &&
      (!effectiveUnitId || Number(form.quantity) <= 0)
    )
      return Alert.alert(
        "Product details required",
        "Select a unit and enter a quantity greater than zero.",
      );
    saveMutation.mutate();
  };
  const confirmDelete = (config: RecurringConfig) =>
    Alert.alert("Delete configuration?", `Delete ${config.name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteMutation.mutate(config.uuid),
      },
    ]);
  const configs = configsQuery.data?.data ?? [];

  return (
    <Page
      backTitle="Configuration"
      eyebrow="CONFIGURATION"
      title="Scheduled transactions"
      subtitle="Choose weekdays and add up to five start/end time ranges."
      headerAction={<Button label="Add" size="sm" onPress={openCreate} />}
      refreshing={configsQuery.isFetching}
      onRefresh={() => void configsQuery.refetch()}
    >
      {configsQuery.isPending ? (
        <LoadingState label="Loading configurations…" />
      ) : configsQuery.isError ? (
        <ErrorState
          message={getApiError(configsQuery.error).message}
          retry={() => void configsQuery.refetch()}
        />
      ) : configs.length === 0 ? (
        <EmptyState
          title="No configurations"
          message="Add a scheduled product or service to get started."
        />
      ) : (
        <View style={styles.list}>
          {configs.map((config) => (
            <View style={styles.card} key={config.uuid}>
              <View style={styles.grow}>
                <View style={styles.row}>
                  <Text style={styles.name}>{config.name}</Text>
                  <Text style={styles.badge}>{config.type.toUpperCase()}</Text>
                </View>
                <Text style={styles.meta}>
                  {config.customer_business?.name ??
                    `${config.customer?.first_name ?? ""} ${config.customer?.last_name ?? ""}`}{" "}
                  · {config.week_days.map((day) => day.slice(0, 3)).join(", ")}
                </Text>
                <Text style={styles.meta}>
                  {config.time_ranges
                    .map((range) => `${range.start_time}–${range.end_time}`)
                    .join(" · ")}
                </Text>
                <Text style={styles.price}>
                  ₹{config.total_price.toFixed(2)}
                  {config.type === "product"
                    ? ` · ${config.quantity} ${config.unit?.code ?? ""}`
                    : ""}
                </Text>
              </View>
              {config.is_creator ? (
                <View style={styles.actions}>
                  <Button
                    label="Edit"
                    size="sm"
                    variant="ghost"
                    onPress={() => openEdit(config)}
                  />
                  <Button
                    label="Delete"
                    size="sm"
                    variant="danger"
                    onPress={() => confirmDelete(config)}
                  />
                </View>
              ) : null}
            </View>
          ))}
        </View>
      )}
      <Modal
        visible={formOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setFormOpen(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <ScrollView
              contentContainerStyle={styles.form}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.dialogTitle}>
                {editing ? "Edit" : "Add"} configuration
              </Text>
              <Select<"user" | "business">
                label="Configure with"
                options={[
                  { label: "User", value: "user" },
                  { label: "Business", value: "business" },
                ]}
                value={form.counterpartyType}
                disabled={Boolean(editing)}
                onChange={(counterpartyType) =>
                  setForm((value) => ({ ...value, counterpartyType }))
                }
              />
              {form.counterpartyType === "business" ? (
                <Select
                  label="Connected business"
                  placeholder="Select a connected business"
                  options={connectedBusinesses.map((connectedBusiness) => ({
                    label: connectedBusiness.name,
                    value: connectedBusiness.uuid,
                  }))}
                  value={form.customerBusinessUuid}
                  searchable
                  disabled={Boolean(editing)}
                  onChange={(customerBusinessUuid) =>
                    setForm((value) => ({
                      ...value,
                      customerBusinessUuid,
                    }))
                  }
                />
              ) : (
                <Select
                  label={businessMode ? "Customer" : "Connected user"}
                  placeholder={
                    businessMode
                      ? "Select a connected customer"
                      : "Select a connected user"
                  }
                  options={configurableUsers.map(({ id, user }) => ({
                    label:
                      `${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim(),
                    value: String(id),
                  }))}
                  value={form.customerId}
                  searchable
                  disabled={Boolean(editing)}
                  onChange={(customerId) =>
                    setForm((value) => ({ ...value, customerId }))
                  }
                />
              )}
              <Select<RecurringConfigType>
                label="Type"
                options={[
                  { label: "Product", value: "product" },
                  { label: "Service", value: "service" },
                ]}
                value={form.type}
                onChange={(type) => setForm((value) => ({ ...value, type }))}
              />
              <Input
                label="Name"
                value={form.name}
                onChangeText={(name) => setForm((v) => ({ ...v, name }))}
                placeholder={form.type === "product" ? "Rice" : "Consultation"}
              />
              {form.type === "product" ? (
                <>
                  <Input
                    label="Quantity"
                    value={form.quantity}
                    onChangeText={(quantity) =>
                      setForm((v) => ({ ...v, quantity }))
                    }
                    keyboardType="decimal-pad"
                  />
                  <Select
                    label="Unit"
                    placeholder="Select a unit"
                    options={units.map((unit) => ({
                      label: `${unit.name} (${unit.code})`,
                      value: String(unit.id),
                    }))}
                    value={effectiveUnitId}
                    searchable
                    onChange={(unitId) =>
                      setForm((value) => ({ ...value, unitId }))
                    }
                  />
                </>
              ) : null}
              <Input
                label="Price"
                value={form.unitPrice}
                onChangeText={(unitPrice) =>
                  setForm((v) => ({ ...v, unitPrice }))
                }
                keyboardType="decimal-pad"
              />
              <Text style={styles.label}>Weekdays</Text>
              <View style={styles.options}>
                {weekdays.map((day) => {
                  const selected = form.weekDays.includes(day);
                  return (
                    <Pressable
                      key={day}
                      onPress={() =>
                        setForm((value) => ({
                          ...value,
                          weekDays: selected
                            ? value.weekDays.filter((item) => item !== day)
                            : [...value.weekDays, day],
                        }))
                      }
                      style={[styles.option, selected && styles.optionActive]}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          selected && styles.optionTextActive,
                        ]}
                      >
                        {day}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <View style={styles.timeHeader}>
                <Text style={styles.label}>
                  Time ranges ({form.timeRanges.length}/5)
                </Text>
                <Button
                  label="Add time"
                  size="sm"
                  variant="ghost"
                  disabled={form.timeRanges.length >= 5}
                  onPress={() =>
                    setForm((value) => ({
                      ...value,
                      timeRanges: [
                        ...value.timeRanges,
                        { start_time: "09:00", end_time: "10:00" },
                      ],
                    }))
                  }
                />
              </View>
              {form.timeRanges.map((range, index) => (
                <View style={styles.timeRange} key={index}>
                  <View style={styles.grow}>
                    <Input
                      label="Start"
                      value={range.start_time}
                      onChangeText={(start_time) =>
                        setForm((value) => ({
                          ...value,
                          timeRanges: value.timeRanges.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, start_time }
                              : item,
                          ),
                        }))
                      }
                      placeholder="09:00"
                    />
                  </View>
                  <View style={styles.grow}>
                    <Input
                      label="End"
                      value={range.end_time}
                      onChangeText={(end_time) =>
                        setForm((value) => ({
                          ...value,
                          timeRanges: value.timeRanges.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, end_time } : item,
                          ),
                        }))
                      }
                      placeholder="10:00"
                    />
                  </View>
                  <Button
                    label="Remove"
                    size="sm"
                    variant="danger"
                    disabled={form.timeRanges.length === 1}
                    onPress={() =>
                      setForm((value) => ({
                        ...value,
                        timeRanges: value.timeRanges.filter(
                          (_, itemIndex) => itemIndex !== index,
                        ),
                      }))
                    }
                  />
                </View>
              ))}
              <View style={styles.dialogActions}>
                <Button
                  label="Cancel"
                  variant="ghost"
                  onPress={() => setFormOpen(false)}
                />
                <Button
                  label="Save"
                  loading={saveMutation.isPending}
                  onPress={submit}
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
  grow: { flex: 1 },
  row: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  name: {
    color: colors.ink,
    fontFamily: typography.fontFamilyExtraBold,
    fontSize: 15,
  },
  badge: {
    backgroundColor: colors.brand50,
    borderRadius: radii.full,
    color: colors.brand600,
    fontFamily: typography.fontFamilyBold,
    fontSize: 9,
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  meta: {
    color: colors.slate500,
    fontFamily: typography.fontFamilyRegular,
    fontSize: 11,
    marginTop: 5,
  },
  price: {
    color: colors.brand600,
    fontFamily: typography.fontFamilyExtraBold,
    fontSize: 13,
    marginTop: 8,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.xs,
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
    overflow: "hidden",
  },
  form: { gap: spacing.md, padding: spacing.xl },
  dialogTitle: {
    color: colors.ink,
    fontFamily: typography.fontFamilyExtraBold,
    fontSize: 20,
  },
  label: {
    color: colors.slate700,
    fontFamily: typography.fontFamilyBold,
    fontSize: 12,
  },
  options: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  option: {
    borderColor: colors.line,
    borderRadius: radii.full,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  optionActive: {
    backgroundColor: colors.brand600,
    borderColor: colors.brand600,
  },
  optionText: {
    color: colors.slate700,
    fontFamily: typography.fontFamilyBold,
    fontSize: 11,
    textTransform: "capitalize",
  },
  optionTextActive: { color: colors.white },
  timeHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  timeRange: { alignItems: "flex-end", flexDirection: "row", gap: spacing.xs },
  dialogActions: {
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "flex-end",
    marginTop: spacing.sm,
  },
});
