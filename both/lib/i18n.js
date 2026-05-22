// T8 — minimal in-repo i18n shim. Lives in both/lib/ so server code
// (email templates, system status reasons, …) can call the same `t()`
// from the future. Today it's used only by Blaze on the client.
//
// Design choices:
//   * No npm dependency. Translations live as plain JS objects keyed
//     by stable dotted identifiers (e.g. `home.cta.browse_jobs`).
//   * Locale resolution priority: explicit Session('locale') override,
//     then the current subdomain's `market.locale`, then 'en'.
//   * `t(key, vars)` accepts {{varname}} placeholders. Missing keys
//     fall back to the English bucket, then return the key itself so
//     a translator can spot it.
//   * On the client, `Session.set('locale', 'pt')` is reactive — Blaze
//     re-renders any `{{t '…'}}` automatically because the helper reads
//     `Session.get('locale')`.
//
// Adding a new language:
//   1. Append a key to `LOCALES`.
//   2. Add the full bucket to `Translations`.
//   3. Optionally set `MARKETS.<key>.locale` so a subdomain defaults to it.

LOCALES = ['en', 'es', 'pt'];

LOCALE_LABELS = {
  en: 'English',
  es: 'Español',
  pt: 'Português'
};

Translations = {
  // ============================== English ==============================
  en: {
    // Generic actions / labels
    'action.cancel': 'Cancel',
    'action.update': 'Update',
    'action.edit': 'Edit',
    'action.delete': 'Delete',
    'action.save': 'Save',
    'action.continue': 'Continue',
    'action.sign_in': 'Log In',
    'action.sign_up': 'Sign Up',
    'action.sign_out': 'Sign Out',
    'action.send': 'Send',
    'action.load_more': 'Load more',
    'action.apply': 'Apply',

    // Header / nav
    'nav.toggle': 'Toggle navigation',
    'nav.all_jobs': 'All Jobs',
    'nav.post_a_job': 'Post a Job',
    'nav.my_posted_jobs': 'My Posted Jobs',
    'nav.resend_verification': 'Resend verification email',
    'nav.admin_jobs': 'Admin Jobs',
    'nav.user_profile': 'User Profile',
    'nav.language': 'Language',

    // Verify-email banner
    'verify.email_unverified': 'Your email address ({{email}}) is not verified.',
    'verify.resend_link': 'Resend verification email',
    'verify.sending': 'Sending…',
    'verify.sent': 'sent.',
    'verify.already_verified': 'already verified.',
    'verify.could_not_send': 'Could not send verification email.',

    // Home
    'home.intro': 'Browse active roles or post an opportunity for candidates in this market.',
    'home.cta.browse_jobs': 'Browse Jobs',
    'home.cta.post_a_job': 'Post a Job',

    // Recent jobs section / jobs list
    'jobs.recent_title': 'Recent Jobs',
    'jobs.last_post_about': 'Last post about {{when}}',
    'jobs.view_all': 'View All Jobs',
    'jobs.list_title': '{{site}} Jobs',
    'jobs.none_found': 'No active jobs found.',
    'jobs.filter.aria': 'Filter jobs',
    'jobs.filter.query': 'Search',
    'jobs.filter.query_placeholder': 'Search by title, company, or location…',
    'jobs.filter.type': 'Job type',
    'jobs.filter.type_any': 'All types',
    'jobs.filter.remote_only': 'Remote only',
    'jobs.filter.clear': 'Clear filters',
    'jobs.label.featured': 'Featured',
    'jobs.label.remote': 'Remote',
    'jobs.label.expired': 'Expired',
    'jobs.posted_on': 'Posted on {{date}}',
    'jobs.featured_until': 'Featured until {{date}}',
    'jobs.salary.per.hour': 'hour',
    'jobs.salary.per.day': 'day',
    'jobs.salary.per.week': 'week',
    'jobs.salary.per.month': 'month',
    'jobs.salary.per.year': 'year',
    // A9.36 — one-row "Featured jobs" strip + paginated /jobs grid.
    'jobs.featured_strip_label': 'Featured',
    'jobs.featured_strip_subtitle': 'A fresh pick of paid listings.',
    'jobs.pagination.page_size_label': 'Per page',
    'jobs.pagination.previous': 'Previous',
    'jobs.pagination.next': 'Next',
    'jobs.pagination.page_of': 'Page {{page}} of {{total}}',
    'jobs.pagination.showing': 'Showing {{from}}–{{to}} of {{total}}',
    'jobs.ad_inline.label': 'Sponsored',

    // Single job view
    'job.deactivate': 'Deactivate',
    'job.report': 'Report this job',
    'job.report.prompt_message': 'Tell us why this job is a problem. Choose a reason: spam, scam, discriminatory, wrong_country, expired_or_filled, duplicate.',
    'job.report.reason_placeholder': 'spam',
    'job.report.error': 'Could not submit your report. Try again later.',
    'job.report.thanks': 'Thanks. An admin will review this report.',
    'job.expired_uh_oh': 'Uh oh!',
    'job.expired_body': 'This job post expired.',
    'job.status_pending': 'This post is awaiting admin approval. It will be reviewed shortly and then become live on the site.',
    'job.status_flagged': 'This post has been flagged for content. Contact an admin if you believe this is in error.',
    'job.status_inactive': 'This job post has been deactivated.',
    'job.status_filled': 'This job post has been filled.',
    'job.featured.title': 'Upgrade to a Featured Job Post',
    'job.featured.bullet1': 'Guaranteed to stay on home page',
    'job.featured.bullet2': 'Highlighted job listing display',
    'job.featured.bullet3': 'Priority placement in jobs listing',
    'job.featured.buy_cta': 'Buy 30 Days for {{price}}',

    // A10.0 — multi-provider checkout strings
    'checkout.pick_provider': 'Choose how you would like to pay:',
    'checkout.no_providers': 'No payment providers are configured for this market yet.',
    'checkout.simulator_tag': 'Simulator',
    'checkout.provider.stripe': 'Pay with card (Stripe)',
    'checkout.provider.mpesa': 'Pay with M-Pesa',
    'checkout.provider.emola': 'Pay with e-Mola',
    'checkout.msisdn.label': 'Your mobile number',
    'checkout.msisdn.hint.mpesa': 'Enter the Vodacom number registered with M-Pesa. You will receive a PIN prompt on your phone.',
    'checkout.msisdn.hint.emola': 'Enter the Movitel number registered with e-Mola. You will receive a PIN prompt on your phone.',
    'checkout.msisdn.placeholder.mpesa': '84 1234567',
    'checkout.msisdn.placeholder.emola': '86 1234567',
    'checkout.msisdn.invalid': 'Please enter a valid 9-digit mobile number.',
    'checkout.send_prompt': 'Send PIN prompt',
    'checkout.awaiting.title.mpesa': 'Check your phone for the M-Pesa prompt',
    'checkout.awaiting.title.emola': 'Check your phone for the e-Mola prompt',
    'checkout.awaiting.detail': 'Enter your PIN on the phone to confirm payment. This page will update automatically.',
    'checkout.cancel_attempt': 'Cancel this attempt',
    'checkout.redirecting': 'Redirecting to secure payment page…',
    'checkout.success.title': 'Payment received',
    'checkout.success.detail': 'Your job will appear as Featured within a few seconds.',
    'checkout.failure.title': 'Payment did not complete',
    'checkout.failure.reason.unknown': 'Something went wrong. Please try again.',
    'checkout.failure.reason.insufficient_funds': 'The mobile money account does not have enough balance.',
    'checkout.failure.reason.user_timeout': 'No PIN was entered in time. Please try again.',
    'checkout.failure.reason.wrong_pin': 'Incorrect PIN. Please try again.',
    'checkout.failure.reason.user_cancelled': 'You cancelled the payment.',
    'checkout.failure.reason.client_poll_timeout': 'We didn\'t hear back from the provider. If your phone shows the payment was charged, please contact support.',
    'checkout.failure.reason.initiate_failed': 'We could not start the payment. Please try again.',
    'checkout.failure.reason.mpesa-invalid-msisdn': 'Please enter a valid Vodacom (M-Pesa) number.',
    'checkout.failure.reason.emola-invalid-msisdn': 'Please enter a valid Movitel (e-Mola) number.',
    'checkout.try_again': 'Try again',
    'action.back': 'Back',
    'modal.close': 'Close',

    // A10.0 — PWA install prompt banner.
    'pwa.install.title': 'Install Employed',
    'pwa.install.detail': 'Add Employed to your home screen for faster access and a cleaner browsing experience.',
    'pwa.install.cta': 'Install',
    'pwa.install.dismiss': 'Not now',

    // A10.0 — WhatsApp apply.
    'job.apply_whatsapp': 'Apply on WhatsApp',
    'job.apply_whatsapp.message': 'Hi! I\'m interested in the {{title}} role at {{company}}. Could we chat?',
    'job.apply_whatsapp.label': 'WhatsApp apply number',
    'job.apply_whatsapp.hint': 'Optional. Candidates will be able to message you directly via WhatsApp. Include country code (e.g. +258 84 1234567).',

    // Job form (new + edit)
    'form.intro_market': 'Post roles for candidates in this market.',
    'form.policy.line1': 'Jobs are free to post.',
    'form.policy.line2': 'Your job post will remain on this site for 90 days. After 90 days the post will no longer appear to visitors.',
    'form.policy.line3': 'You can feature your job post on the home page for 30 days after creating your post.',
    'form.panel.create_title': 'Create Your Job Post',
    'form.panel.edit_title': 'Edit Job Post',
    'form.submit.preview': 'Continue to preview your post',
    'form.placeholder.title': 'Title displayed for your listing',
    'form.placeholder.job_type': '(Select a Job Type)',
    'form.placeholder.company': 'Name of the hiring company',
    'form.placeholder.description': 'Tell candidates about the role, requirements, salary range, work arrangement, and hiring process.',
    'form.placeholder.url': 'External URL of job posting',
    'form.placeholder.contact': 'Email, phone, or hiring contact to display on the listing',
    'form.recaptcha.notice': 'This site is protected by reCAPTCHA and the Google {{privacy}} and {{terms}} apply.',
    'form.recaptcha.privacy': 'Privacy Policy',
    'form.recaptcha.terms': 'Terms of Service',

    // Deactivate modal
    'deactivate.title': 'What would you like to do with this listing?',
    'deactivate.body': 'Use Position Filled or Other Reasons to keep the listing in your history, or Delete permanently to remove it from the database.',
    'deactivate.position_filled': 'Position Filled',
    'deactivate.other_reasons': 'Other Reasons',
    'deactivate.delete_permanent': 'Delete permanently',

    // My jobs
    'mine.title': 'My Posted Jobs',
    'mine.empty.prefix': "You haven't posted any jobs.",
    'mine.empty.cta': 'Post a Job',
    'mine.empty.suffix': 'if you have one to offer.',

    // Not found
    'notfound.title': "Oops, we couldn't find the item that belongs to this URL.",
    'notfound.body': 'It may have been deleted by the owner or removed by admins.',
    'notfound.back': 'Back to all jobs',
    'app.loading': 'Loading…',

    // Footer
    'footer.disclaimer': 'Employed is an independent localized jobs marketplace.',
    'footer.rss_label': 'RSS',
    'footer.json_label': 'JSON',
    'footer.jobs': 'Jobs',

    // A9.33 — Ads (Phase 0 mock-mode placeholder).
    'ads.label': 'Advertisement',
    'ads.mock.title': 'Your ad here',
    'ads.mock.subtitle': 'Reach local job seekers. Email ads@employed.co.mz to sponsor this slot.',
    'ads.mock.cta': 'Boost your listing →',

    // Admin moderation
    'admin.title': 'Job Moderation',
    'admin.subtitle': 'Review submitted jobs and update their publication status.',
    'admin.select_all_on_page': 'Select all on this page',
    'admin.selected_count': '{{n}} selected',
    'admin.bulk_set_status': 'Bulk set status…',
    'admin.apply_to_selected': 'Apply to selected',
    'admin.no_jobs_in_view': 'No jobs found in this view.',
    'admin.access_required': 'Admin access is required.',
    'admin.admins.section': 'Admins',
    'admin.admins.col.name': 'Name',
    'admin.admins.col.email': 'Email',
    'admin.admins.col.created': 'Created',
    'admin.admins.none_other': 'No other admins on file.',
    'admin.admins.revoke': 'Revoke admin',
    'admin.admins.grant': 'Grant admin',
    'admin.admins.id_placeholder': 'User _id…',
    'admin.admins.help': "Paste a user's Mongo `_id`. The very first admin must still be promoted in the database or via `server/dev-accounts.js`.",
    'admin.reports.heading': 'Reported jobs',
    'admin.reports.empty': 'No pending reports.',
    'admin.reports.col.when': 'Reported',
    'admin.reports.col.job': 'Job',
    'admin.reports.col.reason': 'Reason',
    'admin.reports.col.details': 'Details',
    'admin.reports.col.actions': 'Actions',
    'admin.reports.action.dismiss': 'Dismiss',
    'admin.reports.action.removed': 'Job removed',
    'admin.reports.action.reviewed': 'Reviewed',
    'admin.reports.job_missing': 'Job no longer exists',
    'admin.reports.resolve_title': 'Resolve report',
    'admin.reports.resolve_message': 'Mark this report as {{resolution}}?',
    'admin.reports.reason.spam': 'Spam',
    'admin.reports.reason.scam': 'Scam',
    'admin.reports.reason.discriminatory': 'Discriminatory',
    'admin.reports.reason.wrong_country': 'Wrong country',
    'admin.reports.reason.expired_or_filled': 'Expired or filled',
    'admin.reports.reason.duplicate': 'Duplicate',
    'admin.status.current': 'Current status is',
    'admin.status.set_to': 'Set status to',
    'admin.moderation_history': 'Moderation history',
    'admin.col.when': 'When',
    'admin.col.from': 'From',
    'admin.col.to': 'To',
    'admin.col.by': 'By',
    'admin.col.reason': 'Reason',

    // SEO defaults
    'seo.default.title': 'Employed — local jobs, local hiring.',
    'seo.default.description': 'Employed is a localized job board for local, remote, contract, and full-time roles.',
    'seo.home.title': '{{site}} — local jobs, local hiring.',
    'seo.home.description': 'Browse local job opportunities in {{country}} on {{site}}, or post a role to reach local candidates.',
    'seo.jobs.title': '{{site}} — All Jobs',
    'seo.jobs.description': 'All active local job listings on {{site}}.',
    'seo.job.title': '{{title}} at {{company}} | {{site}}',
    'seo.job.description': 'Apply for {{title}} at {{company}} via {{site}}.',
    'seo.jobNew.title': '{{site}} — Post a Job',
    'seo.jobNew.description': 'Post a job opening on {{site}} and reach local candidates in {{country}}.',
    'seo.legalPrivacy.title': '{{site}} — Privacy Policy',
    'seo.legalPrivacy.description': 'How {{site}} collects, stores, and processes your data.',
    'seo.legalTerms.title': '{{site}} — Terms of Service',
    'seo.legalTerms.description': 'Rules of use and payment terms for {{site}}.',
    'seo.userAccount.title': '{{site}} — Account',
    'seo.userAccount.description': 'Manage your account, export your data, or delete your profile.',

    // A9.21 — status enum labels. Mapped via the {{statusLabel s}} Blaze
    // helper so admin tables, job badges, and dashboards stay in sync.
    'status.pending': 'Pending review',
    'status.active': 'Active',
    'status.flagged': 'Flagged',
    'status.inactive': 'Inactive',
    'status.filled': 'Position filled',
    'status.all': 'All',

    // A9.20 — AutoForm field labels. SimpleSchema reads `label` as a
    // function when one is supplied, so we wire the field labels to t()
    // and templates re-render when locale changes.
    'jobs.field.title': 'Title',
    'jobs.field.company': 'Company',
    'jobs.field.jobtype': 'Job Type',
    'jobs.field.location': 'Location',
    'jobs.field.remote': 'Remote',
    'jobs.field.url': 'Application URL',
    'jobs.field.contact': 'Contact',
    'jobs.field.description': 'Description',
    'jobs.field.salary_min': 'Salary (minimum)',
    'jobs.field.salary_max': 'Salary (maximum)',
    'jobs.field.salary_currency': 'Salary currency',
    'jobs.field.salary_period': 'Salary period',
    'jobs.field.country': 'Country',
    'jobs.field.status': 'Status',

    // A9.30 — inline form error region. Replaces the old alert() popups
    // on the new/edit job form. Aria-live="polite" so screen readers
    // announce without interrupting.
    'jobs.form.error.generic': 'Could not save the job post. Please try again.',
    'jobs.form.error.recaptcha': 'Could not verify your browser. Please reload and try again.',
    'jobs.form.error.recaptcha_unavailable': 'Spam protection is temporarily unavailable. Please try again in a moment.',
    'jobs.form.error.network': 'Network error. Check your connection and try again.',

    // A9.19 — admin and deactivate confirmation modal strings. The old UI
    // used native confirm()/prompt() which can't be styled, internationalised,
    // or screen-reader-traversed reliably.
    'admin.confirm.bulk_set_status': 'Set status "{{status}}" for {{count}} job(s)?',
    'admin.confirm.bulk_reason': 'Optional reason (appears in moderation history):',
    'admin.confirm.grant_role': 'Grant ADMIN role to user {{userId}}?',
    'admin.confirm.revoke_role': 'Revoke ADMIN role from this user?',
    'admin.confirm.set_status': 'Optional reason for moving to "{{status}}":',
    'deactivate.confirm.permanent_delete': 'Permanently delete this job? This cannot be undone.',
    'deactivate.confirm.failed': 'Could not delete that job: {{error}}',
    'modal.ok': 'OK',
    'modal.cancel': 'Cancel',

    // A9.32 — skip-to-content link revealed on focus.
    'a11y.skip_to_content': 'Skip to main content',

    // A9.34 — jobDeactivate modal title used by aria-labelledby.
    'deactivate.aria_title': 'Deactivate this job listing',

    // A9.2 — legal pages
    'legal.privacy.title': 'Privacy Policy',
    'legal.privacy.intro': 'This page summarises how Employed handles your personal data when you visit, sign up, post a job, or pay for a featured listing.',
    'legal.privacy.data_we_collect': 'Data we collect',
    'legal.privacy.data_we_collect_body': 'Account email and display name, jobs you post, IP addresses and User-Agent for abuse prevention, and (when you purchase a featured listing) the payment metadata returned by Stripe. We never receive your card number.',
    'legal.privacy.use': 'How we use your data',
    'legal.privacy.use_body': 'To deliver the service you signed up for: render your jobs, send transactional email, prevent spam (reCAPTCHA), and process payments via Stripe.',
    'legal.privacy.retention': 'Retention',
    'legal.privacy.retention_body': 'Jobs are kept until you delete them or until the 90-day expiry runs (whichever comes first). Account records remain until you request deletion via your account page.',
    'legal.privacy.rights': 'Your rights',
    'legal.privacy.rights_body': 'You may request data export or account deletion at any time from your account page. We respond within 30 days.',
    'legal.privacy.contact': 'Contact',
    'legal.privacy.contact_body': 'For privacy questions, email {{email}}.',
    'legal.privacy.last_updated': 'Last updated: {{date}}',

    'legal.terms.title': 'Terms of Service',
    'legal.terms.intro': 'By using Employed you agree to these Terms.',
    'legal.terms.acceptable_use': 'Acceptable use',
    'legal.terms.acceptable_use_body': 'Do not post discriminatory, fraudulent, MLM, or duplicate listings. We may remove any post at our discretion.',
    'legal.terms.payments': 'Payments',
    'legal.terms.payments_body': 'Featured listings are sold as 30-day non-refundable upgrades processed by Stripe. Refunds are at our discretion in cases of platform error.',
    'legal.terms.liability': 'Liability',
    'legal.terms.liability_body': 'Employed is provided as-is. We are not party to the employment relationship between posters and applicants.',
    'legal.terms.changes': 'Changes',
    'legal.terms.changes_body': 'We may update these Terms; material changes will be summarised on the homepage.',

    'legal.privacy_link': 'Privacy',
    'legal.terms_link': 'Terms',

    // A9.3 — account management
    'account.title': 'Your Account',
    'account.subtitle': 'Manage your profile, export your data, or delete your account.',
    'account.export.heading': 'Export your data',
    'account.export.body': 'Download a JSON file containing your account record and every job you have posted.',
    'account.export.button': 'Request export',
    'account.export.ready': 'Your export is ready: {{link}}',
    'account.export.error': 'Could not generate export. Try again later.',
    'account.delete.heading': 'Delete account',
    'account.delete.body': 'Schedules permanent deletion in 30 days. During this window you can cancel from this page; after 30 days your account, jobs, and audit history are wiped from the database.',
    'account.delete.button': 'Request account deletion',
    'account.delete.confirm': 'Type DELETE to confirm. Your account will be removed after 30 days and cannot be recovered.',
    'account.delete.scheduled': 'Deletion is scheduled for {{date}}. {{cancelLink}} to keep your account.',
    'account.delete.cancel': 'Cancel the deletion request',
    'account.delete.canceled': 'Deletion request canceled.',
    'account.profile_heading': 'Profile',
    'account.email': 'Email',
    'account.email_verified': 'Verified',
    'account.email_unverified': 'Unverified',
    'account.created_at': 'Member since',

    // Redesign 2026 — new UI strings
    'home.recent_jobs': 'Recent Jobs',
    'home.see_all_jobs': 'See all jobs',
    'home.trust.free': 'Free to post',
    'home.trust.local': 'Local',
    'home.trust.duration': '90-day listings',
    'home.trust.active_jobs': 'active jobs',
    'jobs.count_label': 'jobs',
    'jobs.none_found_filters': 'Try adjusting or clearing your filters.',
    'jobs.none_found_empty': 'Check back soon — new jobs are posted regularly.',
    'job.apply_contact': 'Apply / Contact',
    'job.sidebar.how_to_apply': 'How to apply',
    'job.sidebar.details': 'Job details',
    'form.step.basics': 'Basics',
    'form.step.details': 'Details',
    'form.step.preview': 'Preview',
    'form.step.next': 'Next',
    'form.step.back': 'Back',
    'form.submit.post_job': 'Post Job',
    'form.submit.posting': 'Posting…',
    'form.preview.label': 'Preview',
    'form.recaptcha.and': 'and',
    'form.recaptcha.notice': 'This site is protected by reCAPTCHA and the Google',

    // Job detail — context bars
    'job.owner.your_listing': 'Your listing',
    'job.no_description': 'No description provided.',
    'admin.suggested_tweet': 'Suggested tweet',

    // p3-fix-012/013/014 — transactional emails to the poster.
    'email.poster.submission.subject': 'Your job post "{{title}}" was received',
    'email.poster.submission.text': 'Thanks for posting on Employed.\n\nWe received your job post "{{title}}" and an admin will review it shortly. You will receive another email once it is live.\n\nView your listing:\n{{url}}',
    'email.poster.submission.html': '<p>Thanks for posting on Employed.</p><p>We received your job post <strong>{{title}}</strong> and an admin will review it shortly. You will receive another email once it is live.</p><p><a href="{{url}}">View your listing</a></p>',
    'email.poster.status.active.subject': 'Your job "{{title}}" is now live',
    'email.poster.status.active.text': 'Good news — your job post "{{title}}" was approved and is now live on Employed.\n\nView it here:\n{{url}}',
    'email.poster.status.active.html': '<p>Good news — your job post <strong>{{title}}</strong> was approved and is now live on Employed.</p><p><a href="{{url}}">View your listing</a></p>',
    'email.poster.status.flagged.subject': 'Your job "{{title}}" was flagged',
    'email.poster.status.flagged.text': 'An admin flagged your job post "{{title}}" for review.\n\nReason: {{reason}}\n\nIt is temporarily hidden from public listings. You can edit it and resubmit:\n{{url}}',
    'email.poster.status.flagged.html': '<p>An admin flagged your job post <strong>{{title}}</strong> for review.</p><p><strong>Reason:</strong> {{reason}}</p><p>It is temporarily hidden from public listings. <a href="{{url}}">Edit your listing</a> and resubmit.</p>',
    'email.poster.status.inactive.subject': 'Your job "{{title}}" was deactivated',
    'email.poster.status.inactive.text': 'Your job post "{{title}}" was set to inactive by an admin.\n\nReason: {{reason}}\n\n{{url}}',
    'email.poster.status.inactive.html': '<p>Your job post <strong>{{title}}</strong> was set to inactive by an admin.</p><p><strong>Reason:</strong> {{reason}}</p><p><a href="{{url}}">View your listing</a></p>',
    'email.poster.status.filled.subject': 'Your job "{{title}}" was marked filled',
    'email.poster.status.filled.text': 'Your job post "{{title}}" was marked as filled by an admin.\n\n{{url}}',
    'email.poster.status.filled.html': '<p>Your job post <strong>{{title}}</strong> was marked as filled by an admin.</p><p><a href="{{url}}">View your listing</a></p>',
    'email.poster.status.pending.subject': 'Your job "{{title}}" is awaiting review',
    'email.poster.status.pending.text': 'Your job post "{{title}}" is back in the review queue.\n\nReason: {{reason}}\n\n{{url}}',
    'email.poster.status.pending.html': '<p>Your job post <strong>{{title}}</strong> is back in the review queue.</p><p><strong>Reason:</strong> {{reason}}</p><p><a href="{{url}}">View your listing</a></p>',

    // AccountsTemplates labels — used by the at-pwd-form template via
    // the AT.T9n.set integration in client/lib/at-i18n.js.
    'accounts.signIn.title': 'Log in',
    'accounts.signIn.button': 'Log in',
    'accounts.signUp.title': 'Create an account',
    'accounts.signUp.button': 'Sign up',
    'accounts.forgotPwd.title': 'Reset your password',
    'accounts.forgotPwd.button': 'Send reset link',
    'accounts.resetPwd.title': 'Choose a new password',
    'accounts.resetPwd.button': 'Save new password',
    'accounts.field.email.placeholder': 'Email address',
    'accounts.field.password.placeholder': 'Password',
    'accounts.field.password_again.placeholder': 'Confirm password',
    'accounts.link.signIn': 'Already have an account? Log in',
    'accounts.link.signUp': 'New here? Create an account',
    'accounts.link.forgotPwd': 'Forgot your password?',
    'accounts.error.signin_failed': 'Could not sign in with those credentials.',

    // A9.32 — hand-rolled auth templates (PR 2 of BS5 migration).
    // Keys consumed by client/views/account/auth.{html,js}.
    'accounts.signIn.subtitle': 'Welcome back — sign in to manage your job posts.',
    'accounts.signUp.subtitle': 'Free to post jobs. No credit card needed.',
    'accounts.signUp.success': 'Account created. Welcome aboard!',
    'accounts.forgotPwd.subtitle': 'Enter your email and we\'ll send you a reset link.',
    'accounts.forgotPwd.success': 'If an account exists for that email, a reset link is on its way.',
    'accounts.resetPwd.subtitle': 'Choose a strong password you don\'t use anywhere else.',
    'accounts.resetPwd.success': 'Password updated — you are now signed in.',
    'accounts.resetPwd.invalid_token': 'This reset link is invalid or has expired. Request a new one.',
    'accounts.verifyEmail.title': 'Verifying your email',
    'accounts.verifyEmail.verifying': 'Confirming your address…',
    'accounts.verifyEmail.success': 'Done — your email is verified. You can now post jobs.',
    'accounts.verifyEmail.error': 'We could not verify this link. It may be expired or already used.',
    'accounts.error.email_required': 'Please enter your email.',
    'accounts.error.password_required': 'Please enter your password.',
    'accounts.error.password_min': 'Password must be at least 8 characters.',
    'accounts.error.password_mismatch': 'Passwords do not match.',
    'accounts.error.email_in_use': 'This email is already registered. Sign in or reset your password.',
    'accounts.cta.back_to_sign_in': 'Back to sign in',

    // Mine page status pill + actions (p2-fix-010 / p3-fix-015)
    'mine.status_pending': 'Awaiting review',
    'mine.status_active': 'Live',
    'mine.status_flagged': 'Flagged',
    'mine.status_inactive': 'Inactive',
    'mine.status_filled': 'Filled',

    'mine.action.view': 'View',
    'mine.action.edit': 'Edit',

    // Relative age labels (admin queue / job card hover)
    'age.just_now': 'just now',
    'age.minute': '{{n}} minute ago',
    'age.minutes': '{{n}} minutes ago',
    'age.hour': '{{n}} hour ago',
    'age.hours': '{{n}} hours ago',
    'age.day': '{{n}} day ago',
    'age.days': '{{n}} days ago',
    'age.month': '{{n}} month ago',
    'age.months': '{{n}} months ago',
    'age.year': '{{n}} year ago',
    'age.years': '{{n}} years ago',
    'admin.posted_ago': 'posted {{age}}',

    // Verify email confirmation (p1-fix-018)
    'verify.confirmation.title': 'Email verified',
    'verify.confirmation.body': 'Thanks — your email has been verified. You can now post jobs and receive notifications.',
  },

  // ============================== Spanish ==============================
  es: {
    'action.cancel': 'Cancelar',
    'action.update': 'Actualizar',
    'action.edit': 'Editar',
    'action.delete': 'Eliminar',
    'action.save': 'Guardar',
    'action.continue': 'Continuar',
    'action.sign_in': 'Iniciar sesión',
    'action.sign_up': 'Crear cuenta',
    'action.sign_out': 'Cerrar sesión',
    'action.send': 'Enviar',
    'action.load_more': 'Cargar más',
    'action.apply': 'Aplicar',

    'nav.toggle': 'Mostrar/ocultar navegación',
    'nav.all_jobs': 'Todos los Empleos',
    'nav.post_a_job': 'Publicar Empleo',
    'nav.my_posted_jobs': 'Mis publicaciones',
    'nav.resend_verification': 'Reenviar correo de verificación',
    'nav.admin_jobs': 'Moderación',
    'nav.user_profile': 'Mi Perfil',
    'nav.language': 'Idioma',

    'verify.email_unverified': 'Tu correo ({{email}}) aún no está verificado.',
    'verify.resend_link': 'Reenviar correo de verificación',
    'verify.sending': 'Enviando…',
    'verify.sent': 'enviado.',
    'verify.already_verified': 'ya está verificado.',
    'verify.could_not_send': 'No se pudo enviar el correo de verificación.',

    'home.intro': 'Explora vacantes activas o publica una oportunidad para candidatos locales.',
    'home.cta.browse_jobs': 'Ver empleos',
    'home.cta.post_a_job': 'Publicar empleo',

    'jobs.recent_title': 'Empleos recientes',
    'jobs.last_post_about': 'Última publicación hace {{when}}',
    'jobs.view_all': 'Ver todos los empleos',
    'jobs.list_title': 'Empleos en {{site}}',
    'jobs.none_found': 'No se encontraron empleos activos.',
    'jobs.filter.aria': 'Filtrar empleos',
    'jobs.filter.query': 'Buscar',
    'jobs.filter.query_placeholder': 'Buscar por título, empresa o ubicación…',
    'jobs.filter.type': 'Tipo de empleo',
    'jobs.filter.type_any': 'Todos los tipos',
    'jobs.filter.remote_only': 'Solo remoto',
    'jobs.filter.clear': 'Limpiar filtros',
    'jobs.label.featured': 'Destacado',
    'jobs.label.remote': 'Remoto',
    'jobs.label.expired': 'Expirado',
    'jobs.posted_on': 'Publicado el {{date}}',
    'jobs.featured_until': 'Destacado hasta {{date}}',
    'jobs.salary.per.hour': 'hora',
    'jobs.salary.per.day': 'día',
    'jobs.salary.per.week': 'semana',
    'jobs.salary.per.month': 'mes',
    'jobs.salary.per.year': 'año',
    // A9.36 — una sola fila de destacados + paginación en /jobs.
    'jobs.featured_strip_label': 'Destacados',
    'jobs.featured_strip_subtitle': 'Una selección nueva de publicaciones patrocinadas.',
    'jobs.pagination.page_size_label': 'Por página',
    'jobs.pagination.previous': 'Anterior',
    'jobs.pagination.next': 'Siguiente',
    'jobs.pagination.page_of': 'Página {{page}} de {{total}}',
    'jobs.pagination.showing': 'Mostrando {{from}}–{{to}} de {{total}}',
    'jobs.ad_inline.label': 'Publicidad',

    'job.deactivate': 'Desactivar',
    'job.report': 'Reportar este empleo',
    'job.report.prompt_message': 'Dinos por qué este empleo es un problema. Elige un motivo: spam, scam, discriminatory, wrong_country, expired_or_filled, duplicate.',
    'job.report.reason_placeholder': 'spam',
    'job.report.error': 'No se pudo enviar tu reporte. Intenta de nuevo más tarde.',
    'job.report.thanks': 'Gracias. Un administrador revisará este reporte.',
    'job.expired_uh_oh': '¡Ups!',
    'job.expired_body': 'Esta publicación de empleo ha expirado.',
    'job.status_pending': 'Esta publicación está esperando aprobación de un administrador. Será revisada en breve y aparecerá en el sitio.',
    'job.status_flagged': 'Esta publicación fue marcada por su contenido. Contacta a un administrador si crees que es un error.',
    'job.status_inactive': 'Esta publicación de empleo fue desactivada.',
    'job.status_filled': 'Esta vacante ya fue cubierta.',
    'job.featured.title': 'Mejora a una publicación destacada',
    'job.featured.bullet1': 'Aparece garantizado en la página de inicio',
    'job.featured.bullet2': 'Listado resaltado visualmente',
    'job.featured.bullet3': 'Posición prioritaria en la lista de empleos',
    'job.featured.buy_cta': 'Comprar 30 días por {{price}}',

    // A10.0 — multi-provider checkout strings
    'checkout.pick_provider': 'Elige cómo deseas pagar:',
    'checkout.no_providers': 'Aún no hay métodos de pago configurados para este mercado.',
    'checkout.simulator_tag': 'Simulador',
    'checkout.provider.stripe': 'Pagar con tarjeta (Stripe)',
    'checkout.provider.mpesa': 'Pagar con M-Pesa',
    'checkout.provider.emola': 'Pagar con e-Mola',
    'checkout.msisdn.label': 'Tu número móvil',
    'checkout.msisdn.hint.mpesa': 'Ingresa el número Vodacom registrado en M-Pesa. Recibirás una solicitud de PIN en tu teléfono.',
    'checkout.msisdn.hint.emola': 'Ingresa el número Movitel registrado en e-Mola. Recibirás una solicitud de PIN en tu teléfono.',
    'checkout.msisdn.placeholder.mpesa': '84 1234567',
    'checkout.msisdn.placeholder.emola': '86 1234567',
    'checkout.msisdn.invalid': 'Por favor ingresa un número móvil válido de 9 dígitos.',
    'checkout.send_prompt': 'Enviar solicitud de PIN',
    'checkout.awaiting.title.mpesa': 'Revisa tu teléfono para la solicitud de M-Pesa',
    'checkout.awaiting.title.emola': 'Revisa tu teléfono para la solicitud de e-Mola',
    'checkout.awaiting.detail': 'Ingresa tu PIN en el teléfono para confirmar el pago. Esta página se actualizará automáticamente.',
    'checkout.cancel_attempt': 'Cancelar este intento',
    'checkout.redirecting': 'Redirigiendo a la página de pago segura…',
    'checkout.success.title': 'Pago recibido',
    'checkout.success.detail': 'Tu publicación aparecerá como Destacada en unos segundos.',
    'checkout.failure.title': 'El pago no se completó',
    'checkout.failure.reason.unknown': 'Algo salió mal. Por favor intenta de nuevo.',
    'checkout.failure.reason.insufficient_funds': 'La cuenta de dinero móvil no tiene saldo suficiente.',
    'checkout.failure.reason.user_timeout': 'No se ingresó el PIN a tiempo. Por favor intenta de nuevo.',
    'checkout.failure.reason.wrong_pin': 'PIN incorrecto. Por favor intenta de nuevo.',
    'checkout.failure.reason.user_cancelled': 'Cancelaste el pago.',
    'checkout.failure.reason.client_poll_timeout': 'No recibimos respuesta del proveedor. Si tu teléfono muestra que el cargo fue realizado, contacta a soporte.',
    'checkout.failure.reason.initiate_failed': 'No pudimos iniciar el pago. Por favor intenta de nuevo.',
    'checkout.failure.reason.mpesa-invalid-msisdn': 'Por favor ingresa un número Vodacom (M-Pesa) válido.',
    'checkout.failure.reason.emola-invalid-msisdn': 'Por favor ingresa un número Movitel (e-Mola) válido.',
    'checkout.try_again': 'Intentar de nuevo',
    'action.back': 'Atrás',
    'modal.close': 'Cerrar',

    // A10.0 — PWA install prompt banner.
    'pwa.install.title': 'Instala Employed',
    'pwa.install.detail': 'Agrega Employed a tu pantalla de inicio para acceder más rápido y con menos distracciones.',
    'pwa.install.cta': 'Instalar',
    'pwa.install.dismiss': 'Ahora no',

    // A10.0 — WhatsApp apply.
    'job.apply_whatsapp': 'Postular por WhatsApp',
    'job.apply_whatsapp.message': '¡Hola! Me interesa el puesto de {{title}} en {{company}}. ¿Podemos conversar?',
    'job.apply_whatsapp.label': 'WhatsApp para postulaciones',
    'job.apply_whatsapp.hint': 'Opcional. Los candidatos podrán contactarte directamente por WhatsApp. Incluye el código de país (ej. +52 55 12345678).',

    'form.intro_market': 'Publica vacantes para candidatos en este mercado.',
    'form.policy.line1': 'Publicar vacantes es gratis.',
    'form.policy.line2': 'Tu publicación permanecerá en el sitio durante 90 días. Después de 90 días dejará de aparecer para los visitantes.',
    'form.policy.line3': 'Puedes destacar tu publicación en la página de inicio durante 30 días tras crearla.',
    'form.panel.create_title': 'Crea tu publicación de empleo',
    'form.panel.edit_title': 'Editar publicación de empleo',
    'form.submit.preview': 'Continuar para previsualizar',
    'form.placeholder.title': 'Título que se mostrará en tu publicación',
    'form.placeholder.job_type': '(Selecciona un tipo de empleo)',
    'form.placeholder.company': 'Nombre de la empresa contratante',
    'form.placeholder.description': 'Cuéntales a los candidatos sobre el puesto, requisitos, rango salarial, modalidad y proceso de contratación.',
    'form.placeholder.url': 'URL externa de la oferta',
    'form.placeholder.contact': 'Correo, teléfono o contacto de contratación a mostrar en la publicación',
    'form.recaptcha.notice': 'Este sitio está protegido por reCAPTCHA y aplican la {{privacy}} y los {{terms}} de Google.',
    'form.recaptcha.privacy': 'Política de Privacidad',
    'form.recaptcha.terms': 'Términos del Servicio',

    'deactivate.title': '¿Qué deseas hacer con esta publicación?',
    'deactivate.body': 'Usa Vacante cubierta u Otros motivos para mantenerla en tu historial, o Eliminar definitivamente para borrarla de la base de datos.',
    'deactivate.position_filled': 'Vacante cubierta',
    'deactivate.other_reasons': 'Otros motivos',
    'deactivate.delete_permanent': 'Eliminar definitivamente',

    'mine.title': 'Mis publicaciones',
    'mine.empty.prefix': 'Aún no has publicado vacantes.',
    'mine.empty.cta': 'Publicar empleo',
    'mine.empty.suffix': 'si tienes una oportunidad para ofrecer.',

    'notfound.title': 'Vaya, no pudimos encontrar el elemento de esta URL.',
    'notfound.body': 'Puede haber sido eliminado por el autor o retirado por los administradores.',
    'notfound.back': 'Volver a todos los empleos',
    'app.loading': 'Cargando…',

    'footer.disclaimer': 'Employed es un mercado de empleo local e independiente.',
    'footer.rss_label': 'RSS',
    'footer.json_label': 'JSON',
    'footer.jobs': 'Empleos',

    'ads.label': 'Anuncio',
    'ads.mock.title': 'Tu anuncio aquí',
    'ads.mock.subtitle': 'Llega a quienes buscan empleo local. Escribe a ads@employed.co.mz para patrocinar este espacio.',
    'ads.mock.cta': 'Destaca tu vacante →',

    'admin.title': 'Moderación de empleos',
    'admin.subtitle': 'Revisa las publicaciones enviadas y actualiza su estado.',
    'admin.select_all_on_page': 'Seleccionar todo en esta página',
    'admin.selected_count': '{{n}} seleccionado(s)',
    'admin.bulk_set_status': 'Cambiar estado en lote…',
    'admin.apply_to_selected': 'Aplicar a seleccionados',
    'admin.no_jobs_in_view': 'No hay empleos en esta vista.',
    'admin.access_required': 'Se requiere acceso de administrador.',
    'admin.admins.section': 'Administradores',
    'admin.admins.col.name': 'Nombre',
    'admin.admins.col.email': 'Correo',
    'admin.admins.col.created': 'Creado',
    'admin.admins.none_other': 'No hay otros administradores registrados.',
    'admin.admins.revoke': 'Revocar admin',
    'admin.admins.grant': 'Otorgar admin',
    'admin.admins.id_placeholder': 'User _id…',
    'admin.admins.help': 'Pega el `_id` de Mongo del usuario. El primer admin sigue siendo promovido desde la base de datos o vía `server/dev-accounts.js`.',
    'admin.reports.heading': 'Empleos reportados',
    'admin.reports.empty': 'No hay reportes pendientes.',
    'admin.reports.col.when': 'Reportado',
    'admin.reports.col.job': 'Empleo',
    'admin.reports.col.reason': 'Motivo',
    'admin.reports.col.details': 'Detalles',
    'admin.reports.col.actions': 'Acciones',
    'admin.reports.action.dismiss': 'Descartar',
    'admin.reports.action.removed': 'Empleo eliminado',
    'admin.reports.action.reviewed': 'Revisado',
    'admin.reports.job_missing': 'El empleo ya no existe',
    'admin.reports.resolve_title': 'Resolver reporte',
    'admin.reports.resolve_message': '¿Marcar este reporte como {{resolution}}?',
    'admin.reports.reason.spam': 'Spam',
    'admin.reports.reason.scam': 'Estafa',
    'admin.reports.reason.discriminatory': 'Discriminatorio',
    'admin.reports.reason.wrong_country': 'País incorrecto',
    'admin.reports.reason.expired_or_filled': 'Expirado o cubierto',
    'admin.reports.reason.duplicate': 'Duplicado',
    'admin.status.current': 'Estado actual:',
    'admin.status.set_to': 'Cambiar estado a',
    'admin.moderation_history': 'Historial de moderación',
    'admin.col.when': 'Cuándo',
    'admin.col.from': 'De',
    'admin.col.to': 'A',
    'admin.col.by': 'Por',
    'admin.col.reason': 'Motivo',

    'seo.default.title': 'Employed — empleos locales, contratación local.',
    'seo.default.description': 'Employed es una bolsa de trabajo localizada para puestos locales, remotos, por contrato y de tiempo completo.',
    'seo.home.title': '{{site}} — empleos locales, contratación local.',
    'seo.home.description': 'Explora oportunidades de empleo locales en {{country}} en {{site}}, o publica una vacante para alcanzar candidatos locales.',
    'seo.jobs.title': '{{site}} — Todos los empleos',
    'seo.jobs.description': 'Todas las publicaciones de empleo activas en {{site}}.',
    'seo.job.title': '{{title}} en {{company}} | {{site}}',
    'seo.job.description': 'Postula para {{title}} en {{company}} a través de {{site}}.',
    'seo.jobNew.title': '{{site}} — Publicar empleo',
    'seo.jobNew.description': 'Publica una vacante en {{site}} y alcanza candidatos en {{country}}.',
    'seo.legalPrivacy.title': '{{site}} — Política de Privacidad',
    'seo.legalPrivacy.description': 'Cómo {{site}} recopila, almacena y procesa tus datos.',
    'seo.legalTerms.title': '{{site}} — Términos del Servicio',
    'seo.legalTerms.description': 'Reglas de uso y términos de pago de {{site}}.',
    'seo.userAccount.title': '{{site}} — Cuenta',
    'seo.userAccount.description': 'Administra tu cuenta, exporta tus datos o elimina tu perfil.',

    'status.pending': 'Pendiente de revisión',
    'status.active': 'Activo',
    'status.flagged': 'Marcado',
    'status.inactive': 'Inactivo',
    'status.filled': 'Vacante cubierta',
    'status.all': 'Todos',

    'jobs.field.title': 'Título',
    'jobs.field.company': 'Empresa',
    'jobs.field.jobtype': 'Tipo de empleo',
    'jobs.field.location': 'Ubicación',
    'jobs.field.remote': 'Remoto',
    'jobs.field.url': 'URL para postular',
    'jobs.field.contact': 'Contacto',
    'jobs.field.description': 'Descripción',
    'jobs.field.salary_min': 'Salario (mínimo)',
    'jobs.field.salary_max': 'Salario (máximo)',
    'jobs.field.salary_currency': 'Moneda',
    'jobs.field.salary_period': 'Período salarial',
    'jobs.field.country': 'País',
    'jobs.field.status': 'Estado',

    'jobs.form.error.generic': 'No se pudo guardar la publicación. Por favor inténtalo de nuevo.',
    'jobs.form.error.recaptcha': 'No pudimos verificar tu navegador. Recarga la página e inténtalo de nuevo.',
    'jobs.form.error.recaptcha_unavailable': 'La protección contra spam no está disponible. Inténtalo en unos instantes.',
    'jobs.form.error.network': 'Error de red. Revisa tu conexión e inténtalo de nuevo.',

    'admin.confirm.bulk_set_status': '¿Fijar el estado "{{status}}" para {{count}} vacante(s)?',
    'admin.confirm.bulk_reason': 'Motivo opcional (aparece en el historial de moderación):',
    'admin.confirm.grant_role': '¿Otorgar rol ADMIN al usuario {{userId}}?',
    'admin.confirm.revoke_role': '¿Revocar el rol ADMIN de este usuario?',
    'admin.confirm.set_status': 'Motivo opcional para pasar a "{{status}}":',
    'deactivate.confirm.permanent_delete': '¿Eliminar esta vacante de forma permanente? Esta acción no se puede deshacer.',
    'deactivate.confirm.failed': 'No se pudo eliminar la vacante: {{error}}',
    'modal.ok': 'Aceptar',
    'modal.cancel': 'Cancelar',

    'a11y.skip_to_content': 'Saltar al contenido principal',

    'deactivate.aria_title': 'Desactivar esta vacante',

    'legal.privacy.title': 'Política de Privacidad',
    'legal.privacy.intro': 'Esta página resume cómo Employed maneja tus datos personales cuando visitas el sitio, te registras, publicas vacantes o pagas una publicación destacada.',
    'legal.privacy.data_we_collect': 'Datos que recopilamos',
    'legal.privacy.data_we_collect_body': 'Correo de la cuenta y nombre público, vacantes que publicas, direcciones IP y User-Agent para prevenir abuso, y (cuando compras una publicación destacada) los metadatos de pago que devuelve Stripe. Nunca recibimos tu número de tarjeta.',
    'legal.privacy.use': 'Uso de los datos',
    'legal.privacy.use_body': 'Para entregar el servicio que solicitaste: mostrar tus vacantes, enviar correos transaccionales, prevenir spam (reCAPTCHA) y procesar pagos vía Stripe.',
    'legal.privacy.retention': 'Conservación',
    'legal.privacy.retention_body': 'Las vacantes se conservan hasta que las elimines o hasta que se cumpla la caducidad de 90 días. La cuenta permanece hasta que solicites su eliminación desde tu página de cuenta.',
    'legal.privacy.rights': 'Tus derechos',
    'legal.privacy.rights_body': 'Puedes solicitar exportación o eliminación de tu cuenta en cualquier momento desde tu página de cuenta. Respondemos en un plazo de 30 días.',
    'legal.privacy.contact': 'Contacto',
    'legal.privacy.contact_body': 'Para preguntas sobre privacidad, escríbenos a {{email}}.',
    'legal.privacy.last_updated': 'Última actualización: {{date}}',

    'legal.terms.title': 'Términos del Servicio',
    'legal.terms.intro': 'Al usar Employed aceptas estos Términos.',
    'legal.terms.acceptable_use': 'Uso aceptable',
    'legal.terms.acceptable_use_body': 'No publiques anuncios discriminatorios, fraudulentos, MLM o duplicados. Podemos retirar cualquier publicación a nuestro criterio.',
    'legal.terms.payments': 'Pagos',
    'legal.terms.payments_body': 'Las publicaciones destacadas se venden como mejoras no reembolsables de 30 días, procesadas por Stripe. Los reembolsos son a discreción nuestra en caso de errores de plataforma.',
    'legal.terms.liability': 'Responsabilidad',
    'legal.terms.liability_body': 'Employed se entrega "tal cual". No somos parte de la relación laboral entre quien publica y quien postula.',
    'legal.terms.changes': 'Cambios',
    'legal.terms.changes_body': 'Podemos actualizar estos Términos; los cambios materiales se resumirán en la página de inicio.',

    'legal.privacy_link': 'Privacidad',
    'legal.terms_link': 'Términos',

    'account.title': 'Tu cuenta',
    'account.subtitle': 'Administra tu perfil, exporta tus datos o elimina tu cuenta.',
    'account.export.heading': 'Exportar tus datos',
    'account.export.body': 'Descarga un JSON con tu cuenta y todas tus publicaciones de empleo.',
    'account.export.button': 'Solicitar exportación',
    'account.export.ready': 'Tu exportación está lista: {{link}}',
    'account.export.error': 'No se pudo generar la exportación. Inténtalo más tarde.',
    'account.delete.heading': 'Eliminar cuenta',
    'account.delete.body': 'Programa la eliminación permanente en 30 días. Durante este período puedes cancelarla desde esta página; después de 30 días la cuenta, vacantes e historial se borran de la base de datos.',
    'account.delete.button': 'Solicitar eliminación de cuenta',
    'account.delete.confirm': 'Escribe ELIMINAR para confirmar. Tu cuenta se eliminará en 30 días y no podrá recuperarse.',
    'account.delete.scheduled': 'La eliminación está programada para el {{date}}. {{cancelLink}} para conservar tu cuenta.',
    'account.delete.cancel': 'Cancelar la solicitud de eliminación',
    'account.delete.canceled': 'Solicitud de eliminación cancelada.',
    'account.profile_heading': 'Perfil',
    'account.email': 'Correo electrónico',
    'account.email_verified': 'Verificado',
    'account.email_unverified': 'Sin verificar',
    'account.created_at': 'Miembro desde',

    // Redesign 2026
    'home.recent_jobs': 'Empleos recientes',
    'home.see_all_jobs': 'Ver todos los empleos',
    'home.trust.free': 'Gratis para publicar',
    'home.trust.local': 'Local',
    'home.trust.duration': 'Listados de 90 días',
    'home.trust.active_jobs': 'empleos activos',
    'jobs.count_label': 'empleos',
    'jobs.none_found_filters': 'Intenta ajustar o limpiar los filtros.',
    'jobs.none_found_empty': 'Vuelve pronto — se publican nuevos empleos regularmente.',
    'job.apply_contact': 'Aplicar / Contactar',
    'job.sidebar.how_to_apply': 'Cómo aplicar',
    'job.sidebar.details': 'Detalles del empleo',
    'form.step.basics': 'Básicos',
    'form.step.details': 'Detalles',
    'form.step.preview': 'Vista previa',
    'form.step.next': 'Siguiente',
    'form.step.back': 'Atrás',
    'form.submit.post_job': 'Publicar empleo',
    'form.submit.posting': 'Publicando…',
    'form.preview.label': 'Vista previa',
    'form.recaptcha.and': 'y los',
    'form.recaptcha.notice': 'Este sitio está protegido por reCAPTCHA y aplican la',

    // Job detail — context bars
    'job.owner.your_listing': 'Tu publicación',
    'job.no_description': 'Sin descripción.',
    'admin.suggested_tweet': 'Tweet sugerido',

    // Emails al publicador
    'email.poster.submission.subject': 'Recibimos tu publicación "{{title}}"',
    'email.poster.submission.text': 'Gracias por publicar en Employed.\n\nRecibimos tu vacante "{{title}}" y un administrador la revisará en breve. Te enviaremos otro correo en cuanto esté publicada.\n\nVer tu publicación:\n{{url}}',
    'email.poster.submission.html': '<p>Gracias por publicar en Employed.</p><p>Recibimos tu vacante <strong>{{title}}</strong> y un administrador la revisará en breve. Te enviaremos otro correo en cuanto esté publicada.</p><p><a href="{{url}}">Ver tu publicación</a></p>',
    'email.poster.status.active.subject': 'Tu vacante "{{title}}" está publicada',
    'email.poster.status.active.text': 'Buenas noticias — tu vacante "{{title}}" fue aprobada y ya está publicada en Employed.\n\nMírala aquí:\n{{url}}',
    'email.poster.status.active.html': '<p>Buenas noticias — tu vacante <strong>{{title}}</strong> fue aprobada y ya está publicada en Employed.</p><p><a href="{{url}}">Ver tu publicación</a></p>',
    'email.poster.status.flagged.subject': 'Tu vacante "{{title}}" fue marcada',
    'email.poster.status.flagged.text': 'Un administrador marcó tu vacante "{{title}}" para revisión.\n\nMotivo: {{reason}}\n\nEstá temporalmente oculta. Puedes editarla y reenviarla:\n{{url}}',
    'email.poster.status.flagged.html': '<p>Un administrador marcó tu vacante <strong>{{title}}</strong> para revisión.</p><p><strong>Motivo:</strong> {{reason}}</p><p>Está temporalmente oculta. <a href="{{url}}">Edita tu publicación</a> y reenvíala.</p>',
    'email.poster.status.inactive.subject': 'Tu vacante "{{title}}" fue desactivada',
    'email.poster.status.inactive.text': 'Tu vacante "{{title}}" fue desactivada por un administrador.\n\nMotivo: {{reason}}\n\n{{url}}',
    'email.poster.status.inactive.html': '<p>Tu vacante <strong>{{title}}</strong> fue desactivada por un administrador.</p><p><strong>Motivo:</strong> {{reason}}</p><p><a href="{{url}}">Ver tu publicación</a></p>',
    'email.poster.status.filled.subject': 'Tu vacante "{{title}}" se marcó como cubierta',
    'email.poster.status.filled.text': 'Tu vacante "{{title}}" fue marcada como cubierta por un administrador.\n\n{{url}}',
    'email.poster.status.filled.html': '<p>Tu vacante <strong>{{title}}</strong> fue marcada como cubierta por un administrador.</p><p><a href="{{url}}">Ver tu publicación</a></p>',
    'email.poster.status.pending.subject': 'Tu vacante "{{title}}" está en revisión',
    'email.poster.status.pending.text': 'Tu vacante "{{title}}" volvió a la cola de revisión.\n\nMotivo: {{reason}}\n\n{{url}}',
    'email.poster.status.pending.html': '<p>Tu vacante <strong>{{title}}</strong> volvió a la cola de revisión.</p><p><strong>Motivo:</strong> {{reason}}</p><p><a href="{{url}}">Ver tu publicación</a></p>',

    'accounts.signIn.title': 'Iniciar sesión',
    'accounts.signIn.button': 'Iniciar sesión',
    'accounts.signUp.title': 'Crear una cuenta',
    'accounts.signUp.button': 'Crear cuenta',
    'accounts.forgotPwd.title': 'Recuperar contraseña',
    'accounts.forgotPwd.button': 'Enviar enlace',
    'accounts.resetPwd.title': 'Elige una nueva contraseña',
    'accounts.resetPwd.button': 'Guardar contraseña',
    'accounts.field.email.placeholder': 'Correo electrónico',
    'accounts.field.password.placeholder': 'Contraseña',
    'accounts.field.password_again.placeholder': 'Confirma la contraseña',
    'accounts.link.signIn': '¿Ya tienes una cuenta? Inicia sesión',
    'accounts.link.signUp': '¿Nuevo aquí? Crea una cuenta',
    'accounts.link.forgotPwd': '¿Olvidaste tu contraseña?',
    'accounts.error.signin_failed': 'No pudimos iniciar tu sesión con esas credenciales.',

    'accounts.signIn.subtitle': 'Bienvenido de nuevo — inicia sesión para gestionar tus publicaciones.',
    'accounts.signUp.subtitle': 'Publicar vacantes es gratis. Sin tarjeta de crédito.',
    'accounts.signUp.success': 'Cuenta creada. ¡Bienvenido!',
    'accounts.forgotPwd.subtitle': 'Escribe tu correo y te enviaremos un enlace para restablecer tu contraseña.',
    'accounts.forgotPwd.success': 'Si existe una cuenta con ese correo, el enlace ya va en camino.',
    'accounts.resetPwd.subtitle': 'Elige una contraseña fuerte que no uses en otro sitio.',
    'accounts.resetPwd.success': 'Contraseña actualizada — ya iniciaste sesión.',
    'accounts.resetPwd.invalid_token': 'Este enlace de recuperación no es válido o caducó. Solicita uno nuevo.',
    'accounts.verifyEmail.title': 'Verificando tu correo',
    'accounts.verifyEmail.verifying': 'Confirmando tu dirección…',
    'accounts.verifyEmail.success': 'Listo — tu correo está verificado. Ya puedes publicar vacantes.',
    'accounts.verifyEmail.error': 'No pudimos verificar este enlace. Puede estar caducado o usado.',
    'accounts.error.email_required': 'Escribe tu correo.',
    'accounts.error.password_required': 'Escribe tu contraseña.',
    'accounts.error.password_min': 'La contraseña debe tener al menos 8 caracteres.',
    'accounts.error.password_mismatch': 'Las contraseñas no coinciden.',
    'accounts.error.email_in_use': 'Este correo ya está registrado. Inicia sesión o recupera tu contraseña.',
    'accounts.cta.back_to_sign_in': 'Volver a iniciar sesión',

    'mine.status_pending': 'En revisión',
    'mine.status_active': 'Publicada',
    'mine.status_flagged': 'Marcada',
    'mine.status_inactive': 'Inactiva',
    'mine.status_filled': 'Cubierta',

    'mine.action.view': 'Ver',
    'mine.action.edit': 'Editar',

    'age.just_now': 'ahora mismo',
    'age.minute': 'hace {{n}} minuto',
    'age.minutes': 'hace {{n}} minutos',
    'age.hour': 'hace {{n}} hora',
    'age.hours': 'hace {{n}} horas',
    'age.day': 'hace {{n}} día',
    'age.days': 'hace {{n}} días',
    'age.month': 'hace {{n}} mes',
    'age.months': 'hace {{n}} meses',
    'age.year': 'hace {{n}} año',
    'age.years': 'hace {{n}} años',
    'admin.posted_ago': 'publicado {{age}}',

    'verify.confirmation.title': 'Correo verificado',
    'verify.confirmation.body': 'Gracias — tu correo fue verificado. Ya puedes publicar vacantes y recibir notificaciones.',
  },

  // ============================== Portuguese ==============================
  pt: {
    'action.cancel': 'Cancelar',
    'action.update': 'Atualizar',
    'action.edit': 'Editar',
    'action.delete': 'Apagar',
    'action.save': 'Guardar',
    'action.continue': 'Continuar',
    'action.sign_in': 'Entrar',
    'action.sign_up': 'Criar conta',
    'action.sign_out': 'Terminar sessão',
    'action.send': 'Enviar',
    'action.load_more': 'Carregar mais',
    'action.apply': 'Aplicar',

    'nav.toggle': 'Alternar navegação',
    'nav.all_jobs': 'Todas as Vagas',
    'nav.post_a_job': 'Publicar Vaga',
    'nav.my_posted_jobs': 'Minhas Vagas Publicadas',
    'nav.resend_verification': 'Reenviar email de verificação',
    'nav.admin_jobs': 'Moderação',
    'nav.user_profile': 'Meu Perfil',
    'nav.language': 'Idioma',

    'verify.email_unverified': 'O seu email ({{email}}) ainda não foi verificado.',
    'verify.resend_link': 'Reenviar email de verificação',
    'verify.sending': 'A enviar…',
    'verify.sent': 'enviado.',
    'verify.already_verified': 'já verificado.',
    'verify.could_not_send': 'Não foi possível enviar o email de verificação.',

    'home.intro': 'Explore vagas activas ou publique uma oportunidade para candidatos deste mercado.',
    'home.cta.browse_jobs': 'Ver vagas',
    'home.cta.post_a_job': 'Publicar vaga',

    'jobs.recent_title': 'Vagas recentes',
    'jobs.last_post_about': 'Última publicação há {{when}}',
    'jobs.view_all': 'Ver todas as vagas',
    'jobs.list_title': 'Vagas em {{site}}',
    'jobs.none_found': 'Nenhuma vaga activa encontrada.',
    'jobs.filter.aria': 'Filtrar vagas',
    'jobs.filter.query': 'Pesquisar',
    'jobs.filter.query_placeholder': 'Pesquisar por título, empresa ou local…',
    'jobs.filter.type': 'Tipo de vaga',
    'jobs.filter.type_any': 'Todos os tipos',
    'jobs.filter.remote_only': 'Apenas remoto',
    'jobs.filter.clear': 'Limpar filtros',
    'jobs.label.featured': 'Em destaque',
    'jobs.label.remote': 'Remoto',
    'jobs.label.expired': 'Expirado',
    'jobs.posted_on': 'Publicado em {{date}}',
    'jobs.featured_until': 'Em destaque até {{date}}',
    'jobs.salary.per.hour': 'hora',
    'jobs.salary.per.day': 'dia',
    'jobs.salary.per.week': 'semana',
    'jobs.salary.per.month': 'mês',
    'jobs.salary.per.year': 'ano',
    // A9.36 — uma fila de destaques + paginação em /jobs.
    'jobs.featured_strip_label': 'Em destaque',
    'jobs.featured_strip_subtitle': 'Uma selecção nova de vagas patrocinadas.',
    'jobs.pagination.page_size_label': 'Por página',
    'jobs.pagination.previous': 'Anterior',
    'jobs.pagination.next': 'Seguinte',
    'jobs.pagination.page_of': 'Página {{page}} de {{total}}',
    'jobs.pagination.showing': 'A mostrar {{from}}–{{to}} de {{total}}',
    'jobs.ad_inline.label': 'Publicidade',

    'job.deactivate': 'Desactivar',
    'job.report': 'Reportar esta vaga',
    'job.report.prompt_message': 'Diga-nos por que esta vaga é um problema. Escolha um motivo: spam, scam, discriminatory, wrong_country, expired_or_filled, duplicate.',
    'job.report.reason_placeholder': 'spam',
    'job.report.error': 'Não foi possível enviar a sua denúncia. Tente novamente mais tarde.',
    'job.report.thanks': 'Obrigado. Um administrador irá rever esta denúncia.',
    'job.expired_uh_oh': 'Ups!',
    'job.expired_body': 'Esta vaga expirou.',
    'job.status_pending': 'Esta publicação aguarda aprovação de um administrador. Será revista em breve e ficará disponível no site.',
    'job.status_flagged': 'Esta publicação foi sinalizada pelo seu conteúdo. Contacte um administrador se considera tratar-se de um engano.',
    'job.status_inactive': 'Esta vaga foi desactivada.',
    'job.status_filled': 'Esta vaga já foi preenchida.',
    'job.featured.title': 'Promover a publicação em destaque',
    'job.featured.bullet1': 'Aparece garantidamente na página inicial',
    'job.featured.bullet2': 'Listagem com destaque visual',
    'job.featured.bullet3': 'Posicionamento prioritário na lista de vagas',
    'job.featured.buy_cta': 'Comprar 30 dias por {{price}}',

    // A10.0 — multi-provider checkout strings
    'checkout.pick_provider': 'Escolha como deseja pagar:',
    'checkout.no_providers': 'Ainda não existem métodos de pagamento configurados para este mercado.',
    'checkout.simulator_tag': 'Simulador',
    'checkout.provider.stripe': 'Pagar com cartão (Stripe)',
    'checkout.provider.mpesa': 'Pagar com M-Pesa',
    'checkout.provider.emola': 'Pagar com e-Mola',
    'checkout.msisdn.label': 'O seu número de telemóvel',
    'checkout.msisdn.hint.mpesa': 'Introduza o número Vodacom registado no M-Pesa. Vai receber um pedido de PIN no seu telemóvel.',
    'checkout.msisdn.hint.emola': 'Introduza o número Movitel registado no e-Mola. Vai receber um pedido de PIN no seu telemóvel.',
    'checkout.msisdn.placeholder.mpesa': '84 1234567',
    'checkout.msisdn.placeholder.emola': '86 1234567',
    'checkout.msisdn.invalid': 'Por favor introduza um número de telemóvel válido com 9 dígitos.',
    'checkout.send_prompt': 'Enviar pedido de PIN',
    'checkout.awaiting.title.mpesa': 'Verifique o seu telemóvel para o pedido M-Pesa',
    'checkout.awaiting.title.emola': 'Verifique o seu telemóvel para o pedido e-Mola',
    'checkout.awaiting.detail': 'Introduza o seu PIN no telemóvel para confirmar o pagamento. Esta página será actualizada automaticamente.',
    'checkout.cancel_attempt': 'Cancelar esta tentativa',
    'checkout.redirecting': 'A redireccionar para a página de pagamento seguro…',
    'checkout.success.title': 'Pagamento recebido',
    'checkout.success.detail': 'A sua vaga vai aparecer como Destacada dentro de alguns segundos.',
    'checkout.failure.title': 'O pagamento não foi concluído',
    'checkout.failure.reason.unknown': 'Algo correu mal. Por favor tente novamente.',
    'checkout.failure.reason.insufficient_funds': 'A conta de dinheiro móvel não tem saldo suficiente.',
    'checkout.failure.reason.user_timeout': 'O PIN não foi introduzido a tempo. Por favor tente novamente.',
    'checkout.failure.reason.wrong_pin': 'PIN incorrecto. Por favor tente novamente.',
    'checkout.failure.reason.user_cancelled': 'Cancelou o pagamento.',
    'checkout.failure.reason.client_poll_timeout': 'Não recebemos resposta do operador. Se o seu telemóvel indicar que o pagamento foi cobrado, contacte o suporte.',
    'checkout.failure.reason.initiate_failed': 'Não foi possível iniciar o pagamento. Por favor tente novamente.',
    'checkout.failure.reason.mpesa-invalid-msisdn': 'Por favor introduza um número Vodacom (M-Pesa) válido.',
    'checkout.failure.reason.emola-invalid-msisdn': 'Por favor introduza um número Movitel (e-Mola) válido.',
    'checkout.try_again': 'Tentar novamente',
    'action.back': 'Voltar',
    'modal.close': 'Fechar',

    // A10.0 — PWA install prompt banner.
    'pwa.install.title': 'Instale o Employed',
    'pwa.install.detail': 'Adicione o Employed ao ecrã inicial para um acesso mais rápido e uma experiência mais limpa.',
    'pwa.install.cta': 'Instalar',
    'pwa.install.dismiss': 'Agora não',

    // A10.0 — WhatsApp apply.
    'job.apply_whatsapp': 'Candidatar via WhatsApp',
    'job.apply_whatsapp.message': 'Olá! Tenho interesse na vaga de {{title}} na {{company}}. Podemos conversar?',
    'job.apply_whatsapp.label': 'WhatsApp para candidaturas',
    'job.apply_whatsapp.hint': 'Opcional. Os candidatos poderão contactar-lhe directamente via WhatsApp. Inclua o código do país (ex. +258 84 1234567).',

    'form.intro_market': 'Publique vagas para candidatos deste mercado.',
    'form.policy.line1': 'Publicar vagas é gratuito.',
    'form.policy.line2': 'A sua vaga permanece no site durante 90 dias. Após 90 dias deixa de aparecer aos visitantes.',
    'form.policy.line3': 'Pode destacar a sua vaga na página inicial durante 30 dias após a criação.',
    'form.panel.create_title': 'Crie a sua publicação de vaga',
    'form.panel.edit_title': 'Editar publicação de vaga',
    'form.submit.preview': 'Continuar para pré-visualizar',
    'form.placeholder.title': 'Título a mostrar na sua publicação',
    'form.placeholder.job_type': '(Seleccione um tipo de vaga)',
    'form.placeholder.company': 'Nome da empresa contratante',
    'form.placeholder.description': 'Descreva aos candidatos o cargo, requisitos, faixa salarial, regime e processo de contratação.',
    'form.placeholder.url': 'URL externa da vaga',
    'form.placeholder.contact': 'Email, telefone ou contacto de contratação a mostrar na publicação',
    'form.recaptcha.notice': 'Este site é protegido por reCAPTCHA e aplicam-se a {{privacy}} e os {{terms}} da Google.',
    'form.recaptcha.privacy': 'Política de Privacidade',
    'form.recaptcha.terms': 'Termos de Serviço',

    'deactivate.title': 'O que pretende fazer com esta publicação?',
    'deactivate.body': 'Use Vaga preenchida ou Outros motivos para a manter no seu histórico, ou Apagar definitivamente para a remover da base de dados.',
    'deactivate.position_filled': 'Vaga preenchida',
    'deactivate.other_reasons': 'Outros motivos',
    'deactivate.delete_permanent': 'Apagar definitivamente',

    'mine.title': 'Minhas vagas publicadas',
    'mine.empty.prefix': 'Ainda não publicou nenhuma vaga.',
    'mine.empty.cta': 'Publicar vaga',
    'mine.empty.suffix': 'se tem uma oportunidade para oferecer.',

    'notfound.title': 'Ups, não conseguimos encontrar o item desta URL.',
    'notfound.body': 'Pode ter sido apagado pelo autor ou removido pelos administradores.',
    'notfound.back': 'Voltar a todas as vagas',
    'app.loading': 'A carregar…',

    'footer.disclaimer': 'Employed é um mercado de empregos local e independente.',
    'footer.rss_label': 'RSS',
    'footer.json_label': 'JSON',
    'footer.jobs': 'Vagas',

    'ads.label': 'Anúncio',
    'ads.mock.title': 'O seu anúncio aqui',
    'ads.mock.subtitle': 'Alcance candidatos locais. Escreva para ads@employed.co.mz para patrocinar este espaço.',
    'ads.mock.cta': 'Destaque a sua vaga →',

    'admin.title': 'Moderação de vagas',
    'admin.subtitle': 'Reveja as publicações submetidas e actualize o respectivo estado.',
    'admin.select_all_on_page': 'Seleccionar tudo nesta página',
    'admin.selected_count': '{{n}} seleccionado(s)',
    'admin.bulk_set_status': 'Alterar estado em lote…',
    'admin.apply_to_selected': 'Aplicar à selecção',
    'admin.no_jobs_in_view': 'Não existem vagas nesta vista.',
    'admin.access_required': 'É necessário acesso de administrador.',
    'admin.admins.section': 'Administradores',
    'admin.admins.col.name': 'Nome',
    'admin.admins.col.email': 'Email',
    'admin.admins.col.created': 'Criado',
    'admin.admins.none_other': 'Não há outros administradores registados.',
    'admin.admins.revoke': 'Revogar admin',
    'admin.admins.grant': 'Conceder admin',
    'admin.admins.id_placeholder': 'User _id…',
    'admin.admins.help': 'Cole o `_id` de Mongo do utilizador. O primeiro admin tem ainda de ser promovido na base de dados ou via `server/dev-accounts.js`.',
    'admin.reports.heading': 'Vagas denunciadas',
    'admin.reports.empty': 'Sem denúncias pendentes.',
    'admin.reports.col.when': 'Denunciado',
    'admin.reports.col.job': 'Vaga',
    'admin.reports.col.reason': 'Motivo',
    'admin.reports.col.details': 'Detalhes',
    'admin.reports.col.actions': 'Acções',
    'admin.reports.action.dismiss': 'Rejeitar',
    'admin.reports.action.removed': 'Vaga removida',
    'admin.reports.action.reviewed': 'Analisado',
    'admin.reports.job_missing': 'A vaga já não existe',
    'admin.reports.resolve_title': 'Resolver denúncia',
    'admin.reports.resolve_message': 'Marcar esta denúncia como {{resolution}}?',
    'admin.reports.reason.spam': 'Spam',
    'admin.reports.reason.scam': 'Burla',
    'admin.reports.reason.discriminatory': 'Discriminatório',
    'admin.reports.reason.wrong_country': 'País incorrecto',
    'admin.reports.reason.expired_or_filled': 'Expirada ou preenchida',
    'admin.reports.reason.duplicate': 'Duplicado',
    'admin.status.current': 'Estado actual:',
    'admin.status.set_to': 'Alterar estado para',
    'admin.moderation_history': 'Histórico de moderação',
    'admin.col.when': 'Quando',
    'admin.col.from': 'De',
    'admin.col.to': 'Para',
    'admin.col.by': 'Por',
    'admin.col.reason': 'Motivo',

    'seo.default.title': 'Employed — empregos locais, contratação local.',
    'seo.default.description': 'Employed é uma bolsa de emprego localizada para vagas locais, remotas, em regime de contrato ou tempo inteiro.',
    'seo.home.title': '{{site}} — empregos locais, contratação local.',
    'seo.home.description': 'Explore oportunidades de emprego locais em {{country}} em {{site}}, ou publique uma vaga para alcançar candidatos locais.',
    'seo.jobs.title': '{{site}} — Todas as vagas',
    'seo.jobs.description': 'Todas as vagas activas publicadas em {{site}}.',
    'seo.job.title': '{{title}} na {{company}} | {{site}}',
    'seo.job.description': 'Candidate-se a {{title}} na {{company}} através de {{site}}.',
    'seo.jobNew.title': '{{site}} — Publicar vaga',
    'seo.jobNew.description': 'Publique uma vaga em {{site}} e alcance candidatos em {{country}}.',
    'seo.legalPrivacy.title': '{{site}} — Política de Privacidade',
    'seo.legalPrivacy.description': 'Como a {{site}} recolhe, armazena e processa os seus dados.',
    'seo.legalTerms.title': '{{site}} — Termos de Serviço',
    'seo.legalTerms.description': 'Regras de uso e termos de pagamento de {{site}}.',
    'seo.userAccount.title': '{{site}} — Conta',
    'seo.userAccount.description': 'Gere a conta, exporte os dados ou apague o perfil.',

    'status.pending': 'Aguarda revisão',
    'status.active': 'Activa',
    'status.flagged': 'Sinalizada',
    'status.inactive': 'Inactiva',
    'status.filled': 'Vaga preenchida',
    'status.all': 'Todas',

    'jobs.field.title': 'Título',
    'jobs.field.company': 'Empresa',
    'jobs.field.jobtype': 'Tipo de vaga',
    'jobs.field.location': 'Localização',
    'jobs.field.remote': 'Remoto',
    'jobs.field.url': 'URL de candidatura',
    'jobs.field.contact': 'Contacto',
    'jobs.field.description': 'Descrição',
    'jobs.field.salary_min': 'Salário (mínimo)',
    'jobs.field.salary_max': 'Salário (máximo)',
    'jobs.field.salary_currency': 'Moeda',
    'jobs.field.salary_period': 'Período salarial',
    'jobs.field.country': 'País',
    'jobs.field.status': 'Estado',

    'jobs.form.error.generic': 'Não foi possível guardar a vaga. Tente novamente.',
    'jobs.form.error.recaptcha': 'Não foi possível verificar o seu browser. Recarregue e tente novamente.',
    'jobs.form.error.recaptcha_unavailable': 'A protecção anti-spam está indisponível. Tente daqui a um momento.',
    'jobs.form.error.network': 'Erro de rede. Verifique a ligação e tente novamente.',

    'admin.confirm.bulk_set_status': 'Definir o estado "{{status}}" para {{count}} vaga(s)?',
    'admin.confirm.bulk_reason': 'Motivo opcional (aparece no histórico de moderação):',
    'admin.confirm.grant_role': 'Conceder o papel ADMIN ao utilizador {{userId}}?',
    'admin.confirm.revoke_role': 'Revogar o papel ADMIN deste utilizador?',
    'admin.confirm.set_status': 'Motivo opcional para passar para "{{status}}":',
    'deactivate.confirm.permanent_delete': 'Apagar esta vaga definitivamente? Esta acção não pode ser desfeita.',
    'deactivate.confirm.failed': 'Não foi possível apagar essa vaga: {{error}}',
    'modal.ok': 'OK',
    'modal.cancel': 'Cancelar',

    'a11y.skip_to_content': 'Saltar para o conteúdo principal',

    'deactivate.aria_title': 'Desactivar esta vaga',

    'legal.privacy.title': 'Política de Privacidade',
    'legal.privacy.intro': 'Esta página resume como a Employed trata os seus dados pessoais quando visita, regista uma conta, publica vagas ou compra uma publicação em destaque.',
    'legal.privacy.data_we_collect': 'Dados que recolhemos',
    'legal.privacy.data_we_collect_body': 'Email da conta e nome público, vagas que publica, endereços IP e User-Agent para prevenção de abuso e (quando compra uma vaga em destaque) os metadados de pagamento devolvidos pelo Stripe. Nunca recebemos o número do seu cartão.',
    'legal.privacy.use': 'Como usamos os dados',
    'legal.privacy.use_body': 'Para entregar o serviço que pediu: mostrar as suas vagas, enviar emails transaccionais, prevenir spam (reCAPTCHA) e processar pagamentos via Stripe.',
    'legal.privacy.retention': 'Retenção',
    'legal.privacy.retention_body': 'As vagas são mantidas até as apagar ou até expirarem em 90 dias. A conta mantém-se até solicitar a sua remoção na página da conta.',
    'legal.privacy.rights': 'Os seus direitos',
    'legal.privacy.rights_body': 'Pode pedir exportação ou remoção de conta a qualquer momento na página da conta. Respondemos em até 30 dias.',
    'legal.privacy.contact': 'Contacto',
    'legal.privacy.contact_body': 'Para questões de privacidade, escreva-nos para {{email}}.',
    'legal.privacy.last_updated': 'Última actualização: {{date}}',

    'legal.terms.title': 'Termos de Serviço',
    'legal.terms.intro': 'Ao usar a Employed concorda com estes Termos.',
    'legal.terms.acceptable_use': 'Uso aceitável',
    'legal.terms.acceptable_use_body': 'Não publique anúncios discriminatórios, fraudulentos, MLM ou duplicados. Podemos remover qualquer publicação ao nosso critério.',
    'legal.terms.payments': 'Pagamentos',
    'legal.terms.payments_body': 'Vagas em destaque são vendidas como upgrades não-reembolsáveis de 30 dias, processadas pelo Stripe. Reembolsos são ao nosso critério em caso de erro de plataforma.',
    'legal.terms.liability': 'Responsabilidade',
    'legal.terms.liability_body': 'A Employed é fornecida tal como está. Não somos parte da relação laboral entre quem publica e quem se candidata.',
    'legal.terms.changes': 'Alterações',
    'legal.terms.changes_body': 'Podemos actualizar estes Termos; mudanças materiais serão resumidas na página inicial.',

    'legal.privacy_link': 'Privacidade',
    'legal.terms_link': 'Termos',

    'account.title': 'A sua conta',
    'account.subtitle': 'Gere o perfil, exporte os dados ou apague a conta.',
    'account.export.heading': 'Exportar os seus dados',
    'account.export.body': 'Descarregue um ficheiro JSON com a sua conta e todas as vagas que publicou.',
    'account.export.button': 'Pedir exportação',
    'account.export.ready': 'A sua exportação está pronta: {{link}}',
    'account.export.error': 'Não foi possível gerar a exportação. Tente mais tarde.',
    'account.delete.heading': 'Apagar conta',
    'account.delete.body': 'Agenda a remoção permanente em 30 dias. Durante este período pode cancelar nesta página; após 30 dias a conta, vagas e histórico são apagados da base de dados.',
    'account.delete.button': 'Pedir remoção da conta',
    'account.delete.confirm': 'Escreva APAGAR para confirmar. A conta será apagada em 30 dias e não pode ser recuperada.',
    'account.delete.scheduled': 'Remoção agendada para {{date}}. {{cancelLink}} para manter a conta.',
    'account.delete.cancel': 'Cancelar o pedido de remoção',
    'account.delete.canceled': 'Pedido de remoção cancelado.',
    'account.profile_heading': 'Perfil',
    'account.email': 'E-mail',
    'account.email_verified': 'Verificado',
    'account.email_unverified': 'Por verificar',
    'account.created_at': 'Membro desde',

    // Redesign 2026
    'home.recent_jobs': 'Vagas recentes',
    'home.see_all_jobs': 'Ver todas as vagas',
    'home.trust.free': 'Publicação gratuita',
    'home.trust.local': 'Local',
    'home.trust.duration': 'Listagens de 90 dias',
    'home.trust.active_jobs': 'vagas activas',
    'jobs.count_label': 'vagas',
    'jobs.none_found_filters': 'Tente ajustar ou limpar os filtros.',
    'jobs.none_found_empty': 'Volte em breve — novas vagas são publicadas regularmente.',
    'job.apply_contact': 'Candidatar / Contactar',
    'job.sidebar.how_to_apply': 'Como candidatar',
    'job.sidebar.details': 'Detalhes da vaga',
    'form.step.basics': 'Básicos',
    'form.step.details': 'Detalhes',
    'form.step.preview': 'Pré-visualizar',
    'form.step.next': 'Seguinte',
    'form.step.back': 'Voltar',
    'form.submit.post_job': 'Publicar vaga',
    'form.submit.posting': 'A publicar…',
    'form.preview.label': 'Pré-visualização',
    'form.recaptcha.and': 'e os',
    'form.recaptcha.notice': 'Este site é protegido pelo reCAPTCHA e aplicam-se a',

    // Job detail — context bars
    'job.owner.your_listing': 'A sua publicação',
    'job.no_description': 'Sem descrição.',
    'admin.suggested_tweet': 'Tweet sugerido',

    // Emails ao publicador
    'email.poster.submission.subject': 'Recebemos a sua vaga "{{title}}"',
    'email.poster.submission.text': 'Obrigado por publicar na Employed.\n\nRecebemos a sua vaga "{{title}}" e um administrador irá revisá-la em breve. Receberá outro email assim que estiver publicada.\n\nVer a sua publicação:\n{{url}}',
    'email.poster.submission.html': '<p>Obrigado por publicar na Employed.</p><p>Recebemos a sua vaga <strong>{{title}}</strong> e um administrador irá revisá-la em breve. Receberá outro email assim que estiver publicada.</p><p><a href="{{url}}">Ver a sua publicação</a></p>',
    'email.poster.status.active.subject': 'A sua vaga "{{title}}" está publicada',
    'email.poster.status.active.text': 'Boas notícias — a sua vaga "{{title}}" foi aprovada e já está publicada na Employed.\n\nVer aqui:\n{{url}}',
    'email.poster.status.active.html': '<p>Boas notícias — a sua vaga <strong>{{title}}</strong> foi aprovada e já está publicada na Employed.</p><p><a href="{{url}}">Ver a sua publicação</a></p>',
    'email.poster.status.flagged.subject': 'A sua vaga "{{title}}" foi sinalizada',
    'email.poster.status.flagged.text': 'Um administrador sinalizou a sua vaga "{{title}}" para revisão.\n\nMotivo: {{reason}}\n\nEstá temporariamente oculta. Pode editá-la e reenviá-la:\n{{url}}',
    'email.poster.status.flagged.html': '<p>Um administrador sinalizou a sua vaga <strong>{{title}}</strong> para revisão.</p><p><strong>Motivo:</strong> {{reason}}</p><p>Está temporariamente oculta. <a href="{{url}}">Edite a sua publicação</a> e reenvie.</p>',
    'email.poster.status.inactive.subject': 'A sua vaga "{{title}}" foi desactivada',
    'email.poster.status.inactive.text': 'A sua vaga "{{title}}" foi desactivada por um administrador.\n\nMotivo: {{reason}}\n\n{{url}}',
    'email.poster.status.inactive.html': '<p>A sua vaga <strong>{{title}}</strong> foi desactivada por um administrador.</p><p><strong>Motivo:</strong> {{reason}}</p><p><a href="{{url}}">Ver a sua publicação</a></p>',
    'email.poster.status.filled.subject': 'A sua vaga "{{title}}" foi marcada como preenchida',
    'email.poster.status.filled.text': 'A sua vaga "{{title}}" foi marcada como preenchida por um administrador.\n\n{{url}}',
    'email.poster.status.filled.html': '<p>A sua vaga <strong>{{title}}</strong> foi marcada como preenchida por um administrador.</p><p><a href="{{url}}">Ver a sua publicação</a></p>',
    'email.poster.status.pending.subject': 'A sua vaga "{{title}}" aguarda revisão',
    'email.poster.status.pending.text': 'A sua vaga "{{title}}" voltou à fila de revisão.\n\nMotivo: {{reason}}\n\n{{url}}',
    'email.poster.status.pending.html': '<p>A sua vaga <strong>{{title}}</strong> voltou à fila de revisão.</p><p><strong>Motivo:</strong> {{reason}}</p><p><a href="{{url}}">Ver a sua publicação</a></p>',

    'accounts.signIn.title': 'Iniciar sessão',
    'accounts.signIn.button': 'Entrar',
    'accounts.signUp.title': 'Criar uma conta',
    'accounts.signUp.button': 'Criar conta',
    'accounts.forgotPwd.title': 'Recuperar palavra-passe',
    'accounts.forgotPwd.button': 'Enviar link',
    'accounts.resetPwd.title': 'Escolha uma nova palavra-passe',
    'accounts.resetPwd.button': 'Guardar palavra-passe',
    'accounts.field.email.placeholder': 'Endereço de email',
    'accounts.field.password.placeholder': 'Palavra-passe',
    'accounts.field.password_again.placeholder': 'Confirme a palavra-passe',
    'accounts.link.signIn': 'Já tem conta? Inicie sessão',
    'accounts.link.signUp': 'Novo aqui? Crie uma conta',
    'accounts.link.forgotPwd': 'Esqueceu a palavra-passe?',
    'accounts.error.signin_failed': 'Não foi possível iniciar sessão com essas credenciais.',

    'accounts.signIn.subtitle': 'Bem-vindo de volta — inicie sessão para gerir as suas vagas.',
    'accounts.signUp.subtitle': 'Publicar vagas é gratuito. Sem cartão de crédito.',
    'accounts.signUp.success': 'Conta criada. Seja bem-vindo!',
    'accounts.forgotPwd.subtitle': 'Escreva o seu email e enviamos um link de recuperação.',
    'accounts.forgotPwd.success': 'Se existir uma conta com esse email, o link de recuperação já segue.',
    'accounts.resetPwd.subtitle': 'Escolha uma palavra-passe forte que não use noutro sítio.',
    'accounts.resetPwd.success': 'Palavra-passe actualizada — já iniciou sessão.',
    'accounts.resetPwd.invalid_token': 'Este link de recuperação é inválido ou expirou. Peça um novo.',
    'accounts.verifyEmail.title': 'A verificar o seu email',
    'accounts.verifyEmail.verifying': 'A confirmar o seu endereço…',
    'accounts.verifyEmail.success': 'Pronto — o seu email está verificado. Já pode publicar vagas.',
    'accounts.verifyEmail.error': 'Não foi possível verificar este link. Pode estar expirado ou já utilizado.',
    'accounts.error.email_required': 'Escreva o seu email.',
    'accounts.error.password_required': 'Escreva a sua palavra-passe.',
    'accounts.error.password_min': 'A palavra-passe tem de ter pelo menos 8 caracteres.',
    'accounts.error.password_mismatch': 'As palavras-passe não coincidem.',
    'accounts.error.email_in_use': 'Este email já está registado. Inicie sessão ou recupere a palavra-passe.',
    'accounts.cta.back_to_sign_in': 'Voltar a iniciar sessão',

    'mine.status_pending': 'Em revisão',
    'mine.status_active': 'Publicada',
    'mine.status_flagged': 'Sinalizada',
    'mine.status_inactive': 'Inactiva',
    'mine.status_filled': 'Preenchida',

    'mine.action.view': 'Ver',
    'mine.action.edit': 'Editar',

    'age.just_now': 'agora mesmo',
    'age.minute': 'há {{n}} minuto',
    'age.minutes': 'há {{n}} minutos',
    'age.hour': 'há {{n}} hora',
    'age.hours': 'há {{n}} horas',
    'age.day': 'há {{n}} dia',
    'age.days': 'há {{n}} dias',
    'age.month': 'há {{n}} mês',
    'age.months': 'há {{n}} meses',
    'age.year': 'há {{n}} ano',
    'age.years': 'há {{n}} anos',
    'admin.posted_ago': 'publicado {{age}}',

    'verify.confirmation.title': 'Email verificado',
    'verify.confirmation.body': 'Obrigado — o seu email foi verificado. Já pode publicar vagas e receber notificações.',
  }
};

// Resolve the locale the visitor sees right now.
//   * Server callers should pass an explicit `locale` to `t()` — there
//     is no per-request Session on the server. Without one the helper
//     returns English.
//   * Client uses Session('locale') override, then market.locale, then 'en'.
//   * Both override and market.locale may be BCP-47 tags like "es-MX";
//     resolveBucket strips the region to fall back to a base bucket.
resolveBucket = function(loc) {
  if (!loc) return null;
  if (Translations[loc]) return loc;
  var dash = loc.indexOf('-');
  if (dash > 0) {
    var base = loc.slice(0, dash);
    if (Translations[base]) return base;
  }
  return null;
};

currentLocale = function() {
  if (Meteor.isClient) {
    try {
      var override = Session.get('locale');
      var b = resolveBucket(override);
      if (b) return b;
    } catch (e) { /* Session not ready */ }
    if (typeof currentMarket === 'function') {
      try {
        var m = currentMarket();
        var mb = resolveBucket(m && m.locale);
        if (mb) return mb;
      } catch (e) { /* hostname not resolvable yet */ }
    }
  }
  return 'en';
};

// Return the full BCP-47 tag for browser metadata, while currentLocale()
// keeps returning the translation bucket ("es", "pt", "en").
currentLocaleTag = function() {
  if (Meteor.isClient) {
    try {
      var override = Session.get('locale');
      if (resolveBucket(override)) return override;
    } catch (e) { /* Session not ready */ }
    if (typeof currentMarket === 'function') {
      try {
        var m = currentMarket();
        if (m && resolveBucket(m.locale)) return m.locale;
      } catch (e) { /* hostname not resolvable yet */ }
    }
  }
  return currentLocale();
};

// Look up a translation. `vars` keys are interpolated wherever {{name}}
// appears in the source string. Missing keys fall through to English
// and finally to the key itself (so QA can spot un-translated text).
t = function(key, vars, locale) {
  var loc = resolveBucket(locale) || currentLocale();
  var dict = Translations[loc] || Translations.en;
  var str = dict[key];
  if (str == null) str = Translations.en[key];
  if (str == null) return key;
  if (vars) {
    Object.keys(vars).forEach(function(name) {
      var re = new RegExp('\\{\\{\\s*' + name + '\\s*\\}\\}', 'g');
      str = str.replace(re, vars[name] == null ? '' : String(vars[name]));
    });
  }
  return str;
};

// Persist a manual locale choice on the client. Reactively re-renders
// every {{t '…'}} helper because the helper reads Session('locale').
setLocale = function(locale) {
  if (!Meteor.isClient) return;
  // Accept BCP-47 tags (es-MX), but require that we can resolve a bucket.
  var bucket = resolveBucket(locale);
  if (!bucket) return;
  Session.set('locale', locale);
  try {
    document.documentElement.lang = locale;
    // Persist across reloads. localStorage is wrapped in try/catch
    // because some browsers (private mode, iframes) reject access.
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('employed.locale', locale);
    }
  } catch (e) { /* ignore */ }
};

if (Meteor.isClient) {
  // Restore persisted locale on boot.
  Meteor.startup(function() {
    try {
      if (typeof localStorage === 'undefined') return;
      var saved = localStorage.getItem('employed.locale');
      if (saved && resolveBucket(saved)) {
        Session.set('locale', saved);
      }
    } catch (e) { /* ignore */ }
  });

  // {{t 'home.intro'}}  or  {{t 'verify.email_unverified' email=userEmail}}
  Template.registerHelper('t', function(key, kw) {
    var hash = (kw && kw.hash) || {};
    return t(key, hash);
  });

  Template.registerHelper('currentLocale', function() {
    return currentLocale();
  });

  Template.registerHelper('locales', function() {
    return LOCALES.map(function(code) {
      return {
        code: code,
        label: LOCALE_LABELS[code] || code,
        active: currentLocale() === code,
        currentAttrs: currentLocale() === code ? { 'aria-current': 'true' } : {}
      };
    });
  });

  Template.registerHelper('localeLabel', function(code) {
    return LOCALE_LABELS[code] || code;
  });

  // A9.21 — localized status badge text. Use as {{statusLabel job.status}}
  // anywhere the raw enum used to be rendered.
  Template.registerHelper('statusLabel', function(s) {
    if (!s) return '';
    return t('status.' + s);
  });
}
