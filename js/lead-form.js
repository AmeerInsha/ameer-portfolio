import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cfg = window.AMEER_SUPABASE || {};
if (!cfg.url || !cfg.publishableKey) {
  console.warn('Lead form: Supabase config missing.');
} else {
  const supabase = createClient(cfg.url, cfg.publishableKey);

  const modal = document.getElementById('service-request-modal');
  const form = document.getElementById('service-request-form');
  const status = document.getElementById('service-request-status');
  const submit = document.getElementById('service-request-submit');
  const serviceSelect = form?.elements?.service;
  let openedAt = 0;
  let lastFocus = null;

  function openModal(serviceName='') {
    if (!modal || !form) return;
    lastFocus = document.activeElement;
    modal.hidden = false;
    modal.setAttribute('aria-hidden','false');
    document.body.classList.add('service-modal-open');
    openedAt = Date.now();

    if (serviceName && serviceSelect) {
      const match = [...serviceSelect.options].find(o =>
        o.value.toLowerCase() === String(serviceName).trim().toLowerCase()
      );
      if (match) serviceSelect.value = match.value;
    }

    setTimeout(() => form.elements.name?.focus(), 30);
  }

  function closeModal() {
    if (!modal) return;
    modal.hidden = true;
    modal.setAttribute('aria-hidden','true');
    document.body.classList.remove('service-modal-open');
    status.textContent = '';
    status.className = 'service-request-status';
    if (lastFocus?.focus) lastFocus.focus();
  }

  document.addEventListener('click', event => {
    const close = event.target.closest('[data-close-service-request]');
    if (close) {
      event.preventDefault();
      closeModal();
      return;
    }

    const request = event.target.closest('.nav-service-cta');
    if (request) {
      event.preventDefault();
      openModal();
      return;
    }

    const serviceCard = event.target.closest('.service-card-final');
    if (serviceCard) {
      event.preventDefault();
      const serviceName = serviceCard.querySelector('h3')?.textContent || '';
      openModal(serviceName);
    }
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && modal && !modal.hidden) closeModal();
  });

  form?.addEventListener('submit', async event => {
    event.preventDefault();
    status.textContent = '';
    status.className = 'service-request-status';

    if (!form.reportValidity()) return;

    // Simple bot trap. Real database permissions still apply server-side via RLS.
    if (form.elements.website?.value) {
      closeModal();
      return;
    }

    // Avoid ultra-fast scripted submissions.
    if (Date.now() - openedAt < 900) {
      status.textContent = 'Please review the form before sending.';
      status.classList.add('error');
      return;
    }

    const payload = {
      name: form.elements.name.value.trim(),
      email: form.elements.email.value.trim(),
      company: form.elements.company.value.trim() || null,
      service: form.elements.service.value,
      message: form.elements.message.value.trim(),
      status: 'new'
    };

    submit.disabled = true;
    submit.textContent = 'Sending…';

    const { error } = await supabase.from('leads').insert(payload);

    submit.disabled = false;
    submit.textContent = 'Send Request';

    if (error) {
      console.error('Lead submit failed:', error);
      status.textContent = 'Could not send the request. Please use Email or WhatsApp instead.';
      status.classList.add('error');
      return;
    }

    form.reset();
    status.textContent = 'Request sent successfully. Ameer will receive it in the private admin inbox.';
    status.classList.add('success');

    setTimeout(closeModal, 2200);
  });
}
