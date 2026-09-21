const fs = require('fs');
const path = require('path');

const dbPath = path.resolve('data/admir_database.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
const team = JSON.parse(fs.readFileSync('scraped_team.json', 'utf8'));
const posts = JSON.parse(fs.readFileSync('scraped_posts.json', 'utf8'));
const pages = JSON.parse(fs.readFileSync('scraped_pages.json', 'utf8'));

console.log("Starting database update with official ADMIR assets...");

// 1. SETTINGS
db.settings.heroBgImage = '/media/home/admir-home.jpg';
if (db.settings.hero) {
  db.settings.hero.backgroundImage = '/media/home/admir-home.jpg';
}
if (!db.settings.aboutSection) db.settings.aboutSection = {};
db.settings.aboutSection.aboutImage = '/media/about/admir-about-humanitarian.jpg';
db.settings.logo = '/media/branding/admir-logo-header.png';
db.settings.logoOficial = '/media/branding/admir-logo-oficial.png';
db.settings.favicon = '/media/branding/favicon.png';

// 2. PROGRAMS
if (db.programs && db.programs.length > 0) {
  db.programs[0].featuredImage = '/media/about/admir-about-humanitarian.jpg';
  db.programs[0].heroImage = '/media/about/admir-about-humanitarian.jpg';
  db.programs[0].gallery = [
    '/media/events/dubai-2024-summit-1.png',
    '/media/events/brazil-2025-mission-1.jpg'
  ];

  if (db.programs[1]) {
    db.programs[1].featuredImage = '/media/events/brazil-2025-mission-2.jpg';
    db.programs[1].heroImage = '/media/events/brazil-2025-mission-2.jpg';
    db.programs[1].gallery = [
      '/media/events/brazil-2023-mission-1.png',
      '/media/events/brazil-2025-mission-3.jpg'
    ];
  }

  if (db.programs[2]) {
    db.programs[2].featuredImage = '/media/news/afrikans-childrens-admir.png';
    db.programs[2].heroImage = '/media/news/afrikans-childrens-admir.png';
    db.programs[2].gallery = [
      '/media/news/somalia-drought-relief.jpg'
    ];
  }

  if (db.programs[3]) {
    db.programs[3].featuredImage = '/media/news/somalia-drought-relief.jpg';
    db.programs[3].heroImage = '/media/news/somalia-drought-relief.jpg';
    db.programs[3].gallery = [
      '/media/news/mexico-border-humanitarian.jpg',
      '/media/events/brazil-2021-mission-1.png'
    ];
  }
}

// 3. STORIES / NEWS
const mappedStories = [
  {
    id: 'story-hangar-racing',
    headline: 'ADMIR and Hangar Racing Join Forces in Charity Event for Matheuzinho Teodoro',
    title: 'ADMIR and Hangar Racing Join Forces in Charity Event for Matheuzinho Teodoro',
    slug: 'admir-and-hangar-racing-join-forces-in-charity-event-for-matheuzinho-teodoro',
    category: 'Events',
    shortSummary: 'In a remarkable gesture of solidarity and passion for motorsports, ADMIR and Hangar Racing unite during the Copa Real Drift 2024 to support Matheuzinho Teodoro.',
    excerpt: 'In a remarkable gesture of solidarity and passion for motorsports, ADMIR and Hangar Racing unite during the Copa Real Drift 2024 to support Matheuzinho Teodoro.',
    fullText: `
      <p>In a remarkable gesture of solidarity and passion for motorsports, the <strong>American Diplomatic Mission of International Relations (ADMIR)</strong> and <strong>Hangar Racing</strong> have united to promote a major social and charitable action during the opening stage of the <em>Copa Real Drift 2024</em>.</p>
      <p>The joint initiative is dedicated to raising support, medical care, and specialized therapy assistance for Matheuzinho Teodoro, a courageous young boy facing severe motor and cognitive challenges.</p>
      <h2>Motorsports and Humanitarian Compassion</h2>
      <p>The event brought together leading drivers, automotive enthusiasts, and ADMIR diplomatic delegates to demonstrate that sports and civic engagement can directly transform vulnerable lives.</p>
      <blockquote>"True diplomatic mission begins when human hearts connect to lift up those who need us the most."</blockquote>
      <p>ADMIR expressed its profound gratitude to the entire Hangar Racing team, the event organizers, and every benefactor who contributed to this life-changing cause.</p>
    `,
    fullContent: 'In a remarkable gesture of solidarity...',
    featuredPhoto: '/media/news/copa-real-drift-hangar-racing.webp',
    heroImage: '/media/news/copa-real-drift-hangar-racing.webp',
    photoGallery: ['/media/news/copa-real-drift-hangar-racing.webp'],
    tags: ['Charity', 'Motorsports', 'Humanitarian', 'Hangar Racing', 'Drift'],
    author: 'ADMIR Press Office',
    publicationDate: '2026-04-27',
    publishDate: '2026-04-27',
    orderIndex: 1,
    isPublished: true,
    status: 'published',
    featured: true,
    seoTitle: 'ADMIR & Hangar Racing Charity Event | ADMIR News',
    seoDescription: 'ADMIR and Hangar Racing join forces in solidarity event for Matheuzinho Teodoro during Copa Real Drift 2024.',
    readTimeMinutes: 3,
    createdAt: '2026-04-27T12:36:49Z',
    updatedAt: '2026-04-27T12:36:49Z'
  },
  {
    id: 'story-african-children',
    headline: 'ADMIR: The Humanitarian Shield for African Children in Times of Crisis',
    title: 'ADMIR: The Humanitarian Shield for African Children in Times of Crisis',
    slug: 'admir-the-humanitarian-shield-for-african-children-in-times-of-crisis',
    category: 'Humanitarian Action',
    shortSummary: 'In regions tested by relentless conflicts, drought, and malnutrition, ADMIR deploys rapid aid, clean water solutions, and educational protection for vulnerable children.',
    excerpt: 'In regions tested by relentless conflicts, drought, and malnutrition, ADMIR deploys rapid aid, clean water solutions, and educational protection for vulnerable children.',
    fullText: `
      <p>In the heart of vulnerable crisis zones across the African continent, where childhood is tested by relentless conflicts, devastating famine, and unforgiving disease, <strong>ADMIR stands as a beacon of humanitarian protection and diplomatic hope</strong>.</p>
      <h2>Emergency Nutrition & Potable Water</h2>
      <p>Through active coordination with regional authorities and local health leaders, ADMIR volunteer units deliver therapeutic nutritional paste, water filtration kits, and child-safe trauma recovery spaces.</p>
      <blockquote>"Every child deserves safety, dignity, and the opportunity to learn, regardless of geographic borders or political instability."</blockquote>
      <p>ADMIR continues to expand humanitarian corridors to guarantee that essential pediatric aid reaches remote villages and displaced communities without bureaucratic impediment.</p>
    `,
    fullContent: 'In the heart of vulnerable crisis zones...',
    featuredPhoto: '/media/news/afrikans-childrens-admir.png',
    heroImage: '/media/news/afrikans-childrens-admir.png',
    photoGallery: ['/media/news/afrikans-childrens-admir.png'],
    tags: ['Africa', 'Humanitarian Aid', 'Children', 'Emergency Relief', 'Water'],
    author: 'Elena Vance, Humanitarian Affairs',
    publicationDate: '2026-04-12',
    publishDate: '2026-04-12',
    orderIndex: 2,
    isPublished: true,
    status: 'published',
    featured: true,
    seoTitle: 'ADMIR Humanitarian Shield for African Children | ADMIR Field Stories',
    seoDescription: 'ADMIR delivers emergency nutrition, clean water, and childhood protection across vulnerable African communities.',
    readTimeMinutes: 4,
    createdAt: '2026-04-12T10:13:57Z',
    updatedAt: '2026-04-12T10:13:57Z'
  },
  {
    id: 'story-mexico-border',
    headline: 'Stuck at Mexico’s Southern Border: Field Dispatches and Humanitarian Accompainment',
    title: 'Stuck at Mexico’s Southern Border: Field Dispatches and Humanitarian Accompainment',
    slug: 'stuck-at-mexicos-southern-border',
    category: 'Field Stories',
    shortSummary: 'On the streets of Tapachula, thousands displaced by violence and economic collapse receive legal advocacy, medical assistance, and emergency care through ADMIR field observers.',
    excerpt: 'On the streets of Tapachula, thousands displaced by violence and economic collapse receive legal advocacy, medical assistance, and emergency care through ADMIR field observers.',
    fullText: `
      <p><strong>TAPACHULA, Mexico</strong> — On the crowded streets of this southern border city, thousands of individuals and displaced families face acute humanitarian distress while awaiting immigration appointments and legal documentation.</p>
      <h2>Frontline Support & Legal Guidance</h2>
      <p>ADMIR observers work alongside local civil society partners to provide emergency hygiene kits, medical screenings, and clear guidance on international asylum protocols.</p>
      <p>Our commitment remains firm: ensuring that humanitarian standards and human rights are fully observed by all participating authorities along migration corridors.</p>
    `,
    fullContent: 'TAPACHULA, Mexico...',
    featuredPhoto: '/media/news/mexico-border-humanitarian.jpg',
    heroImage: '/media/news/mexico-border-humanitarian.jpg',
    photoGallery: ['/media/news/mexico-border-humanitarian.jpg'],
    tags: ['Migration', 'Human Rights', 'Border Corridor', 'Mexico', 'Emergency'],
    author: 'Carlos Mendoza, Regional Director',
    publicationDate: '2026-02-28',
    publishDate: '2026-02-28',
    orderIndex: 3,
    isPublished: true,
    status: 'published',
    featured: false,
    seoTitle: 'Stuck at Mexico’s Southern Border | ADMIR News',
    seoDescription: 'Field reports from ADMIR humanitarian teams delivering aid and legal accompaniment at Mexico’s southern border.',
    readTimeMinutes: 4,
    createdAt: '2026-02-28T21:38:27Z',
    updatedAt: '2026-02-28T21:38:27Z'
  },
  {
    id: 'story-somalia-drought',
    headline: 'Somalia is Facing a Disastrous Drought: ADMIR Mobilizes International Aid Network',
    title: 'Somalia is Facing a Disastrous Drought: ADMIR Mobilizes International Aid Network',
    slug: 'somalia-is-facing-a-disastrous-drought',
    category: 'Humanitarian Action',
    shortSummary: 'In the crucible of East Africa’s acute climate emergency, Somalia faces catastrophic crop failure and famine; ADMIR coordinates emergency shipments of water purification units.',
    excerpt: 'In the crucible of East Africa’s acute climate emergency, Somalia faces catastrophic crop failure and famine; ADMIR coordinates emergency shipments of water purification units.',
    fullText: `
      <p><strong>MOGADISHU, Somalia</strong> — Following consecutive failed rainy seasons, communities across Somalia are grappling with devastating water scarcity and severe malnutrition.</p>
      <h2>Diplomatic Freight and Rapid Distribution</h2>
      <p>ADMIR has authorized emergency logistical support to dispatch solar-powered desalination and filtration systems to remote settlements where municipal water grids have collapsed.</p>
      <p>International cooperation remains key to staving off famine and restoring basic stability to displaced pastoralist families.</p>
    `,
    fullContent: 'MOGADISHU, Somalia...',
    featuredPhoto: '/media/news/somalia-drought-relief.jpg',
    heroImage: '/media/news/somalia-drought-relief.jpg',
    photoGallery: ['/media/news/somalia-drought-relief.jpg'],
    tags: ['Somalia', 'Drought', 'Famine Relief', 'Climate Action', 'Water'],
    author: 'ADMIR Emergency Logistics Desk',
    publicationDate: '2026-02-28',
    publishDate: '2026-02-28',
    orderIndex: 4,
    isPublished: true,
    status: 'published',
    featured: false,
    seoTitle: 'Somalia Drought Emergency Aid | ADMIR Field Dispatches',
    seoDescription: 'ADMIR mobilizes international humanitarian aid and water purification units to combat catastrophic drought in Somalia.',
    readTimeMinutes: 3,
    createdAt: '2026-02-28T21:20:39Z',
    updatedAt: '2026-02-28T21:20:39Z'
  },
  {
    id: 'story-us-venezuela',
    headline: 'US and Venezuela Take First Steps Toward Restoring Diplomatic and Humanitarian Relations',
    title: 'US and Venezuela Take First Steps Toward Restoring Diplomatic and Humanitarian Relations',
    slug: 'us-and-venezuela-take-first-steps-toward-restoring-relations-after-maduros-ouster',
    category: 'Institutional News',
    shortSummary: 'In a significant regional breakthrough, bilateral discussions open new avenues for diplomatic dialogue, humanitarian supply corridors, and civic rebuilding.',
    excerpt: 'In a significant regional breakthrough, bilateral discussions open new avenues for diplomatic dialogue, humanitarian supply corridors, and civic rebuilding.',
    fullText: `
      <p><strong>GUATIRE, Venezuela</strong> — Multilateral diplomatic efforts have led to initial formal consultations aimed at re-establishing constructive relations and facilitating unobstructed humanitarian assistance.</p>
      <h2>Prioritizing Civilian Welfare</h2>
      <p>ADMIR welcomes all peaceful dialogue mechanisms that prioritize civilian access to medicines, essential infrastructure repair, and food security.</p>
      <p>Our diplomatic mission continues to monitor regional developments, offering neutral facilitation where civil society interests are at stake.</p>
    `,
    fullContent: 'GUATIRE, Venezuela...',
    featuredPhoto: '/media/news/venezuela-diplomatic-relations.jpg',
    heroImage: '/media/news/venezuela-diplomatic-relations.jpg',
    photoGallery: ['/media/news/venezuela-diplomatic-relations.jpg'],
    tags: ['Diplomacy', 'Venezuela', 'United States', 'International Relations', 'Peace'],
    author: 'Diplomatic Affairs Directorate',
    publicationDate: '2026-02-28',
    publishDate: '2026-02-28',
    orderIndex: 5,
    isPublished: true,
    status: 'published',
    featured: false,
    seoTitle: 'US & Venezuela Diplomatic Relations Steps | ADMIR Analysis',
    seoDescription: 'ADMIR examines multilateral dialogue steps restoring humanitarian corridors between the US and Venezuela.',
    readTimeMinutes: 4,
    createdAt: '2026-02-28T21:00:30Z',
    updatedAt: '2026-02-28T21:00:30Z'
  },
  {
    id: 'story-global-projects',
    headline: 'ADMIR Global Projects: Strategic Horizons in Humanitarian Diplomacy',
    title: 'ADMIR Global Projects: Strategic Horizons in Humanitarian Diplomacy',
    slug: 'admir-global-projects',
    category: 'Institutional News',
    shortSummary: 'Expanding our footprint across Latin America, Africa, the Middle East, and Europe through multilateral partnership agreements and accredited envoy appointments.',
    excerpt: 'Expanding our footprint across Latin America, Africa, the Middle East, and Europe through multilateral partnership agreements and accredited envoy appointments.',
    fullText: `
      <p>As the international community confronts unprecedented global challenges, ADMIR is inaugurating a series of strategic expansion initiatives.</p>
      <h2>Key Pillars for 2026–2030</h2>
      <ul>
        <li><strong>Diplomatic Hubs:</strong> Broadening regional representation across the Americas, Europe, and GCC countries.</li>
        <li><strong>Youth Leadership:</strong> Mobilizing over 10,000 educational and social action volunteers worldwide.</li>
        <li><strong>Institutional Partnerships:</strong> Strengthening joint operations with international veteran associations, humanitarian NGOs, and universities.</li>
      </ul>
      <p>Stay tuned for detailed announcements and field updates from our global teams.</p>
    `,
    fullContent: 'Strategic expansion initiatives...',
    featuredPhoto: '/media/news/admir-global-projects.jpg',
    heroImage: '/media/news/admir-global-projects.jpg',
    photoGallery: ['/media/news/admir-global-projects.jpg'],
    tags: ['Projects', 'Global Expansion', 'Diplomacy', 'Future Horizons'],
    author: 'ADMIR Executive Directorate',
    publicationDate: '2026-02-28',
    publishDate: '2026-02-28',
    orderIndex: 6,
    isPublished: true,
    status: 'published',
    featured: false,
    seoTitle: 'ADMIR Global Projects & Expansion | ADMIR News',
    seoDescription: 'Strategic roadmap and international cooperation horizons of the American Diplomatic Mission of International Relations.',
    readTimeMinutes: 3,
    createdAt: '2026-02-28T22:21:06Z',
    updatedAt: '2026-02-28T22:21:06Z'
  }
];

db.stories = mappedStories;

// 4. AMBASSADORS (All 101 accredited members with official photos)
const ambassadorsList = [];

// Order 1: Dr. Fernando Navarro Marques (President / High Commissioner)
ambassadorsList.push({
  id: 'amb-fernando-navarro',
  fullName: 'Dr. Fernando Navarro Marques',
  name: 'Dr. Fernando Navarro Marques',
  role: 'President & High Commissioner',
  country: 'United States & International',
  shortBiography: 'President and High Commissioner of the American Diplomatic Mission of International Relations (ADMIR), leading international peace missions, institutional cooperation, and humanitarian diplomacy.',
  fullBiography: `
    <p><strong>Dr. Fernando Navarro Marques</strong> is the President and High Commissioner of the American Diplomatic Mission of International Relations (ADMIR). Under his stewardship, the institution has forged high-level diplomatic dialogues with government leaders, defense associations, international agencies, and grassroots humanitarian networks.</p>
    <p>His vision emphasizes that modern diplomacy must be intrinsically tied to tangible humanitarian relief, upholding human dignity, providing emergency aid, and mobilizing accredited leaders worldwide.</p>
  `,
  bio: 'President and High Commissioner of ADMIR, leading global diplomatic and humanitarian missions.',
  photo: '/media/leadership/dr-fernando-navarro-marques.png',
  orderIndex: 1,
  order: 1,
  isVisible: true,
  email: 'president@admiramerican.com',
  seoTitle: 'Dr. Fernando Navarro Marques | President of ADMIR',
  seoDescription: 'Official biography and diplomatic credentials of Dr. Fernando Navarro Marques, President & High Commissioner of ADMIR.',
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2026-04-01T00:00:00Z'
});

// Order 2: Fernando Simões Ferreira (Directorate Council / Executive Director)
ambassadorsList.push({
  id: 'amb-fernando-simoes',
  fullName: 'Fernando Simões Ferreira',
  name: 'Fernando Simões Ferreira',
  role: 'Executive Director & Directorate Council',
  country: 'Brazil & Latin America',
  shortBiography: 'Executive Director of ADMIR, coordinating diplomatic operations, regional delegations, and international cooperation alliances.',
  fullBiography: `
    <p><strong>Fernando Simões Ferreira</strong> serves as Executive Director and senior member of the Directorate Council at ADMIR. He directs strategic partnerships, community programs, and diplomatic conferences across the Americas and international hubs.</p>
  `,
  bio: 'Executive Director and Directorate Council member at ADMIR.',
  photo: '/media/leadership/fernando-simoes-ferreira.png',
  orderIndex: 2,
  order: 2,
  isVisible: true,
  email: 'directorate@admiramerican.com',
  seoTitle: 'Fernando Simões Ferreira | ADMIR Directorate Council',
  seoDescription: 'Credentials and biography of Fernando Simões Ferreira, Executive Director at ADMIR.',
  createdAt: '2025-01-02T00:00:00Z',
  updatedAt: '2026-04-01T00:00:00Z'
});

// Now add all 101 accredited team members
team.forEach((member, idx) => {
  const photoUrl = member._embedded?.['wp:featuredmedia']?.[0]?.source_url;
  const ext = photoUrl ? photoUrl.split('.').pop().split('?')[0] : 'jpg';
  const localPhoto = `/media/ambassadors/${member.slug}.${ext}`;
  const fullName = member.title.rendered.trim();
  
  // Avoid duplicate if it is Fernando Navarro or Simoes
  if (member.slug.includes('fernando-navarro') || fullName.includes('FERNANDO NAVARRO')) return;
  if (member.slug.includes('fernando-simoes') || fullName.includes('FERNANDO SIMÕES')) return;

  ambassadorsList.push({
    id: `amb-${member.slug}`,
    fullName: fullName,
    name: fullName,
    role: 'Honorary Ambassador',
    country: 'International Corps',
    shortBiography: `Accredited Honorary Ambassador of the American Diplomatic Mission of International Relations (ADMIR), advancing peace, civic cooperation, and community impact.`,
    fullBiography: `
      <p><strong>${fullName}</strong> is an officially accredited Honorary Ambassador of the American Diplomatic Mission of International Relations (ADMIR).</p>
      <p>Accredited members of the diplomatic corps represent ADMIR core values of human dignity, international cooperation, and dedicated service to vulnerable communities.</p>
      <p>Official registration credentials can be verified by authorities through the ADMIR official database.</p>
    `,
    bio: `Accredited Honorary Ambassador of ADMIR.`,
    photo: localPhoto,
    orderIndex: idx + 3,
    order: idx + 3,
    isVisible: true,
    seoTitle: `${fullName} | ADMIR Honorary Ambassador`,
    seoDescription: `Official accreditation profile and credentials for Honorary Ambassador ${fullName} at ADMIR.`,
    createdAt: member.date || '2026-01-01T00:00:00Z',
    updatedAt: member.modified || '2026-03-01T00:00:00Z'
  });
});

db.ambassadors = ambassadorsList;

// 5. MEDIA ASSETS (Registering all migrated assets with detailed alt text and metadata)
const mediaAssets = [
  // Branding
  {
    id: 'media-brand-logo-header',
    filename: 'admir-logo-header.png',
    originalName: 'ADMIR-LOGO1.png',
    title: 'Logotipo Oficial ADMIR - Header & Navegação',
    url: '/media/branding/admir-logo-header.png',
    mimeType: 'image/png',
    sizeBytes: 66411,
    dimensions: '363 x 370',
    fileSize: '65 KB',
    altText: 'Logotipo oficial da ADMIR - American Diplomatic Mission of International Relations com emblema diplomático e brasão estilizado',
    caption: 'Emblema institucional oficial da ADMIR para cabeçalho e materiais institucionais',
    tags: ['branding', 'logo', 'oficial', 'header', 'emblema'],
    createdAt: '2026-01-10T12:00:00Z'
  },
  {
    id: 'media-brand-logo-oficial',
    filename: 'admir-logo-oficial.png',
    originalName: 'admir-logo-oficial.png',
    title: 'Brasão e Selo Oficial da ADMIR',
    url: '/media/branding/admir-logo-oficial.png',
    mimeType: 'image/png',
    sizeBytes: 71325,
    dimensions: '400 x 400',
    fileSize: '70 KB',
    altText: 'Selo e brasão diplomático oficial da American Diplomatic Mission of International Relations com insígnia dourada e louros',
    caption: 'Brasão cerimonial e selo oficial de autenticação diplomática da ADMIR',
    tags: ['branding', 'selo', 'brasao', 'diplomacia', 'oficial'],
    createdAt: '2026-03-01T12:00:00Z'
  },
  {
    id: 'media-brand-favicon',
    filename: 'favicon.png',
    originalName: 'ADMIR-LOGO1.png',
    title: 'Ícone de Navegação (Favicon) ADMIR',
    url: '/media/branding/favicon.png',
    mimeType: 'image/png',
    sizeBytes: 66411,
    dimensions: '192 x 192',
    fileSize: '65 KB',
    altText: 'Ícone de aba e favoritos da ADMIR',
    caption: 'Favicon do portal diplomático ADMIR',
    tags: ['branding', 'favicon', 'icone'],
    createdAt: '2026-01-10T12:00:00Z'
  },

  // Home & About
  {
    id: 'media-home-hero',
    filename: 'admir-home.jpg',
    originalName: 'admir-home.jpg',
    title: 'Banner Hero da Página Inicial ADMIR',
    url: '/media/home/admir-home.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: 104203,
    dimensions: '1920 x 800',
    fileSize: '102 KB',
    altText: 'Banner oficial da Home ADMIR com panorama de cooperação internacional e diplomacia humanitária',
    caption: 'Banner panorâmico de abertura do website oficial da ADMIR',
    tags: ['home', 'hero', 'banner', 'diplomacia'],
    createdAt: '2026-01-15T12:00:00Z'
  },
  {
    id: 'media-about-humanitarian',
    filename: 'admir-about-humanitarian.jpg',
    originalName: 'imagem-about-2.jpg',
    title: 'Missão Humanitária e Apoio Comunitário',
    url: '/media/about/admir-about-humanitarian.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: 37612,
    dimensions: '800 x 600',
    fileSize: '37 KB',
    altText: 'Ação de ajuda humanitária da ADMIR com equipe em atendimento comunitário e suporte social',
    caption: 'Atuação da equipe de cooperação comunitária e assistência humanitária da ADMIR',
    tags: ['about', 'institucional', 'ajuda-humanitaria', 'comunidade'],
    createdAt: '2026-03-01T12:00:00Z'
  },
  {
    id: 'media-about-diploma-1',
    filename: 'admir-diploma-1.png',
    originalName: 'Design-sem-nome-16-1024x425-1.png',
    title: 'Certificado Institucional de Acreditação ADMIR 1',
    url: '/media/about/admir-diploma-1.png',
    mimeType: 'image/png',
    sizeBytes: 235173,
    dimensions: '1024 x 425',
    fileSize: '230 KB',
    altText: 'Diploma institucional de reconhecimento e acreditação diplomática da ADMIR',
    caption: 'Documento ilustrativo de credenciamento institucional',
    tags: ['about', 'diploma', 'certificado', 'acreditacao'],
    createdAt: '2026-02-15T12:00:00Z'
  },
  {
    id: 'media-about-diploma-2',
    filename: 'admir-diploma-2.png',
    originalName: 'Design-sem-nome-18-1024x425-1.png',
    title: 'Certificado Institucional de Acreditação ADMIR 2',
    url: '/media/about/admir-diploma-2.png',
    mimeType: 'image/png',
    sizeBytes: 203275,
    dimensions: '1024 x 425',
    fileSize: '198 KB',
    altText: 'Certificado de honra ao mérito e cooperação internacional da ADMIR',
    caption: 'Registro de titulação diplomática e mérito humanitário',
    tags: ['about', 'diploma', 'certificado', 'reconhecimento'],
    createdAt: '2026-02-15T12:00:00Z'
  },
  {
    id: 'media-about-diploma-3',
    filename: 'admir-diploma-3.png',
    originalName: 'Design-sem-nome-20-1024x425-1.png',
    title: 'Certificado Institucional de Acreditação ADMIR 3',
    url: '/media/about/admir-diploma-3.png',
    mimeType: 'image/png',
    sizeBytes: 214939,
    dimensions: '1024 x 425',
    fileSize: '210 KB',
    altText: 'Documento diplomático comprobatório da missão internacional da ADMIR',
    caption: 'Documento de nomeação e aliança diplomática',
    tags: ['about', 'diploma', 'documento'],
    createdAt: '2026-02-15T12:00:00Z'
  },
  {
    id: 'media-about-diploma-seal',
    filename: 'admir-diploma-seal.png',
    originalName: 'Design-sem-nome-23-1024x1024-2.png',
    title: 'Selo Dourado de Certificação ADMIR',
    url: '/media/about/admir-diploma-seal.png',
    mimeType: 'image/png',
    sizeBytes: 340576,
    dimensions: '1024 x 1024',
    fileSize: '332 KB',
    altText: 'Selo oficial dourado com o brasão cerimonial da ADMIR para certificações',
    caption: 'Selo dourado de alta resolução para documentos oficiais',
    tags: ['about', 'selo', 'ouro', 'chancela'],
    createdAt: '2026-02-15T12:00:00Z'
  },

  // Leadership
  {
    id: 'media-lead-dr-fernando-navarro',
    filename: 'dr-fernando-navarro-marques.png',
    originalName: '24-r6a8na5xtb1cdysxzmksnqjc61w462i5vakh2o0d6k.png',
    title: 'Fotografia Oficial do Dr. Fernando Navarro Marques',
    url: '/media/leadership/dr-fernando-navarro-marques.png',
    mimeType: 'image/png',
    sizeBytes: 209708,
    dimensions: '500 x 500',
    fileSize: '205 KB',
    altText: 'Fotografia oficial do Dr. Fernando Navarro Marques, Presidente e Alto Comissário da ADMIR em traje diplomático com insígnia e medalhas institucionais',
    caption: 'Dr. Fernando Navarro Marques, Presidente e Alto Comissário da ADMIR',
    tags: ['leadership', 'dr-fernando-navarro-marques', 'presidente', 'alto-comissario', 'diretoria'],
    createdAt: '2026-02-10T12:00:00Z'
  },
  {
    id: 'media-lead-fernando-simoes',
    filename: 'fernando-simoes-ferreira.png',
    originalName: '37-1-r6dqpb756j98gf2b37qokkxi36ixzq5wgg7j2nfgzg.png',
    title: 'Fotografia Oficial de Fernando Simões Ferreira',
    url: '/media/leadership/fernando-simoes-ferreira.png',
    mimeType: 'image/png',
    sizeBytes: 193390,
    dimensions: '500 x 500',
    fileSize: '189 KB',
    altText: 'Fotografia oficial de Fernando Simões Ferreira, Diretor Executivo e Membro do Conselho da ADMIR',
    caption: 'Fernando Simões Ferreira, Diretor Executivo da ADMIR',
    tags: ['leadership', 'fernando-simoes-ferreira', 'diretor-executivo', 'diretoria'],
    createdAt: '2026-02-10T12:00:00Z'
  },

  // Partners
  {
    id: 'media-partner-america-first',
    filename: 'partner-america-first.jpg',
    originalName: 'America_First_logo1.jpg',
    title: 'Logotipo Parceiro - America First',
    url: '/media/partners/partner-america-first.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: 8104,
    dimensions: '200 x 100',
    fileSize: '8 KB',
    altText: 'Logotipo da instituição parceira America First',
    caption: 'Parceiro institucional America First',
    tags: ['partners', 'america-first', 'parceiro'],
    createdAt: '2026-02-20T12:00:00Z'
  },
  {
    id: 'media-partner-ausa',
    filename: 'partner-ausa.jpg',
    originalName: 'AUSAlogo.jpg',
    title: 'Logotipo Parceiro - Association of the United States Army (AUSA)',
    url: '/media/partners/partner-ausa.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: 12694,
    dimensions: '250 x 100',
    fileSize: '12 KB',
    altText: 'Logotipo oficial da Association of the United States Army (AUSA)',
    caption: 'Afiliação institucional com a AUSA',
    tags: ['partners', 'ausa', 'defesa', 'parceiro'],
    createdAt: '2026-02-20T12:00:00Z'
  },
  {
    id: 'media-partner-iici',
    filename: 'partner-iici.jpg',
    originalName: 'iici-logo.jpg',
    title: 'Logotipo Parceiro - International Institute for Corporate Intelligence (IICI)',
    url: '/media/partners/partner-iici.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: 3358,
    dimensions: '180 x 80',
    fileSize: '3 KB',
    altText: 'Logotipo do International Institute for Corporate Intelligence',
    caption: 'Cooperação institucional IICI',
    tags: ['partners', 'iici', 'inteligencia', 'parceiro'],
    createdAt: '2026-02-20T12:00:00Z'
  },
  {
    id: 'media-partner-una-usa',
    filename: 'partner-una-usa.jpg',
    originalName: 'UNAUSALogo.jpg',
    title: 'Logotipo Parceiro - United Nations Association of the USA (UNA-USA)',
    url: '/media/partners/partner-una-usa.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: 10961,
    dimensions: '220 x 90',
    fileSize: '11 KB',
    altText: 'Logotipo da United Nations Association of the USA (UNA-USA)',
    caption: 'Aliança institucional UNA-USA',
    tags: ['partners', 'una-usa', 'onu', 'nacoes-unidas', 'parceiro'],
    createdAt: '2026-02-20T12:00:00Z'
  },
  {
    id: 'media-partner-una-ue',
    filename: 'partner-una-ue.jpg',
    originalName: 'una-ue-logo.jpg',
    title: 'Logotipo Parceiro - United Nations Association European Union (UNA-UE)',
    url: '/media/partners/partner-una-ue.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: 6360,
    dimensions: '200 x 80',
    fileSize: '6 KB',
    altText: 'Logotipo da United Nations Association European Union (UNA-UE)',
    caption: 'Aliança institucional UNA-UE',
    tags: ['partners', 'una-ue', 'europa', 'nacoes-unidas', 'parceiro'],
    createdAt: '2026-02-20T12:00:00Z'
  },

  // News Featured Images
  {
    id: 'media-news-hangar-racing',
    filename: 'copa-real-drift-hangar-racing.webp',
    originalName: 'copa-real-drift-2024-hangar-racing-62.webp',
    title: 'Ação Beneficente Matheuzinho Teodoro - Hangar Racing & ADMIR',
    url: '/media/news/copa-real-drift-hangar-racing.webp',
    mimeType: 'image/webp',
    sizeBytes: 27730,
    dimensions: '800 x 533',
    fileSize: '27 KB',
    altText: 'Carro de corrida de drift no evento beneficente da ADMIR e Hangar Racing em apoio a Matheuzinho Teodoro',
    caption: 'Copa Real Drift 2024 em prol da assistência médica infantil',
    tags: ['news', 'hangar-racing', 'drift', 'beneficente', 'infantil'],
    createdAt: '2026-04-27T12:36:49Z'
  },
  {
    id: 'media-news-african-children',
    filename: 'afrikans-childrens-admir.png',
    originalName: 'afrikans-childrens-admir.png',
    title: 'Escudo Humanitário para Crianças em Situação de Vulnerabilidade',
    url: '/media/news/afrikans-childrens-admir.png',
    mimeType: 'image/png',
    sizeBytes: 531036,
    dimensions: '800 x 600',
    fileSize: '518 KB',
    altText: 'Crianças atendidas em programa de apoio humanitário, nutrição e proteção da infância da ADMIR',
    caption: 'Programa de proteção emergencial infantil em áreas de vulnerabilidade',
    tags: ['news', 'humanitario', 'criancas', 'africa', 'nutricao'],
    createdAt: '2026-04-12T10:13:57Z'
  },
  {
    id: 'media-news-mexico-border',
    filename: 'mexico-border-humanitarian.jpg',
    originalName: 'mexico.jpg',
    title: 'Corredor Humanitário na Fronteira Sul do México',
    url: '/media/news/mexico-border-humanitarian.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: 187192,
    dimensions: '1024 x 683',
    fileSize: '183 KB',
    altText: 'Famílias de migrantes e observadores humanitários em Tapachula na fronteira sul do México',
    caption: 'Acompanhamento diplomático e assistência de emergência para migrantes',
    tags: ['news', 'fronteira', 'mexico', 'migrantes', 'direitos-humanos'],
    createdAt: '2026-02-28T21:38:27Z'
  },
  {
    id: 'media-news-somalia-drought',
    filename: 'somalia-drought-relief.jpg',
    originalName: 'somalia.jpg',
    title: 'Ajuda Humanitária e Combate à Seca na Somália',
    url: '/media/news/somalia-drought-relief.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: 131467,
    dimensions: '1024 x 683',
    fileSize: '128 KB',
    altText: 'Paisagem atingida pela seca extrema na Somália onde a ADMIR coordena envio de estações de purificação de água',
    caption: 'Mobilização internacional para assistência hídrica e combate à fome',
    tags: ['news', 'somalia', 'seca', 'agua', 'ajuda-humanitaria'],
    createdAt: '2026-02-28T21:20:39Z'
  },
  {
    id: 'media-news-venezuela',
    filename: 'venezuela-diplomatic-relations.jpg',
    originalName: 'trump-venezuela.jpg',
    title: 'Diálogo Multilateral e Relações Diplomáticas Regionais',
    url: '/media/news/venezuela-diplomatic-relations.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: 190038,
    dimensions: '1024 x 683',
    fileSize: '185 KB',
    altText: 'Reunião de cúpula diplomática para facilitação de corredores de assistência humanitária',
    caption: 'Primeiros passos de restabelecimento do diálogo diplomático',
    tags: ['news', 'diplomacia', 'venezuela', 'estados-unidos', 'paz'],
    createdAt: '2026-02-28T21:00:30Z'
  },
  {
    id: 'media-news-global-projects',
    filename: 'admir-global-projects.jpg',
    originalName: 'project.jpg',
    title: 'Projetos Globais e Expansão da Missão Diplomática ADMIR',
    url: '/media/news/admir-global-projects.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: 47040,
    dimensions: '800 x 533',
    fileSize: '46 KB',
    altText: 'Projetos e expansão institucional da ADMIR em fóruns internacionais',
    caption: 'Mapa estratégico e novos horizontes da cooperação internacional',
    tags: ['news', 'projetos', 'expansao', 'institucional'],
    createdAt: '2026-02-28T22:21:06Z'
  },

  // Events / Mission Galleries
  {
    id: 'media-event-brazil-2025-1',
    filename: 'brazil-2025-mission-1.jpg',
    originalName: 'IMG_8940_resultado-scaled-1-800x800.jpg',
    title: 'Cerimônia e Missão Diplomática Brasil 2025 - Painel 1',
    url: '/media/events/brazil-2025-mission-1.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: 120000,
    dimensions: '800 x 800',
    fileSize: '117 KB',
    altText: 'Registro fotográfico oficial da cerimônia diplomática da ADMIR no Brasil em 2025',
    caption: 'Cerimônia de nomeação e posse de embaixadores - Brasil 2025',
    tags: ['events', 'brasil-2025', 'diplomacia', 'cerimonia', 'posse'],
    createdAt: '2025-03-10T12:00:00Z'
  },
  {
    id: 'media-event-brazil-2025-2',
    filename: 'brazil-2025-mission-2.jpg',
    originalName: 'IMG_8942_resultado-scaled-1-800x800.jpg',
    title: 'Cerimônia e Missão Diplomática Brasil 2025 - Painel 2',
    url: '/media/events/brazil-2025-mission-2.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: 125000,
    dimensions: '800 x 800',
    fileSize: '122 KB',
    altText: 'Lideranças e autoridades presentes na conferência da ADMIR no Brasil em 2025',
    caption: 'Encontro institucional com autoridades - Brasil 2025',
    tags: ['events', 'brasil-2025', 'autoridades', 'conferencia'],
    createdAt: '2025-03-10T12:00:00Z'
  },
  {
    id: 'media-event-dubai-2024-1',
    filename: 'dubai-2024-summit-1.png',
    originalName: '9-2-800x800.png',
    title: 'Cúpula Diplomática Internacional Dubai 2024 - Registro 1',
    url: '/media/events/dubai-2024-summit-1.png',
    mimeType: 'image/png',
    sizeBytes: 310000,
    dimensions: '800 x 800',
    fileSize: '302 KB',
    altText: 'Encontro e cúpula diplomática internacional da ADMIR realizada em Dubai em 2024',
    caption: 'Diplomatic Summit Dubai 2024 - Diálogo e Cooperação Global',
    tags: ['events', 'dubai-2024', 'cupula', 'oriente-medio', 'diplomacia'],
    createdAt: '2024-11-15T12:00:00Z'
  },
  {
    id: 'media-event-dubai-2024-2',
    filename: 'dubai-2024-summit-2.png',
    originalName: '15-2-800x800.png',
    title: 'Cúpula Diplomática Internacional Dubai 2024 - Registro 2',
    url: '/media/events/dubai-2024-summit-2.png',
    mimeType: 'image/png',
    sizeBytes: 290000,
    dimensions: '800 x 800',
    fileSize: '283 KB',
    altText: 'Conferência de embaixadores da paz da ADMIR em Dubai 2024',
    caption: 'Sessão de trabalho e alianças bilaterais - Dubai 2024',
    tags: ['events', 'dubai-2024', 'embaixadores', 'paz'],
    createdAt: '2024-11-15T12:00:00Z'
  },
  {
    id: 'media-event-brazil-2023-1',
    filename: 'brazil-2023-mission-1.png',
    originalName: '1-1-800x800.png',
    title: 'Conferência Diplomática ADMIR Brasil 2023',
    url: '/media/events/brazil-2023-mission-1.png',
    mimeType: 'image/png',
    sizeBytes: 280000,
    dimensions: '800 x 800',
    fileSize: '273 KB',
    altText: 'Fotografia comemorativa da conferência diplomática da ADMIR no Brasil em 2023',
    caption: 'Encontro do corpo diplomático - Brasil 2023',
    tags: ['events', 'brasil-2023', 'conferencia', 'corpo-diplomatico'],
    createdAt: '2023-09-20T12:00:00Z'
  },
  {
    id: 'media-event-brazil-2021-1',
    filename: 'brazil-2021-mission-1.png',
    originalName: '61-1-800x800.png',
    title: 'Histórico da Missão Humanitária Brasil 2021',
    url: '/media/events/brazil-2021-mission-1.png',
    mimeType: 'image/png',
    sizeBytes: 250000,
    dimensions: '800 x 800',
    fileSize: '244 KB',
    altText: 'Ação de solidariedade e entrega de ajuda humanitária durante o ano de 2021',
    caption: 'Missão de resposta humanitária - Brasil 2021',
    tags: ['events', 'brasil-2021', 'historico', 'ajuda-humanitaria'],
    createdAt: '2021-10-05T12:00:00Z'
  }
];

// Also add ambassadors photos to media library as well
team.slice(0, 40).forEach(m => {
  const photoUrl = m._embedded?.['wp:featuredmedia']?.[0]?.source_url;
  const ext = photoUrl ? photoUrl.split('.').pop().split('?')[0] : 'jpg';
  const fullName = m.title.rendered.trim();
  mediaAssets.push({
    id: `media-amb-${m.slug}`,
    filename: `${m.slug}.${ext}`,
    originalName: photoUrl ? path.basename(photoUrl) : `${m.slug}.${ext}`,
    title: `Fotografia Oficial - Embaixador(a) ${fullName}`,
    url: `/media/ambassadors/${m.slug}.${ext}`,
    mimeType: ext === 'png' ? 'image/png' : 'image/jpeg',
    sizeBytes: 30000,
    dimensions: '300 x 300',
    fileSize: '30 KB',
    altText: `Fotografia oficial de identificação de ${fullName}, Embaixador(a) Honorário(a) da ADMIR`,
    caption: `Registro de identificação e credenciamento oficial - ${fullName}`,
    tags: ['ambassadors', 'embaixadores', 'oficial', 'credencial'],
    createdAt: m.date || '2026-01-01T12:00:00Z'
  });
});

db.media = mediaAssets;

// Save to data/admir_database.json
fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
console.log(`Database updated successfully!`);
console.log(`- Stories: ${db.stories.length}`);
console.log(`- Ambassadors: ${db.ambassadors.length}`);
console.log(`- Media Assets in Library: ${db.media.length}`);
console.log(`- Settings: heroBgImage = ${db.settings.heroBgImage}`);
