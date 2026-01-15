export const buildPaymentUrl = (requestId: string) =>
  `${window.location.origin}/pay/${requestId}`;

export const parsePaymentIdFromUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split('/');
    return parts[parts.length - 1] || null;
  } catch {
    return null;
  }
};
