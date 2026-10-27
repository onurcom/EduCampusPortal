const collectorUrl = 'http://127.0.0.1:4000/lab/collect';
const supportedLabs = new Set(['sql-injection', 'bot-protection', 'http', 'https']);

export async function sendLabDemoEvent(lab, isSafeMode) {
  if (isSafeMode) {
    return { blocked: true };
  }

  if (!supportedLabs.has(lab)) {
    throw new Error('Bilinmeyen laboratuvar olayı.');
  }

  const response = await fetch(collectorUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lab })
  });

  if (!response.ok) {
    throw new Error(`Demo alıcısı HTTP ${response.status} yanıtı verdi.`);
  }

  return response.json();
}