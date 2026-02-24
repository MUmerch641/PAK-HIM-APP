import { Service } from '../ApiHandler/Appointment';

export interface InsuranceCompany {
    _id: string;
    companyName: string;
    phoneNumber: string;
    email: string;
    isActive: boolean;
    projectId: string;
    userId: string;
    insuranceServices: InsuranceService[];
}

export interface InsuranceService {
    _id: string;
    companyId: string;
    serviceName: string;
    fees: number;
    doctorCharges: number;
    comment: string;
    isActive: boolean;
}

export interface InsuranceCompaniesResponse {
    isSuccess?: boolean;
    data: InsuranceCompany[];
    message: string;
    totalCount: number;
}

export interface Patient {
    _id?: string;
    mrn: number;
    patientName: string;
    guardiansName: string;
    gender: string;
    dob: string;
    phoneNumber: string;
    cnic: string;
    healthId: string;
    city: string;
    reference: string;
    extra: Record<string, unknown>;
    appointment: {
        doctorId: string;
        services: string[];
        feeStatus: string;
        appointmentDate: string;
        appointmentTime: { from: string; to: string };
        extra: Record<string, unknown>;
        discount: number;
        discountInPercentage: number;
        insuranceDetails: { insuranceCompanyId: string; insuranceId: string; claimStatus: string };
        returnableAmount: number;
    };
}

export interface Doctor {
    _id: string;
    fullName: string;
    services: Service[];
}

export interface FormDataState {
    patientName: string;
    guardianName: string;
    phoneNo: string;
    gender: string;
    dateOfBirth: Date;
    cnic: string;
    healthId: string;
    city: string;
    reference: string;
    doctorName: string;
    services: string;
    appointmentDate: Date;
    time: Date;
    totalFee: string;
    payableFee: string;
    discountPercentage: string;
    discountAmount: string;
    status: string;
    extra: Record<string, unknown>;
    appointment: {
        doctorId: string;
        patientId: string;
        services: string[];
        feeStatus: string;
        appointmentDate: string;
        appointmentTime: { from: string; to: string };
        extra: Record<string, unknown>;
        discount: number;
        discountInPercentage: number;
        insuranceDetails: { insuranceCompanyId: string; insuranceId: string; claimStatus: string };
        returnableAmount: number;
    };
}

export type ActionType =
    | { type: 'UPDATE_FIELD'; field: string; value: any }
    | { type: 'UPDATE_APPOINTMENT_FIELD'; field: string; value: any }
    | { type: 'UPDATE_INSURANCE_DETAILS'; field: string; value: any }
    | { type: 'SET_FORM_DATA'; payload: any }
    | { type: 'RESET_FORM' };
