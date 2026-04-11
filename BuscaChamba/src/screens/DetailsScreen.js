import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';

const DetailsScreen = ({ route }) => {
  const { empresa } = route.params; // Recibimos la info desde el HomeScreen

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Chambas en {empresa.nombre}</Text>
      <FlatList
        data={empresa.puestos}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => (
          <View style={styles.puestoCard}>
            <Text style={styles.puestoText}>{item}</Text>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a1a', padding: 20 },
  header: { color: '#00ffcc', fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  puestoCard: { backgroundColor: '#333', padding: 15, borderRadius: 8, marginBottom: 10 },
  puestoText: { color: '#fff', fontSize: 18 }
});

export default DetailsScreen;
