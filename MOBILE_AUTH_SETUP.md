# Mobile Authentication Setup Guide (Google & Apple)

This guide walks you through setting up Google and Apple authentication in the NillarPay mobile app (Expo React Native) and connecting it to our existing `mobile-login` backend endpoint.

## Prerequisites
- [Expo CLI](https://docs.expo.dev/get-started/installation/) installed
- Google Cloud Console account
- Apple Developer Account (for Apple Sign In)

---

## 1. Google Authentication Setup

### A. Google Cloud Console Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use the existing one created for web)
3. **OAuth Consent Screen**: Ensure it's configured as done for the web.
4. **Create Credentials** (You need separate Client IDs for iOS and Android):
    - **iOS**:
        - Create OAuth client ID -> **iOS**.
        - Bundle ID: `com.nillarpay.app` (Match your `app.json` bundleIdentifier).
    - **Android**:
        - Create OAuth client ID -> **Android**.
        - Package name: `com.nillarpay.app` (Match your `app.json` package).
        - SHA-1 Certificate Fingerprint: Run `cd android && ./gradlew signingReport` (for bare workflow) or use `eas credentials` if using EAS Build.
    - **Web** (Required for Expo Go & Web):
        - You should already have this from the web setup.

### B. Install Dependencies
In your `the-app` directory:
```bash
npx expo install expo-auth-session expo-crypto
npx expo install @react-native-google-signin/google-signin
``` 
*Note: `expo-auth-session` is great, but `@react-native-google-signin/google-signin` is more robust for native apps. For this guide, we'll stick to a pattern compatible with Expo.*

### C. Configure `app.json`
Add the URL scheme to your `app.json` to handle redirects (crucial for Google Auth):
```json
{
  "expo": {
    "scheme": "nillarpay",
    "ios": {
      "bundleIdentifier": "com.nillarpay.app",
      "config": {
        "googleSignIn": {
          "reservedClientId": "YOUR_IOS_URL_SCHEME"
        }
      }
    },
    "android": {
      "package": "com.nillarpay.app"
    },
     "plugins": [
      "@react-native-google-signin/google-signin"
    ]
  }
}
```

---

## 2. Apple Authentication Setup

### A. Apple Developer Portal
1. Go to [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/identifiers/list).
2. Register an App ID (`com.nillarpay.app`) with the "Sign In with Apple" capability checked.
3. Create a Service ID (for web flow if needed, but native flow uses the App ID directly).

### B. Install Dependencies
```bash
npx expo install expo-apple-authentication
```

---

## 3. Implementation in Mobile App

Create a new `SocialAuthButtons.tsx` component in your app.

### Updated `authService.ts`
Add a social login method to your `AuthService` class:

```typescript
// src/services/authService.ts

async socialLogin(provider: 'google' | 'apple', token: string, firstName?: string, lastName?: string): Promise<AuthResponse> {
  try {
    const response = await this.apiClient.post<AuthResponse>('/auth/mobile-login', {
      provider,
      token,
      firstName,
      lastName
    });
    
    const { token: authToken, accessToken, refreshToken, user } = response.data;
    const finalToken = authToken || accessToken;
    
    await this.storeTokens(finalToken, refreshToken);
    await this.storeUser(user);
    
    return response.data; // { user, token, ... }
  } catch (error: any) {
    throw new Error(error.response?.data?.error || `${provider} login failed`);
  }
}
```

### Example `LoginScreen` Integration

```tsx
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';

export default function LoginScreen() {
  // Google Hook
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: 'YOUR_ANDROID_CLIENT_ID',
    iosClientId: 'YOUR_IOS_CLIENT_ID',
    webClientId: 'YOUR_WEB_CLIENT_ID',
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      handleSocialLogin('google', id_token);
    }
  }, [response]);

  const handleSocialLogin = async (provider, token, fName, lName) => {
     try {
        await authService.socialLogin(provider, token, fName, lName);
        // Navigate to Dashboard
     } catch (err) {
        // Handle error
     }
  }

  return (
    <View>
      {/* Existing Login Form */}
      
      {/* Google Button */}
      <Button 
        title="Sign in with Google" 
        disabled={!request}
        onPress={() => promptAsync()} 
      />

      {/* Apple Button (Only show on iOS) */}
      {Platform.OS === 'ios' && (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={5}
          style={{ width: 200, height: 44 }}
          onPress={async () => {
            try {
              const credential = await AppleAuthentication.signInAsync({
                requestedScopes: [
                  AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                  AppleAuthentication.AppleAuthenticationScope.EMAIL,
                ],
              });
              // credential.identityToken is what you send to backend
              handleSocialLogin(
                  'apple', 
                  credential.identityToken, 
                  credential.fullName?.givenName,
                  credential.fullName?.familyName
              );
            } catch (e) {
              if (e.code === 'ERR_CANCELED') {
                // handle that the user canceled the sign-in flow
              } else {
                // handle other errors
              }
            }
          }}
        />
      )}
    </View>
  );
}
```

## 4. Backend Configuration (Already Checked)
Your backend endpoint `/api/auth/mobile-login` is already set up to receive:
- `provider`: 'google' | 'apple'
- `token`: The identity token
- `firstName`: (Optional)
- `lastName`: (Optional)

It verifies the token with Google/Apple servers and creates/logs in the user.

**Important Environment Variables for Backend:**
Ensure these are set in the backend `.env`:
```env
GOOGLE_CLIENT_ID="same-web-client-id-probably"
APPLE_ID="com.nillarpay.app" 
```
*Note: For Google, the `audience` in backend verification usually matches the Web Client ID, but with Expo/Native, the ID Token `aud` claim might match the Android/iOS Client ID. You may need to add your Android/iOS Client IDs to the `audience` check in `route.ts` if verification fails.*

Modify `c:\projects\the-pos\the-backend\app\api\auth\mobile-login\route.ts`:
```typescript
const ticket = await googleClient.verifyIdToken({
    idToken: token,
    audience: [
        process.env.GOOGLE_CLIENT_ID, 
        process.env.GOOGLE_ANDROID_CLIENT_ID, 
        process.env.GOOGLE_IOS_CLIENT_ID
    ],
});
```
