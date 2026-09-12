import AuthScaffold from "@/components/auth/AuthScaffold";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { spacing } from "@/constants/theme";
import { resetPassword } from "@/lib/api/auth";
import { getApiError } from "@/lib/api/errors";
import { useMutation } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { Alert, StyleSheet, View } from "react-native";

interface ResetValues {
  password: string;
  confirmPassword: string;
}

export default function ResetPasswordScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const form = useForm<ResetValues>({
    defaultValues: { password: "", confirmPassword: "" },
  });
  const mutation = useMutation({
    mutationFn: (password: string) => resetPassword(token ?? "", password),
    onSuccess: (response) =>
      Alert.alert(
        "Password reset",
        response.message ?? "Your password was reset.",
        [{ text: "Sign in", onPress: () => router.replace("/(auth)/login") }],
      ),
    onError: (error) => Alert.alert("Reset failed", getApiError(error).message),
  });
  const submit = form.handleSubmit(({ password }) => mutation.mutate(password));

  return (
    <AuthScaffold
      eyebrow="ACCOUNT RECOVERY"
      title="Create a new password"
      subtitle="Choose a strong password you have not used before."
      footer={
        <Button
          label="Back to sign in"
          variant="secondary"
          size="sm"
          onPress={() => router.replace("/(auth)/login")}
        />
      }
    >
      <View style={styles.form}>
        <Controller
          control={form.control}
          name="password"
          rules={{
            required: "Password is required.",
            minLength: { value: 8, message: "Use at least 8 characters." },
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
              value === form.getValues("password") || "Passwords do not match.",
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
          label="Reset password"
          fullWidth
          size="lg"
          disabled={!token}
          loading={mutation.isPending}
          onPress={() => void submit()}
        />
      </View>
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({ form: { gap: spacing.xl } });
