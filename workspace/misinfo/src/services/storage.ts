import { AnalysisResult, UserSettings, AnalysisHistory } from '@/types';

// Chrome storage service for extension data
export class StorageService {
  private static readonly KEYS = {
    SETTINGS: 'misinfoguard_settings',
    HISTORY: 'misinfoguard_history',
    CACHE: 'misinfoguard_cache',
  } as const;

  // Default settings
  private static readonly DEFAULT_SETTINGS: UserSettings = {
    theme: 'system',
    autoAnalyze: false,
    showConfidenceScores: true,
    saveHistory: true,
    apiConfig: {
      ocrSpaceKey: '',
      sightEngineUser: '',
      sightEngineSecret: '',
      huggingFaceKey: '',
      geminiKey: '',
    },
    notifications: true,
    popupSize: 'normal',
  };

  // Get user settings
  static async getSettings(): Promise<UserSettings> {
    try {
      const result = await chrome.storage.sync.get([this.KEYS.SETTINGS]);
      return {
        ...this.DEFAULT_SETTINGS,
        ...result[this.KEYS.SETTINGS],
      };
    } catch (error) {
      console.error('Error getting settings:', error);
      return this.DEFAULT_SETTINGS;
    }
  }

  // Save user settings
  static async saveSettings(settings: Partial<UserSettings>): Promise<void> {
    try {
      const currentSettings = await this.getSettings();
      const updatedSettings = { ...currentSettings, ...settings };
      await chrome.storage.sync.set({
        [this.KEYS.SETTINGS]: updatedSettings,
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      throw new Error('Failed to save settings');
    }
  }

  // Get analysis history
  static async getHistory(): Promise<AnalysisHistory> {
    try {
      const result = await chrome.storage.local.get([this.KEYS.HISTORY]);
      return result[this.KEYS.HISTORY] || {
        results: [],
        totalAnalyses: 0,
        lastUpdated: Date.now(),
      };
    } catch (error) {
      console.error('Error getting history:', error);
      return {
        results: [],
        totalAnalyses: 0,
        lastUpdated: Date.now(),
      };
    }
  }

  // Save analysis result to history
  static async saveAnalysisResult(result: AnalysisResult): Promise<void> {
    try {
      const settings = await this.getSettings();
      if (!settings.saveHistory) {
        return;
      }

      const history = await this.getHistory();
      
      // Add new result to the beginning of the array
      history.results.unshift(result);
      
      // Keep only the last 100 results to avoid storage bloat
      if (history.results.length > 100) {
        history.results = history.results.slice(0, 100);
      }
      
      history.totalAnalyses += 1;
      history.lastUpdated = Date.now();

      await chrome.storage.local.set({
        [this.KEYS.HISTORY]: history,
      });
    } catch (error) {
      console.error('Error saving analysis result:', error);
      throw new Error('Failed to save analysis result');
    }
  }

  // Clear analysis history
  static async clearHistory(): Promise<void> {
    try {
      await chrome.storage.local.remove([this.KEYS.HISTORY]);
    } catch (error) {
      console.error('Error clearing history:', error);
      throw new Error('Failed to clear history');
    }
  }

  // Get cached data
  static async getCache<T>(key: string): Promise<T | null> {
    try {
      const result = await chrome.storage.local.get([`${this.KEYS.CACHE}_${key}`]);
      const cached = result[`${this.KEYS.CACHE}_${key}`];
      
      if (!cached) return null;
      
      // Check if cache is expired (24 hours)
      if (Date.now() - cached.timestamp > 24 * 60 * 60 * 1000) {
        await this.removeCache(key);
        return null;
      }
      
      return cached.data;
    } catch (error) {
      console.error('Error getting cache:', error);
      return null;
    }
  }

  // Set cached data
  static async setCache<T>(key: string, data: T): Promise<void> {
    try {
      await chrome.storage.local.set({
        [`${this.KEYS.CACHE}_${key}`]: {
          data,
          timestamp: Date.now(),
        },
      });
    } catch (error) {
      console.error('Error setting cache:', error);
    }
  }

  // Remove cached data
  static async removeCache(key: string): Promise<void> {
    try {
      await chrome.storage.local.remove([`${this.KEYS.CACHE}_${key}`]);
    } catch (error) {
      console.error('Error removing cache:', error);
    }
  }

  // Get storage usage info
  static async getStorageInfo(): Promise<{
    used: number;
    total: number;
    percentage: number;
  }> {
    try {
      const usage = await chrome.storage.local.getBytesInUse();
      const total = chrome.storage.local.QUOTA_BYTES;
      
      return {
        used: usage,
        total: total,
        percentage: (usage / total) * 100,
      };
    } catch (error) {
      console.error('Error getting storage info:', error);
      return { used: 0, total: 0, percentage: 0 };
    }
  }
}
