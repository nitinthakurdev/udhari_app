import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, spacing, radii, typography } from "@/constants/theme";
import { CheckboxProps, CheckboxSize } from "@/types/ui/checkBoxTypes";

export type { CheckboxProps, CheckboxSize };

const SIZE_CONFIG: Record<
  CheckboxSize,
  { box: number; fontSize: number; glyphSize: number; gap: number }
> = {
  sm: { box: 16, fontSize: 13, glyphSize: 11, gap: spacing.xs + 2 },
  md: { box: 20, fontSize: 15, glyphSize: 13, gap: spacing.sm },
  lg: { box: 24, fontSize: 16, glyphSize: 15, gap: spacing.sm },
};

export function Checkbox({
  checked,
  onChange,
  label,
  helperText,
  errorText,
  indeterminate = false,
  size = "md",
  disabled = false,
  testID,
}: CheckboxProps) {
  const sizeConfig = SIZE_CONFIG[size];
  const hasError = Boolean(errorText);
  const isActive = checked || indeterminate;

  const borderColor = disabled
    ? colors.line
    : hasError
      ? colors.danger600
      : isActive
        ? colors.brand600
        : colors.slate400;

  const backgroundColor = disabled
    ? isActive
      ? colors.line
      : colors.surface
    : isActive
      ? colors.brand600
      : colors.white;

  const handleToggle = () => {
    if (disabled) return;
    onChange(!checked);
  };

  return (
    <View style={styles.container}>
      <Pressable
        onPress={handleToggle}
        disabled={disabled}
        testID={testID}
        accessibilityRole="checkbox"
        accessibilityState={{
          checked: indeterminate ? "mixed" : checked,
          disabled,
        }}
        style={styles.row}
        hitSlop={4}
      >
        <View
          style={[
            styles.box,
            {
              width: sizeConfig.box,
              height: sizeConfig.box,
              borderColor,
              backgroundColor,
            },
          ]}
        >
          {indeterminate ? (
            <View
              style={{
                width: sizeConfig.glyphSize,
                height: 2,
                backgroundColor: colors.white,
                borderRadius: 1,
              }}
            />
          ) : checked ? (
            <Text
              style={{
                fontFamily: typography.fontFamilyBold,
                fontSize: sizeConfig.glyphSize,
                color: colors.white,
              }}
            >
              ✓
            </Text>
          ) : null}
        </View>

        {label ? (
          <Text
            style={[
              styles.label,
              { fontSize: sizeConfig.fontSize, marginLeft: sizeConfig.gap },
              disabled && { color: colors.slate400 },
            ]}
          >
            {label}
          </Text>
        ) : null}
      </Pressable>

      {errorText ? (
        <Text style={[styles.helperText, { color: colors.danger600 }]}>
          {errorText}
        </Text>
      ) : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: "flex-start",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  box: {
    borderWidth: 1.5,
    borderRadius: radii.sm - 4,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    color: colors.ink,
    fontFamily: typography.fontFamilyRegular,
  },
  helperText: {
    fontFamily: typography.fontFamilyRegular,
    fontSize: 12,
    color: colors.slate500,
    marginTop: spacing.xs,
  },
});

export default Checkbox;
