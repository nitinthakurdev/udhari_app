import type React from "react";
import { StyleProp, TextInputProps, TextStyle, ViewStyle } from "react-native";

export type InputSize = "sm" | "md" | "lg";

export type InputIcon = React.ReactNode | ((color: string) => React.ReactNode);

export interface InputProps extends Omit<TextInputProps, "style"> {
  /** Label rendered above the input */
  label?: string;
  /** Helper text rendered below the input (hidden if errorText is set) */
  helperText?: string;
  /** Error text rendered below the input; also switches the input into an error state */
  errorText?: string;
  /** Visual size of the input */
  size?: InputSize;
  /** Icon rendered on the left side of the input */
  leftIcon?: InputIcon;
  /**
   * Icon rendered on the right side of the input.
   * Ignored when `isPassword` is true, since the visibility toggle takes that slot.
   */
  rightIcon?: InputIcon;
  /** Enables a built-in show/hide password toggle and masks input by default */
  isPassword?: boolean;
  /** Disables the input and dims it */
  disabled?: boolean;
  /** Style applied to the outer container (label + field + helper text) */
  containerStyle?: StyleProp<ViewStyle>;
  /** Style applied to the bordered field wrapping the TextInput */
  fieldStyle?: StyleProp<ViewStyle>;
  /** Style applied to the TextInput itself */
  inputStyle?: StyleProp<TextStyle>;
}
