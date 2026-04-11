import React, { useRef } from 'react';
import { 
  Animated, 
  FlatList, 
  Text, 
  View, 
  StyleSheet, 
  TouchableOpacity 
} from 'react-native'; // <-- Asegúrate que Animated esté aquí
import empresas from '../data/chambas.json';

const HomeScreen = ({ navigation }) => {
  const scrollY = useRef(new Animated.Value(0)).current;

  const backgroundColor = scrollY.interpolate({
    inputRange: [0, 500],
    outputRange: ['#000000', '#2c3e50'],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View style={[styles.container, { backgroundColor }]}>
      <Animated.FlatList
        data={empresas}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.card} 
            onPress={() => navigation.navigate('Puestos', { empresa: item })}
          >
            <Text style={styles.title}>{item.nombre}</Text>
            <Text style={{color: '#888'}}>Ver vacantes ➔</Text>
          </TouchableOpacity>
        )}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 20 },
  card: { 
    padding: 30, 
    marginHorizontal: 20, 
    marginVertical: 10, 
    backgroundColor: 'rgba(255,255,255,0.05)', 
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  title: { color: '#fff', fontSize: 22, fontWeight: 'bold' }
});

export default HomeScreen;