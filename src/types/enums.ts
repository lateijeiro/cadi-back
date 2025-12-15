// Roles de usuario
export enum UserRole {
  GOLFER = 'golfer',
  CADDIE = 'caddie',
  ADMIN = 'admin',
}

// Estados de aprobación de caddie
export enum CaddieStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

// Categorías de caddie
export enum CaddieCategory {
  FIRST = '1ra',
  SECOND = '2da',
  THIRD = '3ra',
}

// Franjas horarias
export enum TimeSlot {
  MORNING = '9-12',
  AFTERNOON = '12-15',
  EVENING = '15-18',
}

// Estados de reserva
export enum BookingStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  IN_PROGRESS = 'in-progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  REJECTED = 'rejected',
}

// Estados de pago
export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}
