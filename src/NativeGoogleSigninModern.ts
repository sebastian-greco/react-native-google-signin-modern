import { TurboModuleRegistry, type TurboModule } from 'react-native';

export type GoogleSignInResult = Readonly<{
  idToken: string;
  user: Readonly<{
    id: string;
    name?: string | null;
    email: string;
    photo?: string | null;
  }>;
}>;

export type GoogleSignInTokens = Readonly<{
  idToken: string;
  accessToken: string;
}>;

export interface Spec extends TurboModule {
  configure(webClientId: string): Promise<void>;
  isPlayServicesAvailable(): Promise<boolean>;
  signIn(): Promise<GoogleSignInResult>;
  signInSilently(): Promise<GoogleSignInResult>;
  getTokens(): Promise<GoogleSignInTokens>;
  signOut(): Promise<void>;
  isSignedIn(): Promise<boolean>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('GoogleSigninModern');
