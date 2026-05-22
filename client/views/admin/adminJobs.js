// B3.3 + B3.4: the admin moderation page now drives its own
// subscription off a ReactiveVar so status tabs can swap the filter
// without re-routing. It also wires the B3.8 bulk-status flow and the
// B3.7 admins panel.

var PAGE_SIZE = 50;

Template.adminJobs.onCreated(function() {
  var instance = this;
  // Default tab = pending, since that’s the moderation queue.
  instance.currentTab = new ReactiveVar('pending');
  instance.currentLimit = new ReactiveVar(PAGE_SIZE);
  // Selected job ids for bulk operations. Cleared whenever the tab or
  // page changes so we never apply across views.
  instance.selected = new ReactiveVar({});
  instance.bulkStatus = new ReactiveVar('');

  instance.autorun(function() {
    var tab = instance.currentTab.get();
    var limit = instance.currentLimit.get();
    // p3-fix-017: the publication accepts `null` or a status string.
    // The Todas/All tab is represented by the literal 'all' in the
    // template state — translate it to `null` so the server's
    // Match.OneOf(null, undefined, …STATUSES) check passes instead of
    // silently dropping the subscription.
    var pubStatus = (tab === 'all' || tab == null) ? null : tab;
    instance.subscribe('adminJobs', pubStatus, limit);
  });

  // Pending count badge — piggyback on a tiny dedicated subscription so
  // the badge stays current regardless of the active tab.
  instance.autorun(function() {
    instance.subscribe('adminJobs', 'pending', PAGE_SIZE);
  });

  instance.subscribe('adminUsers');

  // A9.26 — pending job reports queue. Always-subscribed so the
  // moderation page surfaces new reports as soon as they arrive.
  instance.subscribe('adminJobReports', 'pending', PAGE_SIZE);
});

Template.adminJobs.helpers({
  statuses: function() {
    return STATUSES;
  },
  statusTabs: function() {
    var current = Template.instance().currentTab.get();
    return _.map(JOB_STATUS_TABS, function(tab) {
      // A9.21: localised tab label. The constants file still ships a
      // fallback English `label`, but UI text comes from i18n via the
      // `status.<key>` namespace (and `status.all` for the All tab).
      var labelKey = (tab.key == null) ? 'status.all' : 'status.' + tab.key;
      return _.extend({}, tab, {
        label: t(labelKey),
        tabKey: tab.key == null ? 'all' : tab.key,
        isPendingTab: tab.key === 'pending',
        tabActiveClass: (tab.key === current || (tab.key == null && current === 'all'))
          ? 'active' : ''
      });
    });
  },
  pendingCount: function() {
    return Jobs.find({ status: 'pending' }).count();
  },
  jobs: function() {
    var tab = Template.instance().currentTab.get();
    var selector = (tab && tab !== 'all') ? { status: tab } : {};
    return Jobs.find(selector, { sort: { createdAt: -1 } });
  },
  showLoadMore: function() {
    var instance = Template.instance();
    var tab = instance.currentTab.get();
    var selector = (tab && tab !== 'all') ? { status: tab } : {};
    return Jobs.find(selector).count() >= instance.currentLimit.get();
  },
  selectedCount: function() {
    var sel = Template.instance().selected.get();
    return _.size(sel);
  },
  bulkApplyDisabled: function() {
    var instance = Template.instance();
    var hasSelection = _.size(instance.selected.get()) > 0;
    var hasStatus = !!instance.bulkStatus.get();
    return (hasSelection && hasStatus) ? '' : 'disabled';
  },
  isSelected: function() {
    var sel = Template.instance().selected.get();
    return sel[this._id] ? 'checked' : '';
  },
  admins: function() {
    return Meteor.users.find(
      { roles: 'admin' },
      { sort: { createdAt: 1 } }
    );
  },
  adminName: function() {
    return (this.profile && this.profile.name) ||
      (this.emails && this.emails[0] && this.emails[0].address.split('@')[0]) ||
      this._id;
  },
  adminEmail: function() {
    return (this.emails && this.emails[0] && this.emails[0].address) || '—';
  },
  isSelf: function() {
    return this._id === Meteor.userId();
  },

  // A9.26 — pending reports queue.
  pendingReports: function() {
    if (typeof JobReports === 'undefined') return [];
    return JobReports.find({ resolution: 'pending' }, {
      sort: { createdAt: -1 }
    });
  },
  pendingReportCount: function() {
    if (typeof JobReports === 'undefined') return 0;
    return JobReports.find({ resolution: 'pending' }).count();
  },
  reportJob: function() {
    return Jobs.findOne({ _id: this.jobId });
  },
  reportReasonLabel: function() {
    return t('admin.reports.reason.' + this.reason, {}) || this.reason;
  }
});

Template.adminJobs.events({
  'click .set-tab': function(event, template) {
    event.preventDefault();
    var raw = $(event.currentTarget).data('tab');
    var tab = (raw === 'all' || raw == null) ? 'all' : String(raw);
    template.currentTab.set(tab);
    template.currentLimit.set(PAGE_SIZE);
    template.selected.set({});
  },

  'click .load-more': function(event, template) {
    event.preventDefault();
    template.currentLimit.set(template.currentLimit.get() + PAGE_SIZE);
  },

  'change .select-job': function(event, template) {
    var id = $(event.currentTarget).data('job-id');
    var checked = event.currentTarget.checked;
    var sel = _.clone(template.selected.get());
    if (checked) sel[id] = true; else delete sel[id];
    template.selected.set(sel);
  },

  'change .select-all': function(event, template) {
    var sel = {};
    if (event.currentTarget.checked) {
      $('.select-job').each(function() {
        sel[$(this).data('job-id')] = true;
      });
    }
    template.selected.set(sel);
  },

  'change .bulk-status': function(event, template) {
    template.bulkStatus.set(event.currentTarget.value);
  },

  'click .bulk-apply': function(event, template) {
    event.preventDefault();
    var selected = template.selected.get();
    var ids = _.keys(selected);
    var status = template.bulkStatus.get();
    if (!ids.length || !status) return;

    // A9.19: native prompt() / confirm() replaced with the themed and
    // localised AppDialog. The optional reason becomes the third arg
    // to adminSetJobStatusBulk so it lands in the moderation log.
    AppDialog.confirm({
      title: t('admin.confirm.bulk_set_status', { status: t('status.' + status), count: ids.length }),
      message: t('admin.confirm.bulk_reason'),
      withReason: true,
      reasonLabel: t('admin.confirm.bulk_reason'),
      submitClass: 'btn-primary',
      submitLabel: t('action.continue'),
      cancelLabel: t('action.cancel')
    }, function(ok, reason) {
      if (!ok) return;
      Meteor.call('adminSetJobStatusBulk', ids, status, reason || undefined,
        function(err, result) {
          if (err) {
            AppDialog.alert({
              title: t('admin.title'),
              message: err.reason || err.message || 'Bulk update failed.'
            });
            return;
          }
          template.selected.set({});
          template.bulkStatus.set('');
          if (result && result.updated < result.requested) {
            AppDialog.alert({
              title: t('admin.title'),
              message: 'Updated ' + result.updated + ' of ' + result.requested + ' job(s). Some updates were skipped — see the server log.'
            });
          }
        });
    });
  },

  'submit .grant-admin-form': function(event, template) {
    event.preventDefault();
    var $input = template.$('#grant-admin-input');
    var id = ($input.val() || '').trim();
    if (!id) return;
    AppDialog.confirm({
      title: t('admin.admins.grant'),
      message: t('admin.confirm.grant_role', { userId: id }),
      submitClass: 'btn-primary',
      submitLabel: t('admin.admins.grant'),
      cancelLabel: t('action.cancel')
    }, function(ok) {
      if (!ok) return;
      Meteor.call('adminGrantRole', id, 'admin', function(err) {
        if (err) {
          AppDialog.alert({
            title: t('admin.admins.grant'),
            message: err.reason || err.message || 'Could not grant admin role.'
          });
          return;
        }
        $input.val('');
      });
    });
  },

  'click .revoke-admin': function(event) {
    event.preventDefault();
    var userId = $(event.currentTarget).data('user-id');
    if (!userId) return;
    AppDialog.confirm({
      title: t('admin.admins.revoke'),
      message: t('admin.confirm.revoke_role'),
      submitClass: 'btn-danger',
      submitLabel: t('admin.admins.revoke'),
      cancelLabel: t('action.cancel')
    }, function(ok) {
      if (!ok) return;
      Meteor.call('adminRevokeRole', userId, 'admin', function(err) {
        if (err) {
          AppDialog.alert({
            title: t('admin.admins.revoke'),
            message: err.reason || err.message || 'Could not revoke admin role.'
          });
        }
      });
    });
  },

  // A9.26 — resolve a report. Admins pick "dismissed" (false alarm) or
  // "job_removed" (we acted on it). The job itself is moderated via
  // the existing adminSetJobStatus/bulk flows.
  'click .resolve-report': function(event) {
    event.preventDefault();
    var reportId = $(event.currentTarget).data('id');
    var resolution = $(event.currentTarget).data('resolution');
    if (!reportId || !resolution) return;
    AppDialog.confirm({
      title: t('admin.reports.resolve_title'),
      message: t('admin.reports.resolve_message', { resolution: resolution }),
      submitClass: 'btn-primary',
      submitLabel: t('action.continue'),
      cancelLabel: t('action.cancel')
    }, function(ok) {
      if (!ok) return;
      Meteor.call('jobReports.resolve', reportId, resolution, function(err) {
        if (err) {
          AppDialog.alert({
            title: t('admin.reports.resolve_title'),
            message: err.reason || err.message || 'Could not resolve report.'
          });
        }
      });
    });
  }
});
