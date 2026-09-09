const form = document.querySelector('[data-contact-form]');

if (form) {
  const status = form.querySelector('[data-form-status]');
  const endpoint = 'https://mtgsteiypoxudztltzpn.supabase.co/rest/v1/portfolio_contact_messages';
  const publishableKey = 'sb_publishable_q2fe-uWuY3uadJnsvsVWVQ_6enkHJB5';
  const startedAt = Date.now();

  const stripControls = (value = '') => value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
  const cleanLine = (value = '') => stripControls(value).replace(/[\r\n]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
  const cleanMessage = (value = '') => stripControls(value).replace(/\r\n?/g, '\n').trim();

  function setStatus(message, type = '') {
    status.replaceChildren();
    status.className = `form-status${type ? ` ${type}` : ''}`;
    status.textContent = message;
  }

  function setFallbackStatus() {
    status.replaceChildren();
    status.className = 'form-status error';
    status.append('Could not send right now. Email ');
    const link = document.createElement('a');
    link.href = 'mailto:prathameshdhumal28@gmail.com';
    link.textContent = 'prathameshdhumal28@gmail.com';
    status.append(link, '.');
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    // Basic bot trap. A real user never sees or fills this field.
    if (form.elements.website?.value) return;

    if (!form.checkValidity()) {
      form.reportValidity();
      setStatus('Please complete the required fields correctly.', 'error');
      return;
    }

    if (Date.now() - startedAt < 2500) {
      setStatus('Please take a moment to review your message before sending.', 'error');
      return;
    }

    const button = form.querySelector('button[type="submit"]');
    if (button.disabled) return;

    const data = Object.fromEntries(new FormData(form).entries());
    const payload = {
      name: cleanLine(data.name).slice(0, 80),
      email: cleanLine(data.email).toLowerCase().slice(0, 160),
      subject: cleanLine(data.subject).slice(0, 140),
      message: cleanMessage(data.message).slice(0, 3000),
      project_type: cleanLine(data.project_type).slice(0, 80) || null,
      budget: cleanLine(data.budget).slice(0, 80) || null
    };

    // Re-check after normalization so only useful data reaches the backend.
    if (payload.name.length < 2 || payload.subject.length < 2 || payload.message.length < 10 || !payload.email.includes('@')) {
      setStatus('Please review the form fields before sending.', 'error');
      return;
    }

    button.disabled = true;
    const oldLabel = button.textContent;
    button.textContent = 'Sending…';
    setStatus('Sending your inquiry…');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'apikey': publishableKey,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      if (!response.ok) throw new Error(`Contact request failed with HTTP ${response.status}`);

      form.reset();
      setStatus('Message received. It is now in the portfolio inbox.', 'success');
    } catch (error) {
      console.error('Contact form submission failed.', error);
      setFallbackStatus();
    } finally {
      clearTimeout(timeout);
      button.disabled = false;
      button.textContent = oldLabel;
    }
  });
}
