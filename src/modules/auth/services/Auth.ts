import api from '@/app/plugins/axios'
import type {
  GoogleAuthConfig,
  GoogleLoginRequest,
  GoogleLoginResponse,
  IUser,
  IToken,
  LoginRequest,
  RefreshTokenRequest,
  RefreshTokenResponse,
  SignupRequest,
  SignupResponse,
  UpdateMeRequest,
  UpdateMeResponse,
} from '../types/auth'

export default class AuthApi {
  async getGoogleConfig(): Promise<GoogleAuthConfig> {
    const { data } = await api.get<GoogleAuthConfig>('/auth/google/config/')
    return data
  }

  async loginWithGoogle(payload: GoogleLoginRequest): Promise<GoogleLoginResponse> {
    const { data } = await api.post<GoogleLoginResponse>('/auth/google/', payload)
    return data
  }

  async loginUser(payload: LoginRequest): Promise<IToken> {
    const { data } = await api.post<IToken>('/auth/token/', payload)
    return data
  }

  async signupUser(payload: SignupRequest): Promise<SignupResponse> {
    const body = new FormData()
    body.append('name', payload.name)
    body.append('email', payload.email)
    body.append('password', payload.password)

    if (payload.profile_picture) {
      body.append('profile_picture', payload.profile_picture)
    }

    if (payload.profile_picture_id) {
      body.append('profile_picture_id', payload.profile_picture_id)
    }

    const { data } = await api.post<SignupResponse>('/users/signup/', body)

    return data
  }

  async getMe(): Promise<IUser> {
    const { data } = await api.get<IUser>('/users/me/')
    return data
  }

  async updateMe(payload: UpdateMeRequest): Promise<UpdateMeResponse> {
    const body = new FormData()

    if (payload.name) {
      body.append('name', payload.name)
    }

    if (payload.profile_picture) {
      body.append('profile_picture', payload.profile_picture)
    }

    if (payload.profile_picture_id) {
      body.append('profile_picture_id', payload.profile_picture_id)
    }

    const { data } = await api.patch<UpdateMeResponse>('/users/me/', body)

    return data
  }

  async refreshToken(payload: RefreshTokenRequest): Promise<RefreshTokenResponse> {
    const { data } = await api.post<RefreshTokenResponse>('/auth/token/refresh/', payload)
    return data
  }
}
