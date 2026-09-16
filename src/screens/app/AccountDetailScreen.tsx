import { Button } from "@/components/ui/Button";
import TopHeader from "@/components/app/TopHeader";
import { Input } from "@/components/ui/Input";
import { colors, radii, spacing, typography } from "@/constants/theme";
import { changePassword } from "@/lib/api/auth";
import { getApiError } from "@/lib/api/errors";
import { useAuthStore } from "@/stores/authStore";
import { useMutation } from "@tanstack/react-query";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { Controller, useForm } from "react-hook-form";
import type { ReactNode } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";

export type AccountSection =
  | "personal"
  | "password"
  | "privacy"
  | "help"
  | "faq";

interface PasswordValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const strongPassword = (value: string) =>
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,72}$/.test(value) ||
  "Use 8–72 characters with upper, lower, number, and symbol.";

const sectionTitles: Record<AccountSection, string> = {
  personal: "Personal info",
  password: "Account security",
  privacy: "Privacy",
  help: "Help & support",
  faq: "Frequently asked questions",
};

export default function AccountDetailScreen({
  section,
}: {
  section: AccountSection;
}) {
  const user = useAuthStore((state) => state.user);
  const form = useForm<PasswordValues>({
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
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

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <TopHeader title={sectionTitles[section]} />
      {section === "personal" ? (
        <Panel
          icon={{
            ios: "person.text.rectangle",
            android: "badge",
            web: "badge",
          }}
          title="Personal information"
          subtitle="Your account and contact details"
        >
          <Detail
            icon={{ ios: "person", android: "person", web: "person" }}
            label="Full name"
            value={fullName}
          />
          <Detail
            icon={{
              ios: "at",
              android: "alternate_email",
              web: "alternate_email",
            }}
            label="Username"
            value={`@${user?.username ?? "—"}`}
          />
          <Detail
            icon={{ ios: "envelope", android: "mail", web: "mail" }}
            label="Email"
            value={user?.email ?? "—"}
            verified={Boolean(user?.is_email_verified)}
          />
          <Detail
            icon={{ ios: "phone", android: "phone", web: "phone" }}
            label="Phone"
            value={
              `${user?.dial_code ?? ""} ${user?.phone ?? ""}`.trim() || "—"
            }
          />
        </Panel>
      ) : null}

      {section === "password" ? (
        <Panel
          icon={{ ios: "key", android: "key", web: "key" }}
          title="Change password"
          subtitle="Use a strong, unique password"
        >
          <View style={styles.securityNote}>
            <SymbolView
              name={{
                ios: "checkmark.shield",
                android: "verified_user",
                web: "verified_user",
              }}
              size={18}
              tintColor={colors.brand600}
            />
            <Text style={styles.securityNoteText}>
              Use at least 8 characters with uppercase, lowercase, a number,
              and a symbol.
            </Text>
          </View>
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
        </Panel>
      ) : null}

      {section === "privacy" ? (
        <Panel
          icon={{ ios: "lock.shield", android: "shield", web: "shield" }}
          title="Privacy policy"
          subtitle="How your information is handled"
        >
          <Info
            icon={{
              ios: "person.crop.circle",
              android: "person",
              web: "person",
            }}
            title="Your data"
          >
            We use your account, business, and transaction information only to
            provide Udhari features and keep your records in sync.
          </Info>
          <Info
            icon={{ ios: "lock", android: "lock", web: "lock" }}
            title="Security"
          >
            Your session is protected and sensitive changes require
            authentication. Never share your password or verification codes.
          </Info>
          <Info
            icon={{
              ios: "slider.horizontal.3",
              android: "tune",
              web: "tune",
            }}
            title="Your control"
          >
            You control which businesses and customers you connect with.
            Pending requests can be accepted or declined from Requests.
          </Info>
        </Panel>
      ) : null}

      {section === "help" ? (
        <Panel
          icon={{
            ios: "questionmark.circle",
            android: "help",
            web: "help",
          }}
          title="Help & support"
          subtitle="Quick guidance when you need it"
        >
          <Info
            icon={{ ios: "link", android: "link", web: "link" }}
            title="Connection help"
          >
            Open Requests to review invitations. Business accounts can manage
            customers and businesses from Configuration.
          </Info>
          <Info
            icon={{
              ios: "person.badge.key",
              android: "manage_accounts",
              web: "manage_accounts",
            }}
            title="Account help"
          >
            Confirm that your email and phone are correct, then change your
            password from Account settings whenever needed.
          </Info>
          <Info
            icon={{ ios: "envelope", android: "mail", web: "mail" }}
            title="Need more help?"
          >
            Contact your Udhari administrator and include a short description
            of the issue. Do not include your password.
          </Info>
        </Panel>
      ) : null}

      {section === "faq" ? (
        <Panel
          icon={{ ios: "text.bubble", android: "chat", web: "chat" }}
          title="Frequently asked questions"
          subtitle="Answers to common questions"
        >
          <Info
            icon={{ ios: "tray", android: "inbox", web: "inbox" }}
            title="Where are connection requests?"
          >
            All incoming and sent requests are available from the Requests tab.
          </Info>
          <Info
            icon={{ ios: "gearshape", android: "settings", web: "settings" }}
            title="Where are business settings?"
          >
            Business accounts can open Configuration to manage businesses,
            units, customers, and business connections.
          </Info>
          <Info
            icon={{ ios: "key", android: "key", web: "key" }}
            title="How do I secure my account?"
          >
            Use a unique password with uppercase and lowercase letters, a
            number, and a symbol.
          </Info>
        </Panel>
      ) : null}
    </ScrollView>
  );
}

function Panel({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: SymbolViewProps["name"];
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.panel}>
      <View style={styles.panelHeader}>
        <View style={styles.headerIcon}>
          <SymbolView name={icon} size={21} tintColor={colors.brand600} />
        </View>
        <View style={styles.grow}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
      </View>
      {children}
    </View>
  );
}

function Detail({
  icon,
  label,
  value,
  verified = false,
}: {
  icon: SymbolViewProps["name"];
  label: string;
  value: string;
  verified?: boolean;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <SymbolView name={icon} size={17} tintColor={colors.brand600} />
      </View>
      <View style={styles.grow}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
      {verified ? (
        <View style={styles.verified}>
          <SymbolView
            name={{ ios: "checkmark", android: "check", web: "check" }}
            size={11}
            tintColor={colors.brand700}
          />
          <Text style={styles.verifiedText}>Verified</Text>
        </View>
      ) : null}
    </View>
  );
}

function Info({
  icon,
  title,
  children,
}: {
  icon: SymbolViewProps["name"];
  title: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.info}>
      <View style={styles.rowIcon}>
        <SymbolView name={icon} size={17} tintColor={colors.brand600} />
      </View>
      <View style={styles.grow}>
        <Text style={styles.infoTitle}>{title}</Text>
        <Text style={styles.infoText}>{children}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.surface, flex: 1 },
  content: {
    alignSelf: "center",
    gap: 24,
    maxWidth: 760,
    paddingBottom: 48,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    width: "100%",
  },
  panel: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: 20,
    borderWidth: 1,
    elevation: 1,
    gap: spacing.lg,
    padding: spacing.xl,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
  },
  panelHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    paddingBottom: spacing.xs,
  },
  headerIcon: {
    alignItems: "center",
    backgroundColor: colors.brand50,
    borderRadius: radii.md,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  grow: { flex: 1 },
  title: {
    color: colors.ink,
    fontFamily: typography.fontFamilyExtraBold,
    fontSize: 18,
  },
  subtitle: {
    color: colors.slate500,
    fontFamily: typography.fontFamilyRegular,
    fontSize: 11,
    marginTop: 3,
  },
  row: {
    alignItems: "center",
    borderTopColor: colors.line,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 60,
    paddingTop: spacing.lg,
  },
  rowIcon: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  label: {
    color: colors.slate500,
    fontFamily: typography.fontFamilyMedium,
    fontSize: 10,
  },
  value: {
    color: colors.ink,
    fontFamily: typography.fontFamilyBold,
    fontSize: 13,
    marginTop: 2,
  },
  verified: {
    alignItems: "center",
    backgroundColor: colors.brand50,
    borderRadius: radii.full,
    flexDirection: "row",
    gap: 3,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  verifiedText: {
    color: colors.brand700,
    fontFamily: typography.fontFamilyBold,
    fontSize: 9,
  },
  info: {
    alignItems: "flex-start",
    borderTopColor: colors.line,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    paddingTop: spacing.lg,
  },
  infoTitle: {
    color: colors.ink,
    fontFamily: typography.fontFamilyBold,
    fontSize: 13,
  },
  infoText: {
    color: colors.slate500,
    fontFamily: typography.fontFamilyRegular,
    fontSize: 12,
    lineHeight: 19,
    marginTop: spacing.xs,
  },
  securityNote: {
    alignItems: "flex-start",
    backgroundColor: colors.brand50,
    borderColor: colors.brand200,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
  },
  securityNoteText: {
    color: colors.slate700,
    flex: 1,
    fontFamily: typography.fontFamilyMedium,
    fontSize: 11,
    lineHeight: 17,
  },
  form: { gap: spacing.lg },
});
