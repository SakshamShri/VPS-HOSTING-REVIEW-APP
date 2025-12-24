export type AuthRole = "SUPER_ADMIN" | "ADMIN" | "USER";

export type AuthCountry = "INDIA" | "BRAZIL";

export interface JwtPayload {
  userId: string; // user or admin id as stringified BigInt
  role: AuthRole;
}

export interface AdminLoginInput {
  username: string;
  password: string;
}

export interface OtpSendInput {
  mobile: string;
}

export interface OtpVerifyInput {
  mobile: string;
  otp: string;
}

export interface VerifyIdentityInput {
  country: AuthCountry;
  idNumber: string;
}

export interface UserProfileInput {
  name: string;
  age: number;
  address?: string;
  current_location?: string;
  permanent_address?: string;
}
