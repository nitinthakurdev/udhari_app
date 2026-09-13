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
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "house", selected: "house.fill" }}
          md="home"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="transitions">
        <NativeTabs.Trigger.Label>Transitions</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{
            default: "arrow.left.arrow.right",
            selected: "arrow.left.arrow.right.circle.fill",
          }}
          md="swap_horiz"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="requests">
        <NativeTabs.Trigger.Label>Requests</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "tray", selected: "tray.fill" }}
          md="inbox"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="configuration">
        <NativeTabs.Trigger.Label>Configuration</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "gearshape", selected: "gearshape.fill" }}
          md="settings"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>Account</NativeTabs.Trigger.Label>
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
