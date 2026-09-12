import BusinessPicker from "@/components/app/BusinessPicker";
import Page from "@/components/app/Page";
import { EmptyState, ErrorState, LoadingState } from "@/components/app/States";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { colors, radii, spacing, typography } from "@/constants/theme";
import {
  getBusinessConnections,
  getConnectedUsers,
} from "@/lib/api/connections";
import { getApiError } from "@/lib/api/errors";
import {
  createTransition,
  deleteTransition,
  getBusinessTransitions,
  getTransitions,
  updateTransition,
} from "@/lib/api/transitions";
import { getBusinessUnits } from "@/lib/api/units";
import { useAuthStore } from "@/stores/authStore";
import type {
  BusinessConnection,
  Transition,
  TransitionCreatePayload,
  TransitionUpdatePayload,
  Unit,
} from "@/types/models";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SymbolView } from "expo-symbols";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

interface TransitionForm {
  productName: string;
  quantity: string;
  productPrice: string;
  comment: string;
}

type SaveRequest =
  | { mode: "create"; payload: TransitionCreatePayload }
  | { mode: "update"; uuid: string; payload: TransitionUpdatePayload };

const emptyForm: TransitionForm = {
  productName: "",
  quantity: "1",
  productPrice: "",
  comment: "",
};

export default function TransitionsScreen() {
  const queryClient = useQueryClient();
  const role = useAuthStore((state) => state.user?.user_role?.slug);
  const activeBusiness = useAuthStore((state) => state.activeBusiness);
  const businessMode = role === "business";
  const transitionQueryKey = [
    "transitions",
    businessMode ? activeBusiness?.uuid : "user",
  ] as const;
  const [editing, setEditing] = useState<Transition | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [targetUuid, setTargetUuid] = useState("");
  const [unitId, setUnitId] = useState("");
  const [form, setForm] = useState<TransitionForm>(emptyForm);

  const transitionsQuery = useQuery({
    queryKey: transitionQueryKey,
    queryFn: () =>
      businessMode
        ? getBusinessTransitions(activeBusiness?.uuid ?? "")
        : getTransitions(),
    enabled: !businessMode || Boolean(activeBusiness?.uuid),
  });
  const connectionsQuery = useQuery({
    queryKey: businessMode
      ? ["connected-users", activeBusiness?.uuid]
      : ["business-connections"],
    queryFn: () =>
      businessMode
        ? getConnectedUsers(activeBusiness?.uuid ?? "")
        : getBusinessConnections(),
    enabled: !businessMode || Boolean(activeBusiness?.uuid),
  });
  const saveMutation = useMutation({
    mutationFn: (request: SaveRequest) =>
      request.mode === "create"
        ? createTransition(request.payload)
        : updateTransition(request.uuid, request.payload),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: transitionQueryKey });
      closeForm();
      Alert.alert(
        "Saved",
        response.message ?? "Transition saved successfully.",
      );
    },
    onError: (error) =>
      Alert.alert("Could not save transition", getApiError(error).message),
  });
  const approvalMutation = useMutation({
    mutationFn: ({ uuid, approved }: { uuid: string; approved: boolean }) =>
      updateTransition(uuid, {
        [businessMode ? "approved_by_business" : "approved_by_user"]: approved,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: transitionQueryKey });
    },
    onError: (error) =>
      Alert.alert("Could not update approval", getApiError(error).message),
  });
  const deleteMutation = useMutation({
    mutationFn: deleteTransition,
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: transitionQueryKey });
      Alert.alert(
        "Deleted",
        response.message ?? "Transition deleted successfully.",
      );
    },
    onError: (error) =>
      Alert.alert("Could not delete transition", getApiError(error).message),
  });

  const connections = connectionsQuery.data?.data ?? [];
  const transitions = transitionsQuery.data?.data ?? [];
  const selectedConnection = connections.find(
    (connection) => connection.uuid === targetUuid,
  );
  const unitBusinessUuid = businessMode
    ? activeBusiness?.uuid
    : selectedConnection?.business?.uuid;
  const unitsQuery = useQuery({
    queryKey: ["units", "business", unitBusinessUuid],
    queryFn: () => getBusinessUnits(unitBusinessUuid ?? ""),
    enabled: formOpen && Boolean(unitBusinessUuid),
  });
  const units = unitsQuery.data?.data ?? [];
  const effectiveUnitId = units.some((unit) => String(unit.id) === unitId)
    ? unitId
    : String(units[0]?.id ?? "");

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
    setTargetUuid("");
    setUnitId("");
    setForm(emptyForm);
  };

  const openCreate = () => {
    setEditing(null);
    setTargetUuid(connections[0]?.uuid ?? "");
    setUnitId("");
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (transition: Transition) => {
    const target = findConnectionForTransition(
      transition,
      connections,
      businessMode,
    );
    setEditing(transition);
    setTargetUuid(target?.uuid ?? "");
    setUnitId(String(transition.unit_id));
    setForm({
      productName: transition.product_name,
      quantity: String(transition.product_qty),
      productPrice: String(transition.product_price),
      comment: transition.comment ?? "",
    });
    setFormOpen(true);
  };

  const submit = () => {
    const quantity = Number(form.quantity);
    const productPrice = Number(form.productPrice);
    const selectedUnitId = Number(effectiveUnitId);
    const productName = form.productName.trim();

    if (productName.length < 2) {
      Alert.alert("Product required", "Enter at least two characters.");
      return;
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
      Alert.alert(
        "Invalid quantity",
        "Quantity must be a positive whole number.",
      );
      return;
    }
    if (
      form.productPrice.trim() === "" ||
      !Number.isFinite(productPrice) ||
      productPrice < 0
    ) {
      Alert.alert("Invalid unit price", "Unit price must be zero or greater.");
      return;
    }
    const totalPrice = calculateFormTotal(form);
    if (totalPrice > 9_999_999_999.99) {
      Alert.alert("Invalid total", "Calculated total price is too large.");
      return;
    }
    if (!Number.isInteger(selectedUnitId) || selectedUnitId < 1) {
      Alert.alert("Unit required", "Select a unit before saving.");
      return;
    }
    const commonPayload = {
      product_name: productName,
      product_qty: quantity,
      product_price: productPrice,
      total_price: totalPrice,
      unit_id: selectedUnitId,
      comment: form.comment.trim() || null,
    };

    if (editing) {
      saveMutation.mutate({
        mode: "update",
        uuid: editing.uuid,
        payload: commonPayload,
      });
      return;
    }

    const target = connections.find(
      (connection) => connection.uuid === targetUuid,
    );
    if (!target) {
      Alert.alert(
        businessMode ? "Select a customer" : "Select a business",
        "Choose a connected account before saving.",
      );
      return;
    }

    saveMutation.mutate({
      mode: "create",
      payload: {
        ...commonPayload,
        user_id: target.created_by,
        business_id: target.business_id,
      },
    });
  };

  const confirmDelete = (transition: Transition) => {
    Alert.alert("Delete transition?", `Delete ${transition.product_name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteMutation.mutate(transition.uuid),
      },
    ]);
  };

  const refreshing = transitionsQuery.isFetching || connectionsQuery.isFetching;
  const refresh = () => {
    void transitionsQuery.refetch();
    void connectionsQuery.refetch();
  };

  return (
    <Page
      eyebrow="LEDGER"
      title="Transitions"
      subtitle={
        businessMode
          ? "Manage entries for customers connected to the selected business."
          : "Manage entries shared with your connected businesses."
      }
      headerAction={businessMode ? <BusinessPicker /> : undefined}
      refreshing={refreshing}
      onRefresh={refresh}
    >
      {businessMode && !activeBusiness ? (
        <EmptyState
          title="Select a business"
          message="Choose a business before viewing its transitions."
        />
      ) : transitionsQuery.isPending || connectionsQuery.isPending ? (
        <LoadingState label="Loading transitions…" />
      ) : transitionsQuery.isError || connectionsQuery.isError ? (
        <ErrorState
          message={
            getApiError(transitionsQuery.error ?? connectionsQuery.error)
              .message
          }
          retry={refresh}
        />
      ) : (
        <>
          <View style={styles.sectionHeader}>
            <View style={styles.grow}>
              <Text style={styles.sectionTitle}>Shared ledger</Text>
              <Text style={styles.sectionCopy}>
                {transitions.length} entries
              </Text>
            </View>
            <Button
              label="Add entry"
              size="sm"
              disabled={connections.length === 0}
              onPress={openCreate}
            />
          </View>

          {connections.length === 0 ? (
            <EmptyState
              title={
                businessMode
                  ? "No connected customers"
                  : "No connected businesses"
              }
              message={
                businessMode
                  ? "A customer must connect before you can add an entry."
                  : "Connect with a business before you can add an entry."
              }
            />
          ) : transitions.length === 0 ? (
            <EmptyState
              title="No transitions yet"
              message="Add the first shared ledger entry."
            />
          ) : (
            <View style={styles.cards}>
              {transitions.map((transition) => {
                const connection = findConnectionForTransition(
                  transition,
                  connections,
                  businessMode,
                );
                const ownApproval = businessMode
                  ? transition.approved_by_business
                  : transition.approved_by_user;

                return (
                  <View style={styles.card} key={transition.uuid}>
                    <View style={styles.cardTop}>
                      <View style={styles.iconBox}>
                        <SymbolView
                          name={{
                            ios: "shippingbox",
                            android: "inventory_2",
                            web: "inventory_2",
                          }}
                          size={20}
                          tintColor={colors.brand600}
                        />
                      </View>
                      <View style={styles.grow}>
                        <Text numberOfLines={1} style={styles.productName}>
                          {transition.product_name}
                        </Text>
                        <Text style={styles.counterpart}>
                          {connection
                            ? getConnectionLabel(connection, businessMode)
                            : "Connected account"}
                        </Text>
                      </View>
                      <Text style={styles.amount}>
                        {formatAmount(transition.total_price)}
                      </Text>
                    </View>

                    <View style={styles.metaRow}>
                      <Text style={styles.quantity}>
                        Qty {transition.product_qty}
                      </Text>
                      <Text style={styles.quantity}>
                        {formatAmount(transition.product_price)} each
                      </Text>
                      <Text style={styles.date}>
                        {formatDate(transition.created_at)}
                      </Text>
                    </View>

                    {transition.comment ? (
                      <Text style={styles.comment}>{transition.comment}</Text>
                    ) : null}

                    <View style={styles.approvals}>
                      <Approval
                        approved={transition.approved_by_user}
                        label="User"
                      />
                      <Approval
                        approved={transition.approved_by_business}
                        label="Business"
                      />
                    </View>

                    <View style={styles.actions}>
                      <Button
                        label={ownApproval ? "Revoke approval" : "Approve"}
                        size="sm"
                        variant={ownApproval ? "secondary" : "primary"}
                        loading={
                          approvalMutation.isPending &&
                          approvalMutation.variables.uuid === transition.uuid
                        }
                        onPress={() =>
                          approvalMutation.mutate({
                            uuid: transition.uuid,
                            approved: !ownApproval,
                          })
                        }
                      />
                      <Button
                        label="Edit"
                        size="sm"
                        variant="outline"
                        onPress={() => openEdit(transition)}
                      />
                      <Button
                        label="Delete"
                        size="sm"
                        variant="danger"
                        loading={
                          deleteMutation.isPending &&
                          deleteMutation.variables === transition.uuid
                        }
                        onPress={() => confirmDelete(transition)}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </>
      )}

      <TransitionFormModal
        businessMode={businessMode}
        connections={connections}
        editing={editing}
        form={form}
        units={units}
        unitsError={
          unitsQuery.isError ? getApiError(unitsQuery.error).message : ""
        }
        unitsLoading={unitsQuery.isFetching}
        unitId={effectiveUnitId}
        open={formOpen}
        saving={saveMutation.isPending}
        targetUuid={targetUuid}
        onChange={setForm}
        onClose={closeForm}
        onSelectTarget={setTargetUuid}
        onSelectUnit={setUnitId}
        onSubmit={submit}
      />
    </Page>
  );
}

function TransitionFormModal({
  businessMode,
  connections,
  editing,
  form,
  units,
  unitsError,
  unitsLoading,
  unitId,
  open,
  saving,
  targetUuid,
  onChange,
  onClose,
  onSelectTarget,
  onSelectUnit,
  onSubmit,
}: {
  businessMode: boolean;
  connections: BusinessConnection[];
  editing: Transition | null;
  form: TransitionForm;
  units: Unit[];
  unitsError: string;
  unitsLoading: boolean;
  unitId: string;
  open: boolean;
  saving: boolean;
  targetUuid: string;
  onChange: (form: TransitionForm) => void;
  onClose: () => void;
  onSelectTarget: (uuid: string) => void;
  onSelectUnit: (id: string) => void;
  onSubmit: () => void;
}) {
  const update = (field: keyof TransitionForm, value: string) =>
    onChange({ ...form, [field]: value });

  return (
    <Modal
      visible={open}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.modalBackdrop}
      >
        <View style={styles.modalCard}>
          <ScrollView
            contentContainerStyle={styles.modalContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.modalHeader}>
              <View style={styles.grow}>
                <Text style={styles.modalTitle}>
                  {editing ? "Edit transition" : "New transition"}
                </Text>
                <Text style={styles.modalCopy}>
                  This entry is shared with both connected accounts.
                </Text>
              </View>
              <Button
                label="Close"
                size="sm"
                variant="ghost"
                onPress={onClose}
              />
            </View>

            {!editing ? (
              <View>
                <Text style={styles.inputLabel}>
                  {businessMode ? "Connected customer" : "Connected business"}
                </Text>
                <View style={styles.targets}>
                  {connections.map((connection) => (
                    <Pressable
                      key={connection.uuid}
                      onPress={() => onSelectTarget(connection.uuid)}
                      style={[
                        styles.target,
                        targetUuid === connection.uuid && styles.targetSelected,
                      ]}
                    >
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.targetText,
                          targetUuid === connection.uuid &&
                            styles.targetTextSelected,
                        ]}
                      >
                        {getConnectionLabel(connection, businessMode)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            <UnitDropdown
              error={unitsError}
              loading={unitsLoading}
              units={units}
              value={unitId}
              onChange={onSelectUnit}
            />

            <Input
              label="Product or service"
              value={form.productName}
              maxLength={150}
              onChangeText={(value) => update("productName", value)}
            />
            <View style={styles.formRow}>
              <Input
                label="Quantity"
                value={form.quantity}
                keyboardType="number-pad"
                onChangeText={(value) => update("quantity", value)}
                containerStyle={styles.formField}
              />
              <Input
                label="Unit price"
                value={form.productPrice}
                keyboardType="decimal-pad"
                placeholder="0.00"
                onChangeText={(value) => update("productPrice", value)}
                containerStyle={styles.formField}
              />
            </View>
            <View style={styles.totalPreview}>
              <Text style={styles.totalPreviewLabel}>Calculated total</Text>
              <Text style={styles.totalPreviewValue}>
                {formatAmount(calculateFormTotal(form))}
              </Text>
            </View>
            <Input
              label="Comment"
              value={form.comment}
              maxLength={2000}
              multiline
              numberOfLines={3}
              inputStyle={styles.commentInput}
              onChangeText={(value) => update("comment", value)}
            />
            <Button
              label={editing ? "Save changes" : "Create transition"}
              fullWidth
              loading={saving}
              onPress={onSubmit}
            />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function UnitDropdown({
  error,
  loading,
  units,
  value,
  onChange,
}: {
  error: string;
  loading: boolean;
  units: Unit[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const selectedUnit = units.find((unit) => String(unit.id) === value);
  const disabled = loading || units.length === 0;

  return (
    <View>
      <Text style={styles.inputLabel}>Unit</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled, expanded }}
        disabled={disabled}
        onPress={() => setExpanded((current) => !current)}
        style={({ pressed }) => [
          styles.dropdownTrigger,
          disabled && styles.dropdownDisabled,
          pressed && !disabled && styles.dropdownPressed,
        ]}
      >
        <Text style={selectedUnit ? styles.dropdownText : styles.dropdownPlaceholder}>
          {selectedUnit?.name ?? (loading ? "Loading units…" : "No units available")}
        </Text>
        <SymbolView
          name={{ ios: "chevron.down", android: "arrow_drop_down", web: "arrow_drop_down" }}
          size={18}
          tintColor={colors.slate500}
        />
      </Pressable>

      {expanded ? (
        <View style={styles.dropdownMenu}>
          {units.map((unit) => {
            const selected = String(unit.id) === value;

            return (
              <Pressable
                accessibilityRole="button"
                key={unit.uuid}
                onPress={() => {
                  onChange(String(unit.id));
                  setExpanded(false);
                }}
                style={[styles.dropdownOption, selected && styles.dropdownOptionSelected]}
              >
                <Text
                  style={[styles.dropdownOptionText, selected && styles.dropdownOptionTextSelected]}
                >
                  {unit.name}
                </Text>
                {selected ? (
                  <SymbolView
                    name={{ ios: "checkmark", android: "check", web: "check" }}
                    size={16}
                    tintColor={colors.brand600}
                  />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

function Approval({ approved, label }: { approved: boolean; label: string }) {
  return (
    <View style={[styles.approval, approved && styles.approvalDone]}>
      <SymbolView
        name={{
          ios: approved ? "checkmark.circle.fill" : "clock",
          android: approved ? "check_circle" : "schedule",
          web: approved ? "check_circle" : "schedule",
        }}
        size={14}
        tintColor={approved ? "#047857" : colors.slate500}
      />
      <Text style={[styles.approvalText, approved && styles.approvalTextDone]}>
        {label} {approved ? "approved" : "pending"}
      </Text>
    </View>
  );
}

function findConnectionForTransition(
  transition: Transition,
  connections: BusinessConnection[],
  businessMode: boolean,
) {
  return connections.find((connection) =>
    businessMode
      ? connection.created_by === transition.user_id &&
        connection.business_id === transition.business_id
      : connection.business_id === transition.business_id,
  );
}

function getConnectionLabel(
  connection: BusinessConnection,
  businessMode: boolean,
) {
  if (!businessMode) return connection.business?.name ?? "Unavailable business";

  const user = connection.creator;
  return user
    ? [user.first_name, user.last_name].filter(Boolean).join(" ")
    : "Unavailable customer";
}

function formatAmount(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function calculateFormTotal(form: TransitionForm) {
  const quantity = Number(form.quantity);
  const productPrice = Number(form.productPrice);

  if (!Number.isFinite(quantity) || !Number.isFinite(productPrice)) return 0;

  return Math.round((quantity * productPrice + Number.EPSILON) * 100) / 100;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

const styles = StyleSheet.create({
  grow: { flex: 1 },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  sectionTitle: {
    color: colors.ink,
    fontFamily: typography.fontFamilyExtraBold,
    fontSize: 17,
  },
  sectionCopy: {
    color: colors.slate500,
    fontFamily: typography.fontFamilyRegular,
    fontSize: 11,
    marginTop: 3,
  },
  cards: { gap: spacing.md },
  card: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  cardTop: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  iconBox: {
    alignItems: "center",
    backgroundColor: colors.brand50,
    borderRadius: radii.md,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  productName: {
    color: colors.ink,
    fontFamily: typography.fontFamilyExtraBold,
    fontSize: 15,
  },
  counterpart: {
    color: colors.slate500,
    fontFamily: typography.fontFamilyRegular,
    fontSize: 10,
    marginTop: 2,
  },
  amount: {
    color: colors.ink,
    fontFamily: typography.fontFamilyExtraBold,
    fontSize: 15,
  },
  metaRow: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  quantity: {
    color: colors.slate700,
    fontFamily: typography.fontFamilySemiBold,
    fontSize: 10,
  },
  date: {
    color: colors.slate500,
    fontFamily: typography.fontFamilyRegular,
    fontSize: 10,
    marginLeft: "auto",
  },
  comment: {
    color: colors.slate500,
    fontFamily: typography.fontFamilyRegular,
    fontSize: 12,
    lineHeight: 18,
  },
  approvals: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  approval: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.full,
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  approvalDone: { backgroundColor: "#ecfdf3" },
  approvalText: {
    color: colors.slate500,
    fontFamily: typography.fontFamilySemiBold,
    fontSize: 9,
  },
  approvalTextDone: { color: "#047857" },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  modalBackdrop: {
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    flex: 1,
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "92%",
  },
  modalContent: { gap: spacing.lg, padding: spacing.xl, paddingBottom: 36 },
  modalHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
  },
  modalTitle: {
    color: colors.ink,
    fontFamily: typography.fontFamilyExtraBold,
    fontSize: 22,
  },
  modalCopy: {
    color: colors.slate500,
    fontFamily: typography.fontFamilyRegular,
    fontSize: 11,
    marginTop: spacing.xs,
  },
  inputLabel: {
    color: colors.slate700,
    fontFamily: typography.fontFamilySemiBold,
    fontSize: 13,
    marginBottom: spacing.sm,
  },
  helperText: {
    color: colors.slate500,
    fontFamily: typography.fontFamilyRegular,
    fontSize: 11,
  },
  errorText: {
    color: "#dc2626",
    fontFamily: typography.fontFamilySemiBold,
    fontSize: 11,
  },
  dropdownTrigger: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  dropdownDisabled: { backgroundColor: colors.surface, opacity: 0.7 },
  dropdownPressed: { borderColor: colors.brand600 },
  dropdownText: {
    color: colors.ink,
    fontFamily: typography.fontFamilySemiBold,
    fontSize: 13,
  },
  dropdownPlaceholder: {
    color: colors.slate500,
    fontFamily: typography.fontFamilyRegular,
    fontSize: 13,
  },
  dropdownMenu: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    marginTop: spacing.xs,
    overflow: "hidden",
  },
  dropdownOption: {
    alignItems: "center",
    borderBottomColor: colors.line,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  dropdownOptionSelected: { backgroundColor: colors.brand50 },
  dropdownOptionText: {
    color: colors.slate700,
    fontFamily: typography.fontFamilySemiBold,
    fontSize: 12,
  },
  dropdownOptionTextSelected: { color: colors.brand700 },
  targets: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  target: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.full,
    borderWidth: 1,
    maxWidth: "100%",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  targetSelected: {
    backgroundColor: colors.brand50,
    borderColor: colors.brand600,
  },
  targetText: {
    color: colors.slate700,
    fontFamily: typography.fontFamilySemiBold,
    fontSize: 11,
  },
  targetTextSelected: { color: colors.brand700 },
  formRow: { flexDirection: "row", gap: spacing.md },
  formField: { flex: 1 },
  totalPreview: {
    alignItems: "center",
    backgroundColor: colors.brand50,
    borderRadius: radii.md,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: spacing.md,
  },
  totalPreviewLabel: {
    color: colors.brand700,
    fontFamily: typography.fontFamilyBold,
    fontSize: 11,
  },
  totalPreviewValue: {
    color: colors.ink,
    fontFamily: typography.fontFamilyExtraBold,
    fontSize: 16,
  },
  commentInput: { minHeight: 72, textAlignVertical: "top" },
});
