import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  Settings as SettingsIcon, 
  History, 
  Moon, 
  Sun,
  Home,
  ArrowLeft,
  MessageSquare,
  Image
} from 'lucide-react';
import { DragDropZone } from '../components/DragDropZone';
import { AnalysisResults } from '../components/AnalysisResults';
import { Settings } from '../components/Settings';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { Chatbot } from '../components/Chatbot';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useSettings } from '../hooks/useSettings';
import { useAnalysis } from '../hooks/useAnalysis';
import { AnalysisResult } from '../types';
import { applyTheme } from '../utils';
import '../styles/globals.css';

type View = 'home' | 'settings' | 'history';
type Tab = 'images' | 'chat';

const Popup: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('home');
  const [activeTab, setActiveTab] = useState<Tab>('images');
  const [recentResults, setRecentResults] = useState<AnalysisResult[]>([]);
  const { settings, loading: settingsLoading } = useSettings();
  const { history, loadHistory } = useAnalysis();

  // Apply theme and popup size on mount and when settings change
  React.useEffect(() => {
    if (settings) {
      applyTheme(settings.theme);
      
      // Apply popup size
      const body = document.getElementById('popup-body');
      if (body) {
        body.className = body.className.replace(/popup-(compact|normal|large)/, `popup-${settings.popupSize}`);
      }
    } else {
      applyTheme('system');
    }
  }, [settings]);

  // Load history on mount
  React.useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleAnalysisComplete = (results: AnalysisResult[]) => {
    setRecentResults(results);
    loadHistory(); // Refresh history
  };

  const toggleTheme = () => {
    const currentTheme = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
    applyTheme(currentTheme);
  };

  const renderHeader = () => (
    <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-3">
        {currentView !== 'home' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentView('home')}
            className="p-2 w-8 h-8"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
        )}
        
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-gray-900 dark:text-white">
              MisinfoGuard
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {currentView === 'home' && 'Verify Images'}
              {currentView === 'settings' && 'Settings'}
              {currentView === 'history' && 'Analysis History'}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleTheme}
          className="p-2 w-8 h-8"
        >
          {document.documentElement.classList.contains('dark') ? (
            <Sun className="w-4 h-4" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCurrentView(currentView === 'history' ? 'home' : 'history')}
          className="p-2 w-8 h-8 relative"
        >
          <History className="w-4 h-4" />
          {history && history.results.length > 0 && (
            <Badge
              variant="primary"
              size="sm"
              className="absolute -top-1 -right-1 w-5 h-5 text-xs p-0 flex items-center justify-center"
            >
              {history.results.length > 9 ? '9+' : history.results.length}
            </Badge>
          )}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCurrentView(currentView === 'settings' ? 'home' : 'settings')}
          className="p-2 w-8 h-8"
        >
          <SettingsIcon className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );

  const renderContent = () => {
    if (settingsLoading) {
      return (
        <div className="flex items-center justify-center p-8">
          <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      );
    }

    switch (currentView) {
      case 'settings':
        return <Settings onClose={() => setCurrentView('home')} />;
      
      case 'history':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Analysis History
              </h2>
              {history && (
                <Badge variant="secondary" size="sm">
                  {history.totalAnalyses} total
                </Badge>
              )}
            </div>
            
            {history && history.results.length > 0 ? (
              <AnalysisResults results={history.results.slice(0, 10)} />
            ) : (
              <Card className="p-8 text-center">
                <History className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No history yet
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Your analysis results will appear here
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setCurrentView('home')}
                  icon={<Home className="w-4 h-4" />}
                >
                  Start Analyzing
                </Button>
              </Card>
            )}
          </div>
        );
      
      default:
        return (
          <div className="space-y-6">
            {/* API Configuration Warning */}
            {(!settings?.apiConfig.ocrSpaceKey || !settings?.apiConfig.sightEngineUser || !settings?.apiConfig.sightEngineSecret || !settings?.apiConfig.huggingFaceKey || !settings?.apiConfig.geminiKey) && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-700 rounded-lg p-4"
              >
                <div className="flex items-start gap-3">
                  <SettingsIcon className="w-5 h-5 text-warning-600 dark:text-warning-400 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-warning-800 dark:text-warning-300 mb-1">
                      API Configuration Required
                    </h4>
                    <p className="text-sm text-warning-700 dark:text-warning-400 mb-2">
                      Configure your API keys to enable all features
                    </p>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setCurrentView('settings')}
                    >
                      Configure APIs
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Tab Navigation */}
            <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('images')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  activeTab === 'images'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Image className="w-4 h-4" />
                Image Analysis
              </button>
              <button
                onClick={() => setActiveTab('chat')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  activeTab === 'chat'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                AI Assistant
              </button>
            </div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
              {activeTab === 'images' ? (
                <motion.div
                  key="images"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  {/* Main drag and drop area */}
                  <DragDropZone onAnalysisComplete={handleAnalysisComplete} />

                  {/* Recent results */}
                  {recentResults.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          Recent Analysis
                        </h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setCurrentView('history')}
                        >
                          View All
                        </Button>
                      </div>
                      <AnalysisResults results={recentResults} />
                    </div>
                  )}

                  {/* Quick stats */}
                  {history && history.totalAnalyses > 0 && recentResults.length === 0 && (
                    <Card className="p-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary-600 mb-1">
                          {history.totalAnalyses}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          Images analyzed
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setCurrentView('history')}
                        >
                          View History
                        </Button>
                      </div>
                    </Card>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="chat"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="h-96"
                >
                  <Chatbot className="h-full" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
    }
  };

  return (
    <div className="w-full min-h-full bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-blue-900">
      {renderHeader()}
      
      <div className="p-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

// Initialize the popup
const container = document.getElementById('popup-root');
if (container) {
  const root = createRoot(container);
  root.render(
    <ErrorBoundary>
      <Popup />
    </ErrorBoundary>
  );
}
