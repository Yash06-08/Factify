import { useState, useEffect } from 'react';
import { UserSettings } from '@/types';
import { StorageService } from '@/services/storage';

export function useSettings() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const userSettings = await StorageService.getSettings();
      setSettings(userSettings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (newSettings: Partial<UserSettings>) => {
    try {
      setError(null);
      await StorageService.saveSettings(newSettings);
      
      // Update local state
      setSettings(prev => prev ? { ...prev, ...newSettings } : null);
      
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
      return false;
    }
  };

  const resetSettings = async () => {
    try {
      setError(null);
      // Clear all settings to restore defaults
      await chrome.storage.sync.clear();
      await loadSettings();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset settings');
      return false;
    }
  };

  return {
    settings,
    loading,
    error,
    updateSettings,
    resetSettings,
    reload: loadSettings,
  };
}
