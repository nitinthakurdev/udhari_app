import UpgradeScreen from "@/screens/app/UpgradeScreen";
import { NativeModules, TurboModuleRegistry } from "react-native";

const hasRazorpayCheckout =
  (NativeModules["RNRazorpayCheckout"] !== undefined &&
    NativeModules["RazorpayEventEmitter"] !== undefined) ||
  (TurboModuleRegistry.get("RNRazorpayCheckout") !== null &&
    TurboModuleRegistry.get("RazorpayEventEmitter") !== null);

export default function UpgradeEntryScreen() {
  return <UpgradeScreen razorpayAvailable={hasRazorpayCheckout} />;
}
