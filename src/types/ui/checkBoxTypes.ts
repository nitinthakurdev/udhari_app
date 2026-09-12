export type CheckboxSize = "sm" | "md" | "lg";

export interface CheckboxProps {
  /** Whether the checkbox is checked */
  checked: boolean;
  /** Called with the new checked value when the checkbox is toggled */
  onChange: (checked: boolean) => void;
  /** Label rendered next to the checkbox; tapping it also toggles the checkbox */
  label?: string;
  /** Optional supporting text rendered below the label */
  helperText?: string;
  /** Error text rendered below the checkbox; also switches it into an error state */
  errorText?: string;
  /** Shows a dash instead of a checkmark, for "some but not all" selections */
  indeterminate?: boolean;
  /** Visual size of the checkbox */
  size?: CheckboxSize;
  disabled?: boolean;
  testID?: string;
}
