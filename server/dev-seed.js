// =============================================================================
// dev-seed.js — local-only demo data generator
// =============================================================================
//
// Produces enough fake employers + job listings that a developer spinning the
// UAT stack up for the first time sees a board that looks alive: paginated
// browse, featured cards bubbling to the top, mixed statuses for the admin
// moderation tabs, both markets (MZ / MX) covered.
//
// **Triple-gated** so it can never run in production:
//   1.  `Meteor.isDevelopment` must be true.
//   2.  `Meteor.settings.private.devSeed.enabled` must be `true`.
//   3.  We only seed if the seed-marker collection reports a version
//       mismatch, OR `private.devSeed.reset === true`. Otherwise we no-op.
//
// On a `reset:true` run we delete every doc whose `_id` we previously
// recorded in `_devSeed` and re-seed from scratch. Real users / real jobs
// are never touched because we only delete IDs we know we created.
//
// Tunable knobs in `Meteor.settings.private.devSeed`:
//   enabled (bool) ........ master switch (default off)
//   reset   (bool) ........ delete previously-seeded docs and re-seed
//   admins  (int)  ........ number of admin accounts to seed (default 2)
//   users   (int)  ........ number of employer accounts (default 100)
//   jobs    (int)  ........ number of job postings (default 400)
//   password (str) ....... shared password for all seeded accounts
//                          (default "seedpass123" — local-only)
// =============================================================================

var SEED_VERSION = 1;
var SEED_MARKER_ID = 'devSeed';
var DevSeedMarker = new Mongo.Collection('_devSeed');

Meteor.startup(function () {
  var cfg = Meteor.settings.private && Meteor.settings.private.devSeed;
  if (!Meteor.isDevelopment || !cfg || cfg.enabled !== true) {
    return;
  }

  var marker = DevSeedMarker.findOne(SEED_MARKER_ID);
  var alreadySeeded = marker && marker.version === SEED_VERSION;

  if (alreadySeeded && cfg.reset !== true) {
    console.log('[dev-seed] already seeded at version ' + SEED_VERSION +
                ' (' + (marker.jobIds || []).length + ' jobs, ' +
                (marker.userIds || []).length + ' users). ' +
                'Set private.devSeed.reset=true to re-seed.');
    return;
  }

  if (marker) {
    wipeSeed(marker);
  }

  var counts = {
    admins: clampInt(cfg.admins, 2, 0, 10),
    users:  clampInt(cfg.users, 100, 0, 1000),
    jobs:   clampInt(cfg.jobs, 400, 0, 5000)
  };
  var password = String(cfg.password || 'seedpass123');

  console.log('[dev-seed] seeding ' + counts.admins + ' admins, ' +
              counts.users + ' users, ' + counts.jobs + ' jobs...');
  var t0 = Date.now();

  var users = seedUsers(counts.admins, counts.users, password);
  var jobIds = seedJobs(counts.jobs, users);

  DevSeedMarker.upsert(SEED_MARKER_ID, {
    $set: {
      version: SEED_VERSION,
      seededAt: new Date(),
      userIds: _.pluck(users, '_id'),
      jobIds: jobIds
    }
  });

  console.log('[dev-seed] done in ' + (Date.now() - t0) + 'ms. ' +
              'Sign in with seed.admin.1@employed.local / ' + password);
});

// ----- wipe ------------------------------------------------------------------

function wipeSeed(marker) {
  var jobIds = marker.jobIds || [];
  var userIds = marker.userIds || [];
  if (jobIds.length) {
    Jobs.rawCollection().deleteMany({ _id: { $in: jobIds } });
  }
  if (userIds.length) {
    Meteor.users.rawCollection().deleteMany({ _id: { $in: userIds } });
    // Roles 1.x stores assignments in Meteor.users.roles; deleting the
    // user removes them. Nothing else to clean up.
  }
  console.log('[dev-seed] wiped ' + jobIds.length + ' jobs, ' +
              userIds.length + ' users from previous run');
}

// ----- users -----------------------------------------------------------------

function seedUsers(adminCount, userCount, password) {
  var users = [];
  var i;

  for (i = 1; i <= adminCount; i++) {
    var adminEmail = 'seed.admin.' + i + '@employed.local';
    users.push(createSeedUser(adminEmail, 'Seed Admin ' + i, password, ['admin']));
  }

  // Names are sampled per-iteration so duplicates are possible (real
  // life). Employer profile names sit in `profile.name` per existing
  // schema.
  for (i = 1; i <= userCount; i++) {
    var email = 'seed.user.' + pad(i, 3) + '@employed.local';
    var name = pick(EMPLOYER_NAMES);
    users.push(createSeedUser(email, name, password, []));
  }

  return users;
}

function createSeedUser(email, name, password, roles) {
  var existing = Accounts.findUserByEmail(email);
  var userId;
  if (existing) {
    userId = existing._id;
    Accounts.setPassword(userId, password);
  } else {
    userId = Accounts.createUser({
      email: email,
      password: password,
      profile: { name: name }
    });
  }

  // Email-verified so the seed users skip the verification gate. Same
  // approach as `server/dev-accounts.js`.
  Promise.await(Meteor.users.rawCollection().updateOne(
    { _id: userId, 'emails.verified': { $ne: true } },
    { $set: { 'emails.$[].verified': true } }
  ));

  if (roles && roles.length) {
    try { Roles.createRole('admin'); } catch (e) { /* already exists */ }
    Roles.addUsersToRoles(userId, roles);
  }

  return { _id: userId, name: name, email: email };
}

// ----- jobs ------------------------------------------------------------------

function seedJobs(count, users) {
  if (!count || !users.length) return [];

  var now = Date.now();
  var docs = [];
  var ids = [];

  for (var i = 0; i < count; i++) {
    // Roughly even market split with a slight tilt toward MZ since
    // that is the home market.
    var country = (i % 5 === 0) ? 'Mexico' : 'Mozambique';
    var marketData = country === 'Mexico' ? MX_DATA : MZ_DATA;

    var title    = pick(JOB_TITLES);
    var company  = pick(marketData.companies);
    var location = pick(marketData.cities);
    var jobtype  = weightedPick(JOB_TYPE_WEIGHTS);
    var remote   = Math.random() < 0.18;
    var owner    = pick(users);

    // Spread `createdAt` over the last 85 days. The 90-day expiry cron
    // will still consider these "fresh"; a handful (the oldest tail)
    // will sit close to the boundary, which exercises the expiry UI.
    var ageDays  = Math.floor(Math.random() * 85);
    var createdAt = new Date(now - ageDays * 24 * 3600 * 1000);

    // Status mix tuned for a realistic moderation queue: most are
    // already approved, a handful are pending, a few flagged, some
    // inactive/filled.
    var status = weightedPick({
      'active':   72,
      'pending':  12,
      'flagged':   4,
      'inactive':  8,
      'filled':    4
    });

    var description = buildDescription(title, company, location);

    var doc = {
      _id: Random.id(),
      title: title,
      company: company,
      country: country,
      location: location,
      contact: 'jobs+' + slug(company) + '@example.test',
      jobtype: jobtype,
      remote: remote,
      userId: owner._id,
      userName: owner.name,
      description: description,
      htmlDescription: '<p>' + escapeHtml(description).replace(/\n\n+/g, '</p><p>') + '</p>',
      status: status,
      statusHistory: [{ at: createdAt, by: owner._id, to: status }],
      createdAt: createdAt,
      updatedAt: createdAt
    };

    // ~65% of jobs include a salary band.
    if (Math.random() < 0.65) {
      var salary = buildSalary(country);
      doc.salaryMin = salary.min;
      doc.salaryMax = salary.max;
      doc.salaryCurrency = salary.currency;
      doc.salaryPeriod = salary.period;
    }

    // ~12% of *active* jobs have an active featured boost; 5% have a
    // past (expired) feature so the admin UI shows lapsed state too.
    if (status === 'active') {
      doc.publishedAt = createdAt;
      var roll = Math.random();
      if (roll < 0.12) {
        doc.featuredThrough = new Date(now + (3 + Math.floor(Math.random() * 25)) * 24 * 3600 * 1000);
        doc.featuredChargeHistory = ['seed-' + Random.id(8)];
      } else if (roll < 0.17) {
        doc.featuredThrough = new Date(now - (1 + Math.floor(Math.random() * 15)) * 24 * 3600 * 1000);
        doc.featuredChargeHistory = ['seed-' + Random.id(8)];
      }
    }

    docs.push(doc);
    ids.push(doc._id);
  }

  // Single bulk write — orders of magnitude faster than 400 individual
  // `Jobs.insert()` calls (each of which would run schema validation).
  Promise.await(Jobs.rawCollection().insertMany(docs, { ordered: false }));
  return ids;
}

// ----- description builder ---------------------------------------------------

function buildDescription(title, company, location) {
  var intro = pick([
    'We are hiring a ' + title + ' to join the ' + company + ' team in ' + location + '.',
    company + ' is looking for a talented ' + title + ' based in ' + location + '.',
    'Join ' + company + ' as a ' + title + ' and help us grow our presence in ' + location + '.'
  ]);

  var responsibilities = sampleN(RESPONSIBILITIES, 3 + Math.floor(Math.random() * 3));
  var requirements = sampleN(REQUIREMENTS, 3 + Math.floor(Math.random() * 3));

  return intro + '\n\n' +
    'What you will do:\n- ' + responsibilities.join('\n- ') + '\n\n' +
    'What we are looking for:\n- ' + requirements.join('\n- ') + '\n\n' +
    'We offer a collaborative culture, competitive compensation, and the chance to ' +
    'make a real impact. Apply today.';
}

function buildSalary(country) {
  // Currencies aligned with the schema allowedValues. Amounts are loose
  // demo bands — not meant to be statistically accurate.
  if (country === 'Mexico') {
    var min = 12000 + Math.floor(Math.random() * 30) * 1000;
    return {
      min: min,
      max: min + 6000 + Math.floor(Math.random() * 20) * 1000,
      currency: 'MXN',
      period: 'month'
    };
  }
  var minMzn = 25000 + Math.floor(Math.random() * 60) * 1000;
  return {
    min: minMzn,
    max: minMzn + 15000 + Math.floor(Math.random() * 40) * 1000,
    currency: 'MZN',
    period: 'month'
  };
}

// ----- data tables -----------------------------------------------------------

var JOB_TITLES = [
  'Frontend Engineer', 'Backend Engineer', 'Full Stack Developer',
  'Mobile Developer', 'DevOps Engineer', 'Data Analyst', 'Data Engineer',
  'Product Manager', 'Project Manager', 'UX Designer', 'UI Designer',
  'Marketing Manager', 'Content Writer', 'Social Media Manager',
  'Sales Representative', 'Account Manager', 'Customer Success Manager',
  'Accountant', 'Financial Analyst', 'HR Coordinator', 'Recruiter',
  'Operations Manager', 'Logistics Coordinator', 'Warehouse Supervisor',
  'Driver', 'Construction Foreman', 'Electrician', 'Plumber', 'Welder',
  'Restaurant Manager', 'Chef', 'Barista', 'Waiter', 'Receptionist',
  'Security Guard', 'Cleaner', 'Teacher', 'Translator',
  'Civil Engineer', 'Mechanical Engineer', 'Agricultural Technician',
  'Nurse', 'Pharmacist', 'Lab Technician', 'Lawyer', 'Paralegal'
];

var MZ_DATA = {
  cities: [
    'Maputo', 'Matola', 'Beira', 'Nampula', 'Pemba', 'Tete', 'Quelimane',
    'Chimoio', 'Inhambane', 'Xai-Xai', 'Lichinga', 'Maxixe', 'Nacala'
  ],
  companies: [
    'Mozambique Logistics', 'Costa do Sol Hotels', 'Maputo Tech Hub',
    'Beira Construções', 'Nampula Agro', 'Pemba Marítima',
    'Limpopo Energia', 'Zambezi Foods', 'Sofala Telecom', 'Indico Bank',
    'Niassa Mining', 'Vilanculos Tours', 'Cabo Delgado Pesca',
    'Manica Hospital', 'Inhaca Solar', 'Quirimbas Hospitality',
    'Tete Carvão', 'Gaza Algodão', 'Maputo Media Group',
    'África Oriental Seguros'
  ]
};

var MX_DATA = {
  cities: [
    'Ciudad de México', 'Guadalajara', 'Monterrey', 'Puebla', 'Mérida',
    'Querétaro', 'Tijuana', 'León', 'Cancún', 'Veracruz', 'Toluca',
    'San Luis Potosí', 'Aguascalientes', 'Hermosillo'
  ],
  companies: [
    'Aztec Cloud', 'Polanco Capital', 'Pacífico Logística',
    'Guadalajara Tech', 'Monterrey Industrial', 'Yucatán Hospitality',
    'Sonora Agro', 'Quintana Roo Travel', 'Bajío Manufactura',
    'Veracruz Marítima', 'Reforma Media', 'CDMX Health Group',
    'Norte Energía', 'Maya Foods', 'Sierra Mining',
    'Pacífico Seguros', 'Tijuana Cross-Border', 'Cancún Resorts',
    'Hidalgo Construções', 'Bajío Bank'
  ]
};

var EMPLOYER_NAMES = [
  'Ana Sitoe', 'Carlos Mondlane', 'Mariana Macuácua', 'Pedro Cossa',
  'Luísa Tembe', 'Joaquim Chissano', 'Beatriz Nhantumbo', 'Rui Matsinhe',
  'Helena Massingue', 'Daniel Mucavele', 'Sofia Mahumane', 'André Langa',
  'Teresa Chongo', 'Mateus Sambo', 'Patrícia Mate', 'Bruno Nhassengo',
  'Diana Sengo', 'Hélio Tivane', 'Catarina Vilanculo', 'Filipe Bila',
  'Sara Gimo', 'Vasco Macamo', 'Lara Nuvunga', 'Edson Banze',
  'Joana Banze', 'Tomás Chambal', 'Olga Maússe', 'Nelson Mucumbi',
  'Liliana Macia', 'Cláudio Boane', 'Camila Chissico', 'Renato Zandamela',
  'Sónia Tamele', 'Hugo Chivite', 'Mónica Nhampossa', 'Ivo Massango',
  'Isabel Penicela', 'Gilberto Cuna', 'Maria Salomão', 'Jorge Chaúque',
  'Sofía García', 'Diego Hernández', 'Valentina Ramírez', 'Mateo López',
  'Camila Torres', 'Sebastián Rivera', 'Lucía Flores', 'Emilio Vargas',
  'Renata Castro', 'Andrés Mendoza', 'Daniela Romero', 'Joaquín Ortiz',
  'Paula Jiménez', 'Roberto Silva', 'Adriana Núñez', 'Iván Reyes',
  'Fernanda Pérez', 'Gabriel Soto', 'Natalia Ríos', 'Tomás Aguirre'
];

var RESPONSIBILITIES = [
  'Own end-to-end delivery of features from design to deployment',
  'Collaborate with cross-functional teams across product and design',
  'Maintain and improve our existing codebase',
  'Mentor junior team members',
  'Participate in code reviews and architectural discussions',
  'Build and document internal tools',
  'Define and track key performance metrics',
  'Manage stakeholder relationships',
  'Drive operational improvements',
  'Coordinate vendor relationships',
  'Lead onboarding of new team members'
];

var REQUIREMENTS = [
  '3+ years of relevant experience',
  'Strong written and spoken Portuguese (or Spanish for MX)',
  'Working knowledge of English',
  'Comfortable in a fast-paced, ambiguous environment',
  'Experience working with remote or distributed teams',
  'A portfolio of work you are proud of',
  'Self-starter with strong ownership instincts',
  'Excellent communication skills',
  'Ability to break large problems into shippable increments',
  'Bachelor degree or equivalent practical experience'
];

var JOB_TYPE_WEIGHTS = {
  'Full Time':   60,
  'Part Time':   12,
  'Contract':    10,
  'Temporary':    4,
  'Internship':   4,
  'Freelance':    5,
  'Remote':       3,
  'Volunteer':    1,
  'Other':        1
};

// ----- tiny utils ------------------------------------------------------------

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function sampleN(arr, n) {
  var copy = arr.slice();
  var out = [];
  while (out.length < n && copy.length) {
    var idx = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}

function weightedPick(weightMap) {
  var keys = Object.keys(weightMap);
  var total = 0;
  for (var i = 0; i < keys.length; i++) total += weightMap[keys[i]];
  var r = Math.random() * total;
  var acc = 0;
  for (var j = 0; j < keys.length; j++) {
    acc += weightMap[keys[j]];
    if (r < acc) return keys[j];
  }
  return keys[keys.length - 1];
}

function pad(n, width) {
  var s = String(n);
  while (s.length < width) s = '0' + s;
  return s;
}

function clampInt(v, fallback, min, max) {
  var n = parseInt(v, 10);
  if (!isFinite(n)) n = fallback;
  if (n < min) n = min;
  if (n > max) n = max;
  return n;
}

function slug(s) {
  return String(s).toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
