// Utilidad para emitir eventos de reserva a los usuarios involucrados
import { IBooking } from '../models/Booking.model';

/**
 * Envía un evento de reserva a los sockets de golfista y caddie involucrados
 * @param event nombre del evento (ej: 'booking:created', 'booking:updated')
 * @param booking reserva completa (debe tener golferId y caddieId)
 * @param payload datos a enviar (por defecto la reserva)
 */
export function emitBookingEvent(event: string, booking: IBooking, payload?: any) {
  const io = (global as any).io;
  if (!io) return;
  // Emitir al golfista
if (booking.golferId) {
  const golferUserId = booking.golferId.toString();    console.log(`[SOCKET] Emitiendo evento '${event}' a golferUserId: ${golferUserId}`);
    io.to(`user:${golferUserId.toString()}`).emit(event, payload || booking);
  }
  // Emitir al caddie
if (booking.caddieId) {
  const caddieUserId = booking.caddieId.toString();
    console.log(`[SOCKET] Emitiendo evento '${event}' a caddieUserId: ${caddieUserId}`);
    io.to(`user:${caddieUserId.toString()}`).emit(event, payload || booking);
 }
  console.log(`[SOCKET] Payload emitido:`, payload || booking);
}