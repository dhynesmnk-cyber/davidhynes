export interface ZoneContent {
  id: string;
  title: string;
  intro: string;
  professional: Array<{ heading?: string; items?: Array<string | { text: string; link: string }>; text?: string; link?: { url: string; label: string } }>;
  contactFooter: string;
}

export const contactInfo = "David Hynes — Melbourne, VIC\n0411 039 718 · d.hynes.mnk@gmail.com · @dave.likeswine";

export const zones: ZoneContent[] = [
  {
    id: 'experience',
    title: 'Experience',
    intro: "Every system I've ever built started as a shift behind a bar or a stocktake at 1am. Here's the road from there to here.",
    professional: [
      {
        heading: '**AI & Technology Adoption Consultant — Chicken & Potatoes Consulting** (2018–Present)',
        items: [
          'Advise venues and SMEs on operations, marketing, and technology adoption.',
          'Build custom automations (inventory alerts, communication bots) that save real operational time.',
          'Guide owners through AI adoption: high-impact tools vs trends, and training that makes usage stick long after the engagement ends.',
          'Write the playbooks and documentation that sustain adoption.'
        ]
      },
      {
        heading: "**Founder's Assistant / Chief of Staff — VAIDA.ai** (Jan–Jul 2025)",
        items: [
          'Designed internal AI systems and built the commercial narrative with the founder.',
          'Automated admin across Claude Code, Notion, Airtable, Zapier.',
          'Built pitch decks and financial models framing AI in commercial terms.',
          'Created SOPs and training so non-technical staff adopted tools compliantly.'
        ]
      },
      {
        heading: "**Founder & Director — Sauced.shop** (2020–2024)",
        items: [
          'Built and scaled a B2B wine marketplace to 50+ producers.',
          'Owned marketing, positioning, logistics, margins, and financial reporting.'
        ]
      },
      {
        heading: "**Venue Manager — Windsor Wine Room** (2024–2025)",
        items: [
          'Launched a premium wine venue; managed 20+ staff; built every operational system.'
        ]
      },
      {
        text: "Earlier: Bottleshop Manager (Mr West), Trainer/Server (Cookie, Embla, Longrain), Owner (Provenance Food & Wine Co)."
      }
    ],
    contactFooter: contactInfo
  },
  {
    id: 'skills',
    title: 'Skills',
    intro: "Half tradie's kit, half chef's knife roll. These are the tools I actually reach for.",
    professional: [
      {
        heading: '**AI Building:**',
        text: 'frontier models, harnesses & agent skills, prompt/workflow design, retrieval-based knowledge systems, open-source GLM-5.2, SLM Gemma 4.'
      },
      {
        heading: '**Automation:**',
        text: 'workflow automation and no-code glue across business tooling.'
      },
      {
        heading: '**Development & Data:**',
        text: 'Astro, React, Supabase, Netlify, Stripe, Python, SQLite, FastAPI.'
      },
      {
        heading: '**Methodology:**',
        text: 'gate-based builds with testable acceptance criteria, staged testing, output review checklists, human-in-the-loop verification.'
      },
      {
        heading: '**Business Operations:**',
        text: 'commercial strategy, margin tracking, logistics, rostering, sales narratives, SOPs, team training, audits and forecasts.'
      }
    ],
    contactFooter: contactInfo
  },
  {
    id: 'projects',
    title: 'Projects',
    intro: "Things I've shipped, and one big idea I'm planting. Some are live, some are seeds.",
    professional: [
      {
        heading: '**Sovereign Local Nodes**',
        text: 'Private AI for households, communities, and schools. The pitch in one line: "Most intelligence is rented. This isn\'t." On-site nodes, owner-defined constitutions, Orbital Governance (access, domain isolation, tool permissions, ethics), right-sized hardware, transparent pricing.',
        items: ['[Contact for pilot info]']
      },
      {
        heading: '**The AI Playbook for Small Business in Australia**',
        text: 'a 30-day, hype-free methodology for safely introducing AI: first project selection, role clarity, ethical tool picking, training that sticks.',
        link: { url: 'https://notion.so', label: 'Notion link →' }
      },
      {
        heading: '**Bee Free Tools**',
        text: 'free AI diagnostic toolkit for Australian small businesses. Astro + Netlify.',
        link: { url: 'https://bee-free.netlify.app', label: 'Link →' }
      },
      {
        heading: '**Cellar Content Engine**',
        text: 'social content generation for winemakers from vintage data. Vite, React, Supabase.',
        link: { url: '#', label: 'Link →' }
      },
      {
        heading: '**Shop Brain**',
        text: 'retrieval-based knowledge system letting bottleshop staff answer product queries autonomously.'
      }
    ],
    contactFooter: contactInfo
  },
  {
    id: 'blogs',
    title: 'Blogs',
    intro: "Field notes on getting AI working in real businesses — minus the hype.",
    professional: [
      {
        heading: '**The AI Playbook for Small Business in Australia** (series)',
        link: { url: 'https://notion.so', label: 'Notion link →' }
      },
      {
        text: 'Placeholder structure for future essays — build this as a simple data file (title, blurb, date, link) so posts can be added without touching code.'
      }
    ],
    contactFooter: contactInfo
  },
  {
    id: 'tools',
    title: 'Tools & Creators',
    intro: "The tools in my pocket, and the makers worth your attention.",
    professional: [
      {
        heading: '**BOARD 1: THINGS I\'VE BUILT**',
        items: [
          '**Harcourt Valley Vineyards** — The digital front door for Bendigo\'s most-awarded family winery. 500+ medals, one valley, three doors.',
          { text: '[harcourtvalley.netlify.app →]', link: 'https://harcourtvalley.netlify.app' },
          '**Bee Free Tools** — Seven free, hype-free AI tools for Australian small businesses. Check your AI visibility, structure your data, and build what your operation actually needs.',
          { text: '[bee-free.netlify.app →]', link: 'https://bee-free.netlify.app' },
          '**Where We Bathe** — A quiet, ad-free directory of Australian saunas, hot pools, and cold plunges. Researched properly, set out plainly. No ads, no sponsored rankings.',
          { text: '[wherewebathe.com →]', link: 'https://wherewebathe.com' },
          '**The AI Playbook** — The 30-day methodology for safely introducing AI into a business. No hype, just the work, the templates, and the governance.',
          { text: '[Read the Notion doc →]', link: 'https://notion.so' }
        ]
      },
      {
        heading: '**BOARD 2: MAKERS I RATE**',
        items: [
          '**CJ Towbridge (@Cjtowbridge)** — Building in public and showing the actual work, not just the polished demos.',
          { text: '[@Cjtowbridge →]', link: 'https://twitter.com/Cjtowbridge' },
          '**Nate B Jones (@Natebjones)** — Cutting through the AI noise with practical, everyday automation that actually saves time.',
          { text: '[@Natebjones →]', link: 'https://twitter.com/Natebjones' },
          '**Ethic.ai** — Keeping the governance and safety conversation grounded when everyone else is hyperventilating.',
          { text: '[Ethic.ai →]', link: 'https://ethic.ai' },
          '**Future Infinitive** — Clear-eyed thinking on local AI, compute, and infrastructure, minus the doom-scrolling.',
          { text: '[Future Infinitive →]', link: '#' }
        ]
      }
    ],
    contactFooter: contactInfo
  }
];
