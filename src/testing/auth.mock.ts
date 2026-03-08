import { of } from 'rxjs';

/**
 * Mock AuthService for @auth0/auth0-angular
 * Used globally in tests to avoid InjectionToken auth0.client errors.
 */
export const mockAuthService = {
  user$: of(null),
  isAuthenticated$: of(false),
  isLoading$: of(false),
  idTokenClaims$: of(null),
  appState$: of(null),
  error$: of(null),
  accessToken$: of(''),
  getAccessTokenSilently: () => of('mock-token'),
  getAccessTokenWithPopup: () => of('mock-token'),
  getIdTokenClaims: () => of(null),
  loginWithRedirect: () => of(void 0),
  loginWithPopup: () => of(void 0),
  logout: () => of(void 0),
  handleRedirectCallback: () => of({ appState: {} }),
};
