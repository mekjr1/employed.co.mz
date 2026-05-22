Template.jobDeactivate.events({
  "click .deactivate": function(event, template) {
    event.preventDefault();

    Meteor.call("deactivateJob", template.data._id, $(event.currentTarget).hasClass("filled"), function(error, result) {
      Modal.hide("jobDeactivate");
    });
  },
  // B2.15 / A9.19: hard-delete the job from Mongo after a confirmation.
  // Switched from window.confirm/alert to AppDialog so the dialogue is
  // themed, localised, and reachable by assistive tech (see
  // client/lib/dialog.js).
  "click .delete-permanent": function(event, template) {
    event.preventDefault();
    var jobId = template.data._id;
    AppDialog.confirm({
      title: t('action.delete'),
      message: t('deactivate.confirm.permanent_delete'),
      submitClass: 'btn-danger',
      submitLabel: t('action.delete'),
      cancelLabel: t('action.cancel')
    }, function(ok) {
      if (!ok) return;
      Meteor.call('jobs.deleteMine', jobId, function(error) {
        Modal.hide('jobDeactivate');
        if (error) {
          AppDialog.alert({
            title: t('action.delete'),
            message: t('deactivate.confirm.failed', { error: error.reason || error.message || '' })
          });
          return;
        }
        Router.go('myJobs');
      });
    });
  }
});
