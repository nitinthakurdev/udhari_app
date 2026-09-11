import React, { useState } from "react";
import { SymbolView } from "expo-symbols";
import {
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { colors, spacing, radii, typography } from "@/constants/theme";
import { InputIcon, InputProps, InputSize } from "@/types/ui/InputTypes";

export type { InputProps, InputSize, InputIcon };

const SIZE_CONFIG: Record<
    InputSize,
    { minHeight: number; paddingVertical: number; paddingHorizontal: number; fontSize: number; iconGap: number; iconSize: number }
> = {
    sm: { minHeight: 44, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, fontSize: 13, iconGap: spacing.xs, iconSize: 16 },
    md: { minHeight: 52, paddingVertical: spacing.md, paddingHorizontal: spacing.md, fontSize: 15, iconGap: spacing.sm, iconSize: 18 },
    lg: { minHeight: 58, paddingVertical: spacing.lg, paddingHorizontal: spacing.lg, fontSize: 17, iconGap: spacing.sm, iconSize: 20 },
};

export function Input({
    label,
    helperText,
    errorText,
    size = "md",
    leftIcon,
    rightIcon,
    isPassword = false,
    disabled = false,
    containerStyle,
    fieldStyle,
    inputStyle,
    onFocus,
    onBlur,
    editable,
    ...textInputProps
}: InputProps) {
    const [focused, setFocused] = useState(false);
    const [secureVisible, setSecureVisible] = useState(false);

    const sizeConfig = SIZE_CONFIG[size];
    const hasError = Boolean(errorText);
    const isEditable = editable !== undefined ? editable : !disabled;

    const borderColor = disabled
        ? colors.line
        : hasError
            ? colors.danger600
            : focused
                ? colors.brand600
                : colors.line;

    const textColor = disabled ? colors.slate400 : colors.ink;
    const iconColor = disabled
        ? colors.slate400
        : hasError
            ? colors.danger600
            : focused
                ? colors.brand600
                : colors.slate500;

    const renderIcon = (icon: InputIcon | undefined) =>
        typeof icon === "function" ? icon(iconColor) : icon;

    return (
        <View style={[styles.container, containerStyle]}>
            {label ? (
                <Text style={[styles.label, disabled && { color: colors.slate400 }]}>{label}</Text>
            ) : null}

            <View
                style={[
                    styles.field,
                    {
                        borderColor,
                        minHeight: sizeConfig.minHeight,
                        paddingHorizontal: sizeConfig.paddingHorizontal,
                        backgroundColor: disabled || !focused ? colors.surface : colors.white,
                    },
                    fieldStyle,
                ]}
            >
                {leftIcon ? (
                    <View style={{ marginRight: sizeConfig.iconGap }}>{renderIcon(leftIcon)}</View>
                ) : null}

                <TextInput
                    {...textInputProps}
                    editable={isEditable}
                    secureTextEntry={isPassword ? !secureVisible : textInputProps.secureTextEntry}
                    onFocus={(e) => {
                        setFocused(true);
                        onFocus?.(e);
                    }}
                    onBlur={(e) => {
                        setFocused(false);
                        onBlur?.(e);
                    }}
                    placeholderTextColor={colors.slate400}
                    style={[
                        styles.input,
                        {
                            fontSize: sizeConfig.fontSize,
                            fontFamily: typography.fontFamilyRegular,
                            paddingVertical: sizeConfig.paddingVertical,
                            color: textColor,
                        },
                        inputStyle,
                    ]}
                />

                {isPassword ? (
                    <Pressable
                        onPress={() => setSecureVisible((v) => !v)}
                        hitSlop={8}
                        disabled={disabled}
                        style={{ marginLeft: sizeConfig.iconGap }}
                        accessibilityRole="button"
                        accessibilityLabel={secureVisible ? "Hide password" : "Show password"}
                    >
                        <SymbolView
                            name={secureVisible
                                ? { ios: "eye.slash", android: "visibility_off", web: "visibility_off" }
                                : { ios: "eye", android: "visibility", web: "visibility" }}
                            size={19}
                            tintColor={disabled ? colors.slate400 : colors.slate500}
                        />
                    </Pressable>
                ) : rightIcon ? (
                    <View style={{ marginLeft: sizeConfig.iconGap }}>{renderIcon(rightIcon)}</View>
                ) : null}
            </View>

            {errorText ? (
                <Text style={styles.errorText}>{errorText}</Text>
            ) : helperText ? (
                <Text style={styles.helperText}>{helperText}</Text>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: "100%",
    },
    label: {
        fontFamily: typography.fontFamilySemiBold,
        fontSize: 13,
        color: colors.slate700,
        marginBottom: spacing.xs,
    },
    field: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderRadius: radii.md,
    },
    input: {
        flex: 1,
    },
    helperText: {
        fontFamily: typography.fontFamilyRegular,
        fontSize: 12,
        color: colors.slate500,
        marginTop: spacing.xs,
    },
    errorText: {
        fontFamily: typography.fontFamilyMedium,
        fontSize: 12,
        color: colors.danger600,
        marginTop: spacing.xs,
    },
});

export default Input;
