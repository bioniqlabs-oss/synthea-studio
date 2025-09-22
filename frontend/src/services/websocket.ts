/**
 * WebSocket Service - Real-time updates through the Gateway
 */

import { toast } from 'react-hot-toast';

export interface ProgressUpdate {
  type: 'progress' | 'error' | 'complete';
  data: {
    population_id: string;
    progress?: number;
    message?: string;
    error?: string;
    result?: any;
    timestamp?: string;
  };
}

export class WebSocketService {
  private ws: WebSocket | null = null;
  private listeners: Map<string, Set<(update: ProgressUpdate) => void>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private shouldReconnect = true;
  private currentPopulationId: string | null = null;

  constructor(private wsUrl: string = import.meta.env.VITE_WS_URL || 'ws://localhost:8000') {}

  // Connect to population progress WebSocket
  connectToPopulation(populationId: string): void {
    // If already connected to this population, don't reconnect
    if (this.currentPopulationId === populationId && this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    // Close existing connection
    if (this.ws) {
      this.shouldReconnect = false;  // Don't reconnect the old one
      this.ws.close();
      this.ws = null;
    }

    this.currentPopulationId = populationId;
    this.shouldReconnect = true;
    this.reconnectAttempts = 0;

    const url = `${this.wsUrl}/api/generation/ws/${populationId}`;
    console.log(`Connecting to WebSocket: ${url}`);

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log(`WebSocket connected for population ${populationId}`);
        // Only show toast on first connection, not on reconnects
        if (this.reconnectAttempts === 0) {
          toast.success('Connected to live updates');
        }
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const update: ProgressUpdate = JSON.parse(event.data);
          this.notifyListeners(populationId, update);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        toast.error('Connection error');
      };

      this.ws.onclose = () => {
        console.log(`WebSocket closed for population ${populationId}`);
        if (this.shouldReconnect && this.currentPopulationId === populationId) {
          this.handleReconnect(populationId);
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      toast.error('Failed to connect to live updates');
    }
  }

  // Subscribe to updates
  subscribe(populationId: string, callback: (update: ProgressUpdate) => void): () => void {
    if (!this.listeners.has(populationId)) {
      this.listeners.set(populationId, new Set());
    }

    this.listeners.get(populationId)!.add(callback);

    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(populationId);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          this.listeners.delete(populationId);
        }
      }
    };
  }

  // Notify all listeners
  private notifyListeners(populationId: string, update: ProgressUpdate): void {
    const listeners = this.listeners.get(populationId);
    if (listeners) {
      listeners.forEach((callback) => callback(update));
    }

    // Handle specific update types
    switch (update.type) {
      case 'error':
        toast.error(update.data.error || 'An error occurred');
        break;
      case 'complete':
        toast.success('Population generation complete!');
        this.disconnect();
        break;
    }
  }

  // Handle reconnection
  private handleReconnect(populationId: string): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

      console.log(`Reconnecting in ${delay}ms... (attempt ${this.reconnectAttempts})`);

      setTimeout(() => {
        this.connectToPopulation(populationId);
      }, delay);
    } else {
      toast.error('Connection lost. Please refresh the page.');
    }
  }

  // Disconnect WebSocket
  disconnect(): void {
    this.shouldReconnect = false;  // Don't reconnect when manually disconnecting
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.currentPopulationId = null;
    this.listeners.clear();
  }

  // Send message (for ping/pong)
  send(message: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(message);
    }
  }

  // Get connection state
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// Global WebSocket instance
let wsInstance: WebSocketService | null = null;

export const getWebSocketService = (): WebSocketService => {
  if (!wsInstance) {
    wsInstance = new WebSocketService();
  }
  return wsInstance;
};

// React Hook for WebSocket
import { useEffect, useState, useCallback } from 'react';

export function usePopulationProgress(populationId: string | null) {
  const [progress, setProgress] = useState<number>(0);
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const handleUpdate = useCallback((update: ProgressUpdate) => {
    switch (update.type) {
      case 'progress':
        setProgress(update.data.progress || 0);
        setMessage(update.data.message || '');
        break;
      case 'error':
        setError(update.data.error || 'Unknown error');
        break;
      case 'complete':
        setIsComplete(true);
        setProgress(100);
        setMessage('Generation complete');
        break;
    }
  }, []);

  useEffect(() => {
    if (!populationId) return;

    const ws = getWebSocketService();

    // Connect to WebSocket
    ws.connectToPopulation(populationId);
    setIsConnected(ws.isConnected());

    // Subscribe to updates
    const unsubscribe = ws.subscribe(populationId, handleUpdate);

    // Cleanup
    return () => {
      unsubscribe();
      ws.disconnect();
      setIsConnected(false);
    };
  }, [populationId, handleUpdate]);

  return {
    progress,
    message,
    error,
    isComplete,
    isConnected,
  };
}

// Hook for general notifications
export function useNotifications() {
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    const ws = new WebSocket(`${import.meta.env.VITE_WS_URL || 'ws://localhost:8000'}/ws/notifications`);

    ws.onmessage = (event) => {
      try {
        const notification = JSON.parse(event.data);
        setNotifications((prev) => [...prev, notification]);
      } catch (error) {
        console.error('Failed to parse notification:', error);
      }
    };

    // Keep alive
    const interval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send('ping');
      }
    }, 30000);

    return () => {
      clearInterval(interval);
      ws.close();
    };
  }, []);

  return notifications;
}