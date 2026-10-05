// Web Worker for validating GeoJSON using @placemarkio/check-geojson
// Receives: { type: 'validate', payload: { geojson: string } }
// Responds: { type: 'result', payload: { valid: boolean; errors: any[]; warnings: any[] } } | { type: 'error', payload: { message: string } }

import * as checkGeoJson from '@placemarkio/check-geojson';

interface ValidateMessage {
  type: 'validate';
  payload: { text: string };
}

interface ResultMessage {
  type: 'result';
  payload: { valid: boolean; errors: any[]; warnings: any[] };
}

interface ErrorMessage {
  type: 'error';
  payload: { message: string };
}

type Incoming = ValidateMessage;
type Outgoing = ResultMessage | ErrorMessage;

self.onmessage = (evt: MessageEvent<Incoming>) => {
  const { data } = evt;
  if (!data || data.type !== 'validate') return;

  const { text } = data.payload;

  try {
    checkGeoJson.check(text);

    const msg: ResultMessage = {
      type: 'result',
      payload: { valid: true, errors: [], warnings: [] },
    };
    (self as unknown as Worker).postMessage(msg as Outgoing);
  } catch (e: any) {
    const issues = e?.issues || [e?.message || 'Validation failed'];
    const msg: ResultMessage = {
      type: 'result',
      payload: { valid: false, errors: issues, warnings: [] },
    };
    (self as unknown as Worker).postMessage(msg as Outgoing);
  }
};
