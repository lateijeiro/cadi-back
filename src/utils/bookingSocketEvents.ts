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
  if (booking.golferId && booking.golferId.userId) {
    const golferUserId = booking.golferId.userId._id ? booking.golferId.userId._id : booking.golferId.userId;
    console.log(`[SOCKET] Emitiendo evento '${event}' a golferUserId: ${golferUserId}`);
    io.to(`user:${golferUserId.toString()}`).emit(event, payload || booking);
  } else if (booking.golferId) {
    // fallback por si no está populado
    console.log(`[SOCKET] Emitiendo evento '${event}' a golferId: ${booking.golferId}`);
    io.to(`user:${booking.golferId.toString()}`).emit(event, payload || booking);
  }
  // Emitir al caddie
  if (booking.caddieId && booking.caddieId.userId) {
    const caddieUserId = booking.caddieId.userId._id ? booking.caddieId.userId._id : booking.caddieId.userId;
    console.log(`[SOCKET] Emitiendo evento '${event}' a caddieUserId: ${caddieUserId}`);
    io.to(`user:${caddieUserId.toString()}`).emit(event, payload || booking);
  } else if (booking.caddieId) {
    // fallback por si no está populado
    console.log(`[SOCKET] Emitiendo evento '${event}' a caddieId: ${booking.caddieId}`);
    io.to(`user:${booking.caddieId.toString()}`).emit(event, payload || booking);
  }
  console.log(`[SOCKET] Payload emitido:`, payload || booking);
}