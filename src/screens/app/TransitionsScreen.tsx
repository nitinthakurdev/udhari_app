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
  cancelTransition,
  createTransition,
  getBusinessTransitions,
  getTransitions,
  markTransitionPaymentReceived,
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
  balanceType: "payable" | "receivable";
  comment: string;
}

type SaveRequest =
  | { mode: "create"; payload: TransitionCreatePayload }
  | { mode: "update"; uuid: string; payload: TransitionUpdatePayload };

const emptyForm: TransitionForm = {
  productName: "",
  quantity: "1",
  productPrice: "",
  balanceType: "payable",
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
  const [counterpartyType, setCounterpartyType] = useState<"user" | "business">("user");
  const [view, setView] = useState<"active" | "unpaid" | "cancelled">("active");

  const transitionsQuery = useQuery({
    queryKey: transitionQueryKey,
    queryFn: () =>
      businessMode
        ? getBusinessTransitions(activeBusiness?.uuid ?? "")
        : getTransitions(),
    enabled: !businessMode || Boolean(activeBusiness?.uuid),
  });
  const customerConnectionsQuery = useQuery({
    queryKey: ["connected-users", activeBusiness?.uuid],
    queryFn: () => getConnectedUsers(activeBusiness?.uuid ?? ""),
    enabled: businessMode && Boolean(activeBusiness?.uuid),
  });
  const businessConnectionsQuery = useQuery({
    queryKey: ["business-connections", businessMode ? activeBusiness?.uuid : "user"],
    queryFn: () =>
      getBusinessConnections(businessMode ? activeBusiness?.uuid : undefined),
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
    onError: (error) => {
      const apiError = getApiError(error);
      Alert.alert(
        "Could not save transition",
        apiError.details[0]?.message ?? apiError.message,
      );
    },
  });
  const approvalMutation = useMutation({
    mutationFn: ({ uuid }: { uuid: string }) =>
      updateTransition(uuid, { request_status: "approved" }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: transitionQueryKey });
    },
    onError: (error) =>
      Alert.alert("Could not update approval", getApiError(error).message),
  });
  const cancelMutation = useMutation({
    mutationFn: cancelTransition,
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: transitionQueryKey });
      Alert.alert(
        "Cancelled",
        response.message ?? "Transition cancelled successfully.",
      );
    },
    onError: (error) =>
      Alert.alert("Could not cancel transition", getApiError(error).message),
  });
  const paymentMutation = useMutation({
    mutationFn: markTransitionPaymentReceived,
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: transitionQueryKey });
      Alert.alert(
        "Payment received",
        response.message ?? "Payment marked as received.",
      );
    },
    onError: (error) =>
      Alert.alert("Could not receive payment", getApiError(error).message),
  });

  const customerConnections = customerConnectionsQuery.data?.data ?? [];
  const businessConnections = businessConnectionsQuery.data?.data ?? [];
  const connections =
    businessMode && counterpartyType === "user"
      ? customerConnections
      : businessConnections;
  const allConnections = businessMode
    ? [...customerConnections, ...businessConnections]
    : businessConnections;
  const transitions = transitionsQuery.data?.data ?? [];
  const visibleTransitions = transitions.filter((transition) => {
    if (view === "cancelled") return transition.request_status === "cancelled";
    if (view === "unpaid") {
      return (
        transition.request_status === "approved" &&
        transition.payment_status === "unpaid"
      );
    }
    return transition.request_status !== "cancelled";
  });
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

  const openCreate = (type: "user" | "business" = "business") => {
    const availableConnections =
      businessMode && type === "user" ? customerConnections : businessConnections;
    setCounterpartyType(type);
    setEditing(null);
    setTargetUuid(availableConnections[0]?.uuid ?? "");
    setUnitId("");
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (transition: Transition) => {
    const isBusinessTransition = transition.customer_business_id !== null;
    const editingConnections = isBusinessTransition
      ? businessConnections
      : businessMode
        ? customerConnections
        : businessConnections;
    const target = findConnectionForTransition(
      transition,
      editingConnections,
      businessMode,
    );
    setCounterpartyType(isBusinessTransition ? "business" : "user");
    setEditing(transition);
    setTargetUuid(target?.uuid ?? "");
    setUnitId(String(transition.unit_id));
    setForm({
      productName: transition.product_name,
      quantity: String(transition.product_qty),
      productPrice: String(transition.product_unit_price),
      balanceType: transition.balance_type,
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
    if (!Number.isFinite(quantity) || quantity <= 0) {
      Alert.alert("Invalid quantity", "Quantity must be greater than zero.");
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
      product_unit_price: productPrice,
      total_price: totalPrice,
      unit_id: selectedUnitId,
      comment: form.comment.trim() || null,
    };

    if (editing) {
      saveMutation.mutate({
        mode: "update",
        uuid: editing.uuid,
        payload: {
          ...commonPayload,
          ...(editing.customer_business_id !== null
            ? { balance_type: form.balanceType }
            : {}),
        },
      });
      return;
    }

    const target = connections.find(
      (connection) => connection.uuid === targetUuid,
    );
    if (!target) {
      Alert.alert(
        businessMode && counterpartyType === "user"
          ? "Select a customer"
          : "Select a business",
        "Choose a connected account before saving.",
      );
      return;
    }

    const targetBusinessId = getCounterpartyBusinessId(
      target,
      businessMode ? activeBusiness?.uuid : undefined,
    );
    if (!targetBusinessId) {
      Alert.alert(
        "Business unavailable",
        "The selected connected business is no longer available. Refresh and try again.",
      );
      return;
    }

    saveMutation.mutate({
      mode: "create",
      payload: {
        ...commonPayload,
        business_id: targetBusinessId,
        ...(businessMode && counterpartyType === "business"
          ? {
              customer_business_uuid: activeBusiness?.uuid,
              balance_type: form.balanceType,
            }
          : businessMode
            ? { customer_user_id: getConnectionUserId(target) }
          : {}),
      },
    });
  };

  const confirmCancel = (transition: Transition) => {
    Alert.alert("Cancel transition?", `Cancel ${transition.product_name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Confirm",
        style: "destructive",
        onPress: () => cancelMutation.mutate(transition.uuid),
      },
    ]);
  };

  const confirmPaymentReceived = (transition: Transition) => {
    Alert.alert(
      "Confirm payment received?",
      `Mark payment for ${transition.product_name} as received? This will remove it from unpaid balances.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Payment received",
          onPress: () => paymentMutation.mutate(transition.uuid),
        },
      ],
    );
  };

  const refreshing =
    transitionsQuery.isFetching ||
    customerConnectionsQuery.isFetching ||
    businessConnectionsQuery.isFetching;
  const refresh = () => {
    void transitionsQuery.refetch();
    void customerConnectionsQuery.refetch();
    void businessConnectionsQuery.refetch();
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
      ) : transitionsQuery.isPending ||
        businessConnectionsQuery.isPending ||
        (businessMode && customerConnectionsQuery.isPending) ? (
        <LoadingState label="Loading transitions…" />
      ) : transitionsQuery.isError ||
        businessConnectionsQuery.isError ||
        (businessMode && customerConnectionsQuery.isError) ? (
        <ErrorState
          message={
            getApiError(
              transitionsQuery.error ??
                customerConnectionsQuery.error ??
                businessConnectionsQuery.error,
            ).message
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
            <View style={styles.headerActions}>
              {businessMode ? (
                <>
                  <Button
                    label="With user"
                    size="sm"
                    disabled={customerConnections.length === 0}
                    onPress={() => openCreate("user")}
                  />
                  <Button
                    label="With business"
                    size="sm"
                    variant="outline"
                    disabled={businessConnections.length === 0}
                    onPress={() => openCreate("business")}
                  />
                </>
              ) : (
                <Button
                  label="Add entry"
                  size="sm"
                  disabled={businessConnections.length === 0}
                  onPress={() => openCreate("business")}
                />
              )}
            </View>
          </View>

          <View style={styles.tabs}>
            {(["active", "unpaid", "cancelled"] as const).map((tab) => {
              const count = transitions.filter((transition) =>
                tab === "cancelled"
                  ? transition.request_status === "cancelled"
                  : tab === "unpaid"
                    ? transition.request_status === "approved" &&
                      transition.payment_status === "unpaid"
                    : transition.request_status !== "cancelled",
              ).length;
              const selected = view === tab;
              return (
                <Pressable
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  key={tab}
                  onPress={() => setView(tab)}
                  style={[styles.tab, selected && styles.tabSelected]}
                >
                  <Text
                    style={[styles.tabText, selected && styles.tabTextSelected]}
                  >
                    {tab === "active"
                      ? "Active"
                      : tab === "unpaid"
                        ? "Unpaid transitions"
                        : "Cancelled"} ({count})
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {view === "active" &&
          connections.length === 0 &&
          visibleTransitions.length === 0 ? (
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
          ) : visibleTransitions.length === 0 ? (
            <EmptyState
              title={
                view === "cancelled"
                  ? "No cancelled transitions"
                  : view === "unpaid"
                    ? "No unpaid transitions"
                    : "No transitions yet"
              }
              message={
                view === "cancelled"
                  ? "Cancelled transitions will appear here."
                  : view === "unpaid"
                    ? "Approved unpaid transitions will appear here."
                    : "Add the first shared ledger entry."
              }
            />
          ) : (
            <View style={styles.cards}>
              {visibleTransitions.map((transition) => {
                const connection = findConnectionForTransition(
                  transition,
                  allConnections,
                  businessMode,
                );
                const locked = transition.request_status !== "pending";
                const currentIsCustomerSide =
                  transition.account_type === transition.balance_type;
                const createdByCurrentSide = currentIsCustomerSide
                  ? transition.created_by === transition.customer_user_id
                  : transition.created_by === transition.business_user_id;

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
                            ? getConnectionLabel(
                                connection,
                                businessMode,
                                transition.customer_business_id !== null,
                                activeBusiness?.uuid,
                              )
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
                        {formatAmount(transition.product_unit_price)} each
                      </Text>
                      <Text style={styles.date}>
                        {formatDate(transition.created_at)}
                      </Text>
                    </View>

                    {transition.comment ? (
                      <Text style={styles.comment}>{transition.comment}</Text>
                    ) : null}

                    {transition.request_status !== "approved" ? (
                      <View style={styles.approvals}>
                        <Text
                          style={[
                            styles.approvalText,
                            transition.request_status === "cancelled" &&
                              styles.cancelledText,
                          ]}
                        >
                          {transition.request_status === "cancelled"
                            ? "Cancelled"
                            : "Pending approval"}
                        </Text>
                      </View>
                    ) : null}

                    <View style={styles.approvals}>
                      <Text
                        style={[
                          styles.paymentStatus,
                          transition.account_type === "receivable" &&
                            styles.paymentStatusPaid,
                        ]}
                      >
                        {transition.account_type === "receivable"
                          ? "Receivable"
                          : "Payable"}
                      </Text>
                      <Text
                        style={[
                          styles.paymentStatus,
                          transition.payment_status === "paid" &&
                            styles.paymentStatusPaid,
                        ]}
                      >
                        {transition.payment_status === "paid"
                          ? "Paid"
                          : "Unpaid"}
                      </Text>
                    </View>

                    {businessMode &&
                    view === "unpaid" &&
                    transition.account_type === "receivable" ? (
                      <View style={styles.actions}>
                        <Button
                          label="Payment received"
                          size="sm"
                          loading={
                            paymentMutation.isPending &&
                            paymentMutation.variables === transition.uuid
                          }
                          onPress={() => confirmPaymentReceived(transition)}
                        />
                      </View>
                    ) : null}

                    {!locked ? (
                      <View style={styles.actions}>
                        {!createdByCurrentSide ? (
                          <Button
                            label="Approve"
                            size="sm"
                            loading={
                              approvalMutation.isPending &&
                              approvalMutation.variables.uuid ===
                                transition.uuid
                            }
                            onPress={() =>
                              approvalMutation.mutate({
                                uuid: transition.uuid,
                              })
                            }
                          />
                        ) : null}
                        {createdByCurrentSide ? (
                          <>
                            <Button
                              label="Edit"
                              size="sm"
                              variant="outline"
                              onPress={() => openEdit(transition)}
                            />
                            <Button
                              label="Cancel"
                              size="sm"
                              variant="danger"
                              loading={
                                cancelMutation.isPending &&
                                cancelMutation.variables === transition.uuid
                              }
                              onPress={() => confirmCancel(transition)}
                            />
                          </>
                        ) : null}
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          )}
        </>
      )}

      <TransitionFormModal
        activeBusinessUuid={activeBusiness?.uuid}
        businessMode={businessMode}
        counterpartyType={counterpartyType}
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
  activeBusinessUuid,
  businessMode,
  counterpartyType,
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
  activeBusinessUuid?: string;
  businessMode: boolean;
  counterpartyType: "user" | "business";
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
  const update = <Field extends keyof TransitionForm>(
    field: Field,
    value: TransitionForm[Field],
  ) => onChange({ ...form, [field]: value });
  const selectedUnit = units.find((unit) => String(unit.id) === unitId);
  const unitSuffix = selectedUnit?.code ? ` / ${selectedUnit.code}` : "";

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
                  {businessMode && counterpartyType === "user"
                    ? "Connected customer"
                    : "Connected business"}
                </Text>
                {!businessMode || counterpartyType === "business" ? (
                  <ConnectionDropdown
                    activeBusinessUuid={activeBusinessUuid}
                    businessMode={businessMode}
                    connections={connections}
                    value={targetUuid}
                    onChange={onSelectTarget}
                  />
                ) : (
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
                          {getConnectionLabel(connection, businessMode, false)}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            ) : null}

            {businessMode && counterpartyType === "business" ? (
              <View>
                <Text style={styles.inputLabel}>Balance type for your business</Text>
                <View style={styles.targets}>
                  {(["payable", "receivable"] as const).map((type) => {
                    const selected = form.balanceType === type;
                    return (
                      <Pressable
                        key={type}
                        onPress={() => update("balanceType", type)}
                        style={[styles.target, selected && styles.targetSelected]}
                      >
                        <Text
                          style={[
                            styles.targetText,
                            selected && styles.targetTextSelected,
                          ]}
                        >
                          {type === "payable" ? "Payable" : "Receivable"}
                        </Text>
                      </Pressable>
                    );
                  })}
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
                label={`Qty${unitSuffix}`}
                value={form.quantity}
                keyboardType="decimal-pad"
                onChangeText={(value) => update("quantity", value)}
                containerStyle={styles.formField}
              />
              <Input
                label={`Unit price${unitSuffix}`}
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

function ConnectionDropdown({
  activeBusinessUuid,
  businessMode,
  connections,
  value,
  onChange,
}: {
  activeBusinessUuid?: string;
  businessMode: boolean;
  connections: BusinessConnection[];
  value: string;
  onChange: (uuid: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const selectedConnection = connections.find(
    (connection) => connection.uuid === value,
  );
  const selectedLabel = selectedConnection
    ? getConnectionLabel(
        selectedConnection,
        businessMode,
        true,
        activeBusinessUuid,
      )
    : "Select a connected business";

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={() => setExpanded((current) => !current)}
        style={({ pressed }) => [
          styles.dropdownTrigger,
          pressed && styles.dropdownPressed,
        ]}
      >
        <View style={styles.dropdownValue}>
          <SymbolView
            name={{ ios: "building.2", android: "business", web: "business" }}
            size={18}
            tintColor={colors.brand600}
          />
          <Text
            numberOfLines={1}
            style={
              selectedConnection
                ? styles.dropdownText
                : styles.dropdownPlaceholder
            }
          >
            {selectedLabel}
          </Text>
        </View>
        <SymbolView
          name={{
            ios: expanded ? "chevron.up" : "chevron.down",
            android: expanded ? "arrow_drop_up" : "arrow_drop_down",
            web: expanded ? "arrow_drop_up" : "arrow_drop_down",
          }}
          size={18}
          tintColor={colors.slate500}
        />
      </Pressable>

      {expanded ? (
        <View style={styles.dropdownMenu}>
          {connections.map((connection) => {
            const selected = connection.uuid === value;
            return (
              <Pressable
                accessibilityRole="button"
                key={connection.uuid}
                onPress={() => {
                  onChange(connection.uuid);
                  setExpanded(false);
                }}
                style={[
                  styles.dropdownOption,
                  selected && styles.dropdownOptionSelected,
                ]}
              >
                <Text
                  numberOfLines={1}
                  style={[
                    styles.dropdownOptionText,
                    selected && styles.dropdownOptionTextSelected,
                  ]}
                >
                  {getConnectionLabel(
                    connection,
                    businessMode,
                    true,
                    activeBusinessUuid,
                  )}
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
    </View>
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
        <Text
          style={
            selectedUnit ? styles.dropdownText : styles.dropdownPlaceholder
          }
        >
          {selectedUnit
            ? `${selectedUnit.name} (${selectedUnit.code})`
            : loading
              ? "Loading units…"
              : "No units available"}
        </Text>
        <SymbolView
          name={{
            ios: "chevron.down",
            android: "arrow_drop_down",
            web: "arrow_drop_down",
          }}
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
                style={[
                  styles.dropdownOption,
                  selected && styles.dropdownOptionSelected,
                ]}
              >
                <Text
                  style={[
                    styles.dropdownOptionText,
                    selected && styles.dropdownOptionTextSelected,
                  ]}
                >
                  {unit.name} ({unit.code})
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

function findConnectionForTransition(
  transition: Transition,
  connections: BusinessConnection[],
  businessMode: boolean,
) {
  if (transition.customer_business_id !== null) {
    return connections.find(
      (connection) =>
        connection.source_business_id !== null &&
        ((connection.source_business_id === transition.customer_business_id &&
          connection.business_id === transition.business_id) ||
          (connection.source_business_id === transition.business_id &&
            connection.business_id === transition.customer_business_id)),
    );
  }

  return connections.find((connection) =>
    businessMode
      ? getConnectionUserId(connection) === transition.customer_user_id &&
        connection.business_id === transition.business_id
      : connection.business_id === transition.business_id,
  );
}

function getConnectionUserId(connection: BusinessConnection) {
  return connection.role === "business"
    ? connection.connect_user_id
    : connection.created_by;
}

function getConnectionLabel(
  connection: BusinessConnection,
  businessMode: boolean,
  businessCounterparty = false,
  activeBusinessUuid?: string,
) {
  if (!businessMode) {
    return connection.business?.name ?? "Unavailable business";
  }
  if (businessCounterparty) {
    return connection.business?.uuid === activeBusinessUuid
      ? connection.source_business?.name ?? "Unavailable business"
      : connection.business?.name ?? "Unavailable business";
  }

  const user =
    connection.role === "business"
      ? connection.connected_user
      : connection.creator;
  return user
    ? [user.first_name, user.last_name].filter(Boolean).join(" ")
    : "Unavailable customer";
}

function getCounterpartyBusinessId(
  connection: BusinessConnection,
  activeBusinessUuid?: string,
) {
  if (activeBusinessUuid && connection.business?.uuid === activeBusinessUuid) {
    return connection.source_business_id;
  }
  return connection.business_id;
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
  headerActions: {
    alignItems: "flex-end",
    gap: spacing.sm,
  },
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
  tabs: {
    alignSelf: "stretch",
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: "row",
    padding: 4,
  },
  tab: {
    borderRadius: radii.md,
    flex: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  tabSelected: { backgroundColor: colors.brand600 },
  tabText: {
    color: colors.slate500,
    fontFamily: typography.fontFamilyExtraBold,
    fontSize: 10,
    textAlign: "center",
  },
  tabTextSelected: { color: colors.white },
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
  cancelledText: { color: "#b91c1c" },
  paymentStatus: {
    backgroundColor: colors.surface,
    borderRadius: radii.full,
    color: colors.slate500,
    fontFamily: typography.fontFamilySemiBold,
    fontSize: 9,
    overflow: "hidden",
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  paymentStatusPaid: { backgroundColor: "#ecfdf3", color: "#047857" },
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
  dropdownValue: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: spacing.sm,
    marginRight: spacing.sm,
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
