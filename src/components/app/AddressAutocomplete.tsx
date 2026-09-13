import { Input } from "@/components/ui/Input";
import { colors, radii, spacing, typography } from "@/constants/theme";
import {
  getAddressSuggestionDetails,
  searchAddressSuggestions,
} from "@/lib/api/businesses";
import type { AddressSuggestion, SuggestedAddress } from "@/types/models";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { SymbolView } from "expo-symbols";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

interface AddressAutocompleteProps {
  value: string;
  errorText?: string;
  onChangeText: (value: string) => void;
  onAddressSelected: (address: SuggestedAddress) => void;
}

const googleAttribution =
  "https://maps.gstatic.com/mapfiles/api-3/images/powered-by-google-on-white3.png";

const createSessionToken = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

export function AddressAutocomplete({
  value,
  errorText,
  onChangeText,
  onAddressSelected,
}: AddressAutocompleteProps) {
  const [focused, setFocused] = useState(false);
  const [searchKey, setSearchKey] = useState("");
  const [sessionToken, setSessionToken] = useState(createSessionToken);
  const normalizedValue = value.trim();

  useEffect(() => {
    const nextKey = focused && normalizedValue.length >= 3 ? normalizedValue : "";
    const timer = setTimeout(() => setSearchKey(nextKey), nextKey ? 300 : 0);
    return () => clearTimeout(timer);
  }, [focused, normalizedValue]);

  const suggestionsQuery = useQuery({
    queryKey: ["address-suggestions", searchKey, sessionToken],
    queryFn: ({ signal }) =>
      searchAddressSuggestions(searchKey, sessionToken, signal),
    enabled: focused && searchKey.length >= 3,
    staleTime: 60_000,
  });
  const detailsMutation = useMutation({
    mutationFn: (suggestion: AddressSuggestion) =>
      getAddressSuggestionDetails(suggestion.place_id, sessionToken),
    onSuccess: (response) => {
      setFocused(false);
      setSearchKey("");
      onChangeText(response.data.address);
      onAddressSelected(response.data);
      setSessionToken(createSessionToken());
    },
  });
  const suggestions = suggestionsQuery.data?.data ?? [];
  const showSuggestions = focused && searchKey === normalizedValue && searchKey.length >= 3;

  return (
    <View style={styles.container}>
      <Input
        label="Address"
        placeholder="Start typing a street address"
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        autoCorrect={false}
        autoCapitalize="words"
        errorText={errorText}
        leftIcon={(color) => (
          <SymbolView
            name={{ ios: "mappin", android: "location_on", web: "location_on" }}
            size={18}
            tintColor={color}
          />
        )}
        rightIcon={
          suggestionsQuery.isFetching || detailsMutation.isPending
            ? () => <ActivityIndicator color={colors.brand600} size="small" />
            : undefined
        }
      />

      {showSuggestions ? (
        <View style={styles.suggestions}>
          {suggestionsQuery.isError ? (
            <Text style={styles.status}>Suggestions unavailable. You can enter the address manually.</Text>
          ) : suggestions.length === 0 && !suggestionsQuery.isFetching ? (
            <Text style={styles.status}>No matching addresses found.</Text>
          ) : (
            suggestions.map((suggestion) => (
              <Pressable
                accessibilityRole="button"
                disabled={detailsMutation.isPending}
                key={suggestion.place_id}
                onPress={() => detailsMutation.mutate(suggestion)}
                style={({ pressed }) => [styles.suggestion, pressed && styles.suggestionPressed]}
              >
                <SymbolView
                  name={{ ios: "mappin.circle", android: "location_on", web: "location_on" }}
                  size={19}
                  tintColor={colors.brand600}
                />
                <Text numberOfLines={2} style={styles.suggestionText}>
                  {suggestion.description}
                </Text>
              </Pressable>
            ))
          )}
          <Image source={googleAttribution} contentFit="contain" style={styles.attribution} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%" },
  suggestions: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    marginTop: spacing.xs,
    overflow: "hidden",
    paddingBottom: spacing.sm,
  },
  suggestion: {
    alignItems: "center",
    borderBottomColor: colors.line,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 52,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  suggestionPressed: { backgroundColor: colors.brand50 },
  suggestionText: {
    color: colors.slate700,
    flex: 1,
    fontFamily: typography.fontFamilyMedium,
    fontSize: 12,
    lineHeight: 17,
  },
  status: {
    color: colors.slate500,
    fontFamily: typography.fontFamilyRegular,
    fontSize: 12,
    padding: spacing.md,
    textAlign: "center",
  },
  attribution: { alignSelf: "flex-end", height: 14, marginRight: spacing.md, marginTop: spacing.sm, width: 110 },
});
