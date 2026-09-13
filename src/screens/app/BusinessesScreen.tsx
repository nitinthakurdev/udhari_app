import Page from "@/components/app/Page";
import { AddressAutocomplete } from "@/components/app/AddressAutocomplete";
import { EmptyState, ErrorState, LoadingState } from "@/components/app/States";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { colors, radii, spacing, typography } from "@/constants/theme";
import { getCurrentUser } from "@/lib/api/auth";
import {
  createBusiness,
  deleteBusiness,
  getBusinesses,
  setDefaultBusiness,
  updateBusiness,
} from "@/lib/api/businesses";
import { getApiError } from "@/lib/api/errors";
import { useAuthStore } from "@/stores/authStore";
import type { Business, BusinessPayload } from "@/types/models";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SymbolView } from "expo-symbols";
import {
  Controller,
  useForm,
  type Control,
  type FieldPath,
  type RegisterOptions,
} from "react-hook-form";
import { useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type KeyboardTypeOptions,
} from "react-native";

interface BusinessFormValues {
  name: string;
  country: string;
  state: string;
  city: string;
  pincode: string;
  address: string;
  address_2: string;
}

const emptyForm: BusinessFormValues = {
  name: "",
  country: "India",
  state: "",
  city: "",
  pincode: "",
  address: "",
  address_2: "",
};

export default function BusinessesScreen() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const activeBusiness = useAuthStore((state) => state.activeBusiness);
  const setActiveBusiness = useAuthStore((state) => state.setActiveBusiness);
  const businessesQuery = useQuery({
    queryKey: ["businesses"],
    queryFn: getBusinesses,
  });
  const form = useForm<BusinessFormValues>({ defaultValues: emptyForm });
  const [formBusiness, setFormBusiness] = useState<Business | null | undefined>(
    undefined,
  );

  const refreshUser = async () => {
    const currentUser = await getCurrentUser();
    setUser(currentUser.data);
    return currentUser.data;
  };
  const saveMutation = useMutation({
    mutationFn: ({
      uuid,
      payload,
    }: {
      uuid?: string;
      payload: BusinessPayload;
    }) => (uuid ? updateBusiness(uuid, payload) : createBusiness(payload)),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ["businesses"] });
      const currentUser = await refreshUser();
      if (!activeBusiness || formBusiness?.uuid === activeBusiness.uuid) {
        setActiveBusiness(response.data);
      } else if (!currentUser.business) {
        setActiveBusiness(response.data);
      }
      setFormBusiness(undefined);
      Alert.alert("Saved", response.message ?? "Business saved successfully.");
    },
    onError: (error) =>
      Alert.alert("Could not save business", getApiError(error).message),
  });
  const defaultMutation = useMutation({
    mutationFn: setDefaultBusiness,
    onSuccess: async (response) => {
      setActiveBusiness(response.data);
      await refreshUser();
      Alert.alert(
        "Default updated",
        response.message ?? "Default business updated.",
      );
    },
    onError: (error) =>
      Alert.alert("Could not update default", getApiError(error).message),
  });
  const deleteMutation = useMutation({
    mutationFn: deleteBusiness,
    onSuccess: async (response, uuid) => {
      await queryClient.invalidateQueries({ queryKey: ["businesses"] });
      const currentUser = await refreshUser();
      if (activeBusiness?.uuid === uuid) {
        setActiveBusiness(currentUser.business ?? null);
      }
      Alert.alert(
        "Deleted",
        response.message ?? "Business deleted successfully.",
      );
    },
    onError: (error) =>
      Alert.alert("Could not delete business", getApiError(error).message),
  });

  const openForm = (business: Business | null) => {
    form.reset(
      business
        ? {
            name: business.name,
            country: business.country,
            state: business.state,
            city: business.city,
            pincode: business.pincode,
            address: business.address,
            address_2: business.address_2 ?? "",
          }
        : emptyForm,
    );
    setFormBusiness(business);
  };
  const submit = form.handleSubmit((values) => {
    saveMutation.mutate({
      uuid: formBusiness?.uuid,
      payload: {
        ...values,
        name: values.name.trim(),
        country: values.country.trim(),
        state: values.state.trim(),
        city: values.city.trim(),
        pincode: values.pincode.trim(),
        address: values.address.trim(),
        address_2: values.address_2.trim() || null,
      },
    });
  });
  const confirmDelete = (business: Business) => {
    Alert.alert("Delete business?", `Permanently delete ${business.name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteMutation.mutate(business.uuid),
      },
    ]);
  };
  const businesses = businessesQuery.data?.data ?? [];

  return (
    <Page
      eyebrow="MANAGEMENT"
      title="Businesses"
      subtitle="Create and manage your business profiles and branches."
      headerAction={
        <Button label="Add" size="sm" onPress={() => openForm(null)} />
      }
      refreshing={businessesQuery.isFetching}
      onRefresh={() => void businessesQuery.refetch()}
    >
      {businessesQuery.isPending ? (
        <LoadingState label="Loading businesses…" />
      ) : businessesQuery.isError ? (
        <ErrorState
          message={getApiError(businessesQuery.error).message}
          retry={() => void businessesQuery.refetch()}
        />
      ) : businesses.length === 0 ? (
        <EmptyState
          title="No businesses yet"
          message="Add your first business to get started."
        />
      ) : (
        <View style={styles.cards}>
          {businesses.map((business) => {
            const isDefault = user?.business?.uuid === business.uuid;
            return (
              <View style={styles.card} key={business.uuid}>
                <View style={styles.row}>
                  <View style={styles.icon}>
                    <SymbolView
                      name={{
                        ios: "storefront",
                        android: "storefront",
                        web: "storefront",
                      }}
                      size={20}
                      tintColor={colors.brand600}
                    />
                  </View>
                  <View style={styles.grow}>
                    <Text numberOfLines={1} style={styles.name}>
                      {business.name}
                    </Text>
                    <Text style={styles.slug}>/{business.slug}</Text>
                  </View>
                  {isDefault ? <Text style={styles.badge}>DEFAULT</Text> : null}
                </View>
                <Text style={styles.address}>
                  {business.address}, {business.city}, {business.state}{" "}
                  {business.pincode}
                </Text>
                <View style={styles.actions}>
                  {!isDefault ? (
                    <Button
                      label="Set default"
                      variant="outline"
                      size="sm"
                      loading={
                        defaultMutation.isPending &&
                        defaultMutation.variables === business.uuid
                      }
                      onPress={() => defaultMutation.mutate(business.uuid)}
                    />
                  ) : null}
                  <Button
                    label="Edit"
                    variant="ghost"
                    size="sm"
                    onPress={() => openForm(business)}
                  />
                  <Button
                    label="Delete"
                    variant="danger"
                    size="sm"
                    onPress={() => confirmDelete(business)}
                  />
                </View>
              </View>
            );
          })}
        </View>
      )}

      <Modal
        visible={formBusiness !== undefined}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setFormBusiness(undefined)}
      >
        <ScrollView
          style={styles.modal}
          contentContainerStyle={styles.modalContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.modalHeader}>
            <View style={styles.grow}>
              <Text style={styles.modalEyebrow}>
                {formBusiness ? "UPDATE" : "CREATE"}
              </Text>
              <Text style={styles.modalTitle}>
                {formBusiness ? "Edit business" : "Add business"}
              </Text>
            </View>
            <Button
              label="Close"
              variant="ghost"
              size="sm"
              onPress={() => setFormBusiness(undefined)}
            />
          </View>
          <View style={styles.form}>
            <BusinessField
              control={form.control}
              name="name"
              label="Business name"
              placeholder="Amit Kirana"
              rules={{
                required: "Business name is required.",
                minLength: { value: 2, message: "Use at least 2 characters." },
              }}
            />
            <Controller
              control={form.control}
              name="address"
              rules={{
                required: "Address is required.",
                minLength: { value: 5, message: "Use at least 5 characters." },
              }}
              render={({ field: { onChange, value }, fieldState: { error } }) => (
                <AddressAutocomplete
                  value={value}
                  errorText={error?.message}
                  onChangeText={onChange}
                  onAddressSelected={(address) => {
                    const options = { shouldDirty: true, shouldValidate: true };
                    form.setValue("address", address.address, options);
                    if (address.address_2) form.setValue("address_2", address.address_2, options);
                    if (address.city) form.setValue("city", address.city, options);
                    if (address.state) form.setValue("state", address.state, options);
                    if (address.pincode) form.setValue("pincode", address.pincode, options);
                    if (address.country) form.setValue("country", address.country, options);
                  }}
                />
              )}
            />
            <BusinessField
              control={form.control}
              name="address_2"
              label="Additional address"
              placeholder="Floor, landmark, or area (optional)"
            />
            <BusinessField
              control={form.control}
              name="country"
              label="Country"
              placeholder="India"
              rules={{ required: "Country is required." }}
            />
            <BusinessField
              control={form.control}
              name="state"
              label="State"
              placeholder="Delhi"
              rules={{ required: "State is required." }}
            />
            <BusinessField
              control={form.control}
              name="city"
              label="City"
              placeholder="New Delhi"
              rules={{ required: "City is required." }}
            />
            <BusinessField
              control={form.control}
              name="pincode"
              label="Pincode"
              placeholder="110001"
              keyboardType="number-pad"
              rules={{
                required: "Pincode is required.",
                pattern: {
                  value: /^\d{6}$/,
                  message: "Enter a 6-digit pincode.",
                },
              }}
            />
            <Button
              label={formBusiness ? "Save changes" : "Create business"}
              fullWidth
              size="lg"
              loading={saveMutation.isPending}
              onPress={() => void submit()}
            />
          </View>
        </ScrollView>
      </Modal>
    </Page>
  );
}

function BusinessField({
  control,
  name,
  label,
  placeholder,
  rules,
  keyboardType,
}: {
  control: Control<BusinessFormValues>;
  name: FieldPath<BusinessFormValues>;
  label: string;
  placeholder: string;
  rules?: RegisterOptions<BusinessFormValues>;
  keyboardType?: KeyboardTypeOptions;
}) {
  return (
    <Controller
      control={control}
      name={name}
      rules={rules}
      render={({
        field: { onBlur, onChange, value },
        fieldState: { error },
      }) => (
        <Input
          label={label}
          placeholder={placeholder}
          value={value}
          onBlur={onBlur}
          onChangeText={onChange}
          keyboardType={keyboardType}
          errorText={error?.message}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  cards: { gap: spacing.md },
  card: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  row: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  icon: {
    alignItems: "center",
    backgroundColor: colors.brand50,
    borderRadius: radii.md,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  grow: { flex: 1 },
  name: {
    color: colors.ink,
    fontFamily: typography.fontFamilyExtraBold,
    fontSize: 15,
  },
  slug: {
    color: colors.brand600,
    fontFamily: typography.fontFamilyMedium,
    fontSize: 10,
    marginTop: 2,
  },
  badge: {
    backgroundColor: colors.brand50,
    borderRadius: radii.full,
    color: colors.brand700,
    fontFamily: typography.fontFamilyBold,
    fontSize: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  address: {
    color: colors.slate500,
    fontFamily: typography.fontFamilyRegular,
    fontSize: 12,
    lineHeight: 18,
  },
  actions: {
    alignItems: "center",
    borderTopColor: colors.line,
    borderTopWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
  modal: { backgroundColor: colors.surface, flex: 1 },
  modalContent: { padding: spacing.xl, paddingBottom: 48 },
  modalHeader: {
    alignItems: "center",
    flexDirection: "row",
    marginBottom: spacing.xl,
  },
  modalEyebrow: {
    color: colors.brand600,
    fontFamily: typography.fontFamilyExtraBold,
    fontSize: 9,
    letterSpacing: 1.1,
  },
  modalTitle: {
    color: colors.ink,
    fontFamily: typography.fontFamilyExtraBold,
    fontSize: 26,
    marginTop: 3,
  },
  form: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.lg,
    padding: spacing.lg,
  },
});
