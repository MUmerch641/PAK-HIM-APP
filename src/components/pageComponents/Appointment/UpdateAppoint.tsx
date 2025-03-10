import { updateAppointment } from "@/src/ApiHandler/Appointment";
import Toast from "react-native-toast-message";

interface Service {
  _id: string;
  fee: number;
  hospitalChargesInPercentage: number;
  turnaround_time: number;
}

interface InsuranceDetails {
  insuranceCompanyId?: string;
  insuranceId?: string;
  claimStatus?: string;
}

interface AppointmentTime {
  from: string;
  to: string;
}

interface AppointmentData {
  _id: string;
  doctorId?: string;
  // patientId?: string | { _id: string };
  services?: Service[];
  fee?: number;
  discount?: number;
  feeStatus?: string;
  appointmentDate?: string;
  appointmentTime?: AppointmentTime;
  insuranceDetails?: InsuranceDetails;
  returnableAmount?: number;
  doctor?: { fullName: string };
}
export const UpdateAppointments = async (appointmentData: AppointmentData): Promise<any> => {
  if (!appointmentData?._id || typeof appointmentData._id !== "string") {
    Toast.show({
      type: "error",
      text1: "Error",
      text2: "Invalid appointment ID",
    });
    return;
  }

  try {
    // Ensure services array does not contain null values
    const services: string[] = appointmentData.services?.map(service => service._id) || [];

    // Ensure discount is handled correctly
    const totalFee = Number(appointmentData.fee) || 0;
    const discountAmount = Number(appointmentData.discount) || 0;
    const discountInPercentage = totalFee > 0 ? Number((discountAmount / totalFee * 100).toFixed(2)) : 0;

    // Format appointmentDate
    const formattedDate = appointmentData.appointmentDate
      ? new Date(appointmentData.appointmentDate).toISOString().split('T')[0]
      : "";

    // Ensure appointmentTime is valid
    const appointmentTime = appointmentData.appointmentTime?.from && appointmentData.appointmentTime?.to
      ? {
          from: appointmentData.appointmentTime.from,
          to: appointmentData.appointmentTime.to,
        }
      : undefined;

    // Create transformedData
    const transformedData: any = {
      doctorId: appointmentData.doctorId || "",
      services: services,
      feeStatus: appointmentData.feeStatus || "Unpaid",
      appointmentDate: formattedDate,
      discount: discountAmount,
      discountInPercentage: discountInPercentage,
    };

    // Add appointmentTime only if valid
    if (appointmentTime) {
      transformedData.appointmentTime = appointmentTime;
    }

    // Call API
    const response = await updateAppointment(appointmentData._id, transformedData);

    return response;
  } catch (error: any) {
    console.error("Update error:", error.response?.data || error);
    Toast.show({
      type: "error",
      text1: "Error",
      text2: error.response?.data?.message || "Failed to update appointment",
    });
    throw error;
  }
};
