import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { moderateScale } from 'react-native-size-matters';
import { StyleSheet } from 'react-native';
import { ActionMenu } from './ActionMenu';

const RenderTableRow = ({
  report,
  index,
  selectedRowIndex,
  setSelectedRowIndex,
  setShowViewScreen,
  dateRange,
  setReports,
  setOverlayLoading,
  closeExpandable,
  currentColors,
}) => {
  const rowRef = useRef(null);
  const windowHeight = Dimensions.get('window').height;
  const actionMenuHeight = 150; // Approximate height of action menu

  const handleActionPress = () => {
    if (selectedRowIndex?.index === index) {
      setSelectedRowIndex(null);
    } else {
      if (rowRef.current) {
        rowRef.current.measure((x, y, width, height, pageX, pageY) => {
          const distanceFromBottom = windowHeight - pageY;
          const shouldShowAbove = distanceFromBottom < (actionMenuHeight + height);
          setSelectedRowIndex({ index, showAbove: shouldShowAbove });
        });
      }
    }
  };

  const isSelected = selectedRowIndex?.index === index;
  const showAbove = selectedRowIndex?.showAbove;

  return (
    <View
      ref={rowRef}
      style={[
        styles(currentColors).tableRow,
        isSelected && showAbove
          ? { paddingTop: actionMenuHeight + moderateScale(10) } // Add padding at the top if menu is above
          : isSelected && !showAbove
          ? { paddingBottom: actionMenuHeight + moderateScale(10) } // Add padding at the bottom if menu is below
          : {},
      ]}
    >
      <View style={styles(currentColors).mrnColumn}>
        <Text style={styles(currentColors).cellText}>{report.No}</Text>
      </View>
      <View style={styles(currentColors).tokenColumn}>
        <Text style={styles(currentColors).cellText}>{report.DrName}</Text>
      </View>
      <View style={styles(currentColors).nameColumn}>
        <Text style={styles(currentColors).cellText}>{report.TotalAppointments}</Text>
      </View>
      <View style={styles(currentColors).actionColumn}>
        <TouchableOpacity
          onPress={handleActionPress}
          style={styles(currentColors).actionButton}
        >
          <Ionicons
            name={isSelected ? 'chevron-up' : 'chevron-down'}
            size={moderateScale(15)}
            color={currentColors.dropdownText}
          />
        </TouchableOpacity>
        {isSelected && (
          <ActionMenu
            setOverlayLoading={setOverlayLoading}
            visible={true}
            style={[
              styles(currentColors).actionMenu,
              showAbove
                ? styles(currentColors).actionMenuAbove
                : styles(currentColors).actionMenuBelow,
            ]}
            report={report}
            setShowViewScreen={setShowViewScreen}
            dateRange={dateRange}
            setReports={setReports}
            closeExpandable={closeExpandable}
            currentColors={currentColors}
          />
        )}
      </View>
    </View>
  );
};

const styles = (currentColors) =>
  StyleSheet.create({
    tableRow: {
      flexDirection: 'row',
      paddingHorizontal: moderateScale(15),
      paddingVertical: moderateScale(10),
      borderBottomWidth: 1,
      borderBottomColor: currentColors.dropdownBorder,
      alignItems: 'center',
      backgroundColor: currentColors.tableRowBackground,
    },
    cellText: {
      color: currentColors.AppointmentColor,
      fontSize: moderateScale(12),
    },
    tokenColumn: {
      flex: 1,
      alignItems: 'flex-start',
      marginLeft: moderateScale(5),
    },
    mrnColumn: {
      flex: 1,
      alignItems: 'flex-start',
    },
    nameColumn: {
      flex: 2,
      alignItems: 'center',
    },
    actionColumn: {
      flex: 1,
      alignItems: 'center',
    },
    actionButton: {
      borderColor: currentColors.dropdownBorder,
      borderWidth: moderateScale(1),
      borderRadius: moderateScale(50),
      padding: moderateScale(5),
      paddingHorizontal: moderateScale(10),
      justifyContent: 'center',
      alignItems: 'center',
    },
    actionMenu: {
      position: 'absolute',
      right: moderateScale(10),
      backgroundColor: currentColors.dropdownBackground,
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
    actionMenuAbove: {
      bottom: '100%',
      marginBottom: moderateScale(5),
    },
    actionMenuBelow: {
      top: '100%',
      marginTop: moderateScale(5),
    },
  });

export { RenderTableRow };