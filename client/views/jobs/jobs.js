// Template.jobs.onCreated(function() {
//   this.infiniteScroll({
//     perPage: 30,
//     subManager: subs,
//     collection: Jobs,
//     publication: 'jobs'
//   });
// });

Template.jobs.helpers({
  "jobs": function() {
    var selector = {};
    var data = Router.current().data();

    if (data && data.country) {
      selector.country = data.country;
    }

    return Jobs.find(selector, {
      sort: {
        featuredThrough: -1,
        createdAt: -1
      }
    });
  },
  "countryLinks": function() {
    return COUNTRIES.map(function(country) {
      return {
        name: country,
        path: "/jobs/country/" + countrySlug(country)
      };
    });
  },
  "countryActive": function(country) {
    var data = Router.current().data();
    return data && data.country === country ? "active" : "";
  },
  "allCountriesActive": function() {
    var data = Router.current().data();
    return data && data.country ? "" : "active";
  }
});
