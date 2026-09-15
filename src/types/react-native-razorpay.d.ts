declare module "react-native-razorpay" {
  export interface RazorpayCheckoutOptions {
    key: string;
    amount: string;
    currency: string;
    name: string;
    description: string;
    order_id: string;
    prefill?: {
      email?: string;
      contact?: string;
      name?: string;
    };
    theme?: { color?: string };
  }

  export interface RazorpayCheckoutSuccess {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }

  export interface RazorpayCheckoutError {
    code?: number | string;
    description?: string;
  }

  export default class RazorpayCheckout {
    static open(
      options: RazorpayCheckoutOptions,
    ): Promise<RazorpayCheckoutSuccess>;
  }
}
