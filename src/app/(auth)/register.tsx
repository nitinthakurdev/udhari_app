import { router, useLocalSearchParams } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Controller, SubmitHandler, useForm } from "react-hook-form";
import { StyleSheet, Text, View } from "react-native";

import AuthScaffold from "@/components/auth/AuthScaffold";
import Button from "@/components/ui/Button";
import Checkbox from "@/components/ui/Checkboc";
import Input from "@/components/ui/Input";
import { colors, radii, spacing, typography } from "@/constants/theme";

type RegisterFormValues = {
  first_name: string;
  last_name: string;
  email: string;
  username: string;
  phone: string;
  password: string;
  confirm_password: string;
  accepted_terms: boolean;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const namePattern = /^[\p{L}][\p{L}\s'-]*$/u;

export default function RegisterScreen() {
  const { accountType } = useLocalSearchParams<{ accountType?: string }>();
  const isBusiness = accountType === "business";

  const {
    control,
    getValues,
    handleSubmit,
    formState: { isSubmitting, isSubmitSuccessful },
  } = useForm<RegisterFormValues>({
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      username: "",
      phone: "",
      password: "",
      confirm_password: "",
      accepted_terms: false,
    },
    mode: "onTouched",
  });

  const onSubmit: SubmitHandler<RegisterFormValues> = async ({
    accepted_terms,
    confirm_password,
    ...values
  }) => {
    const payload = {
      ...values,
      first_name: values.first_name.trim(),
      last_name: values.last_name.trim() || null,
      email: values.email.trim().toLowerCase(),
      username: values.username.trim().toLowerCase(),
      phone: values.phone.trim(),
      dial_code: null,
    };

    // Pass `payload` to the sign-up API when the app's API client is added.
    await Promise.resolve({ payload, accepted_terms, confirm_password });
  };

  return (
    <AuthScaffold
      eyebrow={isBusiness ? "BUSINESS ACCOUNT" : "PERSONAL ACCOUNT"}
      title={isBusiness ? "Build your business profile" : "Create your account"}
      subtitle={
        isBusiness
          ? "Create your secure account first. We'll help you set up your business next."
          : "Keep your credits, payments, and balances together in one clear place."
      }
      footer={
        <>
          <Text style={styles.switchText}>Already have an account?</Text>
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
                name="first_name"
                rules={{
                  required: "First name is required.",
                  minLength: { value: 2, message: "Use at least 2 characters." },
                  maxLength: { value: 50, message: "Use no more than 50 characters." },
                  pattern: { value: namePattern, message: "Enter a valid first name." },
                }}
                render={({ field: { onBlur, onChange, value }, fieldState: { error } }) => (
                  <Input
                    label="First name"
                    placeholder="Amit"
                    value={value}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    autoCapitalize="words"
                    textContentType="givenName"
                    autoComplete="name-given"
                    errorText={error?.message}
                  />
                )}
              />

              <Controller
                control={control}
                name="last_name"
                rules={{
                  maxLength: { value: 50, message: "Use no more than 50 characters." },
                  validate: (value) =>
                    !value || namePattern.test(value) || "Enter a valid last name.",
                }}
                render={({ field: { onBlur, onChange, value }, fieldState: { error } }) => (
                  <Input
                    label="Last name"
                    placeholder="Kumar"
                    value={value}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    autoCapitalize="words"
                    textContentType="familyName"
                    autoComplete="name-family"
                    errorText={error?.message}
                  />
                )}
              />

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
                  label="Email"
                  placeholder="you@example.com"
                  value={value}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  autoComplete="email"
                  errorText={error?.message}
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

            <Controller
              control={control}
              name="username"
              rules={{
                required: "Username is required.",
                minLength: { value: 3, message: "Use at least 3 characters." },
                maxLength: { value: 30, message: "Use no more than 30 characters." },
                pattern: {
                  value: /^[a-zA-Z0-9_]+$/,
                  message: "Use only letters, numbers, and underscores.",
                },
              }}
              render={({ field: { onBlur, onChange, value }, fieldState: { error } }) => (
                <Input
                  label="Username"
                  placeholder="amit_kirana"
                  value={value}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="username"
                  autoComplete="username-new"
                  errorText={error?.message}
                  leftIcon={(color) => (
                    <SymbolView
                      name={{ ios: "at", android: "alternate_email", web: "alternate_email" }}
                      size={18}
                      tintColor={color}
                    />
                  )}
                />
              )}
            />

            <Controller
              control={control}
              name="phone"
              rules={{
                required: "Phone number is required.",
                pattern: { value: /^\d{7,15}$/, message: "Enter 7 to 15 digits." },
              }}
              render={({ field: { onBlur, onChange, value }, fieldState: { error } }) => (
                <Input
                  label="Phone number"
                  placeholder="9876543210"
                  value={value}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  keyboardType="phone-pad"
                  textContentType="telephoneNumber"
                  autoComplete="tel"
                  errorText={error?.message}
                  leftIcon={(color) => (
                    <SymbolView
                      name={{ ios: "phone", android: "phone", web: "phone" }}
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
                minLength: { value: 8, message: "Use at least 8 characters." },
                maxLength: { value: 72, message: "Use no more than 72 characters." },
                validate: {
                  lowercase: (value) => /[a-z]/.test(value) || "Add a lowercase letter.",
                  uppercase: (value) => /[A-Z]/.test(value) || "Add an uppercase letter.",
                  number: (value) => /\d/.test(value) || "Add a number.",
                  special: (value) =>
                    /[^a-zA-Z0-9]/.test(value) || "Add a special character.",
                },
              }}
              render={({ field: { onBlur, onChange, value }, fieldState: { error } }) => (
                <Input
                  label="Password"
                  placeholder="Create a strong password"
                  value={value}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  isPassword
                  textContentType="newPassword"
                  autoComplete="new-password"
                  helperText="8–72 characters with upper, lower, number, and symbol."
                  errorText={error?.message}
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

            <Controller
              control={control}
              name="confirm_password"
              rules={{
                required: "Confirm your password.",
                validate: (value) => value === getValues("password") || "Passwords do not match.",
              }}
              render={({ field: { onBlur, onChange, value }, fieldState: { error } }) => (
                <Input
                  label="Confirm password"
                  placeholder="Enter your password again"
                  value={value}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  isPassword
                  returnKeyType="done"
                  textContentType="newPassword"
                  autoComplete="new-password"
                  errorText={error?.message}
                  onSubmitEditing={() => void handleSubmit(onSubmit)()}
                  leftIcon={(color) => (
                    <SymbolView
                      name={{ ios: "lock.shield", android: "shield_lock", web: "shield_lock" }}
                      size={18}
                      tintColor={color}
                    />
                  )}
                />
              )}
            />

            <Controller
              control={control}
              name="accepted_terms"
              rules={{
                validate: (value) =>
                  value || "Please accept the Terms of Service and Privacy Policy.",
              }}
              render={({ field: { onChange, value }, fieldState: { error } }) => (
                <Checkbox
                  checked={value}
                  onChange={onChange}
                  size="sm"
                  label="I agree to the Terms of Service and Privacy Policy."
                  errorText={error?.message}
                />
              )}
            />

            {isSubmitSuccessful ? (
              <Text accessibilityRole="alert" style={styles.successText}>
                Form validated. Your registration payload is ready for the API.
              </Text>
            ) : null}

            <Button
              label="Create Account"
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
