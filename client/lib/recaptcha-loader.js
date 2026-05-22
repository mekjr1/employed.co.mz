// B1.6: load reCAPTCHA v3 lazily and only on the pages that actually
// need it (currently just `jobNew`). Earlier this ran on Meteor.startup
// which dragged the script onto every page, including jobs the visitor
// never submits.
var recaptchaLoadPromise = null;

function recaptchaBypassedInDev() {
  // S7: a single source of truth for the dev-bypass flag (`public.recaptcha.bypassInDevelopment`).
  return Meteor.isDevelopment && Meteor.settings.public &&
    Meteor.settings.public.recaptcha &&
    Meteor.settings.public.recaptcha.bypassInDevelopment === true;
}

loadRecaptcha = function() {
  if (recaptchaBypassedInDev()) {
    return Promise.resolve('bypass');
  }
  if (recaptchaLoadPromise) {
    return recaptchaLoadPromise;
  }

  var siteKey = Meteor.settings.public &&
    Meteor.settings.public.recaptcha &&
    Meteor.settings.public.recaptcha.v3SiteKey;
  if (!siteKey) {
    console.warn('reCAPTCHA site key not configured.');
    recaptchaLoadPromise = Promise.reject(new Error('reCAPTCHA not configured'));
    return recaptchaLoadPromise;
  }

  recaptchaLoadPromise = new Promise(function(resolve, reject) {
    var script = document.createElement('script');
    script.src = 'https://www.google.com/recaptcha/api.js?render=' + encodeURIComponent(siteKey);
    script.async = true;
    script.defer = true;
    script.onload = function() { resolve('loaded'); };
    script.onerror = function(error) {
      console.error('reCAPTCHA script failed to load.', error);
      // Allow a future retry by clearing the cached rejection.
      recaptchaLoadPromise = null;
      reject(error);
    };
    document.head.appendChild(script);
  });

  return recaptchaLoadPromise;
};

getRecaptchaToken = function(action) {
  action = action || 'submit_job';
  if (recaptchaBypassedInDev()) {
    return Promise.resolve('development-bypass');
  }

  var siteKey = Meteor.settings.public &&
    Meteor.settings.public.recaptcha &&
    Meteor.settings.public.recaptcha.v3SiteKey;
  if (!siteKey) {
    return Promise.reject(new Error('reCAPTCHA not configured'));
  }

  return loadRecaptcha().then(function() {
    return new Promise(function(resolve, reject) {
      if (typeof grecaptcha === 'undefined') {
        reject(new Error('reCAPTCHA not loaded'));
        return;
      }
      grecaptcha.ready(function() {
        grecaptcha.execute(siteKey, { action: action })
          .then(resolve)
          .catch(reject);
      });
    });
  });
};

// Backwards compatibility for anything that read these from `window`.
if (typeof window !== 'undefined') {
  window.loadRecaptcha = loadRecaptcha;
  window.getRecaptchaToken = getRecaptchaToken;
}
