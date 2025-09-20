import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  Bot, 
  User, 
  Loader2, 
  AlertCircle,
  MessageSquare,
  Trash2,
  Copy
} from 'lucide-react';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { useSettings } from '@/hooks/useSettings';
import { NLPService } from '@/services/nlp';
import { ChatMessage } from '@/types';
import { generateId, formatTimestamp, copyToClipboard } from '@/utils';

interface ChatbotProps {
  className?: string;
}

export const Chatbot: React.FC<ChatbotProps> = ({ className }) => {
  const { settings } = useSettings();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    if (!settings?.apiConfig.geminiKey) {
      setError('Gemini API key not configured. Please add it in settings.');
      return;
    }

    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: inputMessage.trim(),
      timestamp: Date.now(),
      type: 'text',
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setError(null);

    try {
      const nlpService = new NLPService(settings.apiConfig);
      
      // Test connection first
      const connectionTest = await nlpService.testConnections();
      if (!connectionTest.gemini) {
        throw new Error('Gemini API connection failed. Please check your API key in settings.');
      }
      
      const response = await nlpService.generateChatResponse(
        userMessage.content,
        messages.length > 0 ? getConversationContext() : undefined
      );

      const assistantMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
        type: 'text',
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get response';
      setError(errorMessage);
      console.error('Chat error:', err);
      
      // Remove the user message if there was an error
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const getConversationContext = (): string => {
    return messages
      .slice(-4) // Last 4 messages for context
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setError(null);
  };

  const copyMessage = async (content: string) => {
    const success = await copyToClipboard(content);
    if (success) {
      // Could show a toast notification here
      console.log('Message copied to clipboard');
    }
  };

  const handleFactCheck = async (text: string) => {
    if (!settings?.apiConfig.geminiKey) {
      setError('Gemini API key not configured for fact-checking.');
      return;
    }

    const factCheckMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: `Please fact-check this statement: "${text}"`,
      timestamp: Date.now(),
      type: 'fact-check',
    };

    setMessages(prev => [...prev, factCheckMessage]);
    setIsLoading(true);
    setError(null);

    try {
      const nlpService = new NLPService(settings.apiConfig);
      const factCheckResult = await nlpService.analyzeText(text);

      let responseContent = `**Fact-Check Results:**\n\n`;
      
      if (factCheckResult.factCheck) {
        responseContent += `**Status:** ${factCheckResult.factCheck.isFactual ? '✅ Likely Factual' : '❌ Questionable'}\n`;
        responseContent += `**Confidence:** ${Math.round(factCheckResult.factCheck.confidence * 100)}%\n\n`;
        
        if (factCheckResult.factCheck.explanation) {
          responseContent += `**Analysis:** ${factCheckResult.factCheck.explanation}\n\n`;
        }
        
        if (factCheckResult.factCheck.sources && factCheckResult.factCheck.sources.length > 0) {
          responseContent += `**Sources:**\n${factCheckResult.factCheck.sources.map(source => `• ${source}`).join('\n')}\n\n`;
        }
      }

      responseContent += `*Please verify information from multiple reliable sources.*`;

      const assistantMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: responseContent,
        timestamp: Date.now(),
        type: 'fact-check',
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fact-check failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/20 rounded-full flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              MisinfoGuard Assistant
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              AI-powered fact-checking & analysis
            </p>
          </div>
        </div>
        
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={clearChat}
            className="p-2 w-8 h-8"
            disabled={messages.length === 0}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Error Display */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3 bg-danger-50 dark:bg-danger-900/20 border-b border-danger-200 dark:border-danger-700"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-danger-600 dark:text-danger-400" />
              <span className="text-sm text-danger-800 dark:text-danger-300">
                {error}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">
              Welcome to MisinfoGuard Assistant
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Ask me to fact-check information, analyze text, or help with misinformation detection.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setInputMessage('Can you fact-check this news article for me?')}
              >
                Fact-check text
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setInputMessage('How can I identify misinformation?')}
              >
                Get tips
              </Button>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                </div>
              )}
              
              <div className={`max-w-[80%] ${message.role === 'user' ? 'order-2' : ''}`}>
                <div
                  className={`rounded-lg p-3 ${
                    message.role === 'user'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                  }`}
                >
                  <div className="whitespace-pre-wrap text-sm">
                    {message.content}
                  </div>
                  
                  {message.type && (
                    <div className="mt-2">
                      <Badge
                        variant={message.type === 'fact-check' ? 'warning' : 'secondary'}
                        size="sm"
                      >
                        {message.type === 'fact-check' ? 'Fact-Check' : 'Analysis'}
                      </Badge>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {formatTimestamp(message.timestamp)}
                  </span>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyMessage(message.content)}
                    className="p-1 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                  
                  {message.role === 'user' && message.type !== 'fact-check' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleFactCheck(message.content)}
                      className="p-1 text-xs"
                    >
                      Fact-check
                    </Button>
                  )}
                </div>
              </div>
              
              {message.role === 'user' && (
                <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </div>
              )}
            </motion.div>
          ))
        )}
        
        {/* Loading indicator */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-3 justify-start"
          >
            <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/20 rounded-full flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary-600 dark:text-primary-400" />
            </div>
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary-600" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Thinking...
                </span>
              </div>
            </div>
          </motion.div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me about fact-checking, misinformation, or anything else..."
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
            disabled={isLoading}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className="px-3"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Press Enter to send • Shift+Enter for new line
        </p>
      </div>
    </div>
  );
};
