(function () {
  'use strict';

  const copy = {
    nl: { sending: 'Even versturen…', success: 'Dank je! Je bericht is veilig verstuurd.', error: 'Versturen lukt nu niet. Probeer het later opnieuw.', unavailable: 'Het contactformulier is heel even gesloten. Probeer het later opnieuw.' },
    en: { sending: 'Sending…', success: 'Thank you! Your message was sent securely.', error: 'We cannot send your message right now. Please try again later.', unavailable: 'The contact form is briefly closed. Please try again later.' },
    fr: { sending: 'Envoi…', success: 'Merci ! Votre message a été envoyé en toute sécurité.', error: 'Impossible d’envoyer votre message pour le moment. Réessayez plus tard.', unavailable: 'Le formulaire de contact est momentanément fermé. Réessayez plus tard.' },
    es: { sending: 'Enviando…', success: '¡Gracias! Tu mensaje se ha enviado de forma segura.', error: 'No podemos enviar tu mensaje ahora. Inténtalo de nuevo más tarde.', unavailable: 'El formulario de contacto está cerrado temporalmente. Inténtalo más tarde.' },
    zh: { sending: '正在发送…', success: '谢谢！您的消息已安全发送。', error: '暂时无法发送消息，请稍后再试。', unavailable: '联系表单暂时关闭，请稍后再试。' },
  };

  document.querySelectorAll('[data-contact-form]').forEach((form) => {
    const lang = form.dataset.lang || document.documentElement.lang?.slice(0, 2) || 'nl';
    const labels = copy[lang] || copy.nl;
    const availabilityStatus = form.querySelector('[data-contact-status]');
    const availabilityButton = form.querySelector('[type="submit"]');

    fetch('/api/send-message', { headers: { Accept: 'application/json' } })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data) => {
        if (!data.available) {
          if (availabilityButton) availabilityButton.disabled = true;
          if (availabilityStatus) availabilityStatus.textContent = labels.unavailable;
        }
      })
      .catch(() => {});

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;

      const button = form.querySelector('[type="submit"]');
      const status = form.querySelector('[data-contact-status]');
      const originalButtonText = button?.textContent;

      if (button) {
        button.disabled = true;
        button.textContent = labels.sending;
      }
      if (status) status.textContent = labels.sending;

      try {
        const response = await fetch('/api/send-message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'contact',
            name: form.elements.name.value.trim(),
            email: form.elements.email.value.trim(),
            subject: form.elements.subject.value.trim(),
            message: form.elements.message.value.trim(),
            website: form.elements.website?.value || '',
            source: window.location.href,
          }),
        });
        if (!response.ok) throw new Error('send failed');

        form.reset();
        if (status) status.textContent = labels.success;
        if (typeof window.gtag === 'function') window.gtag('event', 'contact_form_sent', { form_language: lang });
      } catch {
        if (status) status.textContent = labels.error;
      } finally {
        if (button) {
          button.disabled = false;
          button.textContent = originalButtonText;
        }
      }
    });
  });
})();
