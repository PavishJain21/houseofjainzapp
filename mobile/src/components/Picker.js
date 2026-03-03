import React from 'react';
import { Platform, StyleSheet } from 'react-native';

// Platform-specific picker component
let PickerComponent;

if (Platform.OS === 'web') {
  // Use HTML select for web. Flatten style so we never pass an array to the DOM
  // (CSSStyleDeclaration does not support indexed property setters).
  PickerComponent = ({ selectedValue, onValueChange, children, style }) => {
    const flatStyle = style != null ? (StyleSheet.flatten(style) || {}) : {};
    return (
      <select
        value={selectedValue}
        onChange={(e) => onValueChange(e.target.value)}
        style={{
          width: '100%',
          padding: '15px',
          fontSize: '16px',
          borderRadius: '10px',
          border: '1px solid #e0e0e0',
          backgroundColor: '#f5f5f5',
          ...flatStyle,
        }}
      >
        {children}
      </select>
    );
  };
} else {
  // Use React Native Picker for mobile
  const { Picker } = require('@react-native-picker/picker');
  PickerComponent = Picker;
}

export const PickerItem = Platform.OS === 'web' 
  ? ({ label, value }) => <option value={value}>{label}</option>
  : require('@react-native-picker/picker').Picker.Item;

export default PickerComponent;

