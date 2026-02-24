import { useState, useEffect } from 'react';
import Toast from 'react-native-toast-message';
import { getInsuranceCompanies, getInsuranceServicesByCompanyId } from '../../../../ApiHandler/Patient';
import { InsuranceCompany, InsuranceService } from '../../../../types/PatientRegistration';

export function useInsurance(formData: any, setServices: any) {
    const [insuranceCompanies, setInsuranceCompanies] = useState<InsuranceCompany[]>([]);
    const [insuranceServices, setInsuranceServices] = useState<InsuranceService[]>([]);
    const [isLoadingServices, setIsLoadingServices] = useState(false);

    useEffect(() => {
        const fetchInsuranceCompaniesInit = async () => {
            try {
                const response = await getInsuranceCompanies({ count: 100, pageNo: 1 });
                if (response.data && Array.isArray(response.data)) {
                    setInsuranceCompanies(response.data as InsuranceCompany[]);
                }
            } catch (error) {
                console.error("Error fetching insurance companies:", error);
            }
        };
        fetchInsuranceCompaniesInit();
    }, []);

    useEffect(() => {
        const fetchInsuranceServicesData = async () => {
            if (formData.status === "insurance" && formData.appointment.insuranceDetails.insuranceCompanyId) {
                setIsLoadingServices(true);
                try {
                    const response = await getInsuranceServicesByCompanyId(
                        formData.appointment.insuranceDetails.insuranceCompanyId,
                    );
                    if (response.data && Array.isArray(response.data)) {
                        setInsuranceServices(response.data as InsuranceService[]);
                        setServices(response.data as InsuranceService[]);
                    }
                } catch (error) {
                    console.error("Error fetching insurance services:", error);
                    Toast.show({
                        type: "error",
                        text1: "Error",
                        text2: "Failed to load insurance services",
                    });
                } finally {
                    setIsLoadingServices(false);
                }
            }
        };

        fetchInsuranceServicesData();
    }, [formData.appointment.insuranceDetails.insuranceCompanyId, formData.status]);

    return { insuranceCompanies, insuranceServices, isLoadingServices };
}
