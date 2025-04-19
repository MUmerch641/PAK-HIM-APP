import React, { useEffect } from 'react';
import { View, TouchableOpacity, Text, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { moderateScale } from 'react-native-size-matters';
import { StyleSheet } from 'react-native';
import { getFinancialReport } from '@/src/ApiHandler/Report';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';

const actionItems = [
  { icon: <Ionicons name="eye-outline" size={moderateScale(20)} color="#9daf4c" />, label: 'View' },
  { icon: <Ionicons name="download-outline" size={moderateScale(20)} color="#4cf436" />, label: 'PDF' },
];

const ActionMenu = ({ visible, onClose, style, report, setShowViewScreen, dateRange, setReports, setOverlayLoading, closeExpandable, currentColors }) => {
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
        feeStatus: "paid",
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
        feeStatus: "paid",
      };
      const response = await getFinancialReport(params);

      // Generate HTML content for the PDF
      const htmlContent = `
        <html>
          <head>
            <style>
              table {
                width: 100%;
                border-collapse: collapse;
              }
              th, td {
                border: 1px solid black;
                padding: 8px;
                text-align: left;
              }
              th {
                background-color: #f2f2f2;
              }
            </style>
          </head>
          <body>
            <h1>Total Report</h1>
            <p>Date: ${dateRange.fromDate} to ${dateRange.toDate}</p>
            <table>
              <tr>
                <th>Name</th>
                <th>Discount</th>
                <th>Discountent</th>
                <th>Created by</th>
                <th>Service Charge</th>
                <th>Dr. Charge</th>
              </tr>
              ${response.map(report => `
                <tr>
                  <td>${report.name || '-'}</td>
                  <td>${report.discount || '-'}</td>
                  <td>${report.discountentName || '-'}</td>
                  <td>${report.createdBy || '-'}</td>
                  <td>${report.servicesCharges || '-'}</td>
                  <td>${report.doctoreCharges || '-'}</td>
                </tr>
              `).join('')}
            </table>
          </body>
        </html>
      `;

      // Generate PDF
      const { uri } = await Print.printToFileAsync({ html: htmlContent });

      // Define file path
      let fileUri;
      if (Platform.OS === 'android') {
        // First, move to cache directory
        fileUri = `${FileSystem.cacheDirectory}Total_Report_${dateRange.fromDate}_to_${dateRange.toDate}.pdf`;
        await FileSystem.moveAsync({ from: uri, to: fileUri });

        // Check if the file exists
        const fileInfo = await FileSystem.getInfoAsync(fileUri);
        if (!fileInfo.exists) {
          throw new Error('Failed to create PDF file in cache directory.');
        }

        // Use StorageAccessFramework to save to Downloads
        const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (permissions.granted) {
          const base64 = await FileSystem.readAsStringAsync(fileUri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
            permissions.directoryUri,
            `Total_Report_${dateRange.fromDate}_to_${dateRange.toDate}.pdf`,
            'application/pdf'
          );
          await FileSystem.writeAsStringAsync(fileUri, base64, {
            encoding: FileSystem.EncodingType.Base64,
          });
          fileUri = `Downloads/Total_Report_${dateRange.fromDate}_to_${dateRange.toDate}.pdf`;
        } else {
          throw new Error('Storage access permission denied.');
        }
      } else {
        // iOS: Save to document directory and allow sharing
        fileUri = `${FileSystem.documentDirectory}Total_Report_${dateRange.fromDate}_to_${dateRange.toDate}.pdf`;
        await FileSystem.moveAsync({ from: uri, to: fileUri });
      }

      // Show success message
      alert(`PDF file saved to: ${fileUri}${Platform.OS === 'ios' ? '\nYou can share it to save to another location.' : ''}`);

      // On iOS, offer to share the file
      if (Platform.OS === 'ios') {
        await Sharing.shareAsync(fileUri);
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert(`Failed to generate PDF file: ${error.message}`);
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
            if (item.label === 'PDF') {
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

const styles = (currentColors) => {
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
};

export { ActionMenu };