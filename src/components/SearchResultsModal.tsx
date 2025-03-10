import React from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, StyleSheet } from 'react-native';

interface SearchResultsModalProps {
  visible: boolean;
  results: Array<{
    mrn: number;
    patientName: string;
    guardiansName: string;
    cnic: string;
    phoneNumber: string;
  }>;
  onClose: () => void;
  onSelect: (item: {
    mrn: number;
    patientName: string;
    guardiansName: string;
    cnic: string;
    phoneNumber: string;
  }) => void;
}

const SearchResultsModal: React.FC<SearchResultsModalProps> = ({ 
  visible, 
  results, 
  onClose, 
  onSelect 
}) => {
  const renderItem = ({ item }: { item: { mrn: number; patientName: string; guardiansName: string; cnic: string; phoneNumber: string; } }) => (
    <TouchableOpacity 
      style={styles.resultItem} 
      onPress={() => {
        onSelect(item);
        onClose();
      }}
    >
      <View style={styles.resultContent}>
        <View style={styles.resultHeader}>
          <Text style={styles.mrnText}>MRN: {item.mrn}</Text>
          <Text style={styles.nameText}>{item.patientName}</Text>
        </View>
        <View style={styles.resultDetails}>
          <Text style={styles.detailText}>Guardian: {item.guardiansName}</Text>
          <Text style={styles.detailText}>CNIC: {item.cnic}</Text>
          <Text style={styles.detailText}>Phone: {item.phoneNumber}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Search Results</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={results}
            renderItem={renderItem}
            keyExtractor={(item) => item.mrn.toString()}
            contentContainerStyle={styles.listContainer}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 8,
    width: '90%',
    maxHeight: '80%',
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 18,
    color: '#666',
  },
  listContainer: {
    flexGrow: 1,
  },
  resultItem: {
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
  },
  resultContent: {
    gap: 8,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mrnText: {
    fontSize: 14,
    color: '#666',
  },
  nameText: {
    fontSize: 16,
    fontWeight: '500',
  },
  resultDetails: {
    gap: 4,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
  },
  separator: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 8,
  },
});

export default SearchResultsModal;
