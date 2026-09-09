// login.js — submits reales de login/registro/olvidé-mi-contraseña contra
// lowloot-server, y el cambio entre las 3 sub-vistas del modal.
// Depende de api-client.js, session.js, state.js, topbar.js (openLoginModal).

function setLoginView(view) {
  ['login', 'register', 'forgot'].forEach((name) => {
    const el = document.getElementById(`login-view-${name}`);
    if (el) el.hidden = name !== view;
  });
  hideAllLoginErrors();
}

function hideAllLoginErrors() {
  ['login-error', 'register-error', 'forgot-error'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.hidden = true;
      el.textContent = '';
    }
  });
}

function showLoginError(id, message) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = message;
  el.hidden = false;
}

function setSubmitBusy(form, busy) {
  const btn = form.querySelector('button[type="submit"]');
  if (!btn) return;
  btn.disabled = busy;
  if (busy && !btn.dataset.originalLabel) btn.dataset.originalLabel = btn.textContent;
  btn.textContent = busy ? 'Espera…' : btn.dataset.originalLabel || btn.textContent;
}

function initAuthForms() {
  // Cambio entre login / registro / olvidé-mi-contraseña dentro del modal.
  document.body.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-login-view]');
    if (btn) setLoginView(btn.dataset.loginView);
  });

  /* ---------- Iniciar sesión ---------- */

  const loginForm = document.getElementById('login-form');
  loginForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    hideAllLoginErrors();

    const email = qs('#login-email').value.trim();
    const password = qs('#login-password').value;
    const remember = qs('#login-remember').checked;

    setSubmitBusy(loginForm, true);
    try {
      const auth = await LowlootAPI.login(email, password);
      await onAuthSuccess(auth, remember);
      loginForm.reset();
      qs('#login-remember').checked = true;
      closeLoginModal();
      showToast(`¡Hola, ${auth.username}!`);
    } catch (err) {
      showLoginError('login-error', err.message || 'No se pudo iniciar sesión');
    } finally {
      setSubmitBusy(loginForm, false);
    }
  });

  /* ---------- Crear cuenta ---------- */

  const registerForm = document.getElementById('register-form');
  registerForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    hideAllLoginErrors();

    const username = qs('#register-username').value.trim();
    const email = qs('#register-email').value.trim();
    const password = qs('#register-password').value;

    setSubmitBusy(registerForm, true);
    try {
      // El registro público siempre crea la cuenta como USER; no hay
      // ningún campo de rol en este formulario ni en la petición.
      const auth = await LowlootAPI.register(username, email, password);
      await onAuthSuccess(auth, true);
      registerForm.reset();
      closeLoginModal();
      showToast(`¡Cuenta creada! Bienvenido, ${auth.username}.`);
    } catch (err) {
      showLoginError('register-error', err.message || 'No se pudo crear la cuenta');
    } finally {
      setSubmitBusy(registerForm, false);
    }
  });

  /* ---------- Olvidé mi contraseña (versión escolar: cambio directo) ---------- */

  const forgotForm = document.getElementById('forgot-form');
  forgotForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    hideAllLoginErrors();

    const email = qs('#forgot-email').value.trim();
    const newPassword = qs('#forgot-password').value;

    setSubmitBusy(forgotForm, true);
    try {
      await LowlootAPI.changePassword(email, newPassword);
      forgotForm.reset();
      setLoginView('login');
      qs('#login-email').value = email;
      showToast('Contraseña actualizada, ya podés iniciar sesión');
    } catch (err) {
      showLoginError('forgot-error', err.message || 'No se pudo cambiar la contraseña');
    } finally {
      setSubmitBusy(forgotForm, false);
    }
  });
}
