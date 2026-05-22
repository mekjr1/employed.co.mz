// A9.2 — helpers for the Privacy and Terms pages. The contact email is
// surfaced from `Meteor.settings.public.contactEmail` so operators can
// rotate it without code edits; falls back to the build-time admin
// notification address if none is set. `lastUpdated` is hard-coded per
// release — bump it whenever the i18n body strings change so visitors
// see the new date.

var PRIVACY_LAST_UPDATED = '2026-05-12';

function contactEmailValue() {
	var pub = (Meteor.settings && Meteor.settings.public) || {};
	if (pub.contactEmail) return pub.contactEmail;
	if (pub.adminEmail) return pub.adminEmail;
	return 'support@employed.co.mz';
}

Template.legalPrivacy.helpers({
	contactEmail: contactEmailValue,
	lastUpdated: function() { return PRIVACY_LAST_UPDATED; }
});

Template.legalTerms.helpers({
	lastUpdated: function() { return PRIVACY_LAST_UPDATED; }
});
