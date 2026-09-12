import { colors, typography } from "@/constants/theme";
import { NativeTabs } from "expo-router/unstable-native-tabs";

export default function BusinessTabsLayout() {
  return (
    <NativeTabs
      backgroundColor={colors.white}
      indicatorColor={colors.brand100}
      iconColor={{ default: colors.slate500, selected: colors.brand600 }}
      labelStyle={{
        default: {
          color: colors.slate500,
          fontFamily: typography.fontFamilySemiBold,
          fontSize: 10,
        },
        selected: {
          color: colors.brand600,
          fontFamily: typography.fontFamilyBold,
          fontSize: 10,
        },
      }}
      rippleColor={colors.brand100}
      shadowColor={colors.line}
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Overview</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "house", selected: "house.fill" }}
          md="home"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="connected-users">
        <NativeTabs.Trigger.Label>Users</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "person.2", selected: "person.2.fill" }}
          md="group"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="businesses">
        <NativeTabs.Trigger.Label>Businesses</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "storefront", selected: "storefront.fill" }}
          md="storefront"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="connected-businesses">
        <NativeTabs.Trigger.Label>Connected</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "building.2", selected: "building.2.fill" }}
          md="business"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{
            default: "person.crop.circle",
            selected: "person.crop.circle.fill",
          }}
          md="person"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
