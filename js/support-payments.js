(function () {
  'use strict';
  var translations = {
    nl: {
      opening: 'We openen de beveiligde betaalpagina…',
      error: 'Betalen lukt nu even niet. Probeer het straks nog eens.',
      cancelled: 'Je hebt de betaling afgebroken. Helemaal goed — kleuren blijft gratis.',
      returned: 'Welkom terug. Je betaalprovider verwerkt je bijdrage. Bedankt dat je ons wilt steunen!',
      checkingTitle: 'Even je betaling controleren',
      checking: 'We kijken bij Stripe of je bijdrage is ontvangen.',
      paidTitle: 'Dankjewel voor je steun!',
      paid: 'Je bijdrage is ontvangen. Daarmee help je ons nieuwe kleurplaten te maken en de site reclamevrij te houden.',
      pendingTitle: 'Je betaling wordt nog verwerkt',
      pending: 'Stripe heeft de betaling nog niet bevestigd. Je hoeft niet opnieuw te betalen. Controleer de status over een paar minuten.',
      expiredTitle: 'Deze betaalpagina is verlopen',
      expired: 'Deze betaling is niet bevestigd. Wil je ons alsnog steunen? Dat kan via de website.',
      unknownTitle: 'We kunnen je betaling nu niet bevestigen',
      unknown: 'Dit betekent niet automatisch dat je betaling is mislukt. Controleer je betaaloverzicht voordat je opnieuw betaalt.',
      back: 'Terug naar de kleurplaten',
      retry: 'Status opnieuw controleren'
    },
    en: {
      opening: 'Opening the secure payment page…',
      error: 'Payment is temporarily unavailable. Please try again later.',
      cancelled: 'You cancelled the payment. No problem — coloring is still free.',
      returned: 'Welcome back. Your payment provider is processing your contribution. Thanks for wanting to support us!',
      checkingTitle: 'Checking your payment',
      checking: 'We are checking with Stripe whether your contribution has arrived.',
      paidTitle: 'Thank you for your support!',
      paid: 'We have received your contribution. It helps us make new coloring pages and keep the site ad-free.',
      pendingTitle: 'Your payment is still processing',
      pending: 'Stripe has not confirmed the payment yet. You do not need to pay again. Check the status in a few minutes.',
      expiredTitle: 'This payment page has expired',
      expired: 'This payment was not confirmed. You can return to the website if you would still like to support us.',
      unknownTitle: 'We cannot confirm your payment right now',
      unknown: 'This does not necessarily mean the payment failed. Check your payment statement before trying to pay again.',
      back: 'Back to the coloring pages',
      retry: 'Check status again'
    },
    fr: {
      opening: 'Ouverture de la page de paiement sécurisée…',
      error: 'Le paiement est temporairement indisponible. Réessayez plus tard.',
      cancelled: 'Vous avez annulé le paiement. Aucun souci — les coloriages restent gratuits.',
      returned: 'Bon retour ! Votre prestataire traite votre contribution. Merci de vouloir nous soutenir !',
      checkingTitle: 'Vérification de votre paiement',
      checking: 'Nous vérifions auprès de Stripe si votre contribution a été reçue.',
      paidTitle: 'Merci pour votre soutien !',
      paid: 'Votre contribution a bien été reçue. Elle nous aide à créer de nouveaux coloriages et à garder le site sans publicité.',
      pendingTitle: 'Votre paiement est en cours',
      pending: 'Stripe n’a pas encore confirmé le paiement. Ne payez pas à nouveau. Vérifiez le statut dans quelques minutes.',
      expiredTitle: 'Cette page de paiement a expiré',
      expired: 'Ce paiement n’a pas été confirmé. Vous pouvez retourner sur le site si vous souhaitez toujours nous soutenir.',
      unknownTitle: 'Impossible de confirmer votre paiement pour le moment',
      unknown: 'Cela ne signifie pas forcément que le paiement a échoué. Vérifiez votre relevé avant de payer à nouveau.',
      back: 'Retour aux coloriages',
      retry: 'Vérifier à nouveau'
    },
    es: {
      opening: 'Abriendo la página de pago segura…',
      error: 'El pago no está disponible en este momento. Inténtalo más tarde.',
      cancelled: 'Has cancelado el pago. No pasa nada — colorear sigue siendo gratis.',
      returned: '¡Bienvenido de nuevo! Tu proveedor está procesando la aportación. ¡Gracias por querer apoyarnos!',
      checkingTitle: 'Comprobando tu pago',
      checking: 'Estamos consultando con Stripe si hemos recibido tu aportación.',
      paidTitle: '¡Gracias por tu apoyo!',
      paid: 'Hemos recibido tu aportación. Nos ayuda a crear nuevos dibujos para colorear y a mantener la web sin anuncios.',
      pendingTitle: 'Tu pago sigue en proceso',
      pending: 'Stripe aún no ha confirmado el pago. No necesitas volver a pagar. Comprueba el estado en unos minutos.',
      expiredTitle: 'Esta página de pago ha caducado',
      expired: 'Este pago no se ha confirmado. Puedes volver a la web si todavía quieres apoyarnos.',
      unknownTitle: 'No podemos confirmar tu pago ahora',
      unknown: 'Esto no significa necesariamente que el pago haya fallado. Revisa tus movimientos antes de volver a pagar.',
      back: 'Volver a los dibujos para colorear',
      retry: 'Comprobar de nuevo'
    },
    zh: {
      opening: '正在打开安全支付页面……',
      error: '暂时无法支付，请稍后再试。',
      cancelled: '你已取消支付。没关系，涂色页仍然免费。',
      returned: '欢迎回来！支付服务商正在处理你的支持款项。感谢你愿意支持我们！',
      checkingTitle: '正在确认支付状态',
      checking: '我们正在向 Stripe 确认是否已收到你的支持款项。',
      paidTitle: '谢谢你的支持！',
      paid: '我们已收到你的支持款项。这将帮助我们创作新的涂色页，并让网站保持无广告。',
      pendingTitle: '支付仍在处理中',
      pending: 'Stripe 尚未确认支付，请不要重复付款。请过几分钟再次查看状态。',
      expiredTitle: '此支付页面已过期',
      expired: '这笔支付尚未确认。如果你仍想支持我们，可以返回网站。',
      unknownTitle: '暂时无法确认支付状态',
      unknown: '这不一定表示支付失败。再次付款前，请先查看你的支付记录。',
      back: '返回涂色页',
      retry: '再次查看状态'
    }
  };

  function safeCheckout(value) {
    try {
      var url = new URL(value);
      return url.protocol === 'https:' && !url.username && !url.password &&
        ['checkout.stripe.com', 'www.mollie.com', 'checkout.mollie.com'].indexOf(url.hostname) !== -1;
    } catch (_) { return false; }
  }

  function init() {
    var params = new URLSearchParams(window.location.search);
    var isReturn = !!document.getElementById('paymentStatus');
    var lang = (isReturn ? params.get('lang') || 'nl' : document.documentElement.lang || 'nl').split('-')[0];
    if (!Object.prototype.hasOwnProperty.call(translations, lang)) lang = 'nl';
    var text = translations[lang];

    if (isReturn) {
      document.documentElement.lang = lang;
      var sessionId = params.get('session_id') || '';
      // A tab-scoped, short-lived reference permits refresh/retry without
      // retaining the Checkout ID in the address or storing payer details.
      try {
        if (/^cs_(test|live)_[A-Za-z0-9]{10,200}$/.test(sessionId)) {
          window.sessionStorage.setItem('klc-support-return', JSON.stringify({
            id: sessionId, expires: Date.now() + 30 * 60 * 1000
          }));
        } else if (params.has('session_id')) {
          window.sessionStorage.removeItem('klc-support-return');
        } else {
          var saved = JSON.parse(window.sessionStorage.getItem('klc-support-return') || 'null');
          if (saved && saved.expires > Date.now() && /^cs_(test|live)_[A-Za-z0-9]{10,200}$/.test(saved.id)) {
            sessionId = saved.id;
          } else {
            window.sessionStorage.removeItem('klc-support-return');
          }
        }
      } catch (_) { /* Storage may be blocked; the original return URL still works. */ }
      // No analytics are loaded on the return page. Also remove the ID from its address.
      window.history.replaceState(null, '', '/support-return?lang=' + lang);
      var heading = document.getElementById('paymentTitle');
      var status = document.getElementById('paymentStatus');
      var retry = document.getElementById('paymentRetry');
      var back = document.getElementById('paymentBack');
      back.textContent = text.back;
      back.href = (lang === 'nl' ? '/' : '/' + lang) + '#steun-ons';
      retry.textContent = text.retry;
      async function checkStatus() {
        heading.textContent = text.checkingTitle;
        document.title = text.checkingTitle + ' | KidsLoveColor';
        status.textContent = text.checking;
        retry.hidden = true;
        var state = 'unknown';
        if (/^cs_(test|live)_[A-Za-z0-9]{10,200}$/.test(sessionId)) {
          try {
            var response = await fetch('/api/payment-status?session_id=' + encodeURIComponent(sessionId), {
              cache: 'no-store', referrerPolicy: 'no-referrer', signal: AbortSignal.timeout(15000)
            });
            var result = await response.json();
            if (response.ok && ['paid', 'pending', 'expired'].indexOf(result.status) !== -1) state = result.status;
          } catch (_) { /* Never infer success from just the return URL. */ }
        }
        heading.textContent = text[state + 'Title'];
        document.title = text[state + 'Title'] + ' | KidsLoveColor';
        status.textContent = text[state];
        retry.hidden = !sessionId || (state !== 'pending' && state !== 'unknown');
      }
      retry.addEventListener('click', checkStatus);
      checkStatus();
      return;
    }

    var buttons = document.querySelectorAll('[data-support]');
    var note = document.getElementById('supportNote');
    var requestIds = {};
    function say(message) {
      if (!note) return;
      note.classList.add('is-visible');
      note.textContent = message;
    }
    function setBusy(busy, selected) {
      buttons.forEach(function (button) {
        button.disabled = busy;
        button.setAttribute('aria-busy', busy && button === selected ? 'true' : 'false');
      });
    }
    if (params.get('donation') === 'thanks') say(text.returned);
    else if (params.get('donation') === 'cancelled') say(text.cancelled);
    window.addEventListener('pageshow', function (event) {
      if (event.persisted) { requestIds = {}; setBusy(false); }
    });
    buttons.forEach(function (button) {
      button.addEventListener('click', async function () {
        setBusy(true, button);
        say(text.opening);
        try {
          var support = button.dataset.support;
          if (!requestIds[support]) requestIds[support] = window.crypto.randomUUID();
          var response = await fetch('/api/create-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(20000),
            body: JSON.stringify({ support: support, lang: lang, requestId: requestIds[support] })
          });
          var result = await response.json();
          if (!response.ok || !safeCheckout(result.checkoutUrl)) throw new Error('checkout_failed');
          window.location.assign(result.checkoutUrl);
        } catch (_) {
          setBusy(false);
          say(text.error);
        }
      });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
