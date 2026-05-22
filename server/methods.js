// check, Match, and HTTP are globally available in Meteor.
// hashIdentifier and assertEmailVerifiedIfSignedIn come from
// server/lib/helpers.js, which loads before this file.

// B3.9: build a stable Message-ID + References pair so the initial
// admin notification and every status-change follow-up land in the same
// mail-client thread. We use a synthetic domain (no DNS lookup needed)
// that’s unique per job.
function jobMessageId(jobId) {
  return '<job-' + jobId + '@employed.co.mz>';
}

function adminEmailAddress() {
  return (Meteor.settings.private && Meteor.settings.private.adminEmail) ||
    'admin@employed.co.mz';
}

function htmlEscape(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// B3.9: invoked from `adminSetJobStatus` (both/lib/methods.js) on every
// transition. Threaded under the same Message-ID as the initial post
// notification so all moderation activity for a job sits in one thread.
// Exposed as a global so the both/lib method can reach it without an
// import (Meteor 2 still uses global pseudo-namespaces).
notifyAdminOfStatusChange = function (job, newStatus, reason, actorUserId) {
  if (!job || !job._id) return;
  var toEmail = adminEmailAddress();
  var jobUrl = Meteor.absoluteUrl('jobs/' + job._id);
  var subject = 'Job ' + newStatus + ' — ' + (job.title || job._id);

  var actor = actorUserId
    ? (Meteor.users.findOne(actorUserId, { fields: { 'profile.name': 1, 'emails.address': 1 } }) || {})
    : {};
  var actorName = (actor.profile && actor.profile.name) ||
    (actor.emails && actor.emails[0] && actor.emails[0].address) ||
    (actorUserId || 'admin');

  var textBody = [
    'Job "' + (job.title || job._id) + '" was set to: ' + newStatus,
    'By: ' + actorName,
    reason ? 'Reason: ' + reason : null,
    '',
    jobUrl
  ].filter(Boolean).join('\n');

  var htmlBody = '<p>Job <strong>' + htmlEscape(job.title || job._id) +
    '</strong> was set to <strong>' + htmlEscape(newStatus) + '</strong>.</p>' +
    '<p>By: ' + htmlEscape(actorName) + '</p>' +
    (reason ? '<p>Reason: ' + htmlEscape(reason) + '</p>' : '') +
    '<p><a href="' + htmlEscape(jobUrl) + '">Open job</a></p>';

  Email.send({
    to: toEmail,
    from: FROM_EMAIL,
    subject: subject,
    text: textBody,
    html: brandedEmail(htmlBody),
    headers: {
      'In-Reply-To': jobMessageId(job._id),
      'References': jobMessageId(job._id)
    }
  });
};

// p3-fix-013 / p3-fix-014: resolve the poster's locale so transactional
// mail goes out in the language of the market they posted in. Falls
// back to English when we cannot figure it out from the document.
function localeForJob(job) {
  try {
    if (job && job.country && typeof MARKETS === 'object') {
      var matchKey = _.find(_.keys(MARKETS), function(k) {
        return MARKETS[k].country === job.country;
      });
      if (matchKey) {
        var loc = MARKETS[matchKey].locale || 'en';
        // i18n.js exposes Translations buckets keyed by base lang only.
        var dash = loc.indexOf('-');
        if (dash > 0 && typeof Translations === 'object' && !Translations[loc]) {
          loc = loc.slice(0, dash);
        }
        return (typeof Translations === 'object' && Translations[loc]) ? loc : 'en';
      }
    }
  } catch (e) { /* ignore */ }
  return 'en';
}

function posterEmailFor(userId) {
  if (!userId) return null;
  var user = Meteor.users.findOne(userId, { fields: { emails: 1 } });
  if (!user || !user.emails || !user.emails.length) return null;
  return user.emails[0].address;
}

// p3-fix-012: tell the poster their job was received and is awaiting
// review. Threaded so subsequent status-change mails sit in the same
// conversation. Best-effort: SMTP failures are logged, never thrown.
notifyPosterOfSubmission = function (job, posterEmailOverride) {
  if (!job || !job._id) return;
  var email = posterEmailOverride || posterEmailFor(job.userId);
  if (!email) return;
  var loc = localeForJob(job);
  var jobUrl = Meteor.absoluteUrl('jobs/' + job._id);
  var subject = t('email.poster.submission.subject', { title: job.title || job._id }, loc);
  var textBody = t('email.poster.submission.text', {
    title: job.title || '',
    url: jobUrl
  }, loc);
  var htmlBody = t('email.poster.submission.html', {
    title: htmlEscape(job.title || ''),
    url: htmlEscape(jobUrl)
  }, loc);
  try {
    Email.send({
      to: email,
      from: FROM_EMAIL,
      subject: subject,
      text: textBody,
      html: brandedEmail(htmlBody),
      headers: {
        'In-Reply-To': jobMessageId(job._id),
        'References': jobMessageId(job._id)
      }
    });
  } catch (e) {
    log.error('notifyPosterOfSubmission.failed', { jobId: job._id, error: e && e.message });
  }
};

// p3-fix-012: tell the poster every time an admin flips their job's
// status. Subject + body are localised via the per-status t9n keys
// `email.poster.status.<status>.subject|text|html`.
notifyPosterOfStatusChange = function (job, newStatus, reason, actorUserId) {
  if (!job || !job._id) return;
  var email = posterEmailFor(job.userId);
  if (!email) return;
  // Do not double-notify if the actor IS the poster (e.g. owner
  // deactivating their own listing — they already saw a confirmation).
  if (actorUserId && actorUserId === job.userId) return;
  var loc = localeForJob(job);
  var jobUrl = Meteor.absoluteUrl('jobs/' + job._id);
  var statusKey = 'email.poster.status.' + newStatus;
  var subject = t(statusKey + '.subject', { title: job.title || job._id }, loc);
  var textBody = t(statusKey + '.text', {
    title: job.title || '',
    url: jobUrl,
    reason: reason || ''
  }, loc);
  var htmlBody = t(statusKey + '.html', {
    title: htmlEscape(job.title || ''),
    url: htmlEscape(jobUrl),
    reason: reason ? htmlEscape(reason) : ''
  }, loc);
  try {
    Email.send({
      to: email,
      from: FROM_EMAIL,
      subject: subject,
      text: textBody,
      html: brandedEmail(htmlBody),
      headers: {
        'In-Reply-To': jobMessageId(job._id),
        'References': jobMessageId(job._id)
      }
    });
  } catch (e) {
    log.error('notifyPosterOfStatusChange.failed', {
      jobId: job._id, status: newStatus, error: e && e.message
    });
  }
};

Meteor.methods({
  'jobs.create'(doc, recaptchaToken, marketKey) {
    // B2.13: derive market from the DDP connection's host (set by the
    // reverse proxy / browser). If the client also forwarded a marketKey,
    // require it to match — otherwise a malicious client could post under
    // the wrong country, bypassing subdomain partitioning.
    const hostMarket = marketFromConnection(this.connection);
    if (marketKey && marketKey !== hostMarket.key) {
      throw new Meteor.Error('market-mismatch',
        'Subdomain and market do not match.');
    }
    const market = hostMarket;

    doc.country = market.country;

    // S3: signed-in posters must verify their email first. Anonymous posts
    // still go through (gated by reCAPTCHA + rate limit).
    assertEmailVerifiedIfSignedIn(this.userId);

    // Validate input
    check(doc, {
      title: String,
      company: Match.Maybe(String),
      country: String,
      location: Match.Maybe(String),
      url: Match.Maybe(String),
      contact: String,
      jobtype: String,
      description: String,
      remote: Match.Maybe(Boolean),
      // A10.0 — optional WhatsApp apply number. Pattern is permissive on
      // purpose so posters can paste in any common format; the
      // collection schema enforces a stricter regex.
      applyWhatsApp: Match.Maybe(String)
    });

    // Development bypass - skip reCAPTCHA in development mode.
    // S7: the bypass flag lives in `public.recaptcha` only so the
    // server and the browser agree without having to re-read `private`.
    const isDevelopment = Meteor.isDevelopment;
    const bypassInDev = Meteor.settings.public?.recaptcha?.bypassInDevelopment;
    let recaptchaScore = null;

    if (isDevelopment && bypassInDev) {
      // A9.40 — emit once per Meteor.startup as a structured log so the
      // operator sees a single "bypass is active" event in dev logs, not
      // a noisy console.log per submission. The startup gate lives in
      // server/startup-checks.js (`startup.recaptcha_bypassed_in_dev`)
      // — here we deliberately stay silent on the per-call hot path.
      // Skip all reCAPTCHA verification in development
    } else {
      // Production path - require and verify reCAPTCHA

      // Check if reCAPTCHA is configured
      if (!Meteor.settings.private?.recaptcha?.v3SecretKey) {
        throw new Meteor.Error('config-missing',
          'reCAPTCHA is not configured. Please contact the administrator.');
      }

      // reCAPTCHA token is required in production
      check(recaptchaToken, String);

      // Verify reCAPTCHA token
      const verificationResult = verifyRecaptchaV3(recaptchaToken, this.connection.clientAddress);

      if (!verificationResult.success) {
        throw new Meteor.Error('recaptcha-failed',
          verificationResult.error || 'reCAPTCHA verification failed');
      }

      const scoreThreshold = Meteor.settings.private.recaptcha.scoreThreshold || 0.5;
      if (verificationResult.score < scoreThreshold) {
        // S12: never log raw client IPs or full reCAPTCHA payloads in
        // production. Hash the IP with a private salt so we can still
        // correlate repeat offenders without persisting PII.
        log.warn('recaptcha.low_score', {
          score: verificationResult.score,
          ipHash: hashIdentifier(this.connection.clientAddress)
        });
        throw new Meteor.Error('spam-detected',
          'Your submission was flagged as potential spam. Please try again or contact support.');
      }

      // S12: full debug payload is dev-only. Otherwise it ends up in
      // production logs alongside the entire job document.
      if (Meteor.isDevelopment) {
        log.debug('jobs.create.debug', {
          title: doc && doc.title,
          recaptchaScore: verificationResult && verificationResult.score,
          recaptchaAction: verificationResult && verificationResult.action
        });
      }

      recaptchaScore = verificationResult.score;

      // Add reCAPTCHA score to document
      // doc.recaptchaScore = verificationResult.score;
      // doc.recaptchaAction = verificationResult.action;
    }

    // Insert job using the Jobs collection schema which will handle autoValues
    const jobId = Jobs.insert(doc);

    // Send admin notification email
    // const admin = Users.findOne({ roles: "admin" });
    const job = Jobs.findOne(jobId);
    const adminEmail = (Meteor.settings.private && Meteor.settings.private.adminEmail) || 'admin@employed.co.mz';
    const host = this.connection && this.connection.httpHeaders && this.connection.httpHeaders.host;

    if (job) {
      // S12: the admin notification used to embed the entire
      // verificationResult JSON (incl. hostname and challenge_ts). Trim it
      // to just the score so the admin mailbox is not a PII sink.
      const adminExtraDetails = recaptchaScore == null
        ? ''
        : '\n\nreCAPTCHA score: ' + recaptchaScore;

      // B3.9: stable Message-ID + HTML body so every subsequent status
      // change (see notifyAdminOfStatusChange) threads under the same
      // conversation in the moderator’s mail client.
      const jobUrl = absoluteUrlForHost('jobs/' + job._id, host);
      const textBody = 'Job needs to be approved before it is live:\n\n' +
        jobUrl +
        '\n\nMarket: ' + market.key +
        '\n\nPosted by user: ' + (this.userId || '(anonymous)') +
        adminExtraDetails;
      const htmlBody = '<p>New job submitted on <strong>' + htmlEscape(market.key) +
        '</strong> and pending approval.</p>' +
        '<p><strong>Title:</strong> ' + htmlEscape(job.title) + '</p>' +
        '<p><strong>Posted by:</strong> ' + htmlEscape(this.userId || '(anonymous)') + '</p>' +
        (recaptchaScore == null
          ? ''
          : '<p><strong>reCAPTCHA score:</strong> ' + htmlEscape(recaptchaScore) + '</p>') +
        '<p><a href="' + htmlEscape(jobUrl) + '">Review job</a></p>';

      // B2.8: failed admin notification mail must NOT roll back the job
      // insert; the user already paid the latency cost and we have the
      // job in Mongo.
      try {
        Email.send({
          to: adminEmail,
          from: FROM_EMAIL,
          subject: "[" + market.key.toUpperCase() + "] New job pending review — " + job.title,
          text: textBody,
          html: brandedEmail(htmlBody),
          headers: {
            'Message-ID': jobMessageId(job._id)
          }
        });
      } catch (err) {
        log.error('jobs.create.admin_notification_email_failed', {
          jobId: job._id,
          error: err && err.message
        });
      }

      // p3-fix-012: confirmation email to the poster (if signed in &
      // we can find an address). Best-effort — failures never break
      // the job submission flow.
      if (this.userId && typeof notifyPosterOfSubmission === 'function') {
        try {
          notifyPosterOfSubmission(job);
        } catch (err) {
          log.error('jobs.create.poster_notification_email_failed', {
            jobId: job._id, error: err && err.message
          });
        }
      }
    }

    return jobId;
  },

  // S3: resend verification email for the currently signed-in user.
  // Exposed so the layout banner and user menu have something to call.
  'users.resendVerification'() {
    if (!this.userId) {
      throw new Meteor.Error('not-signed-in', 'You must be signed in.');
    }
    const user = Users.findOne(this.userId, { fields: { emails: 1 } });
    if (!user || !user.emails || !user.emails.length) {
      throw new Meteor.Error('no-email', 'No email address on file for this account.');
    }
    if (user.emails[0].verified) {
      return { alreadyVerified: true };
    }
    try {
      Accounts.sendVerificationEmail(this.userId);
      return { sent: true };
    } catch (e) {
      // Mail server might be misconfigured. Surface a generic error to
      // the client; log the real one server-side.
      log.error('users.resendVerification.send_failed', { error: e && e.message });
      throw new Meteor.Error('send-failed',
        'Could not send verification email right now. Please try again later.');
    }
  },

  // B2.7 + B2.2 + B2.3 + B2.4 + B2.6: create a Stripe Checkout Session
  // for the 30-day featured upgrade and return the redirect URL. All
  // money rules live here:
  //   - B2.4 only `pending` / `active` jobs (job.featuredAllowed()).
  //   - B2.2 paid days extend from `max(now, featuredThrough)` so a
  //          re-purchase before expiry doesn't burn the remaining days.
  //   - B2.3 Stripe `idempotencyKey` is bucketed per (job, user, minute)
  //          so a double-clicked button creates one session, not two,
  //          and the webhook's `$ne: session.id` guard handles replays.
  //   - B2.6 price + currency come from `marketFromConnection(...)`,
  //          not a USD global.
  // The actual featuredThrough mutation happens in the webhook
  // (server/stripe-webhook.js) when Stripe confirms payment.
  async 'featuredJob.checkout'(jobId) {
    check(jobId, String);

    if (!this.userId) {
      throw new Meteor.Error('not-signed-in',
        'You must be signed in to upgrade a job.');
    }
    assertEmailVerifiedIfSignedIn(this.userId);

    const job = Jobs.findOne({ _id: jobId });
    if (!job) {
      throw new Meteor.Error('not-found', 'Could not find job.');
    }
    if (job.userId !== this.userId) {
      throw new Meteor.Error('forbidden',
        'You can only pay for your own job post.');
    }
    if (!job.featuredAllowed()) {
      throw new Meteor.Error('not-allowed',
        'This job is not eligible to be featured (status: ' + job.status + ').');
    }

    if (!Stripe) {
      throw new Meteor.Error('stripe-not-configured',
        'Payments are temporarily unavailable. Please try again later.');
    }

    const market = marketFromConnection(this.connection);
    const price = (market && market.featuredJob) || {};
    if (!price.amount || !price.currency) {
      throw new Meteor.Error('price-not-configured',
        'Featured pricing is not configured for this market.');
    }

    // B2.2: extend from later of (now, current featuredThrough). Avoids
    // overwriting paid days that haven't elapsed yet.
    const now = new Date();
    const basis = (job.featuredThrough && job.featuredThrough > now)
      ? job.featuredThrough
      : now;
    const extendedThrough = moment(basis).add(30, 'days').toDate();

    const host = this.connection && this.connection.httpHeaders && this.connection.httpHeaders.host;
    const jobUrl = absoluteUrlForHost('jobs/' + job._id + '/' + job.slug(), host);

    const customerEmail = getUserEmail(Meteor.users.findOne(this.userId));

    // B2.3: 1-minute bucket. A user who clicks twice within a minute
    // gets the SAME Stripe session URL (idempotent), not two charges.
    const minuteBucket = Math.floor(Date.now() / 60000);
    const idempotencyKey = ['featured', job._id, this.userId, minuteBucket].join(':');

    let session;
    try {
      session = await Stripe.checkout.sessions.create({
        mode: 'payment',
        success_url: jobUrl + '?featured=success&session_id={CHECKOUT_SESSION_ID}',
        cancel_url: jobUrl + '?featured=cancel',
        customer_email: customerEmail || undefined,
        line_items: [{
          quantity: 1,
          price_data: {
            currency: price.currency,
            unit_amount: price.amount,
            product_data: {
              name: APP_NAME + ' \u2014 Featured Job Post (30 days)',
              description: job.title
            }
          }
        }],
        // Copy a few keys to the PaymentIntent metadata too so refund /
        // dispute webhooks (which carry a charge, not a session) can still
        // resolve back to the job.
        payment_intent_data: {
          metadata: {
            jobId: job._id,
            userId: this.userId
          }
        },
        metadata: {
          jobId: job._id,
          userId: this.userId,
          marketKey: market.key,
          extendedThrough: extendedThrough.toISOString()
        }
      }, {
        idempotencyKey: idempotencyKey
      });
    } catch (e) {
      log.error('featuredJob.checkout.stripe_error', { jobId: job._id, error: e && e.message });
      throw new Meteor.Error('stripe-error',
        'Could not create checkout session. Please try again.');
    }

    return { url: session.url, sessionId: session.id };
  },

  // A10.0 — multi-provider featured-job initiation. Generalizes
  // `featuredJob.checkout` so the same flow can target Stripe (returns
  // a redirect URL), M-Pesa Push (returns a providerRef to poll), or
  // e-Mola (same shape as M-Pesa). The legacy `featuredJob.checkout`
  // method is kept for backwards-compat — new UI calls this one.
  //
  // Returns: {
  //   intentId,                  // PaymentIntents._id, used for poll
  //   providerKey,
  //   kind: 'redirect' | 'await',
  //   url?,                       // when kind = redirect
  //   providerRef?,               // when kind = await
  //   prompt?                     // i18n key when kind = await
  // }
  async 'featuredJob.initiate'(jobId, providerKey, payerMsisdn) {
    check(jobId, String);
    check(providerKey, String);
    check(payerMsisdn, Match.Maybe(String));

    if (!this.userId) {
      throw new Meteor.Error('not-signed-in', 'You must be signed in to upgrade a job.');
    }
    assertEmailVerifiedIfSignedIn(this.userId);

    const job = Jobs.findOne({ _id: jobId });
    if (!job) throw new Meteor.Error('not-found', 'Could not find job.');
    if (job.userId !== this.userId) {
      throw new Meteor.Error('forbidden', 'You can only pay for your own job post.');
    }
    if (!job.featuredAllowed()) {
      throw new Meteor.Error('not-allowed',
        'This job is not eligible to be featured (status: ' + job.status + ').');
    }

    const market = marketFromConnection(this.connection);
    if (!Payments.isAvailable(providerKey, market.key)) {
      throw new Meteor.Error('payment-provider-unavailable',
        'That payment provider is not available in this market.');
    }

    const provider = Payments.get(providerKey);
    const price = (market && market.featuredJob) || {};
    if (!price.amount || !price.currency) {
      throw new Meteor.Error('price-not-configured',
        'Featured pricing is not configured for this market.');
    }

    // A10.0 — guard against accidental double-spend. If the user already
    // has a non-terminal intent for this job opened in the last 5 min,
    // return it instead of creating a parallel one. Mirrors the per-
    // minute Stripe idempotency bucket pattern.
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    const existing = PaymentIntents.findOne({
      jobId: jobId,
      userId: this.userId,
      status: { $in: ['pending', 'awaiting_user'] },
      createdAt: { $gte: fiveMinAgo }
    });
    if (existing && existing.providerKey === providerKey) {
      // Same provider — re-issue the same instructions.
      const samePrompt = (provider.ui && provider.ui.collect === 'redirect')
        ? { kind: 'redirect', url: (existing.meta || {}).stripeUrl }
        : { kind: 'await', providerRef: existing.providerRef };
      return Object.assign({
        intentId: existing._id,
        providerKey: providerKey
      }, samePrompt);
    }

    const now = new Date();
    const basis = (job.featuredThrough && job.featuredThrough > now)
      ? job.featuredThrough
      : now;
    const extendedThrough = moment(basis).add(30, 'days').toDate();

    const host = this.connection && this.connection.httpHeaders && this.connection.httpHeaders.host;
    const jobUrl = absoluteUrlForHost('jobs/' + job._id + '/' + job.slug(), host);
    const customerEmail = getUserEmail(Meteor.users.findOne(this.userId));

    const intentId = PaymentIntents.insert({
      jobId: job._id,
      userId: this.userId,
      marketKey: market.key,
      providerKey: providerKey,
      providerRef: null,
      status: 'pending',
      amount: price.amount,
      currency: price.currency,
      payerMsisdn: null,
      payerMsisdnHash: null,
      extendedThrough: extendedThrough,
      simulator: !!provider.simulator,
      meta: {},
      createdAt: now,
      updatedAt: now
    });

    let initResult;
    try {
      initResult = await provider.initiate({
        intentId: intentId,
        jobId: job._id,
        userId: this.userId,
        marketKey: market.key,
        amount: price.amount,
        currency: price.currency,
        payerMsisdn: payerMsisdn || null,
        jobTitle: job.title,
        customerEmail: customerEmail || null,
        returnUrl: jobUrl,
        cancelUrl: jobUrl,
        extendedThrough: extendedThrough
      });
    } catch (e) {
      PaymentIntents.update(intentId, {
        $set: {
          status: 'failed',
          failureReason: (e && e.error) || (e && e.message) || 'initiate_failed',
          settledAt: new Date(),
          updatedAt: new Date()
        }
      });
      log.error('featuredJob.initiate.provider_error', {
        intentId: intentId,
        providerKey: providerKey,
        error: e && e.message,
        code: e && e.error
      });
      // Re-throw so the client gets the original Meteor.Error code
      // (e.g. 'mpesa-invalid-msisdn') without the wrapper.
      throw e;
    }

    log.info('featuredJob.initiate.created', {
      intentId: intentId,
      jobId: job._id,
      providerKey: providerKey,
      kind: initResult.kind,
      simulator: !!provider.simulator
    });

    return Object.assign({
      intentId: intentId,
      providerKey: providerKey
    }, initResult);
  },

  // A10.0 — poll the status of a PaymentIntent the current user owns.
  // Client UI polls this every ~3 seconds while a mobile-money flow is
  // awaiting the PIN confirmation. Returns the intent's current state.
  'payment.status'(intentId) {
    check(intentId, String);
    if (!this.userId) {
      throw new Meteor.Error('not-signed-in', 'You must be signed in.');
    }
    const intent = PaymentIntents.findOne({ _id: intentId, userId: this.userId });
    if (!intent) {
      throw new Meteor.Error('not-found', 'Payment not found.');
    }
    return {
      intentId: intent._id,
      jobId: intent.jobId,
      providerKey: intent.providerKey,
      status: intent.status,
      failureReason: intent.failureReason || null,
      simulator: !!intent.simulator,
      settledAt: intent.settledAt || null,
      extendedThrough: intent.extendedThrough || null
    };
  },

  // A10.0 — list providers available in the caller's market. The client
  // uses this to render the checkout UI. Returns serializable shape (no
  // function refs).
  'payment.providersForMarket'() {
    const market = marketFromConnection(this.connection);
    return {
      marketKey: market.key,
      providers: Payments.snapshotForMarket(market.key)
    };
  },

  // A10.0 — allow a user to abandon a pending intent (e.g. they
  // typed the wrong MSISDN and want to start over without waiting for
  // the 30s simulator timeout). Idempotent: cancelling an already-terminal
  // intent is a no-op.
  'payment.cancel'(intentId) {
    check(intentId, String);
    if (!this.userId) {
      throw new Meteor.Error('not-signed-in', 'You must be signed in.');
    }
    const intent = PaymentIntents.findOne({ _id: intentId, userId: this.userId });
    if (!intent) throw new Meteor.Error('not-found', 'Payment not found.');
    if (intent.status !== 'pending' && intent.status !== 'awaiting_user') {
      return { status: intent.status };
    }
    const now = new Date();
    PaymentIntents.update(intent._id, {
      $set: {
        status: 'cancelled',
        failureReason: 'user_cancelled',
        settledAt: now,
        updatedAt: now
      }
    });
    log.info('payment.cancel', {
      intentId: intent._id,
      providerKey: intent.providerKey
    });
    return { status: 'cancelled' };
  },

  // A9.3 — schedule the signed-in user's account for permanent deletion
  // in 30 days. The cron in server/cron.js
  // ('Delete accounts past their scheduled removal date') is responsible
  // for the actual wipe; until then the account remains usable and the
  // user can rescind via 'users.cancelAccountDeletion'. Stamping the
  // dates on the user doc is intentionally idempotent — repeating the
  // call refreshes the deadline rather than throwing.
  'users.requestAccountDeletion'() {
    if (!this.userId) {
      throw new Meteor.Error('not-signed-in', 'You must be signed in.');
    }
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    const now = new Date();
    const scheduled = new Date(now.getTime() + THIRTY_DAYS_MS);
    Meteor.users.update(this.userId, {
      $set: {
        deletionRequestedAt: now,
        deletionScheduledFor: scheduled
      }
    });
    log.info('users.requestAccountDeletion', {
      userId: hashIdentifier(this.userId),
      scheduledFor: scheduled.toISOString()
    });
    return { scheduledFor: scheduled };
  },

  // A9.3 — let the user back out before the cron runs.
  'users.cancelAccountDeletion'() {
    if (!this.userId) {
      throw new Meteor.Error('not-signed-in', 'You must be signed in.');
    }
    Meteor.users.update(this.userId, {
      $unset: { deletionRequestedAt: '', deletionScheduledFor: '' }
    });
    log.info('users.cancelAccountDeletion', {
      userId: hashIdentifier(this.userId)
    });
    return { canceled: true };
  },

  // A9.3 — synchronous JSON export of the user's account record and
  // their jobs. Returns the payload directly to the caller; the
  // /api/me/export endpoint (server/api.js) wraps this method so
  // visitors get a downloadable file. Rate-limited in
  // server/rate-limits.js (5/hr/user).
  'users.exportData'() {
    if (!this.userId) {
      throw new Meteor.Error('not-signed-in', 'You must be signed in.');
    }
    const user = Meteor.users.findOne(this.userId, {
      fields: {
        username: 1, emails: 1, profile: 1, roles: 1,
        createdAt: 1, deletionRequestedAt: 1, deletionScheduledFor: 1,
        'services.facebook.id': 1, 'services.google.id': 1,
        'services.github.id': 1, 'services.twitter.id': 1
      }
    });
    if (!user) {
      throw new Meteor.Error('not-found', 'Account not found.');
    }
    const jobs = Jobs.find({ userId: this.userId }, {
      // statusHistory is included so the user can see when their jobs
      // were moderated. featuredChargeHistory is omitted because it
      // contains Stripe-internal session ids (the user can ask for them
      // via support if needed).
      fields: { featuredChargeHistory: 0 }
    }).fetch();
    return {
      generatedAt: new Date(),
      account: user,
      jobs: jobs
    };
  },

  // A9.26 — accept a community report of an offending job. Both signed-in
  // and anonymous reporters are allowed; rate limit (server/rate-limits.js)
  // caps abuse. We validate the jobId against Jobs so a report can't
  // reference a non-existent posting (which would clutter the admin queue
  // with no actionable evidence).
  'jobReports.create'(report) {
    check(report, {
      jobId: String,
      reason: String,
      details: Match.Maybe(String)
    });
    if (JOB_REPORT_REASONS.indexOf(report.reason) === -1) {
      throw new Meteor.Error('bad-reason', 'Invalid report reason.');
    }
    if (report.details && report.details.length > 2000) {
      throw new Meteor.Error('details-too-long', 'Report details are too long.');
    }

    const job = Jobs.findOne({ _id: report.jobId }, { fields: { _id: 1 } });
    if (!job) {
      throw new Meteor.Error('not-found', 'That job no longer exists.');
    }

    const ip = (this.connection && this.connection.clientAddress) || '';
    const doc = {
      jobId: report.jobId,
      reason: report.reason,
      details: report.details || undefined,
      reporterIpHash: ip ? hashIdentifier(ip) : undefined,
      reporterUserId: this.userId || undefined
    };
    JobReports.insert(doc);
    log.info('jobReports.create', { jobId: report.jobId, reason: report.reason });
    return { ok: true };
  },

  // A9.26 — admin closes a report. The admin chooses whether to also
  // flag/inactivate the job (handled separately via the existing
  // adminSetJobStatus method); this call only marks the report itself.
  'jobReports.resolve'(reportId, resolution) {
    if (!this.userId || !Roles.userIsInRole(this.userId, 'admin')) {
      throw new Meteor.Error('not-allowed', 'Admins only.');
    }
    check(reportId, String);
    check(resolution, String);
    if (JOB_REPORT_RESOLUTIONS.indexOf(resolution) === -1 || resolution === 'pending') {
      throw new Meteor.Error('bad-resolution', 'Invalid resolution.');
    }
    const updated = JobReports.update({ _id: reportId, resolution: 'pending' }, {
      $set: {
        resolution: resolution,
        resolvedBy: this.userId,
        resolvedAt: new Date()
      }
    });
    if (!updated) {
      throw new Meteor.Error('not-found-or-resolved',
        'Report was already resolved or does not exist.');
    }
    log.info('jobReports.resolve', {
      reportId: reportId,
      resolution: resolution,
      actor: hashIdentifier(this.userId)
    });
    return { ok: true };
  },

  // A9.36 — pagination total. The `jobs` publication ships only the
  // current page slice, so MiniMongo can no longer answer "how many
  // pages are there?". This method runs the same selector against
  // Mongo and returns just the count. Mirrors the publication's
  // selector exactly so page math is consistent. Rate-limited in
  // server/rate-limits.js.
  'jobs.count'(marketKey, filters) {
    check(marketKey, Match.Maybe(String));
    check(filters, Match.Maybe({
      query: Match.Maybe(String),
      jobtype: Match.Maybe(String),
      remote: Match.Maybe(Boolean),
      // Accepted but ignored — count is independent of which page
      // the caller wants. Keeping them in the check schema means the
      // client can pass its full filter snapshot without rebuilding.
      page: Match.Maybe(Match.Integer),
      pageSize: Match.Maybe(Match.Integer)
    }));

    const hostMarket = marketFromConnection(this.connection);
    const market = marketKey ? marketFromKey(marketKey) : hostMarket;
    // Defence in depth: a hand-crafted DDP call could pass any
    // marketKey. Refuse to count jobs from a market other than the
    // caller's own subdomain.
    if (market.key !== hostMarket.key) {
      throw new Meteor.Error('market-mismatch',
        'Subdomain and market do not match.');
    }

    const selector = {
      createdAt: { $gte: daysUntilExpiration() },
      status: 'active',
      country: market.country,
      // Same featured exclusion as the publication so the count
      // reflects exactly what the main grid shows (no off-by-N where
      // featured cards bumped the math).
      $or: [
        { featuredThrough: { $exists: false } },
        { featuredThrough: { $lt: new Date() } }
      ]
    };

    if (filters) {
      if (filters.query) {
        const q = String(filters.query).slice(0, 80).trim();
        if (q.length >= 2) {
          const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const rx = new RegExp(safe, 'i');
          selector.$and = [
            { $or: selector.$or },
            { $or: [{ title: rx }, { company: rx }, { location: rx }] }
          ];
          delete selector.$or;
        }
      }
      if (filters.jobtype && JOB_TYPES.indexOf(filters.jobtype) !== -1) {
        selector.jobtype = filters.jobtype;
      }
      if (filters.remote === true) {
        selector.remote = true;
      }
    }

    return Jobs.find(selector).count();
  }
});

// Helper function: Verify reCAPTCHA v3 token with Google
function verifyRecaptchaV3(token, remoteip) {
  try {
    const response = HTTP.post('https://www.google.com/recaptcha/api/siteverify', {
      params: {
        secret: Meteor.settings.private.recaptcha.v3SecretKey,
        response: token,
        remoteip: remoteip
      }
    });

    const data = response.data;

    // Check if verification was successful
    if (!data.success) {
      log.warn('recaptcha.verify_failed', { errorCodes: data['error-codes'] });
      return {
        success: false,
        error: 'Verification failed: ' + (data['error-codes'] || ['unknown']).join(', ')
      };
    }

    // Verify the action name matches what we expect
    if (data.action !== 'submit_job') {
      log.warn('recaptcha.action_mismatch', { action: data.action });
      return {
        success: false,
        error: 'Invalid action'
      };
    }

    return {
      success: true,
      score: data.score,
      action: data.action,
      challenge_ts: data.challenge_ts,
      hostname: data.hostname
    };

  } catch (error) {
    log.error('recaptcha.api_error', { error: error && error.message });
    return {
      success: false,
      error: 'Unable to verify reCAPTCHA'
    };
  }
}
