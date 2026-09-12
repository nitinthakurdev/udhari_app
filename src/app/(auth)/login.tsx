import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useMutation } from "@tanstack/react-query";
import { Controller, SubmitHandler, useForm } from "react-hook-form";
import { Alert, StyleSheet, Text, View } from "react-native";

import AuthScaffold from "@/components/auth/AuthScaffold";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { colors, spacing, typography } from "@/constants/theme";
import { login } from "@/lib/api/auth";
import { getApiError } from "@/lib/api/errors";
import { useAuthStore } from "@/stores/authStore";

type LoginFormValues = {
  identifier: string;
  password: string;
};

const identifierPattern = /^(?:[^\s@]+@[^\s@]+\.[^\s@]+|[a-zA-Z0-9_]{3,30})$/;

export default function LoginScreen() {
  const setSession = useAuthStore((state) => state.setSession);
  const { control, handleSubmit } = useForm<LoginFormValues>({
    defaultValues: { identifier: "", password: "" },
    mode: "onTouched",
  });

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: (response) => setSession(response.data),
    onError: (error) =>
      Alert.alert("Sign in failed", getApiError(error).message),
  });

  const onSubmit: SubmitHandler<LoginFormValues> = (values) => {
    loginMutation.mutate({
      identifier: values.identifier.trim().toLowerCase(),
      password: values.password,
    });
  };

  return (
    <AuthScaffold
      eyebrow="GOOD TO SEE YOU AGAIN"
      title="Welcome back"
      subtitle="Sign in to keep your accounts and customer balances up to date."
      footer={
        <>
          <Text style={styles.switchText}>New to Udhari?</Text>
          <Button
            label="Create account"
            variant="secondary"
            size="sm"
            onPress={() => router.replace("/(auth)/account-type")}
          />
        </>
      }
    >
      <View style={styles.form}>
        <Controller
          control={control}
          name="identifier"
          rules={{
            required: "Email or username is required.",
            pattern: {
              value: identifierPattern,
              message: "Enter a valid email or username.",
            },
          }}
          render={({
            field: { onBlur, onChange, value },
            fieldState: { error },
          }) => (
            <Input
              label="Email or username"
              placeholder="you@example.com"
              value={value}
              onBlur={onBlur}
              onChangeText={onChange}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              returnKeyType="next"
              textContentType="username"
              autoComplete="username"
              errorText={error?.message}
              leftIcon={(color) => (
                <SymbolView
                  name={{ ios: "person", android: "person", web: "person" }}
                  size={18}
                  tintColor={color}
                />
              )}
            />
          )}
        />

        <Controller
          control={control}
          name="password"
          rules={{
            required: "Password is required.",
            maxLength: {
              value: 72,
              message: "Password cannot exceed 72 characters.",
            },
          }}
          render={({
            field: { onBlur, onChange, value },
            fieldState: { error },
          }) => (
            <Input
              label="Password"
              placeholder="Enter your password"
              value={value}
              onBlur={onBlur}
              onChangeText={onChange}
              isPassword
              returnKeyType="done"
              textContentType="password"
              autoComplete="current-password"
              errorText={error?.message}
              onSubmitEditing={() => void handleSubmit(onSubmit)()}
              leftIcon={(color) => (
                <SymbolView
                  name={{ ios: "lock", android: "lock", web: "lock" }}
                  size={18}
                  tintColor={color}
                />
              )}
            />
          )}
        />

        <Button
          label="Forgot password?"
          variant="secondary"
          size="sm"
          textStyle={{ color: "blue" }}
          onPress={() => router.push("/(auth)/forgot-password")}
          style={styles.forgotButton}
        />

        <Button
          label="Sign In"
          fullWidth
          size="lg"
          loading={loginMutation.isPending}
          rightIcon={(color) => (
            <SymbolView
              name={{
                ios: "arrow.right",
                android: "arrow_forward",
                web: "arrow_forward",
              }}
              size={19}
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
  forgotButton: { alignSelf: "flex-end", marginTop: -spacing.md },
  switchText: {
    color: colors.slate500,
    fontFamily: typography.fontFamilyRegular,
    fontSize: 13,
  },
});
