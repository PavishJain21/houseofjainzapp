import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';

export default function AudioPlayer({ audioUrl, title = 'Audio' }) {
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [duration, setDuration] = useState(null);
  const [position, setPosition] = useState(null);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [sound]);

  const loadAudio = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Configure audio mode
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });

      // Create and load sound
      const { sound: soundObject } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: false },
        (status) => {
          if (status.isLoaded) {
            setDuration(status.durationMillis);
            setPosition(status.positionMillis);
            
            if (status.didJustFinish) {
              setIsPlaying(false);
              setPosition(0);
              if (intervalRef.current) {
                clearInterval(intervalRef.current);
              }
            }
          }
        }
      );

      setSound(soundObject);
      setIsLoading(false);
    } catch (err) {
      console.error('Error loading audio:', err);
      setError('Failed to load audio');
      setIsLoading(false);
    }
  };

  const togglePlayPause = async () => {
    try {
      if (!sound) {
        await loadAudio();
        return;
      }

      const status = await sound.getStatusAsync();
      
      if (status.isLoaded) {
        if (status.isPlaying) {
          await sound.pauseAsync();
          setIsPlaying(false);
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
        } else {
          await sound.playAsync();
          setIsPlaying(true);
          
          // Update position every 100ms
          intervalRef.current = setInterval(async () => {
            const currentStatus = await sound.getStatusAsync();
            if (currentStatus.isLoaded) {
              setPosition(currentStatus.positionMillis);
            }
          }, 100);
        }
      }
    } catch (err) {
      console.error('Error toggling playback:', err);
      setError('Failed to play audio');
    }
  };

  const formatTime = (millis) => {
    if (!millis) return '0:00';
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progress = duration ? (position / duration) * 100 : 0;

  return (
    <View style={styles.container}>
      <View style={styles.playerContainer}>
        <TouchableOpacity
          style={styles.playButton}
          onPress={togglePlayPause}
          disabled={isLoading || !!error}
          activeOpacity={0.7}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#4CAF50" />
          ) : (
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={24}
              color="#4CAF50"
            />
          )}
        </TouchableOpacity>

        <View style={styles.infoContainer}>
          <View style={styles.titleRow}>
            <Ionicons name="musical-notes" size={16} color="#4CAF50" />
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
          </View>

          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
          </View>

          <View style={styles.timeContainer}>
            <Text style={styles.timeText}>
              {formatTime(position)} / {formatTime(duration)}
            </Text>
          </View>
        </View>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={14} color="#f44336" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    marginBottom: 8,
  },
  playerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#e8f5e9',
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  infoContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginLeft: 6,
    flex: 1,
  },
  progressContainer: {
    marginBottom: 6,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 2,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingHorizontal: 8,
  },
  errorText: {
    fontSize: 11,
    color: '#f44336',
    marginLeft: 4,
  },
});

