import { colors, typography } from "@/constants/theme";
import { getConnectionRequests } from "@/lib/api/connections";
import {
  getBusinessTransitions,
  getTransitions,
} from "@/lib/api/transitions";
import { useAuthStore } from "@/stores/authStore";
import { useQuery } from "@tanstack/react-query";
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
    tabBarBadgeStyle: {
      backgroundColor: colors.danger600,
      color: colors.white,
      fontFamily: typography.fontFamilyBold,
      fontSize: 10,
    },
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
  const role = useAuthStore((state) => state.user?.user_role?.slug);
  const activeBusinessUuid = useAuthStore(
    (state) => state.activeBusiness?.uuid,
  );
  const businessMode = role === "business";
  const requestsQuery = useQuery({
    queryKey: ["connection-requests"],
    queryFn: getConnectionRequests,
    refetchInterval: 30_000,
  });
  const pendingTransitionsQuery = useQuery({
    queryKey: [
      "transitions",
      businessMode ? activeBusinessUuid : "user",
      "pending",
      "badge",
    ],
    queryFn: () =>
      businessMode
        ? getBusinessTransitions(activeBusinessUuid ?? "", {
            page: 1,
            limit: 1,
            view: "pending",
          })
        : getTransitions({ page: 1, limit: 1, view: "pending" }),
    enabled: !businessMode || Boolean(activeBusinessUuid),
    refetchInterval: 30_000,
  });
  const pendingRequestCount = requestsQuery.data?.data.incoming.length ?? 0;
  const pendingTransitionCount =
    pendingTransitionsQuery.data?.meta.pagination.total ?? 0;
  const badges: Partial<Record<TabName, number | string>> = {
    requests: formatBadge(pendingRequestCount),
    transitions: formatBadge(pendingTransitionCount),
  };

  return (
    // RootNavigator already applies the device bottom inset around this navigator.
    <Tabs
      safeAreaInsets={{ bottom: 0 }}
      screenOptions={screenOptions()}
    >
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            tabBarBadge: badges[tab.name],
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

function formatBadge(count: number) {
  if (count <= 0) return undefined;
  return count > 99 ? "99+" : count;
}
