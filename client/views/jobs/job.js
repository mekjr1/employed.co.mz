Template.job.events({
  // Admin context bar — toggle collapse
  'click .context-bar__toggle': function(event, template) {
    event.preventDefault();
    var btn = $(event.currentTarget);
    var body = btn.closest('.context-bar').find('.context-bar__body');
    var expanded = btn.attr('aria-expanded') === 'true';
    body.toggleClass('collapsed', expanded);
    btn.attr('aria-expanded', !expanded);
  },

  'click #job-deactivate': function(event, template) {
    event.preventDefault();
    Modal.show('jobDeactivate', template.data);
  },

  // A9.26 — report a job. We render a confirm dialog with a textarea
  // (`withReason`) so the reporter can add context, and embed the
  // reason taxonomy in the prompt so they pick a valid value. A more
  // polished UI would be a dedicated modal with a <select>; this stays
  // intentionally small so the moderation UI is the priority.
  'click #job-report': function(event, template) {
    event.preventDefault();
    var jobId = template.data && template.data._id;
    if (!jobId) return;
    AppDialog.prompt({
      title: t('job.report'),
      message: t('job.report.prompt_message'),
      submitClass: 'btn-warning',
      submitLabel: t('job.report'),
      cancelLabel: t('modal.cancel'),
      promptPlaceholder: t('job.report.reason_placeholder'),
      promptValue: 'spam'
    }, function(value) {
      if (value == null) return;
      var reason = String(value || 'spam').trim().toLowerCase();
      Meteor.call('jobReports.create', {
        jobId: jobId,
        reason: reason,
        details: ''
      }, function(error) {
        if (error) {
          AppDialog.alert({
            title: t('job.report'),
            message: (error && error.reason) || t('job.report.error')
          });
          return;
        }
        AppDialog.alert({
          title: t('job.report'),
          message: t('job.report.thanks')
        });
      });
    });
  }
});

Template.job.helpers({
  'hasLabel': function() {
    return this.jobType || this.remote || this.featured;
  },
  // p3-fix-011: prefer the moderation-approval timestamp so the
  // "Publicado em" date matches when the listing actually went live.
  // Older jobs without a publishedAt fall back to createdAt.
  'publicPostedDate': function() {
    return this.publishedAt || this.createdAt;
  },
  // A10.0 — WhatsApp apply deep link.
  //
  // wa.me/<digits> opens the chat with the given number. We strip
  // everything that isn't a digit (including the leading +) because
  // wa.me explicitly expects the international number without
  // separators. The prefilled message uses the localised template
  // with `{{title}}` and `{{company}}` substituted by `t(...)`. If
  // either is missing we fall back to an empty string so the URL
  // still works.
  'whatsappApplyUrl': function() {
    if (!this.applyWhatsApp) return '';
    var digits = String(this.applyWhatsApp).replace(/[^0-9]/g, '');
    if (!digits) return '';
    var msg = '';
    try {
      msg = t('job.apply_whatsapp.message', {
        title: this.title || '',
        company: this.company || ''
      });
    } catch (e) { msg = ''; }
    return 'https://wa.me/' + digits + (msg ? ('?text=' + encodeURIComponent(msg)) : '');
  }
});
