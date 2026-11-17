import { useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import { Alert, Linking } from 'react-native';
import { EventRegister } from 'react-native-event-listeners';

export function readMessage(raw, decode) {
  if (typeof raw !== 'string') return null;
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    try {
      data = decode ? JSON.parse(decode(raw)) : null;
    } catch {
      return null;
    }
  }
  const method = data?.method ?? data?.name;
  return typeof method === 'string' ? { ...data, method } : null;
}

export function timestampOrNull(value) {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (typeof value === 'string' && !value.trim()) return null;
  const timestamp = Number(value);
  return Number.isSafeInteger(timestamp) &&
    Math.abs(timestamp) <= 8640000000000000
    ? timestamp
    : null;
}

export function syncConfiguration(data) {
  const token = data.authtoken ?? data.authToken;
  if (
    typeof data.apiBaseUrl !== 'string' ||
    !/^https?:\/\/[^/\s]+/i.test(data.apiBaseUrl.trim()) ||
    typeof token !== 'string' ||
    !token.trim()
  ) {
    return null;
  }
  const cursor = (value) => {
    const timestamp = timestampOrNull(value);
    return timestamp !== null && timestamp >= 0 ? timestamp : -1;
  };
  return {
    apiBaseUrl: data.apiBaseUrl.trim(),
    authToken: token,
    googleFitLastSync: cursor(data.googleFitLastSync),
    gfHourlyLastSync: cursor(data.gfHourlyLastSync),
  };
}

export function useWebDocument(source) {
  const webviewRef = useRef(null);
  const current = useRef(null);
  const generation = useRef(0);
  const reset = useCallback(() => {
    current.current = { id: ++generation.current, pending: new Map() };
  }, []);

  useLayoutEffect(() => {
    reset();
    return () => {
      current.current = null;
    };
  }, [reset, source]);

  return useMemo(() => {
    const isCurrent = (document) =>
      Boolean(document && current.current === document);
    return {
      webviewRef,
      current,
      reset,
      isCurrent,
      inject(document, script) {
        if (isCurrent(document)) webviewRef.current?.injectJavaScript(script);
      },
      run(document, key, action) {
        if (!isCurrent(document)) return;
        const pending = document.pending.get(key);
        if (pending) return pending;
        const request = Promise.resolve()
          .then(() => (isCurrent(document) ? action() : undefined))
          .finally(() => document.pending.delete(key));
        document.pending.set(key, request);
        return request;
      },
    };
  }, [reset]);
}

export function refreshCalorieCard(bridge, document, native) {
  return bridge.run(document, 'calories', async () => {
    const kcal = await native.getTodayCaloriesForWeb();
    if (Number.isFinite(kcal)) {
      bridge.inject(
        document,
        `if (typeof window.updateCalorieBurned === 'function') window.updateCalorieBurned(${kcal}); true;`
      );
    }
  });
}

export async function handleWebAction(data, native, bridge, document) {
  switch (data.method) {
    case 'CLOSE_VIEW':
    case 'OPEN_FACE_SCAN_FLOW':
      EventRegister.emitEvent('visit-event', { message: data.method });
      break;
    case 'OPEN_PDF':
      if (typeof data.url === 'string') await Linking.openURL(data.url);
      break;
    case 'OPEN_DAILER': {
      const phone =
        typeof data.number === 'string' ||
        (Number.isSafeInteger(data.number) && data.number >= 0)
          ? String(data.number).replace(/[\s()-]/g, '')
          : '';
      if (/^\+?\d+$/.test(phone)) await Linking.openURL(`tel:${phone}`);
      break;
    }
    case 'DOWNLOAD_PDF':
      if (typeof data.link !== 'string' || !data.link.trim()) break;
      await bridge.run(document, 'download', async () => {
        try {
          await native.downloadAndShare(
            data.link.trim(),
            typeof data.authToken === 'string' ? data.authToken : null
          );
        } catch {
          if (bridge.isCurrent(document)) {
            Alert.alert('Download failed', 'The document could not be shared.');
          }
        }
      });
      break;
  }
}
