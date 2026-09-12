import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import AuthScaffold from "@/components/auth/AuthScaffold";
import { Button } from "@/components/ui/Button";
import { colors, radii, spacing, typography } from "@/constants/theme";

type AccountType = "business" | "personal";

type AccountOptionProps = {
  description: string;
  icon: "business" | "personal";
  label: string;
  onPress: () => void;
  selected: boolean;
};

export default function AccountTypeScreen() {
  const [selectedType, setSelectedType] = useState<AccountType | null>(null);

  const continueToRegistration = () => {
    if (!selectedType) return;

    router.push({
      pathname: "/(auth)/register",
      params: { accountType: selectedType },
    });
  };

  return (
    <AuthScaffold
      eyebrow="CHOOSE YOUR PATH"
      title="How will you use Udhari?"
      subtitle="Choose the account that fits you. You can add a business later too."
      footer={
        <>
          <Text style={styles.footerText}>Already have an account?</Text>
          <Button
            label="Sign in"
            variant="secondary"
            size="sm"
            onPress={() => router.replace("/(auth)/login")}
          />
        </>
      }
    >
      <View style={styles.options}>
        <AccountOption
          icon="business"
          label="Business owner"
          description="Manage customers, credit, collections, and your business balance."
          selected={selectedType === "business"}
          onPress={() => setSelectedType("business")}
        />

        <AccountOption
          icon="personal"
          label="Personal user"
          description="Track money you owe and payments you need to collect personally."
          selected={selectedType === "personal"}
          onPress={() => setSelectedType("personal")}
        />

        <Button
          label={selectedType ? "Continue" : "Choose an account type"}
          fullWidth
          size="lg"
          disabled={!selectedType}
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
          onPress={continueToRegistration}
        />
      </View>
    </AuthScaffold>
  );
}

function AccountOption({
  description,
  icon,
  label,
  onPress,
  selected,
}: AccountOptionProps) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        selected && styles.optionSelected,
        pressed && styles.optionPressed,
      ]}
    >
      <View style={[styles.iconBox, selected && styles.iconBoxSelected]}>
        <SymbolView
          name={
            icon === "business"
              ? { ios: "storefront", android: "storefront", web: "storefront" }
              : { ios: "person", android: "person", web: "person" }
          }
          size={25}
          tintColor={selected ? colors.white : colors.brand600}
        />
      </View>

      <View style={styles.optionCopy}>
        <Text style={styles.optionTitle}>{label}</Text>
        <Text style={styles.optionDescription}>{description}</Text>
      </View>

      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected ? <View style={styles.radioDot} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  options: { gap: spacing.lg },
  option: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    flexDirection: "row",
    padding: spacing.lg,
  },
  optionSelected: {
    backgroundColor: colors.brand50,
    borderColor: colors.brand600,
  },
  optionPressed: { opacity: 0.82 },
  iconBox: {
    alignItems: "center",
    backgroundColor: colors.brand100,
    borderRadius: radii.md,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  iconBoxSelected: { backgroundColor: colors.brand600 },
  optionCopy: { flex: 1, marginHorizontal: spacing.md },
  optionTitle: {
    color: colors.ink,
    fontFamily: typography.fontFamilyBold,
    fontSize: 16,
  },
  optionDescription: {
    color: colors.slate500,
    fontFamily: typography.fontFamilyRegular,
    fontSize: 12,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  radio: {
    alignItems: "center",
    borderColor: colors.slate400,
    borderRadius: 10,
    borderWidth: 1.5,
    height: 20,
    justifyContent: "center",
    width: 20,
  },
  radioSelected: { borderColor: colors.brand600 },
  radioDot: {
    backgroundColor: colors.brand600,
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  footerText: {
    color: colors.slate500,
    fontFamily: typography.fontFamilyRegular,
    fontSize: 13,
  },
});
