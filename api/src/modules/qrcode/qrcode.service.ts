import QRCode from 'qrcode';

/**
 * Generates a base64 DataURL for a QR Code
 * This is the "generateQRCode" function your Tickets Controller is looking for!
 */
export const generateQRCode = async (data: string): Promise<string> => {
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(data);
    return qrCodeDataUrl;
  } catch (error) {
    console.error('QR Code Generation Error:', error);
    throw new Error('Failed to generate QR code');
  }
};

/**
 * Helper to structure and verify the data inside the QR code string
 */
export const verifyQRData = (qrData: string) => {
  try {
    // If your QR data is a JSON string, we parse it
    const data = typeof qrData === 'string' ? JSON.parse(qrData) : qrData;
    return {
      valid: !!(data.ticketNumber && data.eventId),
      ticketNumber: data.ticketNumber,
      eventId: data.eventId
    };
  } catch {
    return { valid: false };
  }
};