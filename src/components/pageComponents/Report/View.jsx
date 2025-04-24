import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar, FlatList, ActivityIndicator, RefreshControl, Animated, TextInput, Platform } from 'react-native';
import VectorIcons from 'react-native-vector-icons/Ionicons';
import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import * as MediaLibrary from 'expo-media-library';
import { shareAsync } from 'expo-sharing';
import ExpandableDetails from '../../Reuseable/Expandable'; // Import ExpandableDetails

import { useTheme } from '@/src/utils/ThemeContext';

const FinancialReport = ({ onClose, selectedDate, Reports }) => {
  const { currentColors } = useTheme();
  const [filterValue, setFilterValue] = useState('All');
  const [searchText, setSearchText] = useState('');
  const [loadingPDF, setLoadingPDF] = useState(false);
  const [loadingExcel, setLoadingExcel] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedRowIndex, setExpandedRowIndex] = useState(null); // Add state for expandable rows
  const [filteredReports, setFilteredReports] = useState([]);

  // Get the actual array of reports from the Reports object
  const reportData = Reports?.finuncialReport || [];

  // Animation refs
  const scrollY = useRef(new Animated.Value(0)).current;
  const listOpacity = useRef(new Animated.Value(0)).current;
  const listTranslateY = useRef(new Animated.Value(50)).current;
  const itemAnimatedValues = useRef([]);

  // Track if we've already initialized the animations once
  const animationInitialized = useRef(false);

  // Initialize filteredReports with all Reports on component mount only
  useEffect(() => {
    setFilteredReports(reportData);
  }, [JSON.stringify(reportData)]); // Use JSON.stringify to prevent excessive rerenders

  // Filter reports when searchText changes
  useEffect(() => {
    if (!searchText.trim()) {
      setFilteredReports(reportData);
    } else {
      const searchQuery = searchText.toLowerCase().trim();
      const filtered = reportData.filter(report => 
        (report.name && report.name.toLowerCase().includes(searchQuery)) ||
        (report.createdBy && report.createdBy.toLowerCase().includes(searchQuery)) ||
        (report.discountentName && report.discountentName.toLowerCase().includes(searchQuery)) ||
        (report.servicesCharges && report.servicesCharges.toString().includes(searchQuery)) ||
        (report.doctoreCharges && report.doctoreCharges.toString().includes(searchQuery))
      );
      setFilteredReports(filtered);
    }
  }, [searchText, JSON.stringify(reportData)]); // Use JSON.stringify to prevent excessive rerenders

  // Create animated values for each list item when filteredReports change
  // but only run animations when necessary
  useEffect(() => {
    if (filteredReports.length === 0) return;

    // Initialize animated values for each item only once
    itemAnimatedValues.current = filteredReports.map((_, i) => ({
      opacity: new Animated.Value(0),
      translateY: new Animated.Value(20)
    }));

    // Only run the full animations on the first load
    if (!animationInitialized.current) {
      // Animate list appearance when data first loads
      Animated.parallel([
        Animated.timing(listOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true
        }),
        Animated.timing(listTranslateY, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true
        })
      ]).start();

      animationInitialized.current = true;
    }

    // Staggered animation for each item
    filteredReports.forEach((_, i) => {
      if (i < itemAnimatedValues.current.length) {
        Animated.parallel([
          Animated.timing(itemAnimatedValues.current[i].opacity, {
            toValue: 1,
            duration: 500,
            delay: i * 50, // Reduced delay to make animations faster
            useNativeDriver: true
          }),
          Animated.timing(itemAnimatedValues.current[i].translateY, {
            toValue: 0,
            duration: 500,
            delay: i * 50, // Reduced delay to make animations faster
            useNativeDriver: true
          })
        ]).start();
      }
    });
  }, [JSON.stringify(filteredReports)]); // Use JSON.stringify to prevent excessive rerenders

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Add your refresh logic here
    setTimeout(() => {
      setRefreshing(false);
    }, 2000);
  }, []);

  const handleExcel = async () => {
    try {
      setLoadingExcel(true);

      // Request storage permissions for Android
      if (Platform.OS === 'android') {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted') {
          alert('Storage permission is required to save files to Downloads folder.');
          return;
        }
      }

      const data = filteredReports?.map(report => ({
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
      let fileUri;
      if (Platform.OS === 'android') {
        // First, save to cache directory
        fileUri = `${FileSystem.cacheDirectory}Financial_Report_${selectedDate.fromDate}_to_${selectedDate.toDate}.xlsx`;
        await FileSystem.writeAsStringAsync(fileUri, excelBinary, {
          encoding: FileSystem.EncodingType.Base64,
        });

        // Check if the file exists
        const fileInfo = await FileSystem.getInfoAsync(fileUri);
        if (!fileInfo.exists) {
          throw new Error('Failed to create Excel file in cache directory.');
        }

        // Try saving to Downloads using MediaLibrary
        try {
          const asset = await MediaLibrary.createAssetAsync(fileUri);
          await MediaLibrary.createAlbumAsync('Download', asset, false);
          fileUri = `Downloads/Financial_Report_${selectedDate.fromDate}_to_${selectedDate.toDate}.xlsx`;
        } catch (mediaError) {
          console.error('MediaLibrary failed:', mediaError);
          // Fallback to StorageAccessFramework
          const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
          if (permissions.granted) {
            const base64 = await FileSystem.readAsStringAsync(fileUri, {
              encoding: FileSystem.EncodingType.Base64,
            });
            fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
              permissions.directoryUri,
              `Financial_Report_${selectedDate.fromDate}_to_${selectedDate.toDate}.xlsx`,
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            );
            await FileSystem.writeAsStringAsync(fileUri, base64, {
              encoding: FileSystem.EncodingType.Base64,
            });
            fileUri = `Downloads/Financial_Report_${selectedDate.fromDate}_to_${selectedDate.toDate}.xlsx`;
          } else {
            throw new Error('Storage access permission denied.');
          }
        }
      } else {
        // iOS: Save to document directory and allow sharing
        fileUri = `${FileSystem.documentDirectory}Financial_Report_${selectedDate.fromDate}_to_${selectedDate.toDate}.xlsx`;
        await FileSystem.writeAsStringAsync(fileUri, excelBinary, {
          encoding: FileSystem.EncodingType.Base64,
        });
      }

      // Show success message
      alert(`Excel file saved to: ${fileUri}${Platform.OS === 'ios' ? '\nYou can share it to save to another location.' : ''}`);

      // On iOS, offer to share the file
      if (Platform.OS === 'ios') {
        await Sharing.shareAsync(fileUri);
      }
    } catch (error) {
      console.error('Error generating Excel:', error);
      alert(`Failed to generate Excel file: ${error.message}`);
    } finally {
      setLoadingExcel(false);
    }
  };

  const handlePDF = async () => {
    try {
      setLoadingPDF(true);

      // Request storage permissions for Android
      if (Platform.OS === 'android') {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted') {
          alert('Storage permission is required to save files to Downloads folder.');
          return;
        }
      }

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
            <h1>Financial Report</h1>
            <p>Date: ${selectedDate.fromDate} to ${selectedDate.toDate}</p>
            <table>
              <tr>
                <th>Name</th>
                <th>Discount</th>
                <th>Discountent</th>
                <th>Created by</th>
                <th>Service Charge</th>
                <th>Dr. Charge</th>
              </tr>
              ${Array.isArray(filteredReports) ? filteredReports.map(report => `
                <tr>
                  <td>${report.name || '-'}</td>
                  <td>${report.discount || '-'}</td>
                  <td>${report.discountentName || '-'}</td>
                  <td>${report.createdBy || '-'}</td>
                  <td>${report.servicesCharges || '-'}</td>
                  <td>${report.doctoreCharges || '-'}</td>
                </tr>
              `).join('') : ''}
            </table>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      let fileUri;

      if (Platform.OS === 'android') {
        // First, move to cache directory
        fileUri = `${FileSystem.cacheDirectory}Financial_Report_${selectedDate.fromDate}_to_${selectedDate.toDate}.pdf`;
        await FileSystem.moveAsync({ from: uri, to: fileUri });

        // Check if the file exists
        const fileInfo = await FileSystem.getInfoAsync(fileUri);
        if (!fileInfo.exists) {
          throw new Error('Failed to create PDF file in cache directory.');
        }

        // Try saving to Downloads using MediaLibrary
        try {
          const asset = await MediaLibrary.createAssetAsync(fileUri);
          await MediaLibrary.createAlbumAsync('Download', asset, false);
          fileUri = `Downloads/Financial_Report_${selectedDate.fromDate}_to_${selectedDate.toDate}.pdf`;
        } catch (mediaError) {
          console.error('MediaLibrary failed:', mediaError);
          // Fallback to StorageAccessFramework
          const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
          if (permissions.granted) {
            const base64 = await FileSystem.readAsStringAsync(fileUri, {
              encoding: FileSystem.EncodingType.Base64,
            });
            fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
              permissions.directoryUri,
              `Financial_Report_${selectedDate.fromDate}_to_${selectedDate.toDate}.pdf`,
              'application/pdf'
            );
            await FileSystem.writeAsStringAsync(fileUri, base64, {
              encoding: FileSystem.EncodingType.Base64,
            });
            fileUri = `Downloads/Financial_Report_${selectedDate.fromDate}_to_${selectedDate.toDate}.pdf`;
          } else {
            throw new Error('Storage access permission denied.');
          }
        }
      } else {
        // iOS: Save to document directory and allow sharing
        fileUri = `${FileSystem.documentDirectory}Financial_Report_${selectedDate.fromDate}_to_${selectedDate.toDate}.pdf`;
        await FileSystem.moveAsync({ from: uri, to: fileUri });
      }

      // Show success message
      alert(`PDF file saved to: ${fileUri}${Platform.OS === 'ios' ? '\nYou can share it to save to another location.' : ''}`);

      // On iOS, offer to share the file
      if (Platform.OS === 'ios') {
        await Sharing.shareAsync(fileUri);
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert(`Failed to generate PDF file: ${error.message}`);
    } finally {
      setLoadingPDF(false);
    }
  };

  const toggleExpand = (index) => {
    setExpandedRowIndex(expandedRowIndex === index ? null : index);
  };

  const renderItem = ({ item, index }) => {
    // Use the pre-created animated values for this item
    const animatedStyle = {
      opacity: itemAnimatedValues.current[index]?.opacity || new Animated.Value(1),
      transform: [{ translateY: itemAnimatedValues.current[index]?.translateY || new Animated.Value(0) }]
    };

    return (
      <Animated.View style={animatedStyle}>
        <View>
          <TouchableOpacity onPress={() => toggleExpand(index)}>
            <View style={styles(currentColors).tableRow}>
              <Text style={[styles(currentColors).cellText, { flex: 0.8 }]}>{item.name || '-'}</Text>
              <Text style={[styles(currentColors).cellText, { flex: 1 }]}>{item.createdBy || '-'}</Text>
              <Text style={[styles(currentColors).cellText, { flex: 1 }]}>{item.servicesCharges || '-'}</Text>
              <Text style={[styles(currentColors).cellText, { flex: 1 }]}>{item.doctoreCharges || '-'}</Text>
            </View>
          </TouchableOpacity>
          {expandedRowIndex === index && (
            <ExpandableDetails data={item} type="financial" />
          )}
        </View>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles(currentColors).container}>
      {(loadingPDF || loadingExcel) && (
        <View style={styles(currentColors).loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles(currentColors).loadingText}>{loadingPDF ? 'Generating PDF...' : 'Generating Excel...'}</Text>
        </View>
      )}

      {/* Header */}
      <View style={styles(currentColors).header}>
        <TouchableOpacity
          style={styles(currentColors).backButton}
          onPress={() => onClose()}
        >
          <VectorIcons name="arrow-back" size={24} color={currentColors.headerText} />
        </TouchableOpacity>
        <View style={styles(currentColors).headerContent}>
          <View style={styles(currentColors).headerLeft}>
            <Text style={styles(currentColors).headerTitle}>Dr Nadeem</Text>
          </View>
          <View style={styles(currentColors).headerCenter}>
            <Text style={styles(currentColors).headerTitle}>Financial Report</Text>
          </View>
          <View style={styles(currentColors).headerRight}>
            <Text style={styles(currentColors).dateText}>Date: {selectedDate.fromDate} to {selectedDate.toDate}</Text>
          </View>
        </View>
      </View>

      {/* Main Content */}
      <View style={styles(currentColors).mainContent}>
        {/* Search Bar */}
        <View style={styles(currentColors).searchContainer}>
          <View style={styles(currentColors).searchInputWrapper}>
            <VectorIcons 
              name="search" 
              size={20} 
              color={currentColors.dropdownText} 
              style={styles(currentColors).searchIcon}
            />
            <TextInput
              style={styles(currentColors).searchInput}
              placeholder="Search By Data..."
              placeholderTextColor={currentColors.placeholderText}
              value={searchText}
              onChangeText={setSearchText}
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchText('')} style={styles(currentColors).clearButton}>
                <VectorIcons name="close-circle" size={20} color={currentColors.dropdownText} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Table Header */}
        <View style={styles(currentColors).tableHeader}>
          <Text style={[styles(currentColors).columnHeader, { flex: 0.8 }]}>Name</Text>
          <Text style={[styles(currentColors).columnHeader, { flex: 1 }]}>Created by</Text>
          <Text style={[styles(currentColors).columnHeader, { flex: 1 }]}>Service Charge</Text>
          <Text style={[styles(currentColors).columnHeader, { flex: 1 }]}>Dr. Charge</Text>
        </View>

        {/* Table Content */}
        <Animated.View
          style={[
            { flex: 1 },
            { opacity: listOpacity, transform: [{ translateY: listTranslateY }] }
          ]}
        >
          <Animated.FlatList
            data={filteredReports}
            renderItem={renderItem}
            keyExtractor={(item, index) => index.toString()}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              { useNativeDriver: true }
            )}
            scrollEventThrottle={16}
            ListEmptyComponent={
              <View style={styles(currentColors).emptyContainer}>
                <Text style={styles(currentColors).emptyText}>No reports found</Text>
              </View>
            }
          />
        </Animated.View>

        {/* Footer Actions */}
        <View style={styles(currentColors).footer}>
          <TouchableOpacity style={styles(currentColors).footerButton} onPress={() => onClose()}>
            <Text style={styles(currentColors).footerButtonText}>BACK</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handlePDF} style={styles(currentColors).footerButton}>
            <VectorIcons name="download" size={20} color={currentColors.headerText} />
            <Text style={styles(currentColors).footerButtonText}>PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleExcel} style={styles(currentColors).footerButton}>
            <VectorIcons name="download" size={20} color={currentColors.headerText} />
            <Text style={styles(currentColors).footerButtonText}>EXCEL</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = (currentColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: currentColors.background,
  },
  header: {
    backgroundColor: currentColors.headerBackground,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: currentColors.dropdownBorder,
  },
  backButton: {
    marginBottom: 10,
    paddingHorizontal: 15,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
  },
  headerLeft: {
    flex: 1,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: currentColors.headerText,
  },
  dateText: {
    fontSize: 12,
    color: currentColors.headerText,
  },
  mainContent: {
    flex: 1,
  },
  searchFilterContainer: {
    paddingVertical: 15,
    paddingHorizontal: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    gap: 10,
  },
  searchContainer: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: currentColors.dropdownBorder,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: currentColors.dropdownBackground,
    borderRadius: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: currentColors.dropdownBorder,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    color: currentColors.textColor,
  },
  clearButton: {
    padding: 5,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
  },
  emptyText: {
    fontSize: 16,
    color: currentColors.AppointmentColor,
    opacity: 0.7,
  },
  placeholderText: {
    color: currentColors.dropdownText,
    opacity: 0.6,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: currentColors.tableHeaderBackground,
    paddingVertical: 10,
  },
  columnHeader: {
    color: currentColors.headerText,
    fontWeight: 'bold',
    fontSize: 14,
    textAlign: 'center',
  },
  tableContent: {
    flex: 1,
    marginTop: 5,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: currentColors.dropdownBorder,
    backgroundColor: currentColors.tableRowBackground,
  },
  cellText: {
    fontSize: 14,
    color: currentColors.AppointmentColor,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 15,
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderTopWidth: 1,
    borderTopColor: currentColors.dropdownBorder,
  },
  footerButton: {
    backgroundColor: currentColors.headerBackground,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  footerButtonText: {
    color: currentColors.headerText,
    fontWeight: 'bold',
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
    marginTop: 10,
    fontSize: 16,
  },
});

export default FinancialReport;