import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Controller, SubmitHandler, useForm } from "react-hook-form";
import { StyleSheet, Text, View } from "react-native";

import AuthScaffold from "@/components/auth/AuthScaffold";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { colors, radii, spacing, typography } from "@/constants/theme";

type LoginFormValues = {
  identifier: string;
  password: string;
};

const identifierPattern = /^(?:[^\s@]+@[^\s@]+\.[^\s@]+|[a-zA-Z0-9_]{3,30})$/;

export default function LoginScreen() {
  const {
    control,
    handleSubmit,
    formState: { isSubmitting, isSubmitSuccessful },
  } = useForm<LoginFormValues>({
    defaultValues: { identifier: "", password: "" },
    mode: "onTouched",
  });

  const onSubmit: SubmitHandler<LoginFormValues> = async (values) => {
    const payload = {
      identifier: values.identifier.trim().toLowerCase(),
      password: values.password,
    };

    // Pass `payload` to the sign-in API when the app's API client is added.
    await Promise.resolve(payload);
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
              render={({ field: { onBlur, onChange, value }, fieldState: { error } }) => (
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
                maxLength: { value: 72, message: "Password cannot exceed 72 characters." },
              }}
              render={({ field: { onBlur, onChange, value }, fieldState: { error } }) => (
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
              textStyle={{color:"blue"}}
              onPress={() => router.push("/(auth)/forgot-password")}
              style={styles.forgotButton}
            />

            {isSubmitSuccessful ? (
              <Text accessibilityRole="alert" style={styles.successText}>
                Form validated. Your sign-in payload is ready for the API.
              </Text>
            ) : null}

            <Button
              label="Sign In"
              fullWidth
              size="lg"
              loading={isSubmitting}
              rightIcon={(color) => (
                <SymbolView
                  name={{ ios: "arrow.right", android: "arrow_forward", web: "arrow_forward" }}
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
  successText: {
    backgroundColor: colors.brand50,
    borderRadius: radii.sm,
    color: colors.brand700,
    fontFamily: typography.fontFamilyMedium,
    fontSize: 12,
    lineHeight: 18,
    padding: spacing.md,
  },
  switchText: { color: colors.slate500, fontFamily: typography.fontFamilyRegular, fontSize: 13 },
});
