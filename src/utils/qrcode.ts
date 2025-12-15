import QRCode from 'qrcode';


// Solo datos mínimos para el QR
interface QRData {
  bookingId: string;
  timestamp: number;
}

export const generateQRCode = async (data: QRData): Promise<string> => {
  try {
    // Solo bookingId y timestamp
    const qrData = JSON.stringify({
      bookingId: data.bookingId,
      timestamp: data.timestamp,
    });

    // Generar QR con menor corrección
    const qrCodeDataURL = await QRCode.toDataURL(qrData, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      width: 300,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
    return qrCodeDataURL;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
};

export const validateQRData = (qrString: string): QRData | null => {
  try {
    const data = JSON.parse(qrString) as QRData;
    // Validar que tenga los campos mínimos
    if (!data.bookingId || !data.timestamp) {
      return null;
    }
    return data;
  } catch (error) {
    return null;
  }
};
