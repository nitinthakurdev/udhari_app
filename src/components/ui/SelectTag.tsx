import React, { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { colors, spacing, radii, typography } from "@/constants/theme";
import {
  SelectOption,
  SelectProps,
  SelectSize,
} from "@/types/ui/selectTagTypes";

export type { SelectProps, SelectOption, SelectSize };

const SIZE_CONFIG: Record<
  SelectSize,
  { paddingVertical: number; paddingHorizontal: number; fontSize: number }
> = {
  sm: {
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    fontSize: 13,
  },
  md: {
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    fontSize: 15,
  },
  lg: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    fontSize: 17,
  },
};

export function Select<T extends string = string>({
  label,
  helperText,
  errorText,
  placeholder = "Select an option",
  options,
  value,
  onChange,
  searchable = false,
  size = "md",
  disabled = false,
  testID,
}: SelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const sizeConfig = SIZE_CONFIG[size];
  const hasError = Boolean(errorText);
  const selectedOption = options.find((o) => o.value === value);

  const filteredOptions = useMemo(() => {
    if (!searchable || !query.trim()) return options;
    const q = query.trim().toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query, searchable]);

  const borderColor = disabled
    ? colors.line
    : hasError
      ? colors.danger600
      : open
        ? colors.brand600
        : colors.line;

  const closeModal = () => {
    setOpen(false);
    setQuery("");
  };

  const handleSelect = (option: SelectOption<T>) => {
    if (option.disabled) return;
    onChange(option.value);
    closeModal();
  };

  return (
    <View style={styles.container}>
      {label ? (
        <Text style={[styles.label, disabled && { color: colors.slate400 }]}>
          {label}
        </Text>
      ) : null}

      <Pressable
        testID={testID}
        disabled={disabled}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityState={{ disabled, expanded: open }}
        style={[
          styles.field,
          {
            borderColor,
            paddingVertical: sizeConfig.paddingVertical,
            paddingHorizontal: sizeConfig.paddingHorizontal,
            backgroundColor: disabled ? colors.surface : colors.white,
          },
        ]}
      >
        <Text
          numberOfLines={1}
          style={[
            styles.valueText,
            {
              fontSize: sizeConfig.fontSize,
              fontFamily: typography.fontFamilyRegular,
              color: disabled
                ? colors.slate400
                : selectedOption
                  ? colors.ink
                  : colors.slate400,
            },
          ]}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
        <Text style={[styles.chevron, disabled && { color: colors.slate400 }]}>
          ▾
        </Text>
      </Pressable>

      {errorText ? (
        <Text style={styles.errorText}>{errorText}</Text>
      ) : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}

      <BottomSheet
        visible={open}
        onClose={closeModal}
        initialSnapIndex={0}
        scrollable={false}
        sheetStyle={styles.sheet}
      >
        {label ? <Text style={styles.sheetTitle}>{label}</Text> : null}

        {searchable ? (
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search..."
            placeholderTextColor={colors.slate400}
            style={styles.searchInput}
            autoFocus
          />
        ) : null}

        <FlatList
          data={filteredOptions}
          keyExtractor={(item) => item.value}
          style={styles.list}
          keyboardShouldPersistTaps="handled"
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No options found</Text>
          }
          renderItem={({ item }) => {
            const isSelected = item.value === value;
            return (
              <Pressable
                onPress={() => handleSelect(item)}
                disabled={item.disabled}
                style={[styles.option, item.disabled && { opacity: 0.5 }]}
              >
                <Text
                  style={[
                    styles.optionText,
                    isSelected && {
                      color: colors.brand600,
                      fontFamily: typography.fontFamilySemiBold,
                    },
                  ]}
                >
                  {item.label}
                </Text>
                {isSelected ? (
                  <Text style={styles.optionCheck}>✓</Text>
                ) : null}
              </Pressable>
            );
          }}
        />
      </BottomSheet>
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
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: radii.md,
  },
  valueText: {
    flex: 1,
    marginRight: spacing.sm,
  },
  chevron: {
    fontFamily: typography.fontFamilyRegular,
    fontSize: 14,
    color: colors.slate500,
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
  sheet: {
    maxHeight: "70%",
  },
  sheetTitle: {
    fontFamily: typography.fontFamilyBold,
    fontSize: 16,
    color: colors.ink,
    marginBottom: spacing.md,
  },
  searchInput: {
    fontFamily: typography.fontFamilyRegular,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    fontSize: 14,
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  list: {
    flexGrow: 0,
    flexShrink: 1,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
  },
  optionText: {
    fontFamily: typography.fontFamilyRegular,
    fontSize: 15,
    color: colors.ink,
  },
  optionCheck: {
    fontFamily: typography.fontFamilyBold,
    fontSize: 15,
    color: colors.brand600,
  },
  separator: {
    height: 1,
    backgroundColor: colors.line,
  },
  emptyText: {
    fontFamily: typography.fontFamilyRegular,
    textAlign: "center",
    color: colors.slate500,
    paddingVertical: spacing.lg,
  },
});

export default Select;
