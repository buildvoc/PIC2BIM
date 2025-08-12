import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as checkGeoJson from '@placemarkio/check-geojson';

export type ValidationStatus = 'idle' | 'validating' | 'success' | 'error';

export interface ValidationIssue {
  message?: string;
  severity?: string;
  from?: number;
  to?: number;
  [key: string]: any;
}

export interface ValidationResult {
  valid: boolean;
  errors: (string | ValidationIssue)[];
  warnings: (string | ValidationIssue)[];
}

const MAX_DISPLAY = 50;

export default function useGeoJsonValidation() {
  const workerRef = useRef<Worker | null>(null);
  const [fallbackMainThread, setFallbackMainThread] = useState<boolean>(false);
  const [status, setStatus] = useState<ValidationStatus>('idle');
  const [result, setResult] = useState<ValidationResult>({ valid: false, errors: [], warnings: [] });

  useEffect(() => {
    // Initialize worker; fall back to main-thread validation if cross-origin blocks worker
    try {
      const worker = new Worker(new URL('../workers/geojsonValidator.worker.ts', import.meta.url), { type: 'module' });
      workerRef.current = worker;

      worker.onmessage = (evt: MessageEvent<{ type: string; payload: any }>) => {
        const { data } = evt;
        if (!data) return;
        if (data.type === 'result') {
          const payload = data.payload as ValidationResult;
          setResult(payload);
          setStatus(payload.valid ? 'success' : 'error');
        }
      };

      worker.onerror = () => {
        // If worker errors later, switch to fallback for next validations
        setFallbackMainThread(true);
        setStatus('error');
        setResult({ valid: false, errors: ['Worker error'], warnings: [] });
      };

      return () => {
        worker.terminate();
        workerRef.current = null;
      };
    } catch (e: any) {
      // SecurityError due to cross-origin (e.g., Laravel 127.0.0.1:8000 vs Vite 5173)
      setFallbackMainThread(true);
      workerRef.current = null;
    }
  }, []);

  const validate = useCallback(async (text: string): Promise<ValidationResult> => {
    setStatus('validating');
    setResult({ valid: false, errors: [], warnings: [] });

    // Fallback path: run on main thread
    const computeWarnings = (jsonText: string): (string | ValidationIssue)[] => {
      const warnings: (string | ValidationIssue)[] = [];
      try {
        const obj = JSON.parse(jsonText);
        if (obj && typeof obj === 'object') {
          if (obj.crs) warnings.push('Non-RFC 7946 member: crs is present.');
          if (Array.isArray(obj.bbox)) warnings.push('Collection has bbox defined. Ensure it matches actual extent.');
          if (obj.type === 'FeatureCollection' && Array.isArray(obj.features)) {
            for (const f of obj.features) {
              if (f && typeof f === 'object') {
                // foreign members starting with x-
                for (const k of Object.keys(f)) {
                  if (k.startsWith('x-')) warnings.push(`Foreign member on Feature: ${k}`);
                }
                // null geometry
                if (f.geometry === null) warnings.push('Feature has null geometry.');
                // altitude detection for Point/LineString/Polygon
                const g = f.geometry;
                const hasAltitude = (coords: any): boolean => {
                  if (!coords) return false;
                  if (Array.isArray(coords)) {
                    if (coords.length >= 3 && coords.every((n) => typeof n === 'number')) return true;
                    return coords.some((c) => hasAltitude(c));
                  }
                  return false;
                };
                if (g && g.coordinates && hasAltitude(g.coordinates)) {
                  warnings.push('Coordinates include altitude (3D). Some tools may warn.');
                }
              }
            }
          }
        }
      } catch (_) {
        // ignore
      }
      return warnings;
    };

    if (fallbackMainThread || !workerRef.current) {
      try {
        checkGeoJson.check(text);
        const res: ValidationResult = { valid: true, errors: [], warnings: computeWarnings(text) };
        setResult(res);
        setStatus('success');
        return res;
      } catch (e: any) {
        const issues = e?.issues || [e?.message || 'Validation failed'];
        const res: ValidationResult = { valid: false, errors: issues, warnings: [] };
        setResult(res);
        setStatus('error');
        return res;
      }
    }

    // Worker path
    return new Promise((resolve) => {
      const handler = (evt: MessageEvent<{ type: string; payload: any }>) => {
        const { data } = evt;
        if (data?.type === 'result') {
          const payload = data.payload as ValidationResult;
          if (payload.valid) {
            const warnings = computeWarnings(text);
            const merged: ValidationResult = { ...payload, warnings };
            setResult(merged);
            setStatus('success');
            resolve(merged);
          } else {
            setResult(payload);
            setStatus('error');
            resolve(payload);
          }
        }
        workerRef.current?.removeEventListener('message', handler as any);
      };

      workerRef.current?.addEventListener('message', handler as any);
      workerRef.current?.postMessage({ type: 'validate', payload: { text } });
    });
  }, [fallbackMainThread]);

  const limited = useMemo(() => {
    return {
      ...result,
      errors: result.errors?.slice(0, MAX_DISPLAY) || [],
      warnings: result.warnings?.slice(0, MAX_DISPLAY) || [],
      overflowErrors: Math.max(0, (result.errors?.length || 0) - MAX_DISPLAY),
      overflowWarnings: Math.max(0, (result.warnings?.length || 0) - MAX_DISPLAY),
    } as ValidationResult & { overflowErrors: number; overflowWarnings: number };
  }, [result]);

  return { status, result, limited, validate };
}
