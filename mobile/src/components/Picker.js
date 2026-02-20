import React from 'react';
import { Platform } from 'react-native';

// Platform-specific picker component
let PickerComponent;

if (Platform.OS === 'web') {
  // Use HTML select for web
  PickerComponent = ({ selectedValue, onValueChange, children, style }) => {
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
          ...style,
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

