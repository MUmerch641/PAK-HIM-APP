import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, ((...args: any[]) => void)[]> = new Map();
  private projectId: string | null = null;
  private readonly SOCKET_URL = 'https://pakhims.com/socket.io';

  constructor() {
    this.initializeSocket();
    this.loadProjectId();
  }

  private async loadProjectId() {
    try {
      const userDataString = await AsyncStorage.getItem('userData');
      if (userDataString) {
        const userData = JSON.parse(userDataString);
        this.projectId = userData.projectId || null;
        console.log('SocketService: Project ID loaded:', this.projectId);
      }
    } catch (error) {
      console.error('SocketService: Error loading project ID:', error);
    }
  }

  private initializeSocket() {
    if (this.socket) return;

    this.socket = io(this.SOCKET_URL, {
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      autoConnect: true,
    });

    this.socket.on('connect', () => {
      console.log('SocketService: Connected to server with ID:', this.socket?.id);
    });

    this.socket.on('connect_error', (error) => {
      console.error('SocketService: Connection error:', error.message);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('SocketService: Disconnected:', reason);
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('SocketService: Reconnected after', attemptNumber, 'attempts');
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('SocketService: Reconnect error:', error.message);
    });
  }

  public connect() {
    if (this.socket && !this.socket.connected) {
      this.socket.connect();
    }
  }

  public disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  public isConnected(): boolean {
    return this.socket?.connected || false;
  }

  public getSocketId(): string | null {
    return this.socket?.id || null;
  }

  public emit(event: string, data: any) {
    if (this.socket && this.socket.connected) {
      console.log(`SocketService: Emitting ${event}:`, data);
      this.socket.emit(event, data);
      return true;
    } else {
      console.warn('SocketService: Cannot emit - socket not connected');
      return false;
    }
  }

  public on(event: string, callback: (...args: any[]) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)?.push(callback);

    if (this.socket) {
      this.socket.on(event, (...args) => callback(...args));
    }
  }

  public off(event: string, callback?: (...args: any[]) => void) {
    if (!this.socket) return;

    if (callback) {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index !== -1) {
          callbacks.splice(index, 1);
          this.socket.off(event, callback as (...args: any[]) => void); // Remove specific listener
        }
      }
    } else {
      this.socket.off(event); // Remove all listeners for this event
      this.listeners.delete(event);
    }
  }

  public emitHimsEvent(module: string, operation: string, additionalData: any = {}) {
    if (!this.projectId) {
      console.warn('SocketService: Cannot emit HIMS event - no project ID');
      return false;
    }

    const eventData = {
      projectId: this.projectId,
      module,
      operation: operation === 'insert' ? 'insert' : 'update',
      ...additionalData,
    };

    return this.emit('himsEvents', eventData);
  }

  public listenToProjectEvents(callback: (...args: any[]) => void) {
    if (!this.projectId) {
      console.warn('SocketService: Cannot listen to project events - no project ID');
      return () => {}; // Return empty cleanup function
    }

    this.on(this.projectId, callback);
    return () => {
      if (this.projectId) {
        this.off(this.projectId, callback);
        console.log('SocketService: Cleanup listener for projectId:', this.projectId);
      }
    };
  }

  public updateProjectId(projectId: string) {
    this.projectId = projectId;
    console.log('SocketService: Project ID updated:', projectId);
  }
}

const socketService = new SocketService();

export default socketService;