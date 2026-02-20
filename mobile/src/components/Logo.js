import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function Logo({ size = 'large', showText = true }) {
  const isLarge = size === 'large';
  const isSmall = size === 'small';
  const containerSize = isLarge ? 100 : isSmall ? 40 : 60;
  const fontSize = isLarge ? 32 : isSmall ? 14 : 20;
  const textSize = isLarge ? 18 : 12;

  return (
    <View style={styles.container}>
      <View style={[styles.logoContainer, { width: containerSize, height: containerSize }]}>
        <View style={styles.logoInner}>
          <Text style={[styles.logoText, { fontSize }]}>HOJ</Text>
        </View>
      </View>
      {showText && (
        <Text style={[styles.brandText, { fontSize: textSize }]}>House of Jainz</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    backgroundColor: '#4CAF50',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    marginBottom: 10,
  },
  logoInner: {
    width: '85%',
    height: '85%',
    backgroundColor: '#fff',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontWeight: 'bold',
    color: '#4CAF50',
    letterSpacing: 2,
  },
  brandText: {
    color: '#4CAF50',
    fontWeight: '600',
    letterSpacing: 1,
    marginTop: 5,
  },
});

