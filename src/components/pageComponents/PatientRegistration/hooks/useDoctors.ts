import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAssignedDoctors, Service } from '../../../../ApiHandler/Appointment';
import { Doctor } from '../../../../types/PatientRegistration';

export function useDoctors(formData: any, setFormData: any, setServices: any) {
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [userData, setUserData] = useState<any>(null);
    const [isDoctorLocked, setIsDoctorLocked] = useState(false);

    useEffect(() => {
        const fetchDoctors = async () => {
            try {
                const userDataString = await AsyncStorage.getItem("userData");
                const userDataObj = userDataString ? JSON.parse(userDataString) : null;
                setUserData(userDataObj);

                const response = await getAssignedDoctors();
                const doctorsList: Doctor[] = response.map((doctor: any) => ({
                    _id: doctor._id,
                    fullName: doctor.fullName,
                    services: doctor.services || [],
                }));
                setDoctors(doctorsList);

                if (userDataObj && userDataObj.fullName && doctorsList.length > 0) {
                    const matchedDoctor = doctorsList.find((doctor) => doctor.fullName === userDataObj.fullName);

                    if (matchedDoctor) {
                        setIsDoctorLocked(true);
                        setServices(matchedDoctor.services);
                        setFormData((prev: any) => ({
                            ...prev,
                            doctorName: matchedDoctor.fullName,
                            appointment: { ...prev.appointment, doctorId: matchedDoctor._id },
                        }));
                    } else if (doctorsList.length > 0 && formData.status !== "insurance") {
                        setServices(doctorsList[0].services);
                        setFormData((prev: any) => ({
                            ...prev,
                            doctorName: doctorsList[0].fullName,
                            appointment: { ...prev.appointment, doctorId: doctorsList[0]._id },
                        }));
                    }
                } else if (doctorsList.length > 0 && formData.status !== "insurance") {
                    setServices(doctorsList[0].services);
                    setFormData((prev: any) => ({
                        ...prev,
                        doctorName: doctorsList[0].fullName,
                        appointment: { ...prev.appointment, doctorId: doctorsList[0]._id },
                    }));
                }
            } catch (error) {
                console.error("Error fetching doctors:", error);
            }
        };
        fetchDoctors();
    }, []);

    return { doctors, userData, isDoctorLocked };
}
