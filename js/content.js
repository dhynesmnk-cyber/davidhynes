/* Content for the garden. One entry per section.
   `id` is used everywhere: flower geometry, panel, text-resume anchor. */

export const PERSON = {
  name: 'David Hynes',
  role: 'AI Enablement · Melbourne',
  email: 'd.hynes.mnk@gmail.com',
  phone: '0411 039 718',
  social: '@dave.likeswine',
  cv: '/cv.pdf'
};

export const SECTIONS = [
  {
    id: 'hive',
    kind: 'hive',
    label: 'The hive',
    title: 'David Hynes',
    kicker: 'Who I am',
    accent: '#ffb03a',
    accent2: '#ff8a3d',
    pos: [0, -7],
    lead: 'I ran wine bars and a bottleshop before I ran anything technical, which is why I have no patience for AI advice that ignores payroll.',
    body: [
      'I help Australian small businesses pick the two or three AI things actually worth doing, then train their staff until nobody needs me anymore.',
      'I wrote <em>The AI Playbook for Small Business in Australia</em> because somebody had to write the boring, useful version.'
    ],
    list: {
      style: 'facts',
      items: [
        ['Based', 'Melbourne, VIC'],
        ['Doing', 'AI enablement, automation, and the training that makes it stick'],
        ['Before that', '15 years in hospitality and retail']
      ]
    },
    hint: 'Home base. Fly out from here — the hive stays visible from most of the garden.'
  },

  {
    id: 'work',
    kind: 'coneflower',
    label: 'What I do',
    title: 'What I do',
    kicker: 'The job, plainly',
    accent: '#ff2d95',
    accent2: '#ff6ec7',
    pos: [15, 7],
    lead: 'I find the thing that is quietly costing a business six hours a week, and I make it stop.',
    body: [
      'Usually that is a spreadsheet somebody rebuilds every Monday, or a question staff have to interrupt a manager to answer. Rarely is it the thing the owner first asks me about.',
      'Clients are mostly venues, retailers and small operators between five and fifty people, with no tech team and no appetite for a platform migration.'
    ],
    list: {
      style: 'bullets',
      items: [
        'Adoption audits: what is slow, what AI actually fixes, what it does not',
        'Custom automations — inventory alerts, comms bots, reporting that sends itself',
        'Staff training and SOPs written so the tool survives my last invoice',
        'Governance: what the model sees, who signs off, what never leaves the building'
      ]
    }
  },

  {
    id: 'projects',
    kind: 'spire',
    label: 'Projects',
    title: 'Selected projects',
    kicker: 'Shipped, and one being planted',
    accent: '#ff7a1a',
    accent2: '#ffc247',
    pos: [20, 36],
    lead: 'Sovereign Local Nodes is the one I care about most. Private AI on hardware you own, with a written constitution the owner sets.',
    body: [
      'Most intelligence is rented. This is not. On-site nodes, domain isolation, tool permissions, and pricing you can read in one sitting. Currently taking pilots.',
      'The rest are live and paying rent:'
    ],
    list: {
      style: 'links',
      items: [
        { t: 'Bee Free Tools', d: 'Seven free AI diagnostics for Australian small business. Astro, Netlify.', h: 'https://bee-free.netlify.app' },
        { t: 'Harcourt Valley Vineyards', d: "The digital front door for Bendigo's most-awarded family winery. 500+ medals.", h: 'https://harcourtvalley.netlify.app' },
        { t: 'Where We Bathe', d: 'An ad-free directory of Australian saunas, hot pools and cold plunges. No sponsored rankings.', h: 'https://wherewebathe.com' },
        { t: 'Shop Brain', d: 'Retrieval system that lets bottleshop staff answer product questions without finding a manager.' },
        { t: 'Cellar Content Engine', d: 'Turns vintage data into social copy for winemakers. Vite, React, Supabase.' }
      ]
    }
  },

  {
    id: 'method',
    kind: 'dahlia',
    label: 'How I work',
    title: 'How I work',
    kicker: 'Gates, not vibes',
    accent: '#b6ff3d',
    accent2: '#6ef0a0',
    pos: [33, 28],
    lead: 'I build in gates, and the acceptance criteria get written before the work does. That way "done" is not a matter of opinion.',
    body: [
      'Anything a customer will see gets a human check before it ships. Anything a staff member will use gets documented in the words they already use.',
      'I will also tell you when AI is the wrong answer, which happens more often than the market would like.'
    ],
    list: {
      style: 'bullets',
      items: [
        'Criteria written first, demo at the end of every gate',
        'Staged testing and output review checklists',
        'Human-in-the-loop on anything customer-facing',
        'Documentation as a deliverable, not a favour'
      ]
    }
  },

  {
    id: 'toolkit',
    kind: 'allium',
    label: 'Toolkit',
    title: 'Toolkit',
    kicker: 'What I reach for',
    accent: '#35f0ff',
    accent2: '#6ea8ff',
    pos: [7, 33],
    lead: 'Frontier models and agent harnesses for the building. Boring, well-understood web tooling for the shipping.',
    body: [
      'I keep a local model on hand for anything a client would not want leaving the premises.'
    ],
    list: {
      style: 'groups',
      items: [
        ['AI', 'Frontier models, agent skills and harnesses, prompt and workflow design, retrieval-based knowledge systems, local open-weight models'],
        ['Build', 'Astro, React, Three.js, Supabase, Netlify, Stripe, Python, FastAPI, SQLite'],
        ['Automation', 'Zapier, Airtable, Notion, and a lot of small scripts nobody has to think about'],
        ['Operations', 'Margin tracking, rostering, logistics, forecasting, SOPs, team training']
      ]
    }
  },

  {
    id: 'background',
    kind: 'bellflower',
    label: 'Background',
    title: 'Background',
    kicker: 'The road here',
    accent: '#8b5cf6',
    accent2: '#ff6ec7',
    pos: [-35, 19],
    lead: 'I founded a B2B wine marketplace and scaled it to fifty-odd producers. That taught me more about systems than any course would have.',
    body: [
      'Everything technical I do now started as a stocktake at 1am, or a roster that fell apart on a Friday.'
    ],
    list: {
      style: 'timeline',
      items: [
        ['2018 — now', 'AI &amp; Technology Adoption Consultant', 'Chicken &amp; Potatoes Consulting'],
        ['2025', "Founder's Assistant / Chief of Staff", 'VAIDA.ai'],
        ['2024 — 2025', 'Venue Manager', 'Windsor Wine Room'],
        ['2020 — 2024', 'Founder &amp; Director', 'Sauced.shop'],
        ['Earlier', 'Bottleshop manager, trainer, server, owner', 'Mr West · Cookie · Embla · Longrain · Provenance Food &amp; Wine Co']
      ]
    }
  },

  {
    id: 'writing',
    kind: 'moonflower',
    label: 'Writing',
    title: 'Writing',
    kicker: 'Field notes, no hype',
    accent: '#e8fbff',
    accent2: '#35f0ff',
    pos: [-27, -41],
    hidden: true,
    lead: '<em>The AI Playbook for Small Business in Australia</em> is a thirty-day method: pick one project, name who owns it, choose tools that will not leak your data, train people properly.',
    body: [
      'No chapter tells you AI will change everything. Several tell you what to do when it does not work.',
      'The rest of my writing is field notes from actual engagements — what got adopted, what quietly got abandoned, and why.'
    ],
    list: {
      style: 'bullets',
      items: [
        'The AI Playbook for Small Business in Australia — 30-day methodology, templates, governance',
        'Field notes on adoption: the tools staff keep using after month three',
        'Why most AI pilots die at the handover, and the two habits that stop it'
      ]
    },
    hint: 'You found the one that was hiding. Good.'
  }
];

export const HIRE = {
  id: 'hire',
  kind: 'hire',
  label: 'Hire me',
  title: 'Say hello',
  kicker: 'The whole garden is open',
  accent: '#ff2d95',
  accent2: '#ffb03a',
  pos: [-8, 2],
  lead: 'You have seen all of it. If you want something like this growing in your organisation, I am easy to reach and quick to reply.',
  body: [
    'Available for consulting, enablement programmes, and Sovereign Local Nodes pilots.'
  ]
};

export const TOTAL = SECTIONS.length;
