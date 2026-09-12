import Page from "@/components/app/Page";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { colors, radii, spacing, typography } from "@/constants/theme";
import { changePassword, logout } from "@/lib/api/auth";
import { getApiError } from "@/lib/api/errors";
import { useAuthStore } from "@/stores/authStore";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { Controller, useForm } from "react-hook-form";
import { Alert, StyleSheet, Text, View } from "react-native";

interface PasswordValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const strongPassword = (value: string) =>
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,72}$/.test(value) ||
  "Use 8–72 characters with upper, lower, number, and symbol.";

export default function ProfileScreen() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);
  const form = useForm<PasswordValues>({
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });
  const logoutMutation = useMutation({
    mutationFn: logout,
    onSettled: () => {
      queryClient.clear();
      clearSession();
    },
  });
  const passwordMutation = useMutation({
    mutationFn: ({ currentPassword, newPassword }: PasswordValues) =>
      changePassword(currentPassword, newPassword),
    onSuccess: (response) => {
      form.reset();
      Alert.alert(
        "Password changed",
        response.message ?? "Your password was updated.",
      );
    },
    onError: (error) =>
      Alert.alert("Could not change password", getApiError(error).message),
  });
  const submitPassword = form.handleSubmit((values) =>
    passwordMutation.mutate(values),
  );
  const fullName = user
    ? [user.first_name, user.last_name].filter(Boolean).join(" ")
    : "Udhari user";
  const initials = user
    ? `${user.first_name[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase()
    : "U";

  return (
    <Page
      eyebrow="ACCOUNT"
      title="Profile & security"
      subtitle="Review your details and protect your account."
    >
      <View style={styles.hero}>
        <View style={styles.avatar}>
          <Text style={styles.initials}>{initials}</Text>
        </View>
        <View style={styles.grow}>
          <Text style={styles.name}>{fullName}</Text>
          <Text style={styles.username}>@{user?.username}</Text>
          <Text style={styles.role}>{user?.user_role?.name ?? "User"}</Text>
        </View>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Personal information</Text>
        <Detail
          icon={{ ios: "envelope", android: "mail", web: "mail" }}
          label="Email"
          value={user?.email ?? "—"}
        />
        <Detail
          icon={{ ios: "phone", android: "phone", web: "phone" }}
          label="Phone"
          value={`${user?.dial_code ?? ""} ${user?.phone ?? ""}`.trim()}
        />
        <Detail
          icon={{
            ios: "checkmark.shield",
            android: "verified_user",
            web: "verified_user",
          }}
          label="Email status"
          value={user?.is_email_verified ? "Verified" : "Not verified"}
        />
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Change password</Text>
        <View style={styles.form}>
          <Controller
            control={form.control}
            name="currentPassword"
            rules={{ required: "Current password is required." }}
            render={({
              field: { onBlur, onChange, value },
              fieldState: { error },
            }) => (
              <Input
                label="Current password"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                isPassword
                errorText={error?.message}
              />
            )}
          />
          <Controller
            control={form.control}
            name="newPassword"
            rules={{
              required: "New password is required.",
              validate: strongPassword,
            }}
            render={({
              field: { onBlur, onChange, value },
              fieldState: { error },
            }) => (
              <Input
                label="New password"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                isPassword
                errorText={error?.message}
              />
            )}
          />
          <Controller
            control={form.control}
            name="confirmPassword"
            rules={{
              required: "Confirm your password.",
              validate: (value) =>
                value === form.getValues("newPassword") ||
                "Passwords do not match.",
            }}
            render={({
              field: { onBlur, onChange, value },
              fieldState: { error },
            }) => (
              <Input
                label="Confirm password"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                isPassword
                errorText={error?.message}
              />
            )}
          />
          <Button
            label="Update password"
            fullWidth
            loading={passwordMutation.isPending}
            onPress={() => void submitPassword()}
          />
        </View>
      </View>

      <Button
        label="Log out"
        fullWidth
        variant="danger"
        loading={logoutMutation.isPending}
        onPress={() => logoutMutation.mutate()}
      />
    </Page>
  );
}

function Detail({
  icon,
  label,
  value,
}: {
  icon: SymbolViewProps["name"];
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detail}>
      <SymbolView name={icon} size={17} tintColor={colors.brand600} />
      <View style={styles.grow}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: "center",
    backgroundColor: colors.ink,
    borderRadius: radii.lg,
    flexDirection: "row",
    gap: spacing.lg,
    padding: spacing.xl,
  },
  avatar: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,.1)",
    borderColor: "rgba(255,255,255,.15)",
    borderRadius: radii.lg,
    borderWidth: 1,
    height: 64,
    justifyContent: "center",
    width: 64,
  },
  initials: {
    color: colors.white,
    fontFamily: typography.fontFamilyExtraBold,
    fontSize: 20,
  },
  grow: { flex: 1 },
  name: {
    color: colors.white,
    fontFamily: typography.fontFamilyExtraBold,
    fontSize: 20,
  },
  username: {
    color: colors.brand200,
    fontFamily: typography.fontFamilyMedium,
    fontSize: 11,
    marginTop: 3,
  },
  role: {
    color: colors.slate400,
    fontFamily: typography.fontFamilyRegular,
    fontSize: 10,
    marginTop: spacing.sm,
  },
  panel: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.lg,
    padding: spacing.lg,
  },
  panelTitle: {
    color: colors.ink,
    fontFamily: typography.fontFamilyExtraBold,
    fontSize: 16,
  },
  detail: {
    alignItems: "center",
    borderTopColor: colors.line,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    paddingTop: spacing.md,
  },
  detailLabel: {
    color: colors.slate500,
    fontFamily: typography.fontFamilyMedium,
    fontSize: 10,
  },
  detailValue: {
    color: colors.ink,
    fontFamily: typography.fontFamilyBold,
    fontSize: 13,
    marginTop: 2,
  },
  form: { gap: spacing.lg },
});
