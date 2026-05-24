Router.configure({
    layoutTemplate: 'layout',
    loadingTemplate: 'loading',
    yieldTemplates: {
        header: {
            to: 'header'
        },
        footer: {
            to: 'footer'
        }
    },
    progressSpinner: false,
    progressDelay: 250,
    // title: APP_NAME + " - Job board and talent listing"
    title: APP_NAME + " - " + APP_TAGLINE
});


Router.map(function() {
    this.route('home', {
        path: '/',
        layoutTemplate: 'layoutNoContainer',
        // T8: per-route SEO description + OpenGraph in the visitor's locale.
        onAfterAction: function () {
            if (Meteor.isClient && typeof applySeo === 'function') applySeo('home');
        },
        data: function() {
            return {
                jobs: Jobs.find({
                    featuredThrough: {
                        $exists: false
                    },
                    status: "active",
                    country: currentMarket().country
                }, {
                    sort: {
                        createdAt: -1
                    },
                    limit: 10
                }),
                // A9.36 — featured strip is exactly one grid row (3 tiles
                // at desktop, 2 at tablet, 1 at mobile). The pub uses
                // $sample so order is random; we keep the cursor open
                // (no sort) so MiniMongo returns them in insertion order,
                // which is whatever Mongo picked this round.
                featuredJobs: Jobs.find({
                    featuredThrough: {
                        $gte: new Date()
                    },
                    // Match the publication: hide jobs older than the 90-day
                    // cutoff even when their paid feature window is still open.
                    createdAt: {
                        $gte: daysUntilExpiration()
                    },
                    status: "active",
                    country: currentMarket().country
                }, {
                    limit: 3
                })
            };
        },
        subscriptions: function() {
            // A9.36 — second arg of `featuredJobs` is the sample size.
            return [
                subs.subscribe('homeJobs', currentMarketKey()),
                subs.subscribe('featuredJobs', currentMarketKey(), 3)
            ];
        }
    });

    this.route('jobs', {
        path: '/jobs',
        title: function() {
            return currentMarket().siteName + " - Jobs";
        },
        onAfterAction: function () {
            if (Meteor.isClient && typeof applySeo === 'function') applySeo('jobs');
        },
        data: function() {
            return {
                market: currentMarket(),
                // A9.36 — featured strip is shared between home and /jobs.
                // Cursor reads the same MiniMongo docs added by the
                // `featuredJobs` random-sample subscription below.
                featuredJobs: Jobs.find({
                    featuredThrough: { $gte: new Date() },
                    createdAt: { $gte: daysUntilExpiration() },
                    status: "active",
                    country: currentMarket().country
                }, { limit: 3 })
            };
        },
        subscriptions: function() {
            // A9.24 — subscription is reactive: when JobsFilter changes
            // we re-subscribe with the new filter bag so the server
            // sends a fresh slice instead of relying on MiniMongo
            // filtering whatever it happened to already cache.
            // A9.36 — the page-size / page-index also live in the
            // filter bag now so paging through results re-subscribes
            // with the new offset.
            var filters = (typeof JobsFilter !== 'undefined' && JobsFilter && JobsFilter.snapshot)
              ? JobsFilter.snapshot()
              : undefined;
            return [
                subs.subscribe('jobs', currentMarketKey(), filters),
                subs.subscribe('featuredJobs', currentMarketKey(), 3)
            ];
        }
    });

    this.route('myJobs', {
        path: '/myjobs',
        title: APP_NAME + " - My Jobs",
        data: function() {
            return {
                jobs: Jobs.find({
                    userId: Meteor.userId(),
                    country: currentMarket().country
                }, {
                    sort: {
                        createdAt: -1
                    }
                })
            };
        },
        waitOn: function() {
            return subs.subscribe('my_jobs', currentMarketKey());
        }
    });

    this.route('adminJobs', {
        path: '/admin/jobs',
        title: APP_NAME + " - Job Moderation",
        // B3.3/B3.4: subscription is now driven reactively from inside
        // the template so the status tabs can swap filters without a
        // full re-route. Also publishes the `adminUsers` list for the
        // Admins panel (B3.7).
        onBeforeAction: function() {
            // H2: wait for the roles subscription to be ready before
            // redirecting — otherwise Roles.userIsInRole returns false
            // while the sub is still loading and non-admin users flash
            // the admin page briefly before the redirect fires.
            if (!Meteor.userId()) {
                this.next();
                return;
            }
            var rolesReady = Meteor.subscribe('_roles').ready();
            if (!rolesReady) {
                this.render('loading');
                return;
            }
            if (!Roles.userIsInRole(Meteor.userId(), ['admin'])) {
                this.redirect('jobs');
            } else {
                this.next();
            }
        }
    });

    this.route('job', {
        path: '/jobs/:_id/:slug?',
        title: function() {
            if (this.data())
                return currentMarket().siteName + " - " + this.data().title;
        },
        data: function() {
            return Jobs.findOne({
                _id: this.params._id
            });
        },
        waitOn: function() {
            return subs.subscribe("job", this.params._id, currentMarketKey());
        },
        onBeforeAction: function() {
            if (!this.data()) {
                this.next();
                return;
            }

            var expectedSlug = this.data().slug();
            if (this.params.slug !== expectedSlug) {
                this.redirect("job", {
                    _id: this.params._id,
                    slug: expectedSlug
                });
            } else {
                this.next();
            }
        },
        // A9.23 — JobPosting JSON-LD + per-job SEO. We can't write
        // schema.org structured data via mdg:seo's `meta:` map, so the
        // helper applyJsonLd() handles the <script> tag directly.
        onAfterAction: function () {
            if (!Meteor.isClient) return;
            var job = this.data();
            if (!job) {
                if (typeof clearJsonLd === 'function') clearJsonLd();
                return;
            }
            if (typeof applySeo === 'function') {
                applySeo('job', {
                    title: job.title,
                    company: job.company || ''
                });
            }
            if (typeof applyJsonLd === 'function') {
                var market = currentMarket();
                var hostHeader = (typeof window !== 'undefined' && window.location) ? window.location.host : '';
                var jobUrl = (typeof absoluteUrlForHost === 'function')
                    ? absoluteUrlForHost('jobs/' + job._id + '/' + job.slug(), hostHeader)
                    : Meteor.absoluteUrl('jobs/' + job._id + '/' + job.slug());
                var posting = {
                    '@context': 'https://schema.org/',
                    '@type': 'JobPosting',
                    title: job.title,
                    description: job.htmlDescription || job.description || '',
                    datePosted: job.createdAt && job.createdAt.toISOString
                        ? job.createdAt.toISOString() : job.createdAt,
                    employmentType: (job.jobtype || '').toUpperCase().replace(/[\s-]+/g, '_'),
                    hiringOrganization: {
                        '@type': 'Organization',
                        name: job.company || (market && market.siteName) || 'Employer'
                    },
                    jobLocation: {
                        '@type': 'Place',
                        address: {
                            '@type': 'PostalAddress',
                            addressLocality: job.location || '',
                            addressCountry: job.country || ''
                        }
                    },
                    url: jobUrl,
                    directApply: false
                };
                if (job.remote) {
                    posting.jobLocationType = 'TELECOMMUTE';
                }
                if (job.salaryMin || job.salaryMax) {
                    posting.baseSalary = {
                        '@type': 'MonetaryAmount',
                        currency: job.salaryCurrency || (market && market.featuredJob && market.featuredJob.currency) || 'USD',
                        value: {
                            '@type': 'QuantitativeValue',
                            minValue: job.salaryMin || job.salaryMax,
                            maxValue: job.salaryMax || job.salaryMin,
                            unitText: (job.salaryPeriod || 'month').toUpperCase()
                        }
                    };
                }
                applyJsonLd(posting);
            }
        }
    });

    this.route('jobNew', {
        path: '/job',
        title: function() {
            return currentMarket().siteName + " - Post a Job";
        },
        onAfterAction: function () {
            if (Meteor.isClient && typeof applySeo === 'function') applySeo('jobNew');
        }
    });

    // ux-fix-006 — `/jobs/new` is the obvious URL people type & link to;
    // keep the canonical short `/job` but accept the long form too.
    this.route('jobNewAlias', {
        path: '/jobs/new',
        action: function() {
            this.redirect('jobNew');
        }
    });

    this.route('jobEdit', {
        path: '/jobs/:_id/:slug/edit',
        title: function() {
            return currentMarket().siteName + " - Edit Job Post";
        },
        data: function() {
            return {
                job: Jobs.findOne({
                    _id: this.params._id
                })
            };
        },
        waitOn: function() {
            return subs.subscribe("job", this.params._id, currentMarketKey());
        },
        // B2.10: only the owner or an admin may load the edit form.
        onBeforeAction: function() {
            if (!this.ready()) {
                this.next();
                return;
            }
            var job = Jobs.findOne({ _id: this.params._id });
            if (!job) {
                this.next();
                return;
            }
            var uid = Meteor.userId();
            var isOwner = uid && job.userId === uid;
            var isAdmin = uid && Roles.userIsInRole(uid, ['admin']);
            if (!isOwner && !isAdmin) {
                this.redirect('job', { _id: job._id, slug: job.slug() });
                return;
            }
            this.next();
        }
    });

    // A9.2 — public legal pages. Localised via the i18n `legal.*`
    // namespace. SEO key is shared because the body strings are static
    // and we want each market's title to default to the dataset entry.
    this.route('legalPrivacy', {
        path: '/privacy',
        title: function() {
            return currentMarket().siteName + ' - Privacy';
        },
        onAfterAction: function () {
            if (Meteor.isClient && typeof applySeo === 'function') applySeo('legalPrivacy');
        }
    });

    this.route('legalTerms', {
        path: '/terms',
        title: function() {
            return currentMarket().siteName + ' - Terms';
        },
        onAfterAction: function () {
            if (Meteor.isClient && typeof applySeo === 'function') applySeo('legalTerms');
        }
    });

    // A9.3 — signed-in account management (data export + scheduled
    // deletion). Locked behind `ensureSignedIn` below.
    this.route('userAccount', {
        path: '/account',
        title: function() {
            return currentMarket().siteName + ' - Account';
        },
        onAfterAction: function () {
            if (Meteor.isClient && typeof applySeo === 'function') applySeo('userAccount');
        }
    });

    // A9.32 — hand-rolled auth routes (PR 2 of BS5 migration).
    // Replaces the routes that useraccounts:bootstrap +
    // useraccounts:iron-routing used to register via
    // `AccountsTemplates.configureRoute("signIn", { path: '/sign-in' })`.
    // Those calls are now commented out in both/accounts.js — iron-router
    // owns these paths exclusively. The template + handler files live
    // under client/views/account/auth.{html,js}. Route names are kept
    // identical (signIn, signUp, forgotPwd, resetPwd, verifyEmail) so
    // that every `{{pathFor 'signIn'}}` in the codebase keeps resolving
    // to the right URL.
    this.route('signIn', {
        path: '/sign-in',
        title: function() { return currentMarket().siteName + ' - Sign in'; },
        // If a signed-in user lands on /sign-in directly (e.g. via a
        // bookmark or refresh after auth) bounce them away. We wrap the
        // `Meteor.userId()` read in `Tracker.nonreactive` so this hook
        // does NOT re-fire when the user logs in via the form on this
        // very page — that post-login redirect is owned by the form
        // submit callback in client/views/account/auth.js. Without the
        // wrapper, iron-router invalidates the autorun on Router.go
        // and re-runs the hook against the now-empty postSignInRoute,
        // overwriting the callback's redirect target with '/'.
        onBeforeAction: function() {
            var signedIn = Tracker.nonreactive(function() { return !!Meteor.userId(); });
            if (signedIn) {
                Router.go('/');
                return;
            }
            this.next();
        }
    });
    this.route('signUp', {
        path: '/sign-up',
        title: function() { return currentMarket().siteName + ' - Create account'; },
        // See the signIn route above for why this read is non-reactive.
        onBeforeAction: function() {
            var signedIn = Tracker.nonreactive(function() { return !!Meteor.userId(); });
            if (signedIn) {
                Router.go('/');
                return;
            }
            this.next();
        }
    });
    this.route('forgotPwd', {
        path: '/forgot-password',
        title: function() { return currentMarket().siteName + ' - Reset password'; }
    });
    // Token routes: the URL embeds the token Meteor emails the user.
    // `Accounts.urls.resetPassword` / `verifyEmail` are overridden in
    // server/accounts.js to emit clean `/reset-password/{token}` and
    // `/verify-email/{token}` paths (no hash prefix).
    this.route('resetPwd', {
        path: '/reset-password/:token',
        title: function() { return currentMarket().siteName + ' - Reset password'; }
    });
    this.route('verifyEmail', {
        path: '/verify-email/:token',
        title: function() { return currentMarket().siteName + ' - Verify email'; }
    });
});

// A9.32 — PR 2 of BS5 migration. Previously this section called
// `Router.plugin('ensureSignedIn', { ... })`, which was provided by
// the `useraccounts:iron-routing` package. That package was removed
// in PR 2 along with `useraccounts:bootstrap`, so we inline the same
// behaviour as a plain `Router.onBeforeAction` hook here.
//
// Same contract:
//   - Only intercepts the routes in `only` (anything else passes through).
//   - Captures the intended URL in `Session.postSignInRoute` so
//     redirectAfterAuth() can take the user back there post-login
//     (see client/views/account/auth.js).
//   - Issues `this.redirect('signIn')` for the rest.
Router.onBeforeAction(function() {
    if (!Meteor.userId()) {
        if (Meteor.isClient) {
            try {
                Session.set('postSignInRoute', this.url);
            } catch (e) {
                // Session is unavailable on the server during SSR-like calls.
            }
        }
        this.redirect('signIn');
        return;
    }
    this.next();
}, {
    only: ['adminJobs', 'jobEdit', 'jobNew', 'jobNewAlias', 'myJobs', 'userAccount']
});

Router.plugin('dataNotFound', {
    notFoundTemplate: 'notFound'
});
