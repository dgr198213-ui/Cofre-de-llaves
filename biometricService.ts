// Utility to check if WebAuthn is supported and platform authenticator (fingerprint/face) is available
export const isBiometricSupported = async (): Promise<boolean> => {
  if (!window.PublicKeyCredential) {
    return false;
  }
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch (e) {
    return false;
  }
};

export type BiometricResult = {
  success: boolean;
  error?: string;
};

// Register a credential (used here effectively to toggle "on" and verify the user allows it)
export const registerBiometrics = async (): Promise<BiometricResult> => {
  try {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const publicKey: PublicKeyCredentialCreationOptions = {
      challenge,
      rp: {
        name: "CredVault AI",
      },
      user: {
        id: Uint8Array.from("credvault_user", c => c.charCodeAt(0)),
        name: "user@credvault.local",
        displayName: "Vault Owner",
      },
      pubKeyCredParams: [{ alg: -7, type: "public-key" }],
      authenticatorSelection: {
        authenticatorAttachment: "platform", // Forces built-in sensor (TouchID, Windows Hello, Android Biometrics)
        userVerification: "required",      // Forces biometric check
      },
      timeout: 60000,
      attestation: "none",
    };

    const credential = await navigator.credentials.create({ publicKey });
    return { success: !!credential };
  } catch (error: any) {
    console.error("Biometric registration failed:", error);
    let msg = "Failed to verify biometrics";
    if (error.name === 'NotAllowedError') {
      msg = "Biometric access denied or timed out.";
    } else if (error.message && error.message.includes('publickey-credentials-create')) {
      msg = "Biometrics disabled by browser/system policy.";
    }
    return { success: false, error: msg };
  }
};

// Authenticate user
export const authenticateWithBiometrics = async (): Promise<boolean> => {
  try {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const publicKey: PublicKeyCredentialRequestOptions = {
      challenge,
      timeout: 60000,
      userVerification: "required", // Required for biometric factor
    };

    const assertion = await navigator.credentials.get({ publicKey });
    return !!assertion;
  } catch (error) {
    console.error("Biometric authentication failed:", error);
    return false;
  }
};
