import React from "react";
import { View, StyleSheet } from "react-native";
import { Button } from "@/components/ui/Button";
import { colors, spacing } from "@/constants/theme";

export default function ButtonExample() {
    return (
        <View style={styles.container}>
            <Button label="Primary" variant="primary" onPress={() => { }} />
            <Button label="Secondary" variant="secondary" onPress={() => { }} />
            <Button label="Outline" variant="outline" onPress={() => { }} />
            <Button label="Ghost" variant="ghost" onPress={() => { }} />
            <Button label="Danger" variant="danger" onPress={() => { }} />

            <Button label="Small" size="sm" onPress={() => { }} />
            <Button label="Medium" size="md" onPress={() => { }} />
            <Button label="Large" size="lg" onPress={() => { }} />

            <Button label="Loading..." loading onPress={() => { }} />
            <Button label="Disabled" disabled onPress={() => { }} />
            <Button label="Full Width" fullWidth onPress={() => { }} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.white,
        padding: spacing.lg,
        gap: spacing.sm,
    },
});