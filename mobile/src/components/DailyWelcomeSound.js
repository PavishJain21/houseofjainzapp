import React, { useEffect } from 'react';
import { playDailyWelcomeSoundIfNeeded } from '../utils/dailyWelcomeSound';

/**
 * Renders nothing. When mounted (user has entered main app), plays the daily
 * welcome sound (jaijinendra.mp3) once per day.
 */
export default function DailyWelcomeSound() {
  useEffect(() => {
    playDailyWelcomeSoundIfNeeded();
  }, []);
  return null;
}
