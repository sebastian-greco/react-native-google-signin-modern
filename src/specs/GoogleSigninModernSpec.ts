import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export type GoogleSignInResult = Readonly<{
  idToken: string;
  user: Readonly<{
    id: string;
    name?: string | null;
    email: string;
    photo?: string | null;
  }>;
}>;

export interface Spec extends TurboModule {
  configure(webClientId: string): Promise<void>;
  isPlayServicesAvailable(): Promise<boolean>;
  signIn(): Promise<GoogleSignInResult>;
  signOut(): Promise<void>;
  isSignedIn(): Promise<boolean>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('GoogleSigninModern');
