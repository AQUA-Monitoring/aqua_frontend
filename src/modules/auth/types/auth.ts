export enum EUserType {
  ADMIN = 'admin',
  STANDARD = 'standard',
}

export interface IUser {
  name: string
  email: string
  profile_picture: string | null
  type?: EUserType
  is_superuser: boolean
}

export interface IToken {
  access: string
  refresh: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RefreshTokenRequest {
  refresh: string
}

export interface RefreshTokenResponse {
  access: string
}

export interface SignupRequest {
  name: string
  email: string
  password: string
  profile_picture?: File | null
  profile_picture_id?: string
}

export interface SignupResponse {
  user: IUser
  tokens: IToken
}

export interface UpdateMeRequest {
  name?: string
  profile_picture?: File | null
  profile_picture_id?: string
}

export type UpdateMeResponse = IUser

export type GoogleAuthConfig = { enabled: false } | {
  enabled: true
  client_id: string
  nonce: string
  challenge: string
}

export interface GoogleLoginRequest {
  credential: string
  challenge: string
}

export interface GoogleLoginResponse {
  user: IUser
  tokens: IToken
}
