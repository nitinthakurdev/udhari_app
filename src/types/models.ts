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
  role: string;
  created_at: string;
  updated_at: string;
  connected_user: ConnectionUser | null;
  creator: ConnectionUser | null;
  business: Pick<Business, "uuid" | "name" | "slug"> | null;
}
