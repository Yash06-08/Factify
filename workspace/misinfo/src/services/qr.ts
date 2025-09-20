import QrScanner from 'qr-scanner';
import { QRResult } from '@/types';

export class QRService {
  // Analyze QR codes in uploaded image
  static async analyzeImage(imageFile: File): Promise<QRResult> {
    try {
      const result = await QrScanner.scanImage(imageFile, {
        returnDetailedScanResult: true,
      });

      if (!result) {
        return {
          detected: false,
        };
      }

      const isUrl = this.isValidUrl(result.data);
      const isUrlSafe = isUrl ? await this.checkUrlSafety(result.data) : undefined;

      return {
        detected: true,
        data: result.data,
        format: 'QR_CODE',
        position: result.cornerPoints ? {
          x: Math.min(...result.cornerPoints.map(p => p.x)),
          y: Math.min(...result.cornerPoints.map(p => p.y)),
          width: Math.max(...result.cornerPoints.map(p => p.x)) - Math.min(...result.cornerPoints.map(p => p.x)),
          height: Math.max(...result.cornerPoints.map(p => p.y)) - Math.min(...result.cornerPoints.map(p => p.y)),
        } : undefined,
        isUrlSafe,
      };
    } catch (error) {
      console.error('QR analysis error:', error);
      return {
        detected: false,
      };
    }
  }

  // Check if string is a valid URL
  private static isValidUrl(string: string): boolean {
    try {
      new URL(string);
      return true;
    } catch {
      return false;
    }
  }

  // Basic URL safety check
  private static async checkUrlSafety(url: string): Promise<boolean> {
    try {
      const urlObj = new URL(url);
      
      // Check for suspicious domains or patterns
      const suspiciousDomains = [
        'bit.ly',
        'tinyurl.com',
        'short.link',
        't.co',
        'goo.gl',
      ];
      
      const suspiciousPatterns = [
        /[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/, // IP addresses
        /[a-z0-9]{10,}\.tk$/, // Suspicious TLDs with random strings
        /[a-z0-9]{10,}\.ml$/,
        /[a-z0-9]{10,}\.ga$/,
      ];

      // Check domain against suspicious list
      if (suspiciousDomains.some(domain => urlObj.hostname.includes(domain))) {
        return false;
      }

      // Check against suspicious patterns
      if (suspiciousPatterns.some(pattern => pattern.test(urlObj.hostname))) {
        return false;
      }

      // Check protocol
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  // Extract QR data from image blob/base64
  static async scanFromDataUrl(dataUrl: string): Promise<QRResult> {
    try {
      const result = await QrScanner.scanImage(dataUrl, {
        returnDetailedScanResult: true,
      });

      if (!result) {
        return { detected: false };
      }

      const isUrl = this.isValidUrl(result.data);
      const isUrlSafe = isUrl ? await this.checkUrlSafety(result.data) : undefined;

      return {
        detected: true,
        data: result.data,
        format: 'QR_CODE',
        isUrlSafe,
      };
    } catch (error) {
      console.error('QR scan error:', error);
      return { detected: false };
    }
  }
}
