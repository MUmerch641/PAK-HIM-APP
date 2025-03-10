import { signUpUser } from "../Auth/authService";

interface SignUpPayload {
  officialEmail: string;
  password: string;
  hospitalName: string;
  phoneNo: string;
  address: string;
  hospitalLicense?: string;
}

interface ApiResponse {
  isSuccess: boolean;
  message: string;
  data: UserData;
}

interface UserData {
  token: string;
  // Add other user data fields as needed
}

// Function to handle user sign-up
export function signUp(
  officialEmail: string,
  password: string,
  confirmPassword: string,
  hospitalName: string,
  phoneNo: string,
  address: string,
  hospitalLicense?: string
): Promise<UserData | null> {
  if (password !== confirmPassword) {
    throw new Error("Passwords do not match");
  }

  const signUpData: SignUpPayload = {
    officialEmail,
    password,
    hospitalName,
    phoneNo,
    address,
    hospitalLicense,
  };

  return signUpUser(signUpData);
}
