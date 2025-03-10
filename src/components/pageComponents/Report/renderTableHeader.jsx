import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { moderateScale } from 'react-native-size-matters';
import { useColorScheme } from 'react-native';
import { colors } from '../../../utils/color';

export const renderTableHeader = (currentColors) => { // Accept currentColors as a parameter
  return (
    <View style={styles(currentColors).tableHeader}>
      <View style={styles(currentColors).mrnColumn}><Text style={styles(currentColors).headerText}>No.</Text></View>
      <View style={styles(currentColors).tokenColumn}><Text style={styles(currentColors).headerText}>Dr Name</Text></View>
      <View style={styles(currentColors).nameColumn}><Text style={styles(currentColors).headerText}>Appointments</Text></View>
      <View style={styles(currentColors).actionColumn}><Text style={styles(currentColors).headerText}>Action</Text></View>
    </View>
  );
};

const styles = (currentColors) => StyleSheet.create({
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: moderateScale(15),
    paddingVertical: moderateScale(10),
    borderBottomWidth: 1,
    borderBottomColor: currentColors.dropdownBorder,
    backgroundColor: currentColors.tableHeaderBackground,
    alignItems: 'center',
  },
  headerText: {
    color: currentColors.headerText,
    fontSize: moderateScale(11),
    fontWeight: '500',
    justifyContent: 'center',
    alignItems: 'center',
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
  discountColumn: {
    flex: 1,
    alignItems: 'center',
    marginRight: moderateScale(5),
  },
  chargesColumn: {
    flex: 1,
    alignItems: 'center',
    marginRight: moderateScale(5),
  },
  actionColumn: {
    flex: 1,
    alignItems: 'center',
  },
});
