import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';

const STORAGE_KEY = '@dailyWelcomeSoundLastDate';

// Same Supabase bucket as other app audio; replace filename if yours differs
export const JAIJINENDRA_MP3_URL =
  'https://sqfhtmxufevsidyoofla.supabase.co/storage/v1/object/public/uploads/audio/jaijinendra.mp3';

function getTodayDateString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Plays the daily welcome sound (jaijinendra.mp3) once per day on first app open.
 * On web, browsers may block autoplay until the user has tapped the page.
 */
export async function playDailyWelcomeSoundIfNeeded(audioUrl = JAIJINENDRA_MP3_URL) {
  try {
    const today = getTodayDateString();
    const lastPlayed = await AsyncStorage.getItem(STORAGE_KEY);

    if (lastPlayed === today) {
      return;
    }

    // Match AudioPlayer: required for iOS silent mode and reliable playback
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
    });

    // Create with shouldPlay: false then call playAsync() - more reliable on devices
    const { sound } = await Audio.Sound.createAsync(
      { uri: audioUrl },
      { shouldPlay: false }
    );

    await AsyncStorage.setItem(STORAGE_KEY, today);

    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync().catch(() => {});
      }
    });

    await sound.playAsync();
  } catch (err) {
    console.warn('Daily welcome sound failed:', err?.message || err, 'URL:', audioUrl);
  }
}
