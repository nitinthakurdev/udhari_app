import type React from "react";
import { GestureResponderEvent, StyleProp, TextStyle, ViewStyle } from "react-native";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export type ButtonIcon = React.ReactNode | ((color: string) => React.ReactNode);

export interface ButtonProps {
    label: string;
    onPress?: (event: GestureResponderEvent) => void;
    variant?: ButtonVariant;
    size?: ButtonSize;
    disabled?: boolean;
    loading?: boolean;
    fullWidth?: boolean;
    leftIcon?: ButtonIcon;
    rightIcon?: ButtonIcon;
    style?: StyleProp<ViewStyle>;
    textStyle?: StyleProp<TextStyle>;
    testID?: string;
}