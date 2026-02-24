import { useState } from 'react';
import Toast from 'react-native-toast-message';
import {
    getPatientByMRN,
    getPatientByCNIC,
    getPatientByPhonNo,
    getPatientByName,
} from '../../../../ApiHandler/Patient';
import { Patient } from '../../../../types/PatientRegistration';

export function usePatientSearch(
    updateFormWithPatientData: (patient: any) => void,
    resetPatientData: () => void,
    setCurrentStep: (step: number) => void
) {
    const [searchQuery, setSearchQuery] = useState("");
    const [searchType, setSearchType] = useState("MRN");
    const [isSearching, setIsSearching] = useState(false);
    const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
    const [showSearchResults, setShowSearchResults] = useState(false);
    const [searchResults, setSearchResults] = useState<Patient[]>([]);
    const [existingPatient, setExistingPatient] = useState<Patient | null>(null);

    const performSearch = async (value: string) => {
        if (value.trim().length === 0 || isSearching) return;
        setIsSearching(true);
        try {
            let response: any = null;
            switch (searchType) {
                case "MRN":
                    response = await getPatientByMRN(value);
                    break;
                case "CNIC":
                    response = await getPatientByCNIC(value);
                    break;
                case "Mobile No":
                    response = await getPatientByPhonNo(value);
                    break;
                case "Name":
                    response = await getPatientByName(value);
                    break;
                default:
                    Toast.show({ type: "error", text1: "Error", text2: "Invalid search type" });
                    setIsSearching(false);
                    return;
            }

            if (response?.isSuccess && response.data) {
                if (Array.isArray(response.data) && response.data.length > 0) {
                    setSearchResults(response.data);
                    setShowSearchResults(true);
                } else {
                    setExistingPatient(response.data);
                    updateFormWithPatientData(response.data);
                    setCurrentStep(2);
                    Toast.show({ type: "success", text1: "Success", text2: "Patient details found" });
                }
            } else {
                Toast.show({ type: "error", text1: "Error", text2: response?.message || "No patient details found" });
            }
        } catch (error: any) {
            console.error("Error fetching patient details:", error);
            Toast.show({ type: "error", text1: "Error", text2: error.message || "Failed to load patient details" });
        } finally {
            setIsSearching(false);
        }
    };

    const handleSearchInputChange = (value: string) => {
        if (value.trim() === "") {
            setSearchQuery("");
            setShowSearchResults(false);
            setSearchResults([]);
            setExistingPatient(null);
            setCurrentStep(1);
            resetPatientData();
            return;
        }
        setSearchQuery(value);
        if (searchTimeout) clearTimeout(searchTimeout);
        if (value.trim().length > 0) {
            const timeout = setTimeout(() => performSearch(value), 800);
            setSearchTimeout(timeout);
        }
    };

    const handleSearchSubmit = () => {
        if (searchQuery.trim().length > 0) {
            if (searchTimeout) clearTimeout(searchTimeout);
            performSearch(searchQuery);
        }
    };

    return {
        searchQuery,
        setSearchQuery,
        searchType,
        setSearchType,
        isSearching,
        showSearchResults,
        setShowSearchResults,
        searchResults,
        existingPatient,
        setExistingPatient,
        handleSearchInputChange,
        handleSearchSubmit,
    };
}
