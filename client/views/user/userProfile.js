AutoForm.addHooks(['userProfileEdit'], {
  after: {
    update: function(error /*, result */) {
      if (error) {
        // Surface the failure to the user; AutoForm already shows
        // field-level validation errors, but a top-of-form alert is
        // useful for transport-level issues (offline, 5xx, etc.).
        console.error('userProfileEdit update failed:', error && error.reason || error);
        return;
      }
      Modal.hide("userProfile");
    }
  }
});

Template.userProfile.events({
  'click #cancel': function(event, template) {
    event.preventDefault();
    Modal.hide("userProfile");
  }
});
