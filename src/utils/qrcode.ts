import QRCode from 'qrcode';

interface QRData {
  bookingId: string;
  caddieId: string;
  golferId: string;
  clubId: string;
  date: string;
  startTime: string;
  endTime: string;
  timestamp: number;
}

export const generateQRCode = async (data: QRData): Promise<string> => {
  try {
    // Convertir datos a JSON string
    const qrData = JSON.stringify(data);
    
    // Generar QR como Data URL (base64)
    const qrCodeDataURL = await QRCode.toDataURL(qrData, {
      errorCorrectionLevel: 'H',
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
    
    // Validar que tenga todos los campos requeridos
    if (
      !data.bookingId ||
      !data.caddieId ||
      !data.golferId ||
      !data.clubId ||
      !data.date ||
      !data.startTime ||
      !data.endTime ||
      !data.timestamp
    ) {
      return null;
    }
    
    return data;
  } catch (error) {
    return null;
  }
};
