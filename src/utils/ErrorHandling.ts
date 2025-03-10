// Function to map local error codes to custom messages
const getErrorMessage = (error: { code: string }) => {
  switch (error.code) {
    case 'email-already-in-use':
      return 'Email already in use';
    case 'invalid-email':
      return 'Invalid email address';
    case 'weak-password':
      return 'Password is too weak';
    case 'user-not-found':
      return 'User not found';
    case 'wrong-password':
      return 'Incorrect password';
    case 'too-many-requests':
      return 'Too many requests. Try again later.';
    case 'network-request-failed':
      return 'Network error. Please check your connection.';
    case 'operation-not-allowed':
      return 'Operation not allowed. Please contact support.';
    case 'requires-recent-login':
      return 'Please log in again to proceed.';
    case 'user-disabled':
      return 'User account has been disabled.';
    case 'user-token-expired':
      return 'User token has expired. Please log in again.';
    case 'web-storage-unsupported':
      return 'Web storage is not supported on this browser.';
    case 'invalid-api-key':
      return 'Invalid API key. Please check your configuration.';
    case 'app-not-authorized':
      return 'App not authorized. Please check your configuration.';
    case 'expired-action-code':
      return 'Action code has expired. Please try again.';
    case 'invalid-action-code':
      return 'Invalid action code. Please try again.';
    case 'invalid-credential':
      return 'Invalid credentials. Please try again.';
    case 'invalid-verification-code':
      return 'Invalid verification code. Please try again.';
    case 'invalid-verification-id':
      return 'Invalid verification ID. Please try again.';
    case 'missing-verification-code':
      return 'Missing verification code. Please try again.';
    case 'missing-verification-id':
      return 'Missing verification ID. Please try again.';
    case 'invalid-phone-number':
      return 'Invalid phone number. Please check the number and try again.';
    case 'missing-phone-number':
      return 'Missing phone number. Please enter a phone number.';
    // Add more cases as needed
    default:
      return 'An unknown error occurred';
  }
};

export { getErrorMessage };