import React, { useMemo } from 'react';
import { View, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { getStyles } from './styles';
import { useTheme } from '../../../utils/ThemeContext';

export default function SearchPatientBar({
    searchType,
    setSearchType,
    searchQuery,
    handleSearchInputChange,
    handleSearchSubmit,
    setSearchQuery,
}: any) {
    const { currentColors } = useTheme();
    const styles = useMemo(() => getStyles(currentColors), [currentColors]);

    return (
        <View style={styles.searchContainer}>
            <View style={styles.searchTypeContainer}>
                <Picker
                    selectedValue={searchType}
                    onValueChange={(itemValue) => setSearchType(itemValue)}
                    style={styles.searchPicker}
                    dropdownIconColor={currentColors.AppointmentColor}
                >
                    <Picker.Item label="MRN" value="MRN" />
                    <Picker.Item label="Name" value="Name" />
                    <Picker.Item label="CNIC" value="CNIC" />
                    <Picker.Item label="Mobile No" value="Mobile No" />
                </Picker>
            </View>
            <View style={styles.searchInputContainer}>
                <Ionicons name="search" size={20} color={currentColors.AppointmentColor} />
                <TextInput
                    placeholder="Search patient records..."
                    placeholderTextColor={currentColors.placeholderColor || currentColors.AppointmentColor + "80"}
                    style={styles.searchInput}
                    value={searchQuery}
                    onChangeText={handleSearchInputChange}
                    onSubmitEditing={handleSearchSubmit}
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery("")} style={styles.clearButton}>
                        <Ionicons name="close-circle" size={18} color={currentColors.AppointmentColor} />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}
