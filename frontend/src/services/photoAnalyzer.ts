import { authorities } from '@/data/mockData';

export interface ExtractedMetadata {
  latitude: number;
  longitude: number;
  extractedFromEXIF: boolean;
  resolvedWard?: string;
}

interface EXIFData {
  latitude?: number;
  longitude?: number;
  latitudeRef?: string;
  longitudeRef?: string;
  dateTime?: string;
  dateTimeOriginal?: string;
  dateTimeDigitized?: string;
  gpsInfoOffset?: number;
  exifInfoOffset?: number;
}

// Predefined fallback points within ward boundary polygons
const FALLBACK_POINTS = [
  { latitude: 19.1190, longitude: 72.8360, ward: 'MCGM-KW' }, // Ward K-West (S.V. Road area)
  { latitude: 19.0120, longitude: 72.8500, ward: 'MCGM-FN' }, // Ward F-North (Ambedkar Road area)
  { latitude: 19.0840, longitude: 72.8980, ward: 'MCGM-HE' }  // Ward H-East (LBS Marg area)
];

/**
 * Validates whether the given longitude and latitude are in range constraints expected by PostGIS / GeoJSON.
 */
function isValidCoordinate(lon: number, lat: number): boolean {
  return typeof lon === 'number' && !isNaN(lon) && lon >= -180 && lon <= 180 &&
         typeof lat === 'number' && !isNaN(lat) && lat >= -90 && lat <= 90;
}

/**
 * Reads an ASCII string from TIFF entry.
 */
function readString(view: DataView, tiffOffset: number, entryOffset: number, littleEndian: boolean): string {
  const type = view.getUint16(entryOffset + 2, littleEndian);
  const count = view.getUint32(entryOffset + 4, littleEndian);
  if (count === 0) return '';
  
  let strOffset = entryOffset + 8;
  if (count > 4) {
    strOffset = tiffOffset + view.getUint32(entryOffset + 8, littleEndian);
  }
  
  let str = '';
  for (let i = 0; i < count; i++) {
    if (strOffset + i >= view.byteLength) break;
    const charCode = view.getUint8(strOffset + i);
    if (charCode === 0) break; // Null terminator
    str += String.fromCharCode(charCode);
  }
  return str.trim();
}

/**
 * Reads rational values from TIFF entry.
 */
function readRationals(view: DataView, offset: number, count: number, littleEndian: boolean): number[] {
  const result: number[] = [];
  for (let i = 0; i < count; i++) {
    const numOffset = offset + i * 8;
    if (numOffset + 8 > view.byteLength) break;
    const numerator = view.getUint32(numOffset, littleEndian);
    const denominator = view.getUint32(numOffset + 4, littleEndian);
    if (denominator === 0) {
      result.push(0);
    } else {
      result.push(numerator / denominator);
    }
  }
  return result;
}

/**
 * Parses a specific IFD block.
 */
function parseIFD(
  view: DataView,
  tiffOffset: number,
  ifdOffset: number,
  littleEndian: boolean,
  exifData: EXIFData
) {
  if (ifdOffset + 2 > view.byteLength) return;
  const numEntries = view.getUint16(ifdOffset, littleEndian);
  
  for (let i = 0; i < numEntries; i++) {
    const entryOffset = ifdOffset + 2 + i * 12;
    if (entryOffset + 12 > view.byteLength) break;
    
    const tag = view.getUint16(entryOffset, littleEndian);
    const type = view.getUint16(entryOffset + 2, littleEndian);
    const count = view.getUint32(entryOffset + 4, littleEndian);
    
    switch (tag) {
      case 0x8825: // GPS Info IFD Pointer
        exifData.gpsInfoOffset = view.getUint32(entryOffset + 8, littleEndian);
        break;
      case 0x8769: // Exif IFD Pointer
        exifData.exifInfoOffset = view.getUint32(entryOffset + 8, littleEndian);
        break;
      case 0x0132: // DateTime
        exifData.dateTime = readString(view, tiffOffset, entryOffset, littleEndian);
        break;
      case 0x9003: // DateTimeOriginal
        exifData.dateTimeOriginal = readString(view, tiffOffset, entryOffset, littleEndian);
        break;
      case 0x9004: // DateTimeDigitized
        exifData.dateTimeDigitized = readString(view, tiffOffset, entryOffset, littleEndian);
        break;
      case 1: // GPSLatitudeRef
        exifData.latitudeRef = readString(view, tiffOffset, entryOffset, littleEndian);
        break;
      case 2: // GPSLatitude
        {
          const valOffset = tiffOffset + view.getUint32(entryOffset + 8, littleEndian);
          const coords = readRationals(view, valOffset, count, littleEndian);
          if (coords.length === 3) {
            exifData.latitude = coords[0] + coords[1] / 60 + coords[2] / 3600;
          }
        }
        break;
      case 3: // GPSLongitudeRef
        exifData.longitudeRef = readString(view, tiffOffset, entryOffset, littleEndian);
        break;
      case 4: // GPSLongitude
        {
          const valOffset = tiffOffset + view.getUint32(entryOffset + 8, littleEndian);
          const coords = readRationals(view, valOffset, count, littleEndian);
          if (coords.length === 3) {
            exifData.longitude = coords[0] + coords[1] / 60 + coords[2] / 3600;
          }
        }
        break;
    }
  }
}

/**
 * Parses Exif TIFF segment for GPS coordinates and timestamp.
 */
function parseExifTelemetryTIFF(
  buffer: ArrayBuffer,
  tiffOffset: number
): { latitude: number; longitude: number; timestamp: string | null } | null {
  const view = new DataView(buffer);
  
  if (tiffOffset + 8 > view.byteLength) return null;

  const byteOrder = view.getUint16(tiffOffset);
  let littleEndian = false;
  if (byteOrder === 0x4949) {
    littleEndian = true;
  } else if (byteOrder === 0x4D4D) {
    littleEndian = false;
  } else {
    return null;
  }

  if (view.getUint16(tiffOffset + 2, littleEndian) !== 0x002A) {
    return null;
  }

  const firstIfdOffset = view.getUint32(tiffOffset + 4, littleEndian);
  const exifData: EXIFData = {};

  // Parse IFD0
  parseIFD(view, tiffOffset, tiffOffset + firstIfdOffset, littleEndian, exifData);

  // Parse Exif SubIFD if pointer is present
  if (exifData.exifInfoOffset) {
    parseIFD(view, tiffOffset, tiffOffset + exifData.exifInfoOffset, littleEndian, exifData);
  }

  // Parse GPS IFD if pointer is present
  if (exifData.gpsInfoOffset) {
    parseIFD(view, tiffOffset, tiffOffset + exifData.gpsInfoOffset, littleEndian, exifData);
  }

  let latitude = exifData.latitude;
  let longitude = exifData.longitude;
  if (latitude !== undefined && longitude !== undefined) {
    if (exifData.latitudeRef === 'S') latitude = -latitude;
    if (exifData.longitudeRef === 'W') longitude = -longitude;
  } else {
    latitude = undefined;
    longitude = undefined;
  }

  // Resolve timestamp
  const dateStr = exifData.dateTimeOriginal || exifData.dateTimeDigitized || exifData.dateTime;
  let timestamp: string | null = null;
  if (dateStr) {
    // Parse "YYYY:MM:DD HH:MM:SS"
    const matches = dateStr.match(/^(\d{4}):(\d{2}):(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/);
    if (matches) {
      const [_, year, month, day, hour, min, sec] = matches;
      const date = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hour),
        parseInt(min),
        parseInt(sec)
      );
      if (!isNaN(date.getTime())) {
        timestamp = date.toISOString();
      }
    }
  }

  if (latitude !== undefined && longitude !== undefined) {
    return { latitude, longitude, timestamp };
  }

  return null;
}

/**
 * Requests live geolocation from browser navigator.
 */
function getLiveLocation(timeoutMs = 5000): Promise<{ latitude: number; longitude: number } | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.navigator || !window.navigator.geolocation) {
      resolve(null);
      return;
    }
    
    const timeoutId = setTimeout(() => {
      resolve(null);
    }, timeoutMs);

    window.navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(timeoutId);
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      },
      (error) => {
        clearTimeout(timeoutId);
        console.warn('Navigator geolocation failed:', error);
        resolve(null);
      },
      { enableHighAccuracy: true, timeout: timeoutMs }
    );
  });
}

/**
 * Fallback routine for extractPhotoTelemetry when EXIF details are scrubbed or missing.
 * Attempts to poll navigator.geolocation, failing which it selects a random point in Mumbai.
 */
async function useTelemetryFallback(): Promise<{ latitude: number; longitude: number; timestamp: string }> {
  const liveLoc = await getLiveLocation(5000);
  const timestamp = new Date().toISOString();
  if (liveLoc && isValidCoordinate(liveLoc.longitude, liveLoc.latitude)) {
    return {
      latitude: liveLoc.latitude,
      longitude: liveLoc.longitude,
      timestamp
    };
  }
  
  const idx = Math.floor(Math.random() * FALLBACK_POINTS.length);
  const point = FALLBACK_POINTS[idx];
  return {
    latitude: point.latitude,
    longitude: point.longitude,
    timestamp
  };
}

/**
 * Extract photo telemetry containing latitude, longitude, and timestamp from file.
 * Returns GeoJSON-compliant coordinate ranges. Falls back to live location or mock coordinates.
 */
export async function extractPhotoTelemetry(
  file: File
): Promise<{ latitude: number; longitude: number; timestamp: string } | null> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const view = new DataView(arrayBuffer);

    // Verify JPEG SOI marker (0xFFD8)
    if (view.byteLength < 4 || view.getUint16(0) !== 0xFFD8) {
      console.warn('File is not a valid JPEG. Using telemetry fallback.');
      return useTelemetryFallback();
    }

    let offset = 2;
    let telemetry: { latitude: number; longitude: number; timestamp: string | null } | null = null;

    while (offset < view.byteLength - 2) {
      if (view.getUint8(offset) === 0xFF) {
        const marker = view.getUint8(offset + 1);
        if (marker === 0xE1) { // APP1 segment
          if (offset + 10 <= view.byteLength &&
              view.getUint32(offset + 4) === 0x45786966 && 
              view.getUint16(offset + 8) === 0x0000) {
            telemetry = parseExifTelemetryTIFF(arrayBuffer, offset + 10);
          }
          break;
        } else if (marker >= 0xD0 && marker <= 0xD9) {
          offset += 2;
        } else {
          const length = view.getUint16(offset + 2);
          offset += 2 + length;
        }
      } else {
        offset++;
      }
    }

    if (telemetry && isValidCoordinate(telemetry.longitude, telemetry.latitude)) {
      return {
        latitude: telemetry.latitude,
        longitude: telemetry.longitude,
        timestamp: telemetry.timestamp || new Date().toISOString()
      };
    }
  } catch (error) {
    console.error('Error extracting photo telemetry:', error);
  }

  return useTelemetryFallback();
}

/**
 * Backwards compatibility method for legacy code calling analyzePhotoMetadata.
 */
export async function analyzePhotoMetadata(file: File | Blob): Promise<ExtractedMetadata> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const view = new DataView(arrayBuffer);

    if (view.byteLength < 4 || view.getUint16(0) !== 0xFFD8) {
      return useLegacyFallback();
    }

    let offset = 2;
    let gpsCoords: { latitude: number; longitude: number } | null = null;

    while (offset < view.byteLength - 2) {
      if (view.getUint8(offset) === 0xFF) {
        const marker = view.getUint8(offset + 1);
        if (marker === 0xE1) {
          if (offset + 10 <= view.byteLength &&
              view.getUint32(offset + 4) === 0x45786966 && 
              view.getUint16(offset + 8) === 0x0000) {
            const parsed = parseExifTelemetryTIFF(arrayBuffer, offset + 10);
            if (parsed) {
              gpsCoords = { latitude: parsed.latitude, longitude: parsed.longitude };
            }
          }
          break;
        } else if (marker >= 0xD0 && marker <= 0xD9) {
          offset += 2;
        } else {
          const length = view.getUint16(offset + 2);
          offset += 2 + length;
        }
      } else {
        offset++;
      }
    }

    if (gpsCoords && isValidCoordinate(gpsCoords.longitude, gpsCoords.latitude)) {
      const resolvedWard = getResolvedWard(gpsCoords.longitude, gpsCoords.latitude);
      return {
        latitude: gpsCoords.latitude,
        longitude: gpsCoords.longitude,
        extractedFromEXIF: true,
        resolvedWard
      };
    }
  } catch (error) {
    console.error('Error in legacy analyzePhotoMetadata:', error);
  }

  return useLegacyFallback();
}

function useLegacyFallback(): ExtractedMetadata {
  const idx = Math.floor(Math.random() * FALLBACK_POINTS.length);
  const point = FALLBACK_POINTS[idx];
  return {
    latitude: point.latitude,
    longitude: point.longitude,
    extractedFromEXIF: false,
    resolvedWard: point.ward
  };
}

function getResolvedWard(lon: number, lat: number): string | undefined {
  for (const auth of authorities) {
    if (!auth.departmentCode.startsWith('MCGM')) continue;
    const polygon = auth.boundaryGeoJSON.coordinates[0];
    
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][0], yi = polygon[i][1];
      const xj = polygon[j][0], yj = polygon[j][1];
      
      const intersect = ((yi > lat) !== (yj > lat))
          && (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi);
      
      if (intersect) inside = !inside;
    }
    if (inside) {
      return auth.departmentCode;
    }
  }
  return undefined;
}
