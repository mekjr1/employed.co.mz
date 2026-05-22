Users = Meteor.users;

UserProfileSchema = new SimpleSchema({
  name: {
    type: String,
    label: "Full Name",
    max: 64,
    optional: true
  }
});

UserSchema = new SimpleSchema({
  _id: {
    type: String,
    regEx: SimpleSchema.RegEx.Id
  },
  username: {
    type: String,
    optional: true
  },
  emails: {
    type: [Object],
    // this must be optional if you also use other login services like facebook,
    // but if you use only accounts-password, then it can be required
    optional: true
  },
  "emails.$.address": {
    type: String,
    regEx: SimpleSchema.RegEx.Email,
    label: "Email Address"
  },
  "emails.$.verified": {
    type: Boolean,
    defaultValue: false
  },
  emailHash: {
    type: String,
    optional: true
  },
  isDeveloper: {
    type: Boolean,
    defaultValue: false
  },
  createdAt: {
    type: Date
  },
  profile: {
    type: UserProfileSchema,
    optional: true
  },
  services: {
    type: Object,
    optional: true,
    blackbox: true
  },
  roles: {
    type: Array,
    optional: true
  },
  "roles.$": {
    type: String
  },
  deletionRequestedAt: {
    type: Date,
    optional: true
  },
  deletionScheduledFor: {
    type: Date,
    optional: true
  },
  // In order to avoid an 'Exception in setInterval callback' from Meteor
  heartbeat: {
    type: Date,
    optional: true,
  }
});

Users.attachSchema(UserSchema);

// Fields a non-admin user is never allowed to mutate on their own user doc.
USER_PROTECTED_FIELDS = ['roles', 'services', 'emails', 'emailHash', 'createdAt', '_id'];

Users.allow({
  insert: function() {
    return false;
  },
  update: function(userId, doc, fieldNames /*, modifier */) {
    if (Roles.userIsInRole(userId, ['admin'])) return true;
    // Meteor.users docs use _id for the user id; there is no `doc.userId` field.
    // The old check (userId === doc.userId) was always false for non-admins,
    // which silently broke the user profile edit modal.
    if (!userId || !doc || userId !== doc._id) return false;
    return !_.intersection(fieldNames, USER_PROTECTED_FIELDS).length;
  },
  remove: function() {
    return false;
  },
  fetch: []
});
