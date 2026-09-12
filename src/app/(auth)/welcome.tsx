import { Image } from "expo-image";
import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { colors, typography } from "@/constants/theme";
import { Images } from "@/constants/images";
import { Button } from "@/components/ui/Button";

export default function WelcomeScreen() {
  return (
    <View style={styles.safeArea}>
      <View pointerEvents="none" style={styles.backgroundDecoration}>
        <View style={styles.outerCircle} />
        <View style={styles.innerCircle} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.logoBox}>
            <Image
              contentFit="contain"
              source={Images.logo}
              style={styles.logo}
            />
          </View>
          <Text style={styles.brandName}>udhari</Text>
        </View>

        <View style={styles.hero}>
          <View style={styles.eyebrowPill}>
            <View style={styles.eyebrowDot} />
            <Text style={styles.eyebrow}>YOUR BUSINESS, IN BALANCE</Text>
          </View>

          <Text style={styles.title}>
            Every account.{"\n"}
            <Text style={styles.titleAccent}>Always clear.</Text>
          </Text>

          <Text style={styles.subtitle}>
            Keep your credits, payments, and customer balances organised in one
            dependable place.
          </Text>

          <View style={styles.balanceCard}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.balanceLabel}>NET BALANCE</Text>
                <Text style={styles.balanceAmount}>₹38,450</Text>
              </View>
              <View style={styles.monthPill}>
                <Text style={styles.monthText}>This month</Text>
              </View>
            </View>

            <View style={styles.summaryRow}>
              <BalanceSummary
                amount="₹52,800"
                direction="down"
                label="You'll receive"
              />
              <View style={styles.summaryDivider} />
              <BalanceSummary
                amount="₹14,350"
                direction="up"
                label="You'll pay"
              />
            </View>

            <View style={styles.activityRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>AK</Text>
              </View>
              <View style={styles.activityDetails}>
                <Text style={styles.activityName}>Amit Kirana</Text>
                <Text style={styles.activityLabel}>Payment received</Text>
              </View>
              <Text style={styles.activityAmount}>+ ₹2,400</Text>
            </View>
          </View>
        </View>

        <View style={styles.bottomSection}>
          <View style={styles.benefits}>
            <Benefit icon="checkmark" label="Simple to start" />
            <Benefit icon="lock" label="Secure by design" />
          </View>

          <Button
            label="Get Started"
            fullWidth
            size="lg"
            rightIcon={(color) => (
              <SymbolView
                name={{
                  ios: "arrow.right",
                  android: "arrow_forward",
                  web: "arrow_forward",
                }}
                size={20}
                tintColor={color}
              />
            )}
            onPress={() => router.push("/(auth)/account-type")}
          />

          <Button
            label="Log In"
            fullWidth
            size="lg"
            variant="outline"
            onPress={() => router.push("/(auth)/login")}
            style={styles.loginButton}
          />

          <Text style={styles.footerText}>
            Simple accounts. Stronger business.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function BalanceSummary({
  amount,
  direction,
  label,
}: {
  amount: string;
  direction: "down" | "up";
  label: string;
}) {
  const isReceive = direction === "down";

  return (
    <View style={styles.summaryItem}>
      <View
        style={[
          styles.summaryIcon,
          isReceive ? styles.receiveIcon : styles.payIcon,
        ]}
      >
        <SymbolView
          name={
            isReceive
              ? {
                  ios: "arrow.down.left",
                  android: "south_west",
                  web: "south_west",
                }
              : {
                  ios: "arrow.up.right",
                  android: "north_east",
                  web: "north_east",
                }
          }
          size={17}
          tintColor={isReceive ? colors.brand600 : colors.slate500}
        />
      </View>
      <View>
        <Text style={styles.summaryLabel}>{label}</Text>
        <Text style={styles.summaryAmount}>{amount}</Text>
      </View>
    </View>
  );
}

function Benefit({
  icon,
  label,
}: {
  icon: "checkmark" | "lock";
  label: string;
}) {
  return (
    <View style={styles.benefit}>
      <View style={styles.checkCircle}>
        <SymbolView
          name={
            icon === "checkmark"
              ? { ios: "checkmark", android: "check", web: "check" }
              : { ios: "lock", android: "lock", web: "lock" }
          }
          size={13}
          tintColor={colors.brand600}
        />
      </View>
      <Text style={styles.benefitText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.brand50, flex: 1 },
  backgroundDecoration: {
    bottom: 0,
    left: 0,
    overflow: "hidden",
    position: "absolute",
    right: 0,
    top: 0,
  },
  outerCircle: {
    borderColor: "rgba(21, 94, 239, 0.06)",
    borderRadius: 260,
    borderWidth: 58,
    height: 520,
    position: "absolute",
    right: -310,
    top: 90,
    width: 520,
  },
  innerCircle: {
    backgroundColor: "rgba(21, 94, 239, 0.04)",
    borderRadius: 160,
    height: 320,
    left: -220,
    position: "absolute",
    top: 340,
    width: 320,
  },
  content: { flexGrow: 1, paddingBottom: 22, paddingHorizontal: 24 },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    minHeight: 76,
  },
  logoBox: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: 12,
    borderWidth: 1,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  logo: { height: 39, width: 42 },
  brandName: {
    color: colors.ink,
    fontFamily: typography.fontFamilyExtraBold,
    fontSize: 24,
    letterSpacing: -1.2,
  },
  hero: {
    flex: 1,
    justifyContent: "center",
    paddingBottom: 34,
    paddingTop: 30,
  },
  eyebrowPill: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.brand100,
    borderRadius: 20,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  eyebrowDot: {
    backgroundColor: colors.brand600,
    borderRadius: 3,
    height: 6,
    width: 6,
  },
  eyebrow: {
    color: colors.brand700,
    fontFamily: typography.fontFamilyBold,
    fontSize: 10,
    letterSpacing: 1.2,
  },
  title: {
    color: colors.ink,
    fontFamily: typography.fontFamilyExtraBold,
    fontSize: 44,
    letterSpacing: -2.4,
    lineHeight: 48,
    marginTop: 20,
  },
  titleAccent: { color: colors.brand600 },
  subtitle: {
    color: colors.slate500,
    fontFamily: typography.fontFamilyRegular,
    fontSize: 15,
    lineHeight: 23,
    marginTop: 18,
    maxWidth: 410,
  },
  balanceCard: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: 20,
    borderWidth: 1,
    elevation: 7,
    marginTop: 34,
    padding: 20,
    shadowColor: "#1f3150",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.12,
    shadowRadius: 28,
  },
  cardHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  balanceLabel: {
    color: colors.slate400,
    fontFamily: typography.fontFamilyBold,
    fontSize: 9,
    letterSpacing: 0.7,
  },
  balanceAmount: {
    color: colors.ink,
    fontFamily: typography.fontFamilyExtraBold,
    fontSize: 27,
    letterSpacing: -1,
    marginTop: 4,
  },
  monthPill: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  monthText: {
    color: colors.slate500,
    fontFamily: typography.fontFamilySemiBold,
    fontSize: 10,
  },
  summaryRow: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    flexDirection: "row",
    marginTop: 20,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  summaryItem: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 9,
  },
  summaryDivider: {
    backgroundColor: colors.line,
    marginHorizontal: 10,
    width: 1,
  },
  summaryIcon: {
    alignItems: "center",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  receiveIcon: { backgroundColor: colors.brand100 },
  payIcon: { backgroundColor: "#e7ecf3" },
  summaryLabel: {
    color: colors.slate400,
    fontFamily: typography.fontFamilyRegular,
    fontSize: 9,
  },
  summaryAmount: {
    color: colors.ink,
    fontFamily: typography.fontFamilyBold,
    fontSize: 12,
    marginTop: 3,
  },
  activityRow: {
    alignItems: "center",
    borderTopColor: colors.surface,
    borderTopWidth: 1,
    flexDirection: "row",
    marginTop: 18,
    paddingTop: 16,
  },
  avatar: {
    alignItems: "center",
    backgroundColor: colors.brand600,
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  avatarText: {
    color: colors.white,
    fontFamily: typography.fontFamilyExtraBold,
    fontSize: 10,
  },
  activityDetails: { flex: 1, marginLeft: 10 },
  activityName: {
    color: colors.ink,
    fontFamily: typography.fontFamilyBold,
    fontSize: 11,
  },
  activityLabel: {
    color: colors.slate400,
    fontFamily: typography.fontFamilyRegular,
    fontSize: 9,
    marginTop: 3,
  },
  activityAmount: {
    color: colors.brand600,
    fontFamily: typography.fontFamilyExtraBold,
    fontSize: 11,
  },
  bottomSection: { paddingTop: 4 },
  loginButton: { marginTop: 12 },
  benefits: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 22,
  },
  benefit: { alignItems: "center", flexDirection: "row", gap: 7 },
  checkCircle: {
    alignItems: "center",
    backgroundColor: colors.brand100,
    borderRadius: 10,
    height: 20,
    justifyContent: "center",
    width: 20,
  },
  benefitText: {
    color: colors.slate500,
    fontFamily: typography.fontFamilyBold,
    fontSize: 11,
  },
  footerText: {
    color: colors.slate400,
    fontFamily: typography.fontFamilyRegular,
    fontSize: 10,
    marginTop: 20,
    textAlign: "center",
  },
});
