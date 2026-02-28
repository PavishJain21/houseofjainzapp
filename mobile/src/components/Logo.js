import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';

const logoImage = require('../../assets/logo.png');

export default function Logo({ size = 'large', showText = false }) {
  const isLarge = size === 'large';
  const isSmall = size === 'small';
  const width = isLarge ? 220 : isSmall ? 100 : 160;
  const height = isLarge ? 120 : isSmall ? 55 : 87;
  const textSize = isLarge ? 18 : 12;

  return (
    <View style={styles.container}>
      <Image
        source={logoImage}
        style={{ width, height }}
        resizeMode="contain"
        accessibilityLabel="House of Jainz logo"
      />
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
  brandText: {
    color: '#4CAF50',
    fontWeight: '600',
    letterSpacing: 1,
    marginTop: 8,
  },
});
