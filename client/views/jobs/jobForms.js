// B1.6: kick off reCAPTCHA loading only for templates that need it.
// A9.30: module-level ReactiveVars surface form submission errors in an
// inline `<div class="alert alert-danger" role="alert" aria-live>`
// region instead of in window.alert(). Keyed by form id so the
// AutoForm hook (which doesn't know which template wraps it) can write
// the message without traversing template parents.
var FormErrors = {
  jobNew: new ReactiveVar(''),
  jobEdit: new ReactiveVar('')
};

// Wizard step state
var JobFormStep = new ReactiveVar(1);
// Snapshot of form values for preview step
var JobFormPreview = new ReactiveVar({});

Template.jobNew.onCreated(function() {
  FormErrors.jobNew.set('');
  JobFormStep.set(1);
  JobFormPreview.set({});
  if (typeof loadRecaptcha === 'function') {
    loadRecaptcha();
  }
});

Template.jobEdit.onCreated(function() {
  FormErrors.jobEdit.set('');
});

// Step helpers
Template.jobNew.helpers({
  formError: function() { return FormErrors.jobNew.get(); },
  isStep: function(n) { return JobFormStep.get() === n; },
  // p2-fix-006: drives the show/hide for each .wizard-step div. We keep
  // every step rendered so AutoForm collects the full document on submit.
  stepDisplayClass: function(n) {
    return JobFormStep.get() === n ? 'is-active' : 'is-hidden';
  },
  stepClass: function(n) {
    var current = JobFormStep.get();
    if (n < current) return 'done';
    if (n === current) return 'active';
    return '';
  },
  stepIcon: function(n) {
    var current = JobFormStep.get();
    return n < current ? '✓' : n;
  },
  isMobile: function() {
    return typeof window !== 'undefined' && window.matchMedia &&
      window.matchMedia('(max-width: 767px)').matches;
  },
  // Preview step values
  previewTitle:   function() { return (JobFormPreview.get() || {}).title || '—'; },
  previewCompany: function() { return (JobFormPreview.get() || {}).company || ''; },
  previewLocation:function() { return (JobFormPreview.get() || {}).location || ''; },
  previewJobtype: function() { return (JobFormPreview.get() || {}).jobtype || ''; },
  previewRemote:  function() { return !!(JobFormPreview.get() || {}).remote; },
  previewContact: function() { return (JobFormPreview.get() || {}).contact || ''; },
  // p2-fix-007: surface the description on the preview step so what the
  // user sees matches the public job detail rendering. We render escaped
  // text wrapped in <p> tags — the server still re-renders via the
  // schema's autoValue, but the preview should never inject raw HTML.
  previewDescriptionHtml: function() {
    var raw = (JobFormPreview.get() || {}).description || '';
    if (!raw) return '';
    var escaped = String(raw)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    // Honour paragraph breaks so the preview reads naturally.
    var paragraphs = escaped.split(/\n{2,}/).map(function(p) {
      return '<p>' + p.replace(/\n/g, '<br>') + '</p>';
    });
    return paragraphs.join('');
  },
  previewInitial: function() {
    var p = JobFormPreview.get() || {};
    var name = p.company || p.title || '?';
    return name.charAt(0).toUpperCase();
  }
});

Template.jobEdit.helpers({
  formError: function() { return FormErrors.jobEdit.get(); }
});

// Wizard navigation events
Template.jobNew.events({
  'click .next-step': function(event, template) {
    event.preventDefault();
    var fromStep = parseInt($(event.currentTarget).data('step'));

    // p2-fix-008: validate the visible step's fields before advancing.
    // We do a per-step check so the user only sees errors relevant to
    // what they just filled in. SimpleSchema's validation context is
    // shared with AutoForm, which paints the messages on each field.
    var ctx = (typeof Jobs !== 'undefined' && Jobs.simpleSchema)
      ? Jobs.simpleSchema().namedContext('jobNew')
      : null;
    var stepFields = {
      1: ['title', 'jobtype', 'company', 'location', 'remote'],
      2: ['description', 'url', 'contact']
    }[fromStep] || [];
    if (ctx && stepFields.length) {
      // Collect current values for this step's fields only.
      var partial = {};
      stepFields.forEach(function(name) {
        // p2-fix-008b: `description` uses the summernote autoform adapter
        // (mpowaga:autoform-summernote), which strips the underlying
        // textarea's `name` attribute when it mounts. A `[name=description]`
        // selector therefore returns 0 elements and per-step validation
        // would always reject step 2 as "required". Read the live editor
        // content directly: `.note-editable` on desktop, `textarea[name]`
        // on mobile (where {{#if isMobile}} renders a plain textarea).
        if (name === 'description') {
          var $note = template.$('.note-editable').first();
          var $mobile = template.$('textarea[name="description"]').first();
          if ($note.length) {
            var html = $note.html() || '';
            // Strip tags to test whether the user typed anything visible.
            var textOnly = html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, '').trim();
            if (textOnly.length > 0) partial[name] = html;
          } else if ($mobile.length) {
            var mv = $mobile.val();
            if (mv) partial[name] = mv;
          }
          return;
        }
        var el = template.$('[name="' + name + '"]').first();
        if (!el.length) return;
        if (el.attr('type') === 'checkbox') {
          partial[name] = el.is(':checked');
        } else {
          var v = el.val();
          if (v !== '' && v != null) partial[name] = v;
        }
      });
      // Add the country (hidden) so SimpleSchema's required check passes.
      partial.country = template.$('[name="country"]').val();
      var keys = stepFields.concat(['country']);
      // aldeed:simple-schema@1.5.4 does NOT support a `keys` option on
      // `validate()`; passing it causes the entire partial to be checked
      // against the FULL schema and always fails on required fields that
      // belong to later steps (description, contact, userId, etc.). Use
      // `validateOne(doc, key)` per field instead — it validates a single
      // key against the schema using the doc for context.
      ctx.resetValidation();
      var firstBadKey = null;
      keys.forEach(function(k) {
        var passed = ctx.validateOne(partial, k);
        if (!passed && !firstBadKey) firstBadKey = k;
      });
      if (firstBadKey) {
        // Scroll to the first invalid field for visibility.
        var $bad = template.$('[name="' + firstBadKey + '"]').first();
        if ($bad.length && $bad.offset()) {
          $('html, body').animate({ scrollTop: $bad.offset().top - 120 }, 200);
          try { $bad.focus(); } catch (e) { /* ignore */ }
        }
        return;
      }
    }

    // Collect form values for preview / data preservation.
    var formData = {};
    template.$('#jobNew input, #jobNew select, #jobNew textarea').each(function() {
      var el = $(this);
      var name = el.attr('name');
      if (!name) return;
      if (el.attr('type') === 'checkbox') {
        formData[name] = el.is(':checked');
      } else {
        formData[name] = el.val();
      }
    });
    JobFormPreview.set(formData);
    JobFormStep.set(fromStep + 1);
    // Scroll to top of form
    $('html, body').animate({ scrollTop: $('.post-job-page').offset().top - 80 }, 200);
  },
  'click .prev-step': function(event, template) {
    event.preventDefault();
    var fromStep = parseInt($(event.currentTarget).data('step'));
    JobFormStep.set(fromStep - 1);
    $('html, body').animate({ scrollTop: $('.post-job-page').offset().top - 80 }, 200);
  },
  // Character counter for mobile textarea
  'input .job-description-textarea': function(event) {
    var len = event.target.value.length;
    var max = 50000;
    var counter = $('#descCharCounter');
    counter.text(len.toLocaleString() + ' / ' + max.toLocaleString());
    counter.removeClass('near-limit at-limit');
    if (len > max * 0.9) counter.addClass('near-limit');
    if (len >= max) counter.addClass('at-limit');
  }
});

function labelSummernoteControls(template) {
  function applyLabels() {
    template.$('.note-btn, .note-color-btn').each(function() {
      var $button = $(this);
      if ($button.attr('aria-label')) return;
      var label = ($button.attr('data-original-title') ||
        $button.attr('title') ||
        $button.attr('data-value') ||
        '').trim();
      if (!label && $button.hasClass('note-color-btn')) {
        label = 'Color';
      }
      if (!label) {
        label = 'Editor control';
      }
      $button.attr('aria-label', label);
      if (!$button.attr('title')) {
        $button.attr('title', label);
      }
    });
  }

  Meteor.setTimeout(applyLabels, 0);
  Meteor.setTimeout(applyLabels, 750);
}

Template.jobNew.onRendered(function() {
  labelSummernoteControls(this);
});

Template.jobEdit.onRendered(function() {
  labelSummernoteControls(this);
});

// Helper to resolve the most useful error message for the inline
// region. Maps known method error codes to localised strings; falls
// back to the server-provided reason text or a generic message.
function resolveJobFormError(error) {
  if (!error) return t('jobs.form.error.generic');
  switch (error.error) {
    case 'spam-detected':
    case 'recaptcha-failed':
      return t('jobs.form.error.recaptcha');
    case 'config-missing':
      return t('jobs.form.error.recaptcha_unavailable');
    default:
      return error.reason || error.message || t('jobs.form.error.generic');
  }
}

// Custom submit handler for reCAPTCHA v3 on job creation
AutoForm.addHooks(['jobNew'], {
  onSubmit: function(doc) {
    const self = this;
    const market = currentMarket();
    doc.country = market.country;

    FormErrors.jobNew.set('');
    $('#submitJobBtn').prop('disabled', true).html('<svg class="btn-brand-spinner" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-dasharray="40 60"/></svg> ' + t('form.submit.posting'));

    // Get reCAPTCHA token
    getRecaptchaToken('submit_job')
      .then(token => {
        Meteor.call('jobs.create', doc, token, market.key, (error, result) => {
          // Reset button
          $('#submitJobBtn').prop('disabled', false).html('<i class="fa fa-check" aria-hidden="true"></i> ' + t('form.submit.post_job'));

          if (error) {
            FormErrors.jobNew.set(resolveJobFormError(error));
            self.done(error);
          } else {
            self.done();
            Router.go('job', { _id: result });
          }
        });
      })
      .catch(error => {
        $('#submitJobBtn').prop('disabled', false).html('<i class="fa fa-check" aria-hidden="true"></i> ' + t('form.submit.post_job'));
        FormErrors.jobNew.set(t('jobs.form.error.recaptcha_unavailable'));
        self.done(error);
      });

    // Prevent default form submission
    return false;
  }
});

// Keep existing hook for job edit
AutoForm.addHooks(['jobEdit'], {
  after: {
    update: function(error, result) {
      if (error) {
        FormErrors.jobEdit.set(error.reason || error.message || t('jobs.form.error.generic'));
      } else {
        Router.go('job', { _id: Router.current().params._id });
      }
    }
  }
});

Template.jobEdit.events({
  'click #cancel': function(event, template) {
    event.preventDefault();
    Router.go("job", { _id: this.job._id });
  }
})
