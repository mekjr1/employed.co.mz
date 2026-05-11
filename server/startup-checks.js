// Server startup checks
Meteor.startup(() => {
  const privateRecaptchaSettings = Meteor.settings.private?.recaptcha || {};
  const publicRecaptchaSettings = Meteor.settings.public?.recaptcha || {};
  const bypassInDev = Meteor.isDevelopment && privateRecaptchaSettings.bypassInDevelopment;

  if (bypassInDev) {
    console.warn('reCAPTCHA bypassed in development mode');
    return;
  }

  // Check for required reCAPTCHA configuration
  if (!privateRecaptchaSettings.v3SecretKey) {
    console.error('');
    console.error('========================================');
    console.error('ERROR: reCAPTCHA v3 Secret Key is missing!');
    console.error('');
    console.error('Please add the following to your settings.json:');
    console.error('{');
    console.error('  "private": {');
    console.error('    "recaptcha": {');
    console.error('      "v3SecretKey": "YOUR_SECRET_KEY_HERE",');
    console.error('      "scoreThreshold": 0.5');
    console.error('    }');
    console.error('  }');
    console.error('}');
    console.error('========================================');
    console.error('');
    throw new Error('reCAPTCHA v3 Secret Key is required but not configured in settings.json');
  }

  if (!publicRecaptchaSettings.v3SiteKey) {
    console.error('');
    console.error('========================================');
    console.error('ERROR: reCAPTCHA v3 Site Key is missing!');
    console.error('');
    console.error('Please add the following to your settings.json:');
    console.error('{');
    console.error('  "public": {');
    console.error('    "recaptcha": {');
    console.error('      "v3SiteKey": "YOUR_SITE_KEY_HERE"');
    console.error('    }');
    console.error('  }');
    console.error('}');
    console.error('========================================');
    console.error('');
    throw new Error('reCAPTCHA v3 Site Key is required but not configured in settings.json');
  }

  // Log successful configuration
  console.log('reCAPTCHA v3 configured successfully');
  console.log('  - Score threshold:', privateRecaptchaSettings.scoreThreshold || 0.5);
});
