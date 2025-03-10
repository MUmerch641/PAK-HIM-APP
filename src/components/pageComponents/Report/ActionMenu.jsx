import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { moderateScale } from 'react-native-size-matters';
import { StyleSheet } from 'react-native';
import { getFinancialReport } from '@/src/ApiHandler/Report';
import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const actionItems = [
  { icon: <Ionicons name="eye-outline" size={moderateScale(20)} color="#9daf4c" />, label: 'View' },
  { icon: <Ionicons name="print-outline" size={moderateScale(20)} color="#4cf436" />, label: 'Print' },
];

const ActionMenu = ({ visible, onClose, style, report, setShowViewScreen, dateRange, setReports, setOverlayLoading, closeExpandable,currentColors }) => { // Add setShowViewScreen prop

  if (!visible) return null;
  useEffect(() => {
    if (visible) {
      closeExpandable();
    }
  }, [visible, closeExpandable]);

  const fetchReport = async () => {
    try {
      const params = {
        userIds: [],
        doctorIds: [report.DoctorId],
        fromDate: dateRange.fromDate,
        toDate: dateRange.toDate,
        feeStatus: "paid"
      };
      const response = await getFinancialReport(params);
      setReports(response);
    } catch (error) {
      console.error("Error fetching hospital report:", error);
    }
  };

  const handlePrint = async () => {
    setOverlayLoading(true); // Set loading to true
    try {
      const params = {
        userIds: [],
        doctorIds: [report.DoctorId],
        fromDate: dateRange.fromDate,
        toDate: dateRange.toDate,
        feeStatus: "paid"
      };
      const response = await getFinancialReport(params);
      const data = response.map(report => ({
        Name: report.name || '-',
        Discount: report.discount || '-',
        Discountent: report.discountentName || '-',
        'Created by': report.createdBy || '-',
        'Service Charge': report.servicesCharges || '-',
        'Dr. Charge': report.doctoreCharges || '-',
      }));

      // Convert data to worksheet
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

      // Convert workbook to binary Excel format
      const excelBinary = XLSX.write(workbook, { type: "base64", bookType: "xlsx" });

      // Define file path
      const fileUri = FileSystem.cacheDirectory + `Total_Report_${dateRange.fromDate}_to_${dateRange.toDate}.xlsx`;

      // Write file
      await FileSystem.writeAsStringAsync(fileUri, excelBinary, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Share the file
      await Sharing.shareAsync(fileUri);
    } catch (error) {
      console.error("Error generating report:", error);
    } finally {
      setOverlayLoading(false); // Set loading to false
    }
  };

  return (
    <View style={[styles(currentColors).actionMenu, style]}>



      {actionItems.map((item, index) => (
        <TouchableOpacity
          key={index}
          style={styles(currentColors).actionItem}
          onPress={() => {
            if (item.label === 'View') {
              setShowViewScreen(true); // Show view screen
              fetchReport();
            }
            if (item.label === 'Print') {
              handlePrint();
            }
          }}
        >
          <Text style={styles(currentColors).actionIcon}>{item.icon}</Text>
          <Text style={[styles(currentColors).actionText]}>{item.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = (currentColors)=>{
  return StyleSheet.create({
    actionMenu: {
      backgroundColor: 'white',
      borderRadius: moderateScale(8),
      padding: moderateScale(5),
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
      minWidth: moderateScale(120),
      zIndex: 1000,
      // position: 'absolute',
    },
    actionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: moderateScale(8),
      gap: moderateScale(8),
    },
    actionText: {
      fontSize: moderateScale(14),
      color: currentColors.actionMenuTextColor,
    },
    loadingOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1,
    },
    loadingText: {
      color: '#fff',
      marginTop: moderateScale(10),
      fontSize: moderateScale(16),
    },
    actionIcon: {
      marginRight: moderateScale(5),
    },
  });
}


export { ActionMenu };