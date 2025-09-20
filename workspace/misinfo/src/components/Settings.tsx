import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings as SettingsIcon, 
  Key, 
  Moon, 
  Sun, 
  Monitor, 
  Save,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  Trash2
} from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';
import { Card, CardHeader, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { APIStatusIndicator } from './APIStatusIndicator';
import { cn } from '@/utils';

interface SettingsProps {
  onClose?: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ onClose }) => {
  const { settings, loading, error, updateSettings, resetSettings } = useSettings();
  const [showApiKeys, setShowApiKeys] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [formData, setFormData] = useState({
    ocrSpaceKey: settings?.apiConfig.ocrSpaceKey || '',
    sightEngineUser: settings?.apiConfig.sightEngineUser || '',
    sightEngineSecret: settings?.apiConfig.sightEngineSecret || '',
    huggingFaceKey: settings?.apiConfig.huggingFaceKey || '',
    geminiKey: settings?.apiConfig.geminiKey || '',
    theme: settings?.theme || 'system',
    autoAnalyze: settings?.autoAnalyze || false,
    showConfidenceScores: settings?.showConfidenceScores ?? true,
    saveHistory: settings?.saveHistory ?? true,
    notifications: settings?.notifications ?? true,
    popupSize: settings?.popupSize || 'normal',
  });

  React.useEffect(() => {
    if (settings) {
      setFormData({
        ocrSpaceKey: settings.apiConfig.ocrSpaceKey,
        sightEngineUser: settings.apiConfig.sightEngineUser,
        sightEngineSecret: settings.apiConfig.sightEngineSecret,
        huggingFaceKey: settings.apiConfig.huggingFaceKey,
        geminiKey: settings.apiConfig.geminiKey,
        theme: settings.theme,
        autoAnalyze: settings.autoAnalyze,
        showConfidenceScores: settings.showConfidenceScores,
        saveHistory: settings.saveHistory,
        notifications: settings.notifications,
        popupSize: settings.popupSize,
      });
    }
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage(null);

    try {
      const success = await updateSettings({
        apiConfig: {
          ocrSpaceKey: formData.ocrSpaceKey,
          sightEngineUser: formData.sightEngineUser,
          sightEngineSecret: formData.sightEngineSecret,
          huggingFaceKey: formData.huggingFaceKey,
          geminiKey: formData.geminiKey,
        },
        theme: formData.theme as 'light' | 'dark' | 'system',
        autoAnalyze: formData.autoAnalyze,
        showConfidenceScores: formData.showConfidenceScores,
        saveHistory: formData.saveHistory,
        notifications: formData.notifications,
        popupSize: formData.popupSize as 'compact' | 'normal' | 'large',
      });

      if (success) {
        setSaveMessage({ type: 'success', message: 'Settings saved successfully!' });
        setTimeout(() => setSaveMessage(null), 3000);
      } else {
        setSaveMessage({ type: 'error', message: 'Failed to save settings. Please try again.' });
      }
    } catch (err) {
      setSaveMessage({ type: 'error', message: 'An error occurred while saving settings.' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
      const success = await resetSettings();
      if (success) {
        setSaveMessage({ type: 'success', message: 'Settings reset to defaults!' });
        setTimeout(() => setSaveMessage(null), 3000);
      }
    }
  };

  const themeOptions = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-primary-600" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Settings
          </h2>
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        )}
      </div>

      {/* Error/Success Messages */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-700 rounded-lg"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-danger-600 dark:text-danger-400" />
              <span className="text-sm font-medium text-danger-800 dark:text-danger-300">
                {error}
              </span>
            </div>
          </motion.div>
        )}

        {saveMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={cn(
              'p-4 border rounded-lg',
              saveMessage.type === 'success'
                ? 'bg-success-50 dark:bg-success-900/20 border-success-200 dark:border-success-700'
                : 'bg-danger-50 dark:bg-danger-900/20 border-danger-200 dark:border-danger-700'
            )}
          >
            <div className="flex items-center gap-2">
              {saveMessage.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-success-600 dark:text-success-400" />
              ) : (
                <AlertCircle className="w-5 h-5 text-danger-600 dark:text-danger-400" />
              )}
              <span className={cn(
                'text-sm font-medium',
                saveMessage.type === 'success'
                  ? 'text-success-800 dark:text-success-300'
                  : 'text-danger-800 dark:text-danger-300'
              )}>
                {saveMessage.message}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* API Status */}
      {settings && (
        <Card>
          <CardHeader>
            <APIStatusIndicator 
              apiConfig={settings.apiConfig}
              className="w-full"
            />
          </CardHeader>
        </Card>
      )}

      {/* API Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-primary-600" />
            <h3 className="font-semibold text-gray-900 dark:text-white">
              API Configuration
            </h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Configure your API keys for all services
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              OCR.space API Key
            </label>
            <div className="relative">
              <input
                type={showApiKeys ? 'text' : 'password'}
                value={formData.ocrSpaceKey}
                onChange={(e) => setFormData(prev => ({ ...prev, ocrSpaceKey: e.target.value }))}
                placeholder="Enter your OCR.space API key"
                className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowApiKeys(!showApiKeys)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 w-6 h-6"
              >
                {showApiKeys ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Get your free API key from <a href="https://ocr.space/ocrapi" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">ocr.space</a>
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              SightEngine User ID
            </label>
            <input
              type="text"
              value={formData.sightEngineUser}
              onChange={(e) => setFormData(prev => ({ ...prev, sightEngineUser: e.target.value }))}
              placeholder="Enter your SightEngine User ID"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              SightEngine Secret
            </label>
            <div className="relative">
              <input
                type={showApiKeys ? 'text' : 'password'}
                value={formData.sightEngineSecret}
                onChange={(e) => setFormData(prev => ({ ...prev, sightEngineSecret: e.target.value }))}
                placeholder="Enter your SightEngine Secret"
                className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowApiKeys(!showApiKeys)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 w-6 h-6"
              >
                {showApiKeys ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Get your API credentials from <a href="https://sightengine.com" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">sightengine.com</a>
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Hugging Face API Key
            </label>
            <div className="relative">
              <input
                type={showApiKeys ? 'text' : 'password'}
                value={formData.huggingFaceKey}
                onChange={(e) => setFormData(prev => ({ ...prev, huggingFaceKey: e.target.value }))}
                placeholder="Enter your Hugging Face API key"
                className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowApiKeys(!showApiKeys)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 w-6 h-6"
              >
                {showApiKeys ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Get your free API key from <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">huggingface.co</a>
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Google Gemini API Key
            </label>
            <div className="relative">
              <input
                type={showApiKeys ? 'text' : 'password'}
                value={formData.geminiKey}
                onChange={(e) => setFormData(prev => ({ ...prev, geminiKey: e.target.value }))}
                placeholder="Enter your Google Gemini API key"
                className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowApiKeys(!showApiKeys)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 w-6 h-6"
              >
                {showApiKeys ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Get your free API key from <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">Google AI Studio</a>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold text-gray-900 dark:text-white">Appearance</h3>
        </CardHeader>

        <CardContent className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Theme
            </label>
            <div className="grid grid-cols-3 gap-2">
              {themeOptions.map((option) => {
                const IconComponent = option.icon;
                return (
                  <button
                    key={option.value}
                    onClick={() => setFormData(prev => ({ ...prev, theme: option.value as 'light' | 'dark' | 'system' }))}
                    className={cn(
                      'flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all',
                      formData.theme === option.value
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    )}
                  >
                    <IconComponent className="w-5 h-5" />
                    <span className="text-sm font-medium">{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Popup Size
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'compact', label: 'Compact', size: '350×500' },
                { value: 'normal', label: 'Normal', size: '420×650' },
                { value: 'large', label: 'Large', size: '500×750' }
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setFormData(prev => ({ ...prev, popupSize: option.value as 'compact' | 'normal' | 'large' }))}
                  className={cn(
                    'flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all',
                    formData.popupSize === option.value
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  )}
                >
                  <div className="w-6 h-6 bg-gray-300 dark:bg-gray-600 rounded border-2 border-gray-400 dark:border-gray-500" 
                       style={{ 
                         transform: option.value === 'compact' ? 'scale(0.7)' : 
                                   option.value === 'large' ? 'scale(1.3)' : 'scale(1)' 
                       }} 
                  />
                  <div className="text-center">
                    <div className="text-sm font-medium">{option.label}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{option.size}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Behavior */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold text-gray-900 dark:text-white">Behavior</h3>
        </CardHeader>

        <CardContent className="space-y-4">
          <label className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Auto-analyze images
              </span>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Automatically analyze images when right-clicked
              </p>
            </div>
            <input
              type="checkbox"
              checked={formData.autoAnalyze}
              onChange={(e) => setFormData(prev => ({ ...prev, autoAnalyze: e.target.checked }))}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
          </label>

          <label className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Show confidence scores
              </span>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Display confidence percentages in results
              </p>
            </div>
            <input
              type="checkbox"
              checked={formData.showConfidenceScores}
              onChange={(e) => setFormData(prev => ({ ...prev, showConfidenceScores: e.target.checked }))}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
          </label>

          <label className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Save analysis history
              </span>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Keep a record of your analyses
              </p>
            </div>
            <input
              type="checkbox"
              checked={formData.saveHistory}
              onChange={(e) => setFormData(prev => ({ ...prev, saveHistory: e.target.checked }))}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
          </label>

          <label className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Enable notifications
              </span>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Get notified when analysis is complete
              </p>
            </div>
            <input
              type="checkbox"
              checked={formData.notifications}
              onChange={(e) => setFormData(prev => ({ ...prev, notifications: e.target.checked }))}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
          </label>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <Button
          onClick={handleSave}
          loading={saving}
          className="flex-1"
          icon={<Save className="w-4 h-4" />}
        >
          Save Settings
        </Button>
        <Button
          variant="secondary"
          onClick={handleReset}
          icon={<Trash2 className="w-4 h-4" />}
        >
          Reset
        </Button>
      </div>
    </motion.div>
  );
};
