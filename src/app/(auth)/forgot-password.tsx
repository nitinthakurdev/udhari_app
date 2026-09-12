import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useMutation } from "@tanstack/react-query";
import { Controller, SubmitHandler, useForm } from "react-hook-form";
import { Alert, StyleSheet, Text, View } from "react-native";

import AuthScaffold from "@/components/auth/AuthScaffold";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { colors, spacing, typography } from "@/constants/theme";
import { forgotPassword } from "@/lib/api/auth";
import { getApiError } from "@/lib/api/errors";

type ForgotPasswordFormValues = {
  email: string;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordScreen() {
  const { control, handleSubmit } = useForm<ForgotPasswordFormValues>({
    defaultValues: { email: "" },
    mode: "onTouched",
  });

  const forgotMutation = useMutation({
    mutationFn: forgotPassword,
    onSuccess: (response) =>
      Alert.alert(
        "Check your email",
        response.message ?? "Reset instructions sent.",
      ),
    onError: (error) =>
      Alert.alert("Request failed", getApiError(error).message),
  });

  const onSubmit: SubmitHandler<ForgotPasswordFormValues> = (values) => {
    forgotMutation.mutate(values.email.trim().toLowerCase());
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
            pattern: {
              value: emailPattern,
              message: "Enter a valid email address.",
            },
          }}
          render={({
            field: { onBlur, onChange, value },
            fieldState: { error },
          }) => (
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

        <Button
          label="Send Reset Link"
          fullWidth
          size="lg"
          loading={forgotMutation.isPending}
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
  footerText: {
    color: colors.slate500,
    fontFamily: typography.fontFamilyRegular,
    fontSize: 13,
  },
});
