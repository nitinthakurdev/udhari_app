import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, spacing, radii, typography } from "@/constants/theme";
import { ButtonProps, ButtonSize, ButtonVariant, ButtonIcon } from "@/types/ui/buttonTypes";

export type { ButtonProps, ButtonSize, ButtonVariant, ButtonIcon };

const SIZE_CONFIG: Record<
    ButtonSize,
    { paddingVertical: number; paddingHorizontal: number; fontSize: number; iconGap: number }
> = {
    sm: { paddingVertical: spacing.xs + 2, paddingHorizontal: spacing.md, fontSize: 13, iconGap: spacing.xs },
    md: { paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.lg, fontSize: 15, iconGap: spacing.sm },
    lg: { paddingVertical: spacing.md, paddingHorizontal: spacing.xl, fontSize: 17, iconGap: spacing.sm },
};

type VariantStyle = {
    background: string;
    backgroundPressed: string;
    backgroundDisabled: string;
    text: string;
    textDisabled: string;
    borderColor?: string;
    borderColorDisabled?: string;
};

const VARIANT_CONFIG: Record<ButtonVariant, VariantStyle> = {
    primary: {
        background: colors.brand600,
        backgroundPressed: colors.brand700,
        backgroundDisabled: colors.brand200,
        text: colors.white,
        textDisabled: colors.white,
    },
    secondary: {
        background: colors.brand50,
        backgroundPressed: colors.brand100,
        backgroundDisabled: colors.surface,
        text: colors.brand700,
        textDisabled: colors.slate400,
    },
    outline: {
        background: "transparent",
        backgroundPressed: colors.brand50,
        backgroundDisabled: "transparent",
        text: colors.brand600,
        textDisabled: colors.slate400,
        borderColor: colors.brand600,
        borderColorDisabled: colors.line,
    },
    ghost: {
        background: "transparent",
        backgroundPressed: colors.surface,
        backgroundDisabled: "transparent",
        text: colors.slate700,
        textDisabled: colors.slate400,
    },
    danger: {
        background: colors.danger600,
        backgroundPressed: "#b91c1c",
        backgroundDisabled: colors.danger50,
        text: colors.white,
        textDisabled: colors.white,
    },
};

export function Button({
    label,
    onPress,
    variant = "primary",
    size = "md",
    disabled = false,
    loading = false,
    fullWidth = false,
    leftIcon,
    rightIcon,
    style,
    textStyle,
    testID,
}: ButtonProps) {
    const sizeConfig = SIZE_CONFIG[size];
    const variantConfig = VARIANT_CONFIG[variant];
    const isDisabled = disabled || loading;
    const activeTextColor = isDisabled ? variantConfig.textDisabled : variantConfig.text;

    const renderIcon = (icon: ButtonIcon | undefined) =>
        typeof icon === "function" ? icon(activeTextColor) : icon;

    return (
        <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: isDisabled, busy: loading }}
            testID={testID}
            onPress={isDisabled ? undefined : onPress}
            disabled={isDisabled}
            style={({ pressed }) => [
                styles.base,
                {
                    paddingVertical: sizeConfig.paddingVertical,
                    paddingHorizontal: sizeConfig.paddingHorizontal,
                    backgroundColor: isDisabled
                        ? variantConfig.backgroundDisabled
                        : pressed
                            ? variantConfig.backgroundPressed
                            : variantConfig.background,
                    borderWidth: variantConfig.borderColor ? 1 : 0,
                    borderColor: isDisabled
                        ? variantConfig.borderColorDisabled ?? variantConfig.borderColor
                        : variantConfig.borderColor,
                    width: fullWidth ? "100%" : undefined,
                    opacity: isDisabled && variant !== "outline" && variant !== "ghost" ? 1 : isDisabled ? 0.6 : 1,
                },
                style,
            ]}
        >
            <View style={styles.content}>
                {loading ? (
                    <ActivityIndicator
                        size="small"
                        color={isDisabled ? variantConfig.textDisabled : variantConfig.text}
                    />
                ) : (
                    <>
                        {leftIcon ? (
                            <View style={{ marginRight: sizeConfig.iconGap }}>{renderIcon(leftIcon)}</View>
                        ) : null}
                        <Text
                            style={[
                                styles.text,
                                {
                                    fontSize: sizeConfig.fontSize,
                                    color: activeTextColor,
                                },
                                textStyle,
                            ]}
                            numberOfLines={1}
                        >
                            {label}
                        </Text>
                        {rightIcon ? (
                            <View style={{ marginLeft: sizeConfig.iconGap }}>{renderIcon(rightIcon)}</View>
                        ) : null}
                    </>
                )}
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    base: {
        borderRadius: radii.md,
        alignItems: "center",
        justifyContent: "center",
        alignSelf: "flex-start",
    },
    content: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
    },
    text: {
        fontFamily: typography.fontFamilySemiBold,
        textAlign: "center",
    },
});

export default Button;
