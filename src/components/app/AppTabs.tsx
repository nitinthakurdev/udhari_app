import { colors, typography } from "@/constants/theme";
import { Tabs } from "expo-router";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import type { ComponentProps } from "react";
import type { ColorValue } from "react-native";

type SymbolName = Extract<SymbolViewProps["name"], string>;
type TabName = "index" | "transitions" | "requests" | "configuration" | "profile";

type TabDefinition = {
  android: "home" | "receipt_long" | "inbox" | "tune" | "account_circle";
  ios: SymbolName;
  iosSelected: SymbolName;
  name: TabName;
  title: string;
};

const tabs: readonly TabDefinition[] = [
  {
    android: "home",
    ios: "house",
    iosSelected: "house.fill",
    name: "index",
    title: "Home",
  },
  {
    android: "receipt_long",
    ios: "arrow.left.arrow.right",
    iosSelected: "arrow.left.arrow.right.circle.fill",
    name: "transitions",
    title: "Transitions",
  },
  {
    android: "inbox",
    ios: "tray",
    iosSelected: "tray.fill",
    name: "requests",
    title: "Requests",
  },
  {
    android: "tune",
    ios: "slider.horizontal.3",
    iosSelected: "slider.horizontal.3",
    name: "configuration",
    title: "Configuration",
  },
  {
    android: "account_circle",
    ios: "person.crop.circle",
    iosSelected: "person.crop.circle.fill",
    name: "profile",
    title: "Account",
  },
];

type TabIconProps = {
  color: ColorValue;
  definition: TabDefinition;
  focused: boolean;
  size: number;
};

function TabIcon({ color, definition, focused, size }: TabIconProps) {
  return (
    <SymbolView
      name={{
        android: definition.android,
        ios: focused ? definition.iosSelected : definition.ios,
        web: definition.android,
      }}
      size={size}
      tintColor={color}
    />
  );
}

function screenOptions(): ComponentProps<typeof Tabs>["screenOptions"] {
  return {
    headerShown: false,
    tabBarActiveTintColor: colors.brand600,
    tabBarHideOnKeyboard: true,
    tabBarInactiveTintColor: colors.slate500,
    tabBarLabelStyle: {
      fontFamily: typography.fontFamilySemiBold,
      fontSize: 10,
    },
    tabBarStyle: {
      backgroundColor: colors.white,
      borderTopColor: colors.line,
      borderTopWidth: 1,
    },
  };
}

export function AppTabs() {
  return (
    <Tabs screenOptions={screenOptions()}>
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            tabBarIcon: ({ color, focused, size }) => (
              <TabIcon
                color={color}
                definition={tab}
                focused={focused}
                size={size}
              />
            ),
            title: tab.title,
          }}
        />
      ))}
    </Tabs>
  );
}

