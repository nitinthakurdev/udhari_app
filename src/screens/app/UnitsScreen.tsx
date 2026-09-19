import Page from "@/components/app/Page";
import { EmptyState, ErrorState, LoadingState } from "@/components/app/States";
import { Button } from "@/components/ui/Button";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Input } from "@/components/ui/Input";
import { colors, radii, spacing, typography } from "@/constants/theme";
import { createUnit, deleteUnit, getUnits, updateUnit } from "@/lib/api/units";
import { getApiError } from "@/lib/api/errors";
import type { Unit } from "@/types/models";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SymbolView } from "expo-symbols";
import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

interface UnitForm {
  name: string;
  code: string;
  type: string;
  factor: string;
}

const emptyForm: UnitForm = { name: "", code: "", type: "", factor: "1" };

export default function UnitsScreen() {
  const queryClient = useQueryClient();
  const unitsQuery = useQuery({ queryKey: ["units"], queryFn: getUnits });
  const [editing, setEditing] = useState<Unit | null | undefined>(undefined);
  const [form, setForm] = useState<UnitForm>(emptyForm);
  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        name: form.name.trim(),
        code: form.code.trim().toLowerCase(),
        type: form.type.trim().toLowerCase(),
        factor: Number(form.factor),
      };
      return editing
        ? updateUnit(editing.uuid, payload)
        : createUnit(payload);
    },
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ["units"] });
      setEditing(undefined);
      setForm(emptyForm);
      Alert.alert("Saved", response.message ?? "Unit saved successfully.");
    },
    onError: (error) => Alert.alert("Could not save unit", getApiError(error).message),
  });
  const deleteMutation = useMutation({
    mutationFn: deleteUnit,
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ["units"] });
      Alert.alert("Deleted", response.message ?? "Unit deleted successfully.");
    },
    onError: (error) => Alert.alert("Could not delete unit", getApiError(error).message),
  });
  const units = unitsQuery.data?.data ?? [];

  const openForm = (unit: Unit | null) => {
    setEditing(unit);
    setForm(
      unit
        ? {
            name: unit.name,
            code: unit.code,
            type: unit.type,
            factor: String(unit.factor),
          }
        : emptyForm,
    );
  };
  const submit = () => {
    if (form.name.trim().length < 1 || form.name.trim().length > 50) {
      Alert.alert("Invalid unit", "Enter a unit name of up to 50 characters.");
      return;
    }
    if (!/^[a-zA-Z][a-zA-Z0-9._-]{0,19}$/.test(form.code.trim())) {
      Alert.alert("Invalid code", "Enter a short code such as kg, ml, or pcs.");
      return;
    }
    if (!/^[a-zA-Z][a-zA-Z0-9_-]{0,29}$/.test(form.type.trim())) {
      Alert.alert("Invalid type", "Enter a type such as weight, volume, or count.");
      return;
    }
    if (!Number.isFinite(Number(form.factor)) || Number(form.factor) <= 0) {
      Alert.alert("Invalid factor", "Conversion factor must be greater than zero.");
      return;
    }
    saveMutation.mutate();
  };
  const confirmDelete = (unit: Unit) => {
    Alert.alert("Delete unit?", `Delete ${unit.name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteMutation.mutate(unit.uuid),
      },
    ]);
  };

  return (
    <Page
      backTitle="Configuration"
      eyebrow="CONFIGURATION"
      title="Units"
      subtitle="Manage units used in transaction quantities."
      headerAction={<Button label="Add" size="sm" onPress={() => openForm(null)} />}
      refreshing={unitsQuery.isFetching}
      onRefresh={() => void unitsQuery.refetch()}
    >
      {unitsQuery.isPending ? (
        <LoadingState label="Loading units…" />
      ) : unitsQuery.isError ? (
        <ErrorState
          message={getApiError(unitsQuery.error).message}
          retry={() => void unitsQuery.refetch()}
        />
      ) : units.length === 0 ? (
        <EmptyState title="No units" message="Add a unit to get started." />
      ) : (
        <View style={styles.list}>
          {units.map((unit) => (
            <View style={styles.card} key={unit.uuid}>
              <View style={styles.icon}>
                <SymbolView
                  name={{ ios: "ruler", android: "straighten", web: "straighten" }}
                  size={19}
                  tintColor={colors.brand600}
                />
              </View>
              <View style={styles.grow}>
                <Text style={styles.name}>{unit.name}</Text>
                <Text style={styles.unitMeta}>
                  {unit.code} · {unit.type} · factor {unit.factor}
                </Text>
                <Text style={styles.scope}>{unit.can_manage ? "Business unit" : "System unit"}</Text>
              </View>
              {unit.can_manage ? (
                <View style={styles.actions}>
                  <Button label="Edit" variant="ghost" size="sm" onPress={() => openForm(unit)} />
                  <Button label="Delete" variant="danger" size="sm" onPress={() => confirmDelete(unit)} />
                </View>
              ) : null}
            </View>
          ))}
        </View>
      )}

      <BottomSheet
        visible={editing !== undefined}
        onClose={() => setEditing(undefined)}
        contentContainerStyle={styles.dialog}
      >
        <Text style={styles.dialogTitle}>{editing ? "Edit unit" : "Add unit"}</Text>
        <Input label="Unit name" value={form.name} onChangeText={(name) => setForm((current) => ({ ...current, name }))} placeholder="Kilogram" autoFocus maxLength={50} />
        <Input label="Code" value={form.code} onChangeText={(code) => setForm((current) => ({ ...current, code }))} placeholder="kg" autoCapitalize="none" maxLength={20} />
        <Input label="Type" value={form.type} onChangeText={(type) => setForm((current) => ({ ...current, type }))} placeholder="weight" autoCapitalize="none" maxLength={30} />
        <Input label="Conversion factor" value={form.factor} onChangeText={(factor) => setForm((current) => ({ ...current, factor }))} placeholder="1" keyboardType="decimal-pad" />
        <View style={styles.dialogActions}>
          <Button label="Cancel" variant="ghost" onPress={() => setEditing(undefined)} />
          <Button label="Save" loading={saveMutation.isPending} onPress={submit} />
        </View>
      </BottomSheet>
    </Page>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md },
  card: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    padding: spacing.lg,
  },
  icon: {
    alignItems: "center",
    backgroundColor: colors.brand50,
    borderRadius: radii.md,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  grow: { flex: 1, minWidth: 100 },
  name: { color: colors.ink, fontFamily: typography.fontFamilyExtraBold, fontSize: 15 },
  unitMeta: { color: colors.brand600, fontFamily: typography.fontFamilyBold, fontSize: 10, marginTop: 2 },
  scope: { color: colors.slate500, fontFamily: typography.fontFamilyRegular, fontSize: 10, marginTop: 2 },
  actions: { flexDirection: "row", gap: spacing.xs },
  dialog: {
    gap: spacing.lg,
  },
  dialogTitle: { color: colors.ink, fontFamily: typography.fontFamilyExtraBold, fontSize: 20 },
  dialogActions: { flexDirection: "row", gap: spacing.sm, justifyContent: "flex-end" },
});
