export type SelectSize = "sm" | "md" | "lg";

export interface SelectOption<T extends string = string> {
    label: string;
    value: T;
    disabled?: boolean;
}

export interface SelectProps<T extends string = string> {
    /** Label rendered above the field */
    label?: string;
    /** Helper text rendered below the field (hidden if errorText is set) */
    helperText?: string;
    /** Error text rendered below the field; also switches it into an error state */
    errorText?: string;
    /** Text shown when no option is selected */
    placeholder?: string;
    /** List of selectable options */
    options: SelectOption<T>[];
    /** Currently selected value, or null/undefined when nothing is selected */
    value?: T | null;
    /** Called with the newly selected option's value */
    onChange: (value: T) => void;
    /** Shows a text input inside the modal to filter options by label */
    searchable?: boolean;
    /** Visual size of the field */
    size?: SelectSize;
    disabled?: boolean;
    testID?: string;
}