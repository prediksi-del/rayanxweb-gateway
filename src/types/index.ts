export interface ClientDevice {
  socketId: string;
  pin: string;
  model: string;
  connectedAt: number;
  status: 'online' | 'offline';
}

export interface RelayPayload {
  targetId: string;
  action: string;
  params?: Record<string, any>;
}
