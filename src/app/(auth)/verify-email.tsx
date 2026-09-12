import AuthScaffold from "@/components/auth/AuthScaffold";
import { Button } from "@/components/ui/Button";
import { colors, radii, spacing, typography } from "@/constants/theme";
import {
  getCurrentUser,
  resendVerification,
  verifyEmail,
} from "@/lib/api/auth";
import { getApiError } from "@/lib/api/errors";
import { useAuthStore } from "@/stores/authStore";
import { useMutation } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

export default function VerifyEmailScreen() {
  const { email, token } = useLocalSearchParams<{
    email?: string;
    token?: string;
  }>();
  const verificationStarted = useRef(false);
  const setSession = useAuthStore((state) => state.setSession);
  const { mutate: verifyToken, isPending: isVerifying } = useMutation({
    mutationFn: verifyEmail,
    onSuccess: async (response) => {
      const currentUser = await getCurrentUser(response.data.access_token);
      setSession({ ...response.data, user: currentUser.data });
    },
    onError: (error) =>
      Alert.alert("Verification failed", getApiError(error).message),
  });
  const resendMutation = useMutation({
    mutationFn: resendVerification,
    onSuccess: (response) =>
      Alert.alert("Email sent", response.message ?? "Verification email sent."),
    onError: (error) =>
      Alert.alert("Could not resend", getApiError(error).message),
  });

  useEffect(() => {
    if (token && !verificationStarted.current) {
      verificationStarted.current = true;
      verifyToken(token);
    }
  }, [token, verifyToken]);

  return (
    <AuthScaffold
      eyebrow="EMAIL VERIFICATION"
      title="Check your inbox"
      subtitle="Open the verification link sent to your email to activate your Udhari account."
      footer={
        <Button
          label="Back to sign in"
          variant="secondary"
          size="sm"
          onPress={() => router.replace("/(auth)/login")}
        />
      }
    >
      <View style={styles.content}>
        <View style={styles.notice}>
          <Text style={styles.title}>
            {isVerifying ? "Verifying your account…" : "Verification required"}
          </Text>
          <Text style={styles.copy}>
            {email
              ? `We sent the link to ${email}.`
              : "Return here from your verification link."}
          </Text>
        </View>
        {email ? (
          <Button
            label="Resend verification email"
            fullWidth
            loading={resendMutation.isPending}
            onPress={() => resendMutation.mutate(email)}
          />
        ) : null}
      </View>
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl },
  notice: {
    backgroundColor: colors.brand50,
    borderColor: colors.brand200,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  title: {
    color: colors.brand700,
    fontFamily: typography.fontFamilyBold,
    fontSize: 15,
  },
  copy: {
    color: colors.slate500,
    fontFamily: typography.fontFamilyRegular,
    fontSize: 12,
    lineHeight: 18,
  },
});
