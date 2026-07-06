import { authorities } from '@/data/mockData';

export interface ExtractedMetadata {
  latitude: number;
  longitude: number;
  extractedFromEXIF: boolean;
  resolvedWard?: string;
}

// Predefined fallback points within ward boundary polygons
const FALLBACK_POINTS = [
  { latitude: 19.1190, longitude: 72.8360, ward: 'MCGM-KW' }, // Ward K-West (S.V. Road area)
  { latitude: 19.0120, longitude: 72.8500, ward: 'MCGM-FN' }, // Ward F-North (Ambedkar Road area)
  { latitude: 19.0840, longitude: 72.8980, ward: 'MCGM-HE' }  // Ward H-East (LBS Marg area)
];

/**
 * Parses binary image data to extract raw EXIF GPS coordinates.
 * Falls back to mock coordinates within the project boundaries if EXIF coordinates are missing.
 */
export async function analyzePhotoMetadata(file: File | Blob): Promise<ExtractedMetadata> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const view = new DataView(arrayBuffer);

    // Verify JPEG SOI marker (0xFFD8)
    if (view.byteLength < 4 || view.getUint16(0) !== 0xFFD8) {
      console.warn('File is not a valid JPEG. Using fallback coordinates.');
      return useFallback();
    }

    let offset = 2;
    let gpsCoords: { latitude: number; longitude: number } | null = null;

    while (offset < view.byteLength - 2) {
      // Find segment marker
      if (view.getUint8(offset) === 0xFF) {
        const marker = view.getUint8(offset + 1);
        
        if (marker === 0xE1) { // APP1 segment
          // Exif starts at offset + 4: check Exif\0\0 header
          if (offset + 10 <= view.byteLength &&
              view.getUint32(offset + 4) === 0x45786966 && 
              view.getUint16(offset + 8) === 0x0000) {
            gpsCoords = parseExifTIFF(arrayBuffer, offset + 10);
          }
          break; // APP1 processed (or invalid), exit loop
        } else if (marker >= 0xD0 && marker <= 0xD9) {
          // SOI, EOI, RST markers do not have a length field
          offset += 2;
        } else {
          const length = view.getUint16(offset + 2);
          offset += 2 + length;
        }
      } else {
        offset++;
      }
    }

    if (gpsCoords) {
      // Determine if coordinates fall into a known ward
      const resolvedWard = getResolvedWard(gpsCoords.longitude, gpsCoords.latitude);
      return {
        latitude: gpsCoords.latitude,
        longitude: gpsCoords.longitude,
        extractedFromEXIF: true,
        resolvedWard
      };
    }
  } catch (error) {
    console.error('Error analyzing photo EXIF metadata:', error);
  }

  return useFallback();
}

function parseExifTIFF(buffer: ArrayBuffer, tiffOffset: number): { latitude: number; longitude: number } | null {
  const view = new DataView(buffer);
  
  if (tiffOffset + 8 > view.byteLength) return null;

  // Byte order
  const byteOrder = view.getUint16(tiffOffset);
  let littleEndian = false;
  if (byteOrder === 0x4949) {
    littleEndian = true;
  } else if (byteOrder === 0x4D4D) {
    littleEndian = false;
  } else {
    return null;
  }

  // TIFF Magic number
  if (view.getUint16(tiffOffset + 2, littleEndian) !== 0x002A) {
    return null;
  }

  // Offset to first IFD (IFD0)
  const firstIfdOffset = view.getUint32(tiffOffset + 4, littleEndian);
  let ifdOffset = tiffOffset + firstIfdOffset;

  if (ifdOffset + 2 > view.byteLength) return null;

  const numEntries = view.getUint16(ifdOffset, littleEndian);
  let gpsInfoOffset = 0;

  for (let i = 0; i < numEntries; i++) {
    const entryOffset = ifdOffset + 2 + i * 12;
    if (entryOffset + 12 > view.byteLength) break;

    const tag = view.getUint16(entryOffset, littleEndian);
    if (tag === 0x8825) { // GPS Info IFD Pointer
      gpsInfoOffset = view.getUint32(entryOffset + 8, littleEndian);
      break;
    }
  }

  if (!gpsInfoOffset) return null;

  const gpsIfdOffset = tiffOffset + gpsInfoOffset;
  if (gpsIfdOffset + 2 > view.byteLength) return null;

  const gpsEntries = view.getUint16(gpsIfdOffset, littleEndian);
  let latRef = '';
  let lonRef = '';
  let latCoords: number[] = [];
  let lonCoords: number[] = [];

  for (let i = 0; i < gpsEntries; i++) {
    const entryOffset = gpsIfdOffset + 2 + i * 12;
    if (entryOffset + 12 > view.byteLength) break;

    const tag = view.getUint16(entryOffset, littleEndian);
    const type = view.getUint16(entryOffset + 2, littleEndian);
    const count = view.getUint32(entryOffset + 4, littleEndian);

    if (tag === 1) { // GPSLatitudeRef
      const charCode = view.getUint8(entryOffset + 8);
      latRef = String.fromCharCode(charCode).toUpperCase();
    } else if (tag === 2) { // GPSLatitude
      const valOffset = tiffOffset + view.getUint32(entryOffset + 8, littleEndian);
      latCoords = readRationals(view, valOffset, count, littleEndian);
    } else if (tag === 3) { // GPSLongitudeRef
      const charCode = view.getUint8(entryOffset + 8);
      lonRef = String.fromCharCode(charCode).toUpperCase();
    } else if (tag === 4) { // GPSLongitude
      const valOffset = tiffOffset + view.getUint32(entryOffset + 8, littleEndian);
      lonCoords = readRationals(view, valOffset, count, littleEndian);
    }
  }

  if (latCoords.length === 3 && lonCoords.length === 3) {
    let latitude = latCoords[0] + latCoords[1] / 60 + latCoords[2] / 3600;
    let longitude = lonCoords[0] + lonCoords[1] / 60 + lonCoords[2] / 3600;

    if (latRef === 'S') latitude = -latitude;
    if (lonRef === 'W') longitude = -longitude;

    return { latitude, longitude };
  }

  return null;
}

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

function useFallback(): ExtractedMetadata {
  const idx = Math.floor(Math.random() * FALLBACK_POINTS.length);
  const point = FALLBACK_POINTS[idx];
  return {
    latitude: point.latitude,
    longitude: point.longitude,
    extractedFromEXIF: false,
    resolvedWard: point.ward
  };
}

// Ray-casting helper to check if point falls within authority boundary
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
