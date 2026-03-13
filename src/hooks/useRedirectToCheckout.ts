interface UseRedirectToCheckoutReturn {
  redirectToCheckout: (checkoutUrl: string) => void;
}

export const useRedirectToCheckout = (): UseRedirectToCheckoutReturn => {
  const redirectToCheckout = (checkoutUrl: string): void => {
    try {
      if (!checkoutUrl || !checkoutUrl.startsWith('https://')) {
        console.error('[redirect] URL inválida:', checkoutUrl);
        return;
      }

      const isInIframe = window.self !== window.top;

      if (isInIframe) {
        console.log('[redirect] Detectado iframe, abrindo nova aba...');
        const opened = window.open(checkoutUrl, '_blank');
        if (!opened) {
          console.warn('[redirect] Popup bloqueado, redirecionando top...');
          window.top!.location.href = checkoutUrl;
        }
      } else {
        console.log('[redirect] Top-level, redirecionando...');
        window.location.href = checkoutUrl;
      }
    } catch (error) {
      console.error('[redirect] Erro ao redirecionar:', error);
      window.open(checkoutUrl, '_blank');
    }
  };

  return { redirectToCheckout };
};
