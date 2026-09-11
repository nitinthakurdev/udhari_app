import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Controller, SubmitHandler, useForm } from "react-hook-form";
import { StyleSheet, Text, View } from "react-native";

import AuthScaffold from "@/components/auth/AuthScaffold";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { colors, radii, spacing, typography } from "@/constants/theme";

type ForgotPasswordFormValues = {
  email: string;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordScreen() {
  const {
    control,
    handleSubmit,
    formState: { isSubmitting, isSubmitSuccessful },
  } = useForm<ForgotPasswordFormValues>({
    defaultValues: { email: "" },
    mode: "onTouched",
  });

  const onSubmit: SubmitHandler<ForgotPasswordFormValues> = async (values) => {
    const payload = { email: values.email.trim().toLowerCase() };

    // Pass `payload` to the forgot-password API when the app's API client is added.
    await Promise.resolve(payload);
  };

  return (
    <AuthScaffold
      eyebrow="ACCOUNT RECOVERY"
      title="Reset your password"
      subtitle="Enter your account email and we'll send you a secure reset link."
      footer={
        <>
          <Text style={styles.footerText}>Remember your password?</Text>
          <Button
            label="Sign in"
            variant="secondary"
            size="sm"
            onPress={() => router.replace("/(auth)/login")}
          />
        </>
      }
    >
      <View style={styles.form}>
        <Controller
          control={control}
          name="email"
          rules={{
            required: "Email is required.",
            maxLength: { value: 254, message: "Email is too long." },
            pattern: { value: emailPattern, message: "Enter a valid email address." },
          }}
          render={({ field: { onBlur, onChange, value }, fieldState: { error } }) => (
            <Input
              label="Email address"
              placeholder="you@example.com"
              value={value}
              onBlur={onBlur}
              onChangeText={onChange}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              returnKeyType="send"
              textContentType="emailAddress"
              autoComplete="email"
              errorText={error?.message}
              onSubmitEditing={() => void handleSubmit(onSubmit)()}
              leftIcon={(color) => (
                <SymbolView
                  name={{ ios: "envelope", android: "mail", web: "mail" }}
                  size={18}
                  tintColor={color}
                />
              )}
            />
          )}
        />

        {isSubmitSuccessful ? (
          <View accessibilityRole="alert" style={styles.successBox}>
            <SymbolView
              name={{ ios: "checkmark.circle.fill", android: "check_circle", web: "check_circle" }}
              size={20}
              tintColor={colors.brand600}
            />
            <Text style={styles.successText}>
              Email validated. The reset request is ready for the API.
            </Text>
          </View>
        ) : null}

        <Button
          label="Send Reset Link"
          fullWidth
          size="lg"
          loading={isSubmitting}
          rightIcon={(color) => (
            <SymbolView
              name={{ ios: "paperplane", android: "send", web: "send" }}
              size={18}
              tintColor={color}
            />
          )}
          onPress={() => void handleSubmit(onSubmit)()}
        />
      </View>
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.xl },
  successBox: {
    alignItems: "center",
    backgroundColor: colors.brand50,
    borderRadius: radii.md,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
  },
  successText: {
    color: colors.brand700,
    flex: 1,
    fontFamily: typography.fontFamilyMedium,
    fontSize: 12,
    lineHeight: 18,
  },
  footerText: {
    color: colors.slate500,
    fontFamily: typography.fontFamilyRegular,
    fontSize: 13,
  },
});
