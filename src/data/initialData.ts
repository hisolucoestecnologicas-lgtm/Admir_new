import {
  SiteSettings,
  Program,
  Story,
  Ambassador,
  MediaAsset,
  Donation,
  Task,
  AuditLog,
  User,
  AdminInvite,
} from '../types';
import { getPresetPermissions } from './permissionPresets';

export const INITIAL_SITE_SETTINGS: SiteSettings = {
  // Impact Counters
  communitiesServed: 120,
  communitiesServedLabel: 'Communities served',
  reliefsDelivered: 48000,
  reliefsDeliveredLabel: 'Emergency reliefs delivered',
  volunteersEngaged: 1500,
  volunteersEngagedLabel: 'Volunteers engaged',

  // Hero
  heroEyebrow: 'American Diplomatic Mission of International Relations',
  heroTitleLine1: 'Humanitarian Diplomacy.',
  heroTitleLine2: 'Global Cooperation in Action.',
  heroParagraph:
    'ADMIR exists to serve as a bridge between nations, cultures, and vulnerable populations. We mobilize diplomatic dialogue, rapid emergency response, and community-led empowerment across the globe.',
  heroCtaPrimary: 'Support Our Mission',
  heroCtaSecondary: 'Explore Programs',
  heroBgImage: '/media/home/admir-home.jpg',
  heroOverlayOpacity: 75,

  // About Section
  aboutSmallLabel: 'About ADMIR',
  aboutTitle: 'Looking inward, acting outward.',
  aboutHighlightedSentence: 'ADMIR exists to serve as a bridge between nations, cultures, and individuals.',
  aboutParagraph:
    'Our work fosters tangible actions that transform lives and inspire new possibilities through humanitarian diplomacy, international cooperation, and service to others. From peacebuilding delegations to frontline relief teams, ADMIR coordinates with sovereign bodies, civil society, and local leaders to uphold human dignity.',
  aboutCtaText: 'Learn More About Us',

  // Programs Section
  programsSectionTitle: 'Action where it matters.',
  programsSectionIntro:
    'Our humanitarian programs deliver sustainable change by pairing high-level diplomatic dialogue with grassroots community interventions worldwide.',

  // Impact Section
  impact1Number: '30+',
  impact1Text: 'Years developing humanitarian projects worldwide',
  impact2Number: '190+',
  impact2Text: 'Countries reached by ADMIR cooperation and outreach efforts',
  impact3Number: '6',
  impact3Text: 'Specialized pathways to volunteer, advocate, and serve',

  // Donation Section
  donationSectionTitle: 'Your generosity moves hope forward.',
  donationSectionParagraph:
    'Choose a gift amount and help strengthen community-led humanitarian action, rapid emergency relief, and international peace missions.',

  // Ambassadors Page & Section
  ambassadorsPageTitle: 'Diplomatic Leadership & Global Envoys',
  ambassadorsPageIntro:
    'Distinguished leaders, humanitarians, and advocates representing ADMIR values across multilateral institutions, regional hubs, and local communities.',

  // Donor Wall
  donorWallTitle: 'Honoring Global Champions of Peace',
  donorWallParagraph:
    'We express our deepest gratitude to our international benefactors, philanthropic foundations, and private donors whose enduring generosity sustains our humanitarian missions worldwide.',

  // News/Stories Section
  newsSectionTitle: 'Stories that matter.',
  newsSectionIntro:
    'Field reports, institutional breakthroughs, and frontline dispatches showcasing the real human impact of our global cooperation.',

  // Newsletter Section
  newsletterTitle: 'Stay close to the work.',
  newsletterParagraph: 'Receive stories, field updates, and ways to help direct from our diplomatic delegations.',

  // Footer
  footerDescription:
    'The American Diplomatic Mission of International Relations (ADMIR) is an American humanitarian diplomatic institution dedicated to fostering global peace, humanitarian relief, and sustainable human dignity across all borders.',
  footerAddress: '1700 Pennsylvania Avenue NW, Suite 400, Washington, DC 20006, USA',
  footerEmail: 'contact@admiramerican.com',
  footerPhone: '+1 (202) 890-2340',
  footerWebsite: 'https://admiramerican.com',
  footerCopyright: '© 2026 American Diplomatic Mission of International Relations (ADMIR). All rights reserved.',
};

export const INITIAL_PROGRAMS: Program[] = [
  {
    id: 'prog-1',
    title: 'Peace Ambassadors',
    slug: 'peace-ambassadors',
    shortDescription:
      'Promoting unity, dialogue, and social harmony through community-based peacebuilding initiatives and diplomatic envoys.',
    fullDescription: `
      <p>The <strong>ADMIR Peace Ambassadors</strong> initiative deploys trained international envoys and regional community leaders to mediate intercultural tensions, facilitate dialogue in fragile environments, and support sustainable conflict prevention.</p>
      <h2>Core Strategic Pillars</h2>
      <ul>
        <li><strong>Cross-Border Conciliation:</strong> Establishing neutral, humanitarian channels between municipal leaders and community stakeholders.</li>
        <li><strong>Youth Diplomatic Academies:</strong> Imparting negotiation, human rights, and mediation frameworks to emerging leaders.</li>
        <li><strong>Civic Dialogue Forums:</strong> Hosting interfaith and intercultural summits aimed at reconciling historical divides.</li>
      </ul>
      <p>Through our diplomatic consultative network, Peace Ambassadors help turn tense environments into resilient communities built upon mutual respect and civic collaboration.</p>
    `,
    featuredImage: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?q=80&w=1200&auto=format&fit=crop',
    gallery: [
      'https://images.unsplash.com/photo-1544027993-37dbfe43562a?q=80&w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1526976668912-1a811878dd37?q=80&w=800&auto=format&fit=crop',
    ],
    orderIndex: 1,
    isVisible: true,
    category: 'Diplomatic Action',
    beneficiariesMetric: '42,000+ Citizens Mediated',
    regionsActive: 'Global / 38 Nations',
    seoTitle: 'Peace Ambassadors Program | ADMIR International Relations',
    seoDescription:
      'Explore ADMIR Peace Ambassadors program fostering unity, dialogue, and community peacebuilding around the world.',
    createdAt: '2025-01-10T10:00:00Z',
    updatedAt: '2026-02-15T14:30:00Z',
  },
  {
    id: 'prog-2',
    title: 'Educational Volunteers',
    slug: 'educational-volunteers',
    shortDescription:
      'Sharing languages, life skills, civic literacy, and vocational training in underserved and displaced regions worldwide.',
    fullDescription: `
      <p>Education is the fundamental catalyst for human freedom and community self-reliance. ADMIR <strong>Educational Volunteers</strong> pairs international educators, bilingual specialists, and technical mentors with underprivileged schools and refugee learning hubs.</p>
      <h2>What We Deliver</h2>
      <ul>
        <li><strong>Multilingual Fluency Hubs:</strong> English, Spanish, French, and local dialect literacy centers.</li>
        <li><strong>Digital Literacy Labs:</strong> Bringing solar-powered laptops and certified tech courses to remote classrooms.</li>
        <li><strong>Women's Economic Empowerment:</strong> Practical vocational education including bookkeeping, digital skills, and cooperative management.</li>
      </ul>
      <p>By empowering schools with long-term human capital and educational resources, we foster generational mobility and social stability.</p>
    `,
    featuredImage: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?q=80&w=1200&auto=format&fit=crop',
    gallery: [
      'https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=800&auto=format&fit=crop',
    ],
    orderIndex: 2,
    isVisible: true,
    category: 'Education & Literacy',
    beneficiariesMetric: '65,000+ Students Reached',
    regionsActive: 'Americas, Africa & Southeast Asia',
    seoTitle: 'Educational Volunteers | ADMIR Global Outreach',
    seoDescription:
      'Learn about ADMIR Educational Volunteers program bringing language skills, digital literacy, and vocational training to underserved communities.',
    createdAt: '2025-01-12T11:00:00Z',
    updatedAt: '2026-02-18T09:15:00Z',
  },
  {
    id: 'prog-3',
    title: 'Social Workers & Counselors',
    slug: 'social-workers-and-counselors',
    shortDescription:
      'Providing emotional support, psychosocial counseling, advocacy, and direct emergency care for vulnerable people worldwide.',
    fullDescription: `
      <p>Humanitarian crises inflict profound mental and emotional scars on families. The <strong>Social Workers & Counselors</strong> division delivers specialized trauma-informed care, child advocacy, and psychosocial support to displaced families and vulnerable communities.</p>
      <h2>Key Program Initiatives</h2>
      <ul>
        <li><strong>Post-Crisis Psychological First Aid:</strong> Deploying certified counselors within 72 hours of natural catastrophes and conflict situations.</li>
        <li><strong>Family Reunification Support:</strong> Assisting missing person tracking and humanitarian case management.</li>
        <li><strong>Community Care Centers:</strong> Creating safe spaces for children and elderly individuals requiring ongoing therapeutic support.</li>
      </ul>
      <p>Our licensed specialists bridge immediate emotional healing with enduring social safety nets.</p>
    `,
    featuredImage: 'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?q=80&w=1200&auto=format&fit=crop',
    gallery: [
      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?q=80&w=800&auto=format&fit=crop',
    ],
    orderIndex: 3,
    isVisible: true,
    category: 'Humanitarian Care',
    beneficiariesMetric: '28,000+ Families Supported',
    regionsActive: '24 International Corridors',
    seoTitle: 'Social Workers & Psychosocial Counselors | ADMIR',
    seoDescription:
      'ADMIR Social Workers and Counselors provide trauma-informed support and direct care for vulnerable people and disaster-affected populations.',
    createdAt: '2025-01-15T09:30:00Z',
    updatedAt: '2026-02-20T16:00:00Z',
  },
  {
    id: 'prog-4',
    title: 'Emergency Relief & Disaster Response',
    slug: 'emergency-relief-disaster-response',
    shortDescription:
      'Rapid logistical deployment of clean water, vital medicines, survival rations, and temporary shelter in frontline emergency zones.',
    fullDescription: `
      <p>When sudden disasters strike, every hour counts. ADMIR coordinates diplomatic clearance, air-freight transport, and local distribution networks to rush life-saving supplies directly into affected territories.</p>
      <h2>Operational Capabilities</h2>
      <ul>
        <li><strong>Rapid Survival Supply Kits:</strong> Pre-positioned water filtration systems, nutritional rations, and hygiene supplies.</li>
        <li><strong>Mobile Medical Clinics:</strong> Temporary trauma tents staffed by volunteer physicians and emergency medics.</li>
        <li><strong>Last-Mile Logistics:</strong> Leveraging regional diplomatic status to clear customs and deliver assistance where standard logistics fail.</li>
      </ul>
    `,
    featuredImage: 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?q=80&w=1200&auto=format&fit=crop',
    gallery: [
      'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?q=80&w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?q=80&w=800&auto=format&fit=crop',
    ],
    orderIndex: 4,
    isVisible: true,
    category: 'Disaster Relief',
    beneficiariesMetric: '48,000+ Relief Deliveries',
    regionsActive: 'Global Crisis Zones',
    seoTitle: 'Emergency Relief & Disaster Response | ADMIR',
    seoDescription: 'Rapid humanitarian logistics, clean water, medical aid, and emergency relief deployments by ADMIR.',
    createdAt: '2025-02-01T08:00:00Z',
    updatedAt: '2026-02-22T11:45:00Z',
  },
];

export const INITIAL_STORIES: Story[] = [
  {
    id: 'story-1',
    headline: 'High-Level Diplomatic Dialogue Strengthens Community Relief Corridors in the Americas',
    slug: 'diplomatic-dialogue-strengthens-relief-corridors',
    category: 'Humanitarian Action',
    shortSummary:
      'ADMIR senior envoys met with regional multilateral leaders to establish expedited customs clearance for life-saving humanitarian supplies across 12 countries.',
    fullText: `
      <p>In an effort to dismantle bureaucratic bottlenecks during climate emergencies, the <strong>American Diplomatic Mission of International Relations (ADMIR)</strong> concluded a multilateral pact with regional authorities to guarantee humanitarian fast-track lanes.</p>
      <h2>Diplomatic Solutions for Ground Realities</h2>
      <p>Historically, critical medicines, sterile medical equipment, and water purification units have experienced prolonged customs hold-ups in border transits. Through this diplomatic initiative, designated humanitarian shipments bearing ADMIR verification will receive priority border access.</p>
      <blockquote>
        "Humanitarian diplomacy is not theoretical; it is about ensuring that a mother in an isolated settlement receives clean water and infant nutrition within 24 hours of a disaster rather than three weeks later."
      </blockquote>
      <h2>Field Implementation Strategy</h2>
      <p>The newly ratified protocols establish digital manifests synchronized across regional logistics hubs in Miami, Panama, and Bogotá. Volunteer response units have already conducted simulation exercises to validate the streamlined pipeline.</p>
      <p>This initiative represents a pivotal milestone in ADMIR's ongoing commitment to pairing formal diplomatic stature with direct community action.</p>
    `,
    featuredPhoto: 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?q=80&w=1200&auto=format&fit=crop',
    photoGallery: [
      'https://images.unsplash.com/photo-1577495508048-b635879837f1?q=80&w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1526976668912-1a811878dd37?q=80&w=800&auto=format&fit=crop',
    ],
    videoLink: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    author: 'ADMIR Diplomatic Press Office',
    publicationDate: '2026-02-28',
    orderIndex: 1,
    isPublished: true,
    seoTitle: 'Diplomatic Dialogue Strengthens Relief Corridors | ADMIR News',
    seoDescription:
      'ADMIR establishes expedited customs clearance and humanitarian relief corridors for emergency supplies across 12 countries.',
    readTimeMinutes: 4,
    createdAt: '2026-02-28T14:00:00Z',
    updatedAt: '2026-02-28T14:00:00Z',
  },
  {
    id: 'story-2',
    headline: 'Over 1,500 Educational Volunteers Mobilized Across Underserved Regional Classrooms',
    slug: 'educational-volunteers-mobilized-classrooms',
    category: 'Events',
    shortSummary:
      'Celebrating the graduation of our 2026 Educational Volunteers cohort, expanding literacy and bilingual computer training to over 65,000 young students.',
    fullText: `
      <p>More than 1,500 volunteer educators, university mentors, and retired professionals have formally completed their mission briefing under ADMIR's <em>Educational Volunteers</em> program.</p>
      <h2>Bridging the Digital Divide</h2>
      <p>The program places specialized focus on equipping students with foundational skills needed in the 21st-century economy. In addition to core language training in English and Spanish, volunteers deliver curriculum modules on coding, data literacy, and community civics.</p>
      <p>Community centers in rural and semi-urban districts will host after-school learning cohorts led directly by these dedicated volunteers.</p>
    `,
    featuredPhoto: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=1200&auto=format&fit=crop',
    photoGallery: [
      'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?q=80&w=800&auto=format&fit=crop',
    ],
    author: 'Elena Vance, Global Education Liaison',
    publicationDate: '2026-02-14',
    orderIndex: 2,
    isPublished: true,
    seoTitle: '1,500 Educational Volunteers Mobilized | ADMIR Field Stories',
    seoDescription:
      'ADMIR celebrates 1,500 educational volunteers expanding literacy and digital skills across underserved global classrooms.',
    readTimeMinutes: 3,
    createdAt: '2026-02-14T09:00:00Z',
    updatedAt: '2026-02-14T09:00:00Z',
  },
  {
    id: 'story-3',
    headline: 'Frontline Social Workers Deliver Crucial Psychosocial Care to Displaced Families',
    slug: 'social-workers-deliver-psychosocial-care',
    category: 'Field Stories',
    shortSummary:
      'Field dispatches from our certified counseling teams providing trauma-informed psychological first aid and safe spaces for displaced children.',
    fullText: `
      <p>In the aftermath of recent seasonal flooding, ADMIR mobile mental health and trauma relief units were deployed to provide urgent psychosocial care for over 1,200 displaced families.</p>
      <h2>Safe Spaces for Children</h2>
      <p>Trauma disrupts childhood development. By establishing child-friendly emergency play pavilions, our counselors help young survivors process shock, grief, and displacement in a safe, structured environment.</p>
    `,
    featuredPhoto: 'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?q=80&w=1200&auto=format&fit=crop',
    photoGallery: [],
    author: 'David Sterling, Senior Social Work Director',
    publicationDate: '2026-01-20',
    orderIndex: 3,
    isPublished: true,
    seoTitle: 'Frontline Psychosocial Care for Displaced Families | ADMIR Stories',
    seoDescription:
      'Field reports from ADMIR social workers delivering critical counseling and trauma care in emergency zones.',
    readTimeMinutes: 5,
    createdAt: '2026-01-20T11:30:00Z',
    updatedAt: '2026-01-20T11:30:00Z',
  },
  {
    id: 'story-4',
    headline: 'ADMIR Announces Strategic Humanitarian Cooperation Partnership with Global Health NGOs',
    slug: 'strategic-humanitarian-cooperation-partnership-health',
    category: 'Institutional News',
    shortSummary:
      'Expanding healthcare delivery: New multilateral agreement unites medical logistics, local community clinics, and diplomatic supply corridors.',
    fullText: `
      <p>ADMIR leadership has signed a comprehensive memorandum of understanding with key international health non-governmental organizations to deliver essential maternal and infant health services.</p>
      <h2>Expanding Clinical Outreach</h2>
      <p>This coalition will supply clean water sanitation units, pediatric vaccines, and emergency nutrition packs to remote clinics serving over 250,000 vulnerable individuals.</p>
    `,
    featuredPhoto: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?q=80&w=1200&auto=format&fit=crop',
    photoGallery: [],
    author: 'ADMIR Executive Directorate',
    publicationDate: '2026-01-05',
    orderIndex: 4,
    isPublished: true,
    seoTitle: 'Strategic Humanitarian Healthcare Partnership | ADMIR News',
    seoDescription:
      'ADMIR establishes multilateral healthcare alliance to supply essential medicine and water sanitization.',
    readTimeMinutes: 3,
    createdAt: '2026-01-05T08:00:00Z',
    updatedAt: '2026-01-05T08:00:00Z',
  },
];

export const INITIAL_AMBASSADORS: Ambassador[] = [
  {
    id: 'amb-1',
    fullName: 'Amb. Marcus Vance',
    role: 'Special Envoy for Diplomatic Relations & Global Peace',
    country: 'United States',
    shortBiography:
      'Senior diplomat with over 25 years of multilateral negotiation experience across North America, Europe, and international peace missions.',
    fullBiography: `
      <p>Ambassador Marcus Vance serves as ADMIR's Special Envoy for Diplomatic Relations & Global Peace. Throughout his distinguished career in foreign affairs and humanitarian service, he has spearheaded cross-cultural mediation initiatives and represented civil missions at global forums.</p>
      <p>At ADMIR, Amb. Vance leads strategic engagements with international entities, ensuring that humanitarian assistance programs maintain unfettered operational access across complex border corridors.</p>
    `,
    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=800&auto=format&fit=crop',
    orderIndex: 1,
    isVisible: true,
    email: 'm.vance@admiramerican.com',
    linkedin: 'https://linkedin.com/in/admir-marcus-vance',
    socialLinks: 'https://twitter.com/admir_vance',
    seoTitle: 'Amb. Marcus Vance | ADMIR Diplomatic Leadership',
    seoDescription: 'Biography and mission profile of Ambassador Marcus Vance, Special Envoy for ADMIR.',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2026-01-10T00:00:00Z',
  },
  {
    id: 'amb-2',
    fullName: 'Dr. Elena Rostova',
    role: 'Global Envoy for Educational & Youth Development',
    country: 'Switzerland',
    shortBiography:
      'International educator, author, and advocate dedicated to expanding literacy and university partnerships in post-conflict zones.',
    fullBiography: `
      <p>Dr. Elena Rostova has dedicated her career to championing inclusive education in underserved nations. Holding a Ph.D. in Comparative Education from the University of Geneva, she has designed bilingual curricula adopted in over 15 countries.</p>
      <p>As ADMIR's Global Envoy for Educational Development, Dr. Rostova oversees volunteer educator deployments and digital laboratory rollouts across three continents.</p>
    `,
    photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=800&auto=format&fit=crop',
    orderIndex: 2,
    isVisible: true,
    email: 'e.rostova@admiramerican.com',
    linkedin: 'https://linkedin.com/in/elena-rostova-admir',
    seoTitle: 'Dr. Elena Rostova | ADMIR Educational Envoy',
    seoDescription: 'Dr. Elena Rostova leads ADMIR educational volunteer and literacy programs worldwide.',
    createdAt: '2025-01-05T00:00:00Z',
    updatedAt: '2026-01-12T00:00:00Z',
  },
  {
    id: 'amb-3',
    fullName: 'Hon. Amina Diallo',
    role: 'High Commissioner for Community Health & Women’s Rights',
    country: 'Senegal',
    shortBiography:
      'Public health champion and legal advocate with extensive field leadership in maternal healthcare and rural community resilience.',
    fullBiography: `
      <p>Hon. Amina Diallo is a renowned champion for maternal health rights and community resilience. Having served in high-level advisory capacities for international health coalitions, she brings invaluable strategic insight to ADMIR's humanitarian interventions.</p>
      <p>Her leadership focuses on deploying mobile health screening teams, building community clinics, and defending vulnerable women and children in displaced environments.</p>
    `,
    photo: 'https://images.unsplash.com/photo-1580894732444-8ecded7900cd?q=80&w=800&auto=format&fit=crop',
    orderIndex: 3,
    isVisible: true,
    email: 'a.diallo@admiramerican.com',
    linkedin: 'https://linkedin.com/in/amina-diallo-admir',
    seoTitle: 'Hon. Amina Diallo | ADMIR High Commissioner',
    seoDescription: 'Hon. Amina Diallo directs community health and advocacy initiatives for ADMIR.',
    createdAt: '2025-01-10T00:00:00Z',
    updatedAt: '2026-01-15T00:00:00Z',
  },
  {
    id: 'amb-4',
    fullName: 'Carlos Mendoza',
    role: 'Regional Director for Latin American Cooperation',
    country: 'Brazil',
    shortBiography:
      'Expert in regional cooperation, cross-border humanitarian logistics, and civil society coalition building.',
    fullBiography: `
      <p>Carlos Mendoza coordinates ADMIR’s strategic footprint across South and Central America. With a background in international economics and emergency management, he works closely with municipal authorities, local NGOs, and regional embassies.</p>
    `,
    photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=800&auto=format&fit=crop',
    orderIndex: 4,
    isVisible: true,
    email: 'c.mendoza@admiramerican.com',
    linkedin: 'https://linkedin.com/in/carlos-mendoza-admir',
    seoTitle: 'Carlos Mendoza | ADMIR Latin America Regional Director',
    seoDescription: 'Carlos Mendoza coordinates ADMIR humanitarian logistics and cooperation in Latin America.',
    createdAt: '2025-01-15T00:00:00Z',
    updatedAt: '2026-01-20T00:00:00Z',
  },
];

export const INITIAL_MEDIA_ASSETS: MediaAsset[] = [
  {
    id: 'media-1',
    filename: 'hero-humanitarian-diplomacy.jpg',
    originalName: 'Humanitarian Care and Relief.jpg',
    url: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?q=80&w=2000&auto=format&fit=crop',
    mimeType: 'image/jpeg',
    sizeBytes: 845200,
    altText: 'Humanitarian volunteer smiling with child during community outreach relief mission',
    caption: 'Frontline community outreach in underserved regional sector',
    tags: ['hero', 'humanitarian', 'community', 'children'],
    createdAt: '2025-01-01T12:00:00Z',
    usageCount: 2,
  },
  {
    id: 'media-2',
    filename: 'peace-ambassadors-summit.jpg',
    originalName: 'Diplomatic Conference.jpg',
    url: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?q=80&w=1200&auto=format&fit=crop',
    mimeType: 'image/jpeg',
    sizeBytes: 712000,
    altText: 'International delegates and peace ambassadors gathered for multilateral dialogue',
    caption: 'Global Peace Ambassadors conference session',
    tags: ['diplomacy', 'conference', 'ambassadors', 'peace'],
    createdAt: '2025-01-03T14:30:00Z',
    usageCount: 3,
  },
  {
    id: 'media-3',
    filename: 'education-classroom-volunteers.jpg',
    originalName: 'Classroom Literacy.jpg',
    url: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?q=80&w=1200&auto=format&fit=crop',
    mimeType: 'image/jpeg',
    sizeBytes: 654000,
    altText: 'Books and classroom materials arranged for educational volunteer programs',
    caption: 'Educational Volunteers literacy resource distribution',
    tags: ['education', 'volunteers', 'literacy', 'books'],
    createdAt: '2025-01-05T09:15:00Z',
    usageCount: 2,
  },
  {
    id: 'media-4',
    filename: 'emergency-relief-logistics.jpg',
    originalName: 'Emergency Logistics.jpg',
    url: 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?q=80&w=1200&auto=format&fit=crop',
    mimeType: 'image/jpeg',
    sizeBytes: 920000,
    altText: 'Humanitarian supplies and logistical distribution in emergency disaster zone',
    caption: 'Emergency relief supplies awaiting distribution',
    tags: ['disaster', 'emergency', 'logistics', 'supplies'],
    createdAt: '2025-01-10T16:20:00Z',
    usageCount: 2,
  },
];

export const INITIAL_DONATIONS: Donation[] = [
  {
    id: 'don-1',
    donorName: 'Dr. Arthur Sterling',
    donorEmail: 'arthur.sterling@philanthropy.org',
    donationType: 'monthly',
    amount: 500,
    currency: 'USD',
    status: 'completed',
    transactionId: 'TXN-ADM-984210',
    cause: 'General Humanitarian Fund',
    message: 'Honored to support the vital diplomatic and relief missions of ADMIR.',
    date: '2026-03-01T15:24:00Z',
  },
  {
    id: 'don-2',
    donorName: 'Geneva Global Fellowship',
    donorEmail: 'contact@genevafellowship.ch',
    donationType: 'one-time',
    amount: 15000,
    currency: 'USD',
    status: 'completed',
    transactionId: 'TXN-ADM-984211',
    cause: 'Peace Ambassadors Program',
    message: 'In recognition of ADMIR cross-border conciliation summits.',
    date: '2026-02-27T10:12:00Z',
  },
  {
    id: 'don-3',
    donorName: 'Maria Santos',
    donorEmail: 'm.santos@curitiba.br',
    donationType: 'monthly',
    amount: 75,
    currency: 'USD',
    status: 'completed',
    transactionId: 'TXN-ADM-984212',
    cause: 'Educational Volunteers',
    message: 'For the children and digital literacy centers.',
    date: '2026-02-25T18:40:00Z',
  },
  {
    id: 'don-4',
    donorName: 'Pacific Rim Relief Partners',
    donorEmail: 'grants@pacificrelief.org',
    donationType: 'one-time',
    amount: 8500,
    currency: 'USD',
    status: 'completed',
    transactionId: 'TXN-ADM-984213',
    cause: 'Disaster Emergency Relief',
    message: 'Designated for rapid water filtration kits deployment.',
    date: '2026-02-20T11:05:00Z',
  },
  {
    id: 'don-5',
    donorName: 'Jonathan Hayes',
    donorEmail: 'jhayes@dclegalservices.com',
    donationType: 'one-time',
    amount: 250,
    currency: 'USD',
    status: 'completed',
    transactionId: 'TXN-ADM-984214',
    cause: 'Social Workers & Counselors',
    date: '2026-02-18T14:15:00Z',
  },
];

export const INITIAL_TASKS: Task[] = [
  {
    id: 'task-1',
    title: 'Audit 2026 Field Logistics & Air-Freight Clearance in Central America',
    description:
      'Review diplomatic customs agreements and expedite landing permits for medical container shipments with regional air authority.',
    responsible: 'Carlos Mendoza',
    priority: 'high',
    dueDate: '2026-03-25',
    workspaceId: 'ws-1',
    workflowId: 'wf-legacy',
    stageId: 'st-l-2',
    column: 'in_progress',
    orderIndex: 1,
    comments: [
      {
        id: 'comm-1',
        taskId: 'task-1',
        authorName: 'Carlos Mendoza',
        authorEmail: 'c.mendoza@admiramerican.com',
        content: 'Draft agreements forwarded to civil aviation directorate. Awaiting final countersignature.',
        createdAt: '2026-03-02T16:00:00Z',
      },
    ],
    createdAt: '2026-03-01T10:00:00Z',
    updatedAt: '2026-03-02T16:00:00Z',
  },
  {
    id: 'task-2',
    title: 'Finalize Peace Ambassadors Geneva Briefing Dossier',
    description:
      'Compile multilateral working papers, attendee credentials, and agenda for the Spring Youth Diplomatic Assembly.',
    responsible: 'Amb. Marcus Vance',
    priority: 'urgent',
    dueDate: '2026-03-30',
    workspaceId: 'ws-1',
    workflowId: 'wf-legacy',
    stageId: 'st-l-1',
    column: 'todo',
    orderIndex: 1,
    comments: [],
    createdAt: '2026-03-01T11:30:00Z',
    updatedAt: '2026-03-01T11:30:00Z',
  },
  {
    id: 'task-3',
    title: 'Deploy Solar-Powered Tablet Hubs to 6 Rural Learning Centers',
    description:
      'Coordinate shipment of 120 encrypted educational devices loaded with bilingual curriculum to volunteer teams.',
    responsible: 'Dr. Elena Rostova',
    priority: 'medium',
    dueDate: '2026-04-10',
    workspaceId: 'ws-1',
    workflowId: 'wf-legacy',
    stageId: 'st-l-1',
    column: 'todo',
    orderIndex: 2,
    comments: [],
    createdAt: '2026-03-03T09:00:00Z',
    updatedAt: '2026-03-03T09:00:00Z',
  },
  {
    id: 'task-4',
    title: 'Release Annual Transparency & Impact Metric Report for Donors',
    description:
      'Publish audited figures of 120 communities served, 48,000 relief packages delivered, and financial allocation breakdown.',
    responsible: 'High Diplomatic Directorate',
    priority: 'high',
    dueDate: '2026-02-28',
    workspaceId: 'ws-1',
    workflowId: 'wf-legacy',
    stageId: 'st-l-3',
    column: 'done',
    orderIndex: 1,
    comments: [
      {
        id: 'comm-2',
        taskId: 'task-4',
        authorName: 'High Diplomatic Directorate',
        authorEmail: 'admin@admiramerican.com',
        content: 'Report ratified and published to official institutional website.',
        createdAt: '2026-02-28T18:00:00Z',
      },
    ],
    createdAt: '2026-02-15T14:00:00Z',
    updatedAt: '2026-02-28T18:00:00Z',
  },
];

export const INITIAL_OWNER_USER: User = {
  id: 'user-owner-1',
  name: 'ADMIR High Diplomatic Directorate',
  email: 'admin@admiramerican.com',
  role: 'owner',
  permissions: getPresetPermissions('all'),
  status: 'active',
  joinedAt: '2024-01-01T00:00:00Z',
  lastLoginAt: '2026-03-05T12:00:00Z',
  title: 'High Commissioner & Site Owner',
  avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop',
};

export const INITIAL_ADDITIONAL_USERS: User[] = [
  // --- CONTAS ADMINISTRATIVAS OFICIAIS ADMIR (Regra Permanente 10.1) ---
  // OWNERS OFICIAIS
  {
    id: 'user-owner-navarro',
    name: 'Navarro Empreendimentos',
    email: 'navarro.empreendimentos@gmail.com',
    role: 'owner',
    permissions: getPresetPermissions('all'),
    status: 'active',
    joinedAt: '2026-09-20T00:00:00Z',
    lastLoginAt: '',
    title: 'Site Owner & High Commissioner',
    identityStatus: 'pending_link',
    isProtected: true,
  },
  {
    id: 'user-owner-hfonseca',
    name: 'Herbert Fonseca Figueiredo',
    email: 'hfonsecafigueiredo@gmail.com',
    role: 'owner',
    permissions: getPresetPermissions('all'),
    status: 'active',
    joinedAt: '2026-09-19T09:00:00Z',
    lastLoginAt: '2026-09-19T10:15:00Z',
    title: 'High Commissioner & Site Owner',
    avatarUrl: 'https://lh3.googleusercontent.com/a/ACg8ocJ0MgF2_zytP5G8Ai1q3mE9rx-MxDI_G0r8z88afl9pxEF6yoprvw=s96-c',
    firebaseUid: '9vcsRqe5VDflebVc4qB3lA5iHx53',
    authProvider: 'google',
    identityStatus: 'linked',
    isProtected: true,
  },
  {
    id: 'user-owner-hisolucoes',
    name: 'HI Soluções Tecnológicas',
    email: 'hisolucoestecnologicas@gmail.com',
    role: 'owner',
    permissions: getPresetPermissions('all'),
    status: 'active',
    joinedAt: '2026-09-20T00:00:00Z',
    lastLoginAt: '',
    title: 'Site Owner & Technology Director',
    identityStatus: 'pending_link',
    isProtected: true,
  },

  // ADMINISTRADORES OFICIAIS
  {
    id: 'user-admin-inadmflavio',
    name: 'Flávio (Administração ADMIR)',
    email: 'inadmflavio@gmail.com',
    role: 'manager',
    permissions: getPresetPermissions('manager'),
    status: 'active',
    joinedAt: '2026-09-20T00:00:00Z',
    lastLoginAt: '',
    title: 'Administrador Oficial ADMIR',
    identityStatus: 'pending_link',
    isProtected: true,
  },
  {
    id: 'user-admin-drisaas07',
    name: 'Adriana (Administração ADMIR)',
    email: 'drisaas07@gmail.com',
    role: 'manager',
    permissions: getPresetPermissions('manager'),
    status: 'active',
    joinedAt: '2026-09-20T00:00:00Z',
    lastLoginAt: '',
    title: 'Administradora Oficial ADMIR',
    identityStatus: 'pending_link',
    isProtected: true,
  },
  {
    id: 'user-admin-andreval74',
    name: 'André Val (Administração ADMIR)',
    email: 'andreval74@gmail.com',
    role: 'manager',
    permissions: getPresetPermissions('manager'),
    status: 'active',
    joinedAt: '2026-09-20T00:00:00Z',
    lastLoginAt: '',
    title: 'Administrador Oficial ADMIR',
    identityStatus: 'pending_link',
    isProtected: true,
  },

  // Contas operacionais de equipe interna
  {
    id: 'user-2',
    name: 'Sarah Jenkins',
    email: 's.jenkins@admiramerican.com',
    role: 'manager',
    permissions: getPresetPermissions('manager'),
    status: 'active',
    joinedAt: '2025-06-15T00:00:00Z',
    lastLoginAt: '2026-03-04T10:15:00Z',
    title: 'Director of Programs & Field Affairs',
  },
  {
    id: 'user-3',
    name: 'Marcio Oliveira',
    email: 'm.oliveira@admiramerican.com',
    role: 'editor',
    permissions: getPresetPermissions('editor'),
    status: 'active',
    joinedAt: '2025-09-01T00:00:00Z',
    lastLoginAt: '2026-03-03T16:45:00Z',
    title: 'Lead Editorial & Communications Officer',
  },
];

export const INITIAL_INVITES: AdminInvite[] = [
  {
    id: 'inv-1',
    email: 'delegate.geneva@admiramerican.com',
    role: 'editor',
    permissions: getPresetPermissions('editor'),
    invitedBy: 'admin@admiramerican.com',
    token: 'adm_inv_8390f7192837bcde8192a0192837461e',
    status: 'pending',
    expiresAt: '2026-04-05T00:00:00Z',
    createdAt: '2026-03-01T14:00:00Z',
  },
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'log-1',
    timestamp: '2026-03-05T12:00:00Z',
    userEmail: 'admin@admiramerican.com',
    userName: 'ADMIR High Diplomatic Directorate',
    action: 'Login',
    module: 'Auth',
    affectedRecord: 'Session authenticated',
    details: 'Master diplomatic credentials verified with secure token.',
    ipAddress: '192.168.1.10',
    device: 'Desktop / Workstation',
    browser: 'Chrome 134 / macOS',
    location: 'Washington, DC, USA',
  },
  {
    id: 'log-2',
    timestamp: '2026-03-04T15:30:00Z',
    userEmail: 'admin@admiramerican.com',
    userName: 'ADMIR High Diplomatic Directorate',
    action: 'Alteração',
    module: 'Home',
    affectedRecord: 'Impact Counters',
    details: 'Updated communities served to 120 and emergency reliefs to 48,000.',
    beforeState: '110 communities, 42000 reliefs',
    afterState: '120 communities, 48000 reliefs',
    ipAddress: '192.168.1.10',
    device: 'Desktop / Workstation',
    browser: 'Chrome 134 / macOS',
    location: 'Washington, DC, USA',
  },
  {
    id: 'log-3',
    timestamp: '2026-03-03T11:00:00Z',
    userEmail: 's.jenkins@admiramerican.com',
    userName: 'Sarah Jenkins',
    action: 'Publicação',
    module: 'News',
    affectedRecord: 'High-Level Diplomatic Dialogue Strengthens Community Relief Corridors',
    details: 'Story published to official institutional news section.',
    ipAddress: '192.168.1.42',
    device: 'Laptop',
    browser: 'Firefox / Windows',
    location: 'Geneva, Switzerland',
  },
  {
    id: 'log-4',
    timestamp: '2026-03-01T14:00:00Z',
    userEmail: 'admin@admiramerican.com',
    userName: 'ADMIR High Diplomatic Directorate',
    action: 'Convite criado',
    module: 'Administrators',
    affectedRecord: 'delegate.geneva@admiramerican.com',
    details: 'Sent invitation for Editor role with expiration set to 2026-04-05.',
    ipAddress: '192.168.1.10',
    device: 'Desktop',
    browser: 'Chrome 134 / macOS',
    location: 'Washington, DC, USA',
  },
];

export const INITIAL_MAINTENANCE_SETTINGS = {
  global: {
    enabled: false,
    themeId: 'theme-01',
    title: 'Site temporariamente em manutenção',
    subtitle: 'Estamos realizando melhorias',
    message: '<p>Este site está temporariamente indisponível enquanto realizamos atualizações. Por favor, tente novamente mais tarde.</p>',
    additionalText: 'Obrigado pela compreensão.',
    showLogo: true,
    showButton: true,
    buttonLabel: 'Acessar Painel / Suporte',
    buttonUrl: '/#contact',
    showContact: true,
    showEstimatedReturn: false,
    estimatedReturnDate: '',
    showCountdown: false,
    translations: {
      en: {
        title: 'Site Under Maintenance',
        subtitle: 'We are making improvements',
        message: '<p>This website is temporarily unavailable while we perform updates. Please check back later.</p>',
        additionalText: 'Thank you for your understanding.',
        buttonLabel: 'Contact',
      },
      es: {
        title: 'Sitio temporalmente en mantenimiento',
        subtitle: 'Estamos realizando mejoras',
        message: '<p>Este sitio web no está disponible temporalmente mientras realizamos actualizaciones. Por favor, vuelva a intentarlo más tarde.</p>',
        additionalText: 'Gracias por su comprensión.',
        buttonLabel: 'Contacto',
      },
    },
  },
  pages: {
    home: {
      enabled: false,
      themeId: 'theme-01',
      title: 'Página temporariamente em manutenção',
      subtitle: 'Estamos realizando melhorias',
      message: '<p>Estamos realizando atualizações nesta página. Por favor, tente novamente mais tarde.</p>',
      additionalText: 'Obrigado pela compreensão.',
      showLogo: true,
      showButton: true,
      buttonLabel: 'Voltar ao Início',
      buttonUrl: '/#home',
      showContact: true,
      showEstimatedReturn: false,
      showCountdown: false,
    },
    about: {
      enabled: false,
      themeId: 'theme-05',
      title: 'Página temporariamente em manutenção',
      subtitle: 'Estamos realizando melhorias',
      message: '<p>Estamos realizando atualizações nesta página. Por favor, tente novamente mais tarde.</p>',
      additionalText: 'Obrigado pela compreensão.',
      showLogo: true,
      showButton: true,
      buttonLabel: 'Voltar ao Início',
      buttonUrl: '/#home',
      showContact: true,
      showEstimatedReturn: false,
      showCountdown: false,
    },
    programs: {
      enabled: false,
      themeId: 'theme-04',
      title: 'Página temporariamente em manutenção',
      subtitle: 'Estamos realizando melhorias',
      message: '<p>Estamos realizando atualizações nesta página. Por favor, tente novamente mais tarde.</p>',
      additionalText: 'Obrigado pela compreensão.',
      showLogo: true,
      showButton: true,
      buttonLabel: 'Voltar ao Início',
      buttonUrl: '/#home',
      showContact: true,
      showEstimatedReturn: false,
      showCountdown: false,
    },
    ambassadors: {
      enabled: false,
      themeId: 'theme-05',
      title: 'Página temporariamente em manutenção',
      subtitle: 'Estamos realizando melhorias',
      message: '<p>Estamos realizando atualizações nesta página. Por favor, tente novamente mais tarde.</p>',
      additionalText: 'Obrigado pela compreensão.',
      showLogo: true,
      showButton: true,
      buttonLabel: 'Voltar ao Início',
      buttonUrl: '/#home',
      showContact: true,
      showEstimatedReturn: false,
      showCountdown: false,
    },
    'get-involved': {
      enabled: false,
      themeId: 'theme-06',
      title: 'Página temporariamente em manutenção',
      subtitle: 'Estamos realizando melhorias',
      message: '<p>Estamos realizando atualizações nesta página. Por favor, tente novamente mais tarde.</p>',
      additionalText: 'Obrigado pela compreensão.',
      showLogo: true,
      showButton: true,
      buttonLabel: 'Voltar ao Início',
      buttonUrl: '/#home',
      showContact: true,
      showEstimatedReturn: false,
      showCountdown: false,
    },
    stories: {
      enabled: false,
      themeId: 'theme-02',
      title: 'Página temporariamente em manutenção',
      subtitle: 'Estamos realizando melhorias',
      message: '<p>Estamos realizando atualizações nesta página. Por favor, tente novamente mais tarde.</p>',
      additionalText: 'Obrigado pela compreensão.',
      showLogo: true,
      showButton: true,
      buttonLabel: 'Voltar ao Início',
      buttonUrl: '/#home',
      showContact: true,
      showEstimatedReturn: false,
      showCountdown: false,
    },
    contact: {
      enabled: false,
      themeId: 'theme-03',
      title: 'Página temporariamente em manutenção',
      subtitle: 'Estamos realizando melhorias',
      message: '<p>Estamos realizando atualizações nesta página. Por favor, tente novamente mais tarde.</p>',
      additionalText: 'Obrigado pela compreensão.',
      showLogo: true,
      showButton: true,
      buttonLabel: 'Voltar ao Início',
      buttonUrl: '/#home',
      showContact: true,
      showEstimatedReturn: false,
      showCountdown: false,
    },
    donate: {
      enabled: false,
      themeId: 'theme-08',
      title: 'Página temporariamente em manutenção',
      subtitle: 'Estamos realizando melhorias',
      message: '<p>Esta área está temporariamente indisponível enquanto realizamos atualizações. Por favor, tente novamente mais tarde.</p>',
      additionalText: 'Obrigado pela compreensão.',
      showLogo: true,
      showButton: true,
      buttonLabel: 'Voltar ao Início',
      buttonUrl: '/#home',
      showContact: true,
      showEstimatedReturn: false,
      showCountdown: false,
    },
  },
  updatedAt: new Date().toISOString(),
  updatedBy: 'System Initializer',
};

