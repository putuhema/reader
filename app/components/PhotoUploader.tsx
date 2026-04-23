"use client";

import { useState, useCallback } from "react";
import ExifReader from "exifreader";

interface ExifData {
  latitude: number | null;
  longitude: number | null;
  timestamp: string | null;
}

function getStringTagValue(tag: unknown): string | undefined {
  if (!tag || typeof tag !== "object") return undefined;
  const t = tag as { value?: string[]; description?: string | string[] };
  if (typeof t.description === "string") return t.description;
  if (Array.isArray(t.value) && t.value.length > 0 && typeof t.value[0] === "string") {
    return t.value[0];
  }
  return undefined;
}

function getGPSDecimal(coordTag: unknown, refTag: unknown): number | null {
  if (!coordTag || typeof coordTag !== "object" || !refTag || typeof refTag !== "object") {
    return null;
  }

  const coord = coordTag as { value?: [[number, number], [number, number], [number, number]] };
  const ref = refTag as { value?: string[] };

  if (!coord.value || !ref.value?.length) return null;

  const [[degNum, degDen], [minNum, minDen], [secNum, secDen]] = coord.value;

  if (degDen === 0 || minDen === 0 || secDen === 0) return null;

  const degrees = degNum / degDen;
  const minutes = minNum / minDen;
  const seconds = secNum / secDen;

  let decimal = degrees + minutes / 60 + seconds / 3600;

  const refValue = ref.value[0];
  if (refValue === "S" || refValue === "W") {
    decimal = -decimal;
  }

  return decimal;
}

export default function PhotoUploader() {
  const [exifData, setExifData] = useState<ExifData | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      setLoading(true);
      setExifData(null);
      setError(null);

      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);

      try {
        const arrayBuffer = await file.arrayBuffer();
        const tags = await ExifReader.load(arrayBuffer);

        console.log("All EXIF tags:", tags);

        const latitude = getGPSDecimal(tags.GPSLatitude, tags.GPSLatitudeRef);
        const longitude = getGPSDecimal(
          tags.GPSLongitude,
          tags.GPSLongitudeRef
        );

        const timestamp =
          getStringTagValue(tags.DateTimeOriginal) ||
          getStringTagValue(tags.DateTimeDigitized) ||
          getStringTagValue(tags.DateTime) ||
          null;

        const data: ExifData = { latitude, longitude, timestamp };
        setExifData(data);

        console.log("=== EXIF Data ===");
        console.log("Latitude:", latitude);
        console.log("Longitude:", longitude);
        console.log("Timestamp:", timestamp);
        console.log("=================");
      } catch (err) {
        console.error("Error reading EXIF data:", err);
        setError(
          err instanceof Error ? err.message : "Failed to read EXIF data"
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-xl mx-auto p-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Photo EXIF Reader</h1>
        <p className="text-zinc-500">
          Upload a photo to extract GPS coordinates and timestamp
        </p>
      </div>

      <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-zinc-300 rounded-xl cursor-pointer hover:border-zinc-400 hover:bg-zinc-50 transition-colors">
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <svg
            className="w-10 h-10 mb-3 text-zinc-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <p className="mb-2 text-sm text-zinc-500">
            <span className="font-semibold">Click to upload</span> or drag and
            drop
          </p>
          <p className="text-xs text-zinc-400">JPEG, PNG, HEIC with EXIF</p>
        </div>
        <input
          type="file"
          className="hidden"
          accept="image/*"
          onChange={handleFileChange}
        />
      </label>

      {loading && (
        <div className="flex items-center gap-2 text-zinc-500">
          <div className="w-5 h-5 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin" />
          Reading EXIF data...
        </div>
      )}

      {error && (
        <div className="w-full bg-red-50 text-red-600 rounded-lg p-4 border border-red-200">
          {error}
        </div>
      )}

      {preview && (
        <div className="w-full">
          <img
            src={preview}
            alt="Preview"
            className="w-full max-h-64 object-contain rounded-lg border border-zinc-200"
          />
        </div>
      )}

      {exifData && (
        <div className="w-full bg-zinc-50 rounded-xl p-6 border border-zinc-200">
          <h2 className="text-lg font-semibold mb-4">Extracted EXIF Data</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-zinc-500">Latitude</span>
              <span className="font-mono font-medium">
                {exifData.latitude !== null
                  ? exifData.latitude.toFixed(6)
                  : "Not available"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-zinc-500">Longitude</span>
              <span className="font-mono font-medium">
                {exifData.longitude !== null
                  ? exifData.longitude.toFixed(6)
                  : "Not available"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-zinc-500">Timestamp</span>
              <span className="font-mono font-medium">
                {exifData.timestamp || "Not available"}
              </span>
            </div>
          </div>

          {exifData.latitude !== null && exifData.longitude !== null && (
            <a
              href={`https://www.google.com/maps?q=${exifData.latitude},${exifData.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 block w-full text-center py-2 px-4 bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity"
            >
              Open in Google Maps
            </a>
          )}
        </div>
      )}
    </div>
  );
}
