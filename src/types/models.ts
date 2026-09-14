export interface Business {
  uuid: string;
  name: string;
  slug: string;
  country: string;
  state: string;
  city: string;
  pincode: string;
  address: string;
  address_2: string | null;
  created_at: string;
  updated_at: string;
}

export interface BusinessPayload {
  name: string;
  country: string;
  state: string;
  city: string;
  pincode: string;
  address: string;
  address_2: string | null;
}

export interface AddressSuggestion {
  place_id: string;
  description: string;
}

export interface SuggestedAddress {
  address: string;
  address_2?: string;
  city?: string;
  pincode?: string;
  state?: string;
  country?: string;
}

export interface CustomerSearchResult extends ConnectionUser {
  user_id: number;
}

export interface BusinessSearchResult {
  uuid: string;
  name: string;
  slug: string;
  business_id: number;
  connect_user_id: number;
}

export interface UserRole {
  uuid: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface CurrentUser {
  uuid: string;
  first_name: string;
  last_name: string | null;
  email: string;
  username: string;
  phone: string;
  dial_code: string | null;
  is_email_verified: boolean;
  is_phone_verified: boolean;
  created_at: string;
  user_role?: UserRole;
  business?: Business | null;
}

export interface PublicUser extends Omit<CurrentUser, "business"> {
  score: number;
  updated_at: string;
}

export interface AuthSession {
  user: CurrentUser;
  access_token: string;
  refresh_token: string;
}

export interface ConnectionUser {
  uuid: string;
  first_name: string;
  last_name: string | null;
  email: string;
  username: string;
  phone: string;
  dial_code: string | null;
}

export interface BusinessConnection {
  uuid: string;
  connect_user_id: number;
  business_id: number;
  source_business_id: number | null;
  created_by: number;
  role: string;
  request_status: "pending" | "approved" | "rejected";
  created_at: string;
  updated_at: string;
  connected_user: ConnectionUser | null;
  creator: ConnectionUser | null;
  business: Pick<Business, "uuid" | "name" | "slug"> | null;
  source_business: Pick<Business, "uuid" | "name" | "slug"> | null;
}

export interface ConnectionRequests {
  incoming: BusinessConnection[];
  outgoing: BusinessConnection[];
}

export interface Transition {
  uuid: string;
  customer_user_id: number;
  customer_business_id: number | null;
  business_id: number;
  business_user_id: number;
  unit_id: number;
  product_name: string;
  product_qty: number;
  product_unit_price: number;
  total_price: number;
  request_status:
    "pending" | "approved" | "rejected" | "not_available" | "cancelled";
  payment_status: "paid" | "unpaid";
  balance_type: "payable" | "receivable";
  account_type: "payable" | "receivable";
  comment: string | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface TransitionCreatePayload {
  customer_user_id?: number;
  customer_business_id?: number | null;
  business_id: number;
  unit_id: number;
  product_name: string;
  product_unit_price: number;
  total_price: number;
  product_qty?: number;
  customer_business_uuid?: string;
  balance_type?: "payable" | "receivable";
  comment?: string | null;
}

export interface TransitionBatchItem {
  unit_id: number;
  product_name: string;
  product_unit_price: number;
  total_price: number;
  product_qty?: number;
  comment?: string | null;
}

export interface TransitionBatchCreatePayload {
  business_id: number;
  items: TransitionBatchItem[];
  customer_user_id?: number;
  customer_business_uuid?: string;
  balance_type?: "payable" | "receivable";
}

export type TransitionListView = "all" | "unpaid" | "cancelled";

export interface TransitionListParams {
  page?: number;
  limit?: number;
  view?: TransitionListView;
  party_type?: "user" | "business";
  party_id?: number;
}

export interface TransitionBalanceParty {
  party_type: "user" | "business";
  party_id: number;
  account_type: "payable" | "receivable";
  amount: number;
}

export interface TransitionBalanceSummary {
  payable: number;
  receivable: number;
  parties: TransitionBalanceParty[];
}

export type TransitionUpdatePayload = Partial<
  Pick<
    Transition,
    | "product_name"
    | "unit_id"
    | "product_qty"
    | "product_unit_price"
    | "total_price"
    | "request_status"
    | "balance_type"
    | "comment"
  >
>;

export interface Unit {
  id: number;
  uuid: string;
  name: string;
  code: string;
  type: string;
  factor: number;
  can_manage: boolean;
  created_at: string;
  updated_at: string;
}
