/**
 * Yassin Ragab — Digital Twin Knowledge Data
 * Pure data module: update bio, projects, links, or Q&A entries here
 * without touching any UI or matching logic.
 */

export const DOSSIER = {
  name: "Yassin Mohamed Ragab",
  title: "Computer Engineering Student & AI Systems Developer",
  university: "University of Sharjah (UOS), College of Computing & Informatics (2026–2030)",
  highSchool: "GEMS Westminster School Ras Al Khaimah (Head Boy & Deputy Head Boy)",
  academics: "8 A*/A IGCSE Honors · Pearson Edexcel High Achiever",
  email: "yassinraggab@gmail.com",
  workEmail: "yassin@navicampus.app",
  github: "https://github.com/yvs1n",
  linkedin: "https://linkedin.com/in/yassinr",
  stats: {
    reach: "500,000+ views",
    systems: "15+ deployed architectures",
    mentored: "1,000+ students in Edexcel Physics & Statistics"
  }
};

export const QUESTION_POOLS = [
  [
    "What is your flagship project?",
    "Tell me about NaviCampus",
    "What is your tech stack?",
    "How do I hire or contact you?"
  ],
  [
    "What did you build with Blackboarder?",
    "What drives your engineering philosophy?",
    "What was your role as Head Boy?",
    "Which live projects can I test right now?"
  ],
  [
    "Tell me about your background at UOS",
    "What is your experience with AI and NLP?",
    "Tell me about Elementa and TranZ",
    "What roles are you currently open to?"
  ]
];

export const KNOWLEDGE_BASE = [
  {
    id: "navicampus",
    keywords: ["navicampus", "campus", "navigation", "coolest route", "routing", "map", "desert heat", "accessible", "step-free", "leaflet", "spatial"],
    bubbles: [
      "NaviCampus is my flagship spatial mapping and climate-aware campus navigation platform.",
      "I built it specifically to solve extreme desert heat across UAE universities using a custom 'Coolest Route' algorithm through air-conditioned skywalks and shaded concourses.",
      "It also features a strict 'Step-Free' accessibility engine for mobility-impaired students and an in-browser vector topology compiler that runs multi-floor pathfinding with zero server latency.",
      "You can test the production system right now at <a href='https://navicampus.app/' target='_blank' rel='noopener' class='tw-link'>navicampus.app</a> or inspect the card in the <a href='#projects' class='tw-link' data-nav-index='3'>Projects section</a>."
    ],
    followups: ["What tech stack powers NaviCampus?", "Tell me about Blackboarder", "What roles are you looking for?"]
  },
  {
    id: "blackboarder",
    keywords: ["blackboarder", "blackboard", "extension", "chrome", "lms", "arabic", "bilingual", "nlp", "gpa", "gradebook", "vitest"],
    bubbles: [
      "Blackboarder is my bilingual academic sidekick extension for Blackboard Learn Ultra.",
      "It features a custom local NLP parser that extracts buried exam deadlines and room changes from unstructured announcements in both Arabic (like 'الأحد بعد القادم') and English.",
      "It also computes weighted cumulative GPA projections on the UOS 4.0 scale and syncs across devices via private 10-character cryptographic keys.",
      "The codebase has over 528 Vitest tests. Check out the <a href='https://blackboarder.pages.dev/' target='_blank' rel='noopener' class='tw-link'>official site</a> or view the repo on <a href='https://github.com/yvs1n/blackboarder-extension' target='_blank' rel='noopener' class='tw-link'>GitHub</a>."
    ],
    followups: ["Tell me about NaviCampus", "What is your tech stack?", "How do I reach you?"]
  },
  {
    id: "favorite_project",
    keywords: ["favorite", "proudest", "best", "flagship", "top project", "proud"],
    bubbles: [
      "That's definitely a split between <strong>NaviCampus</strong> and <strong>Blackboarder</strong>, but for different reasons.",
      "NaviCampus tackled complex spatial graph algorithms and indoor climate routing for hundreds of students under 45°C heat.",
      "Blackboarder, on the other hand, pushed my bilingual NLP and browser extension engineering with 528 automated tests and live gradebook synchronization.",
      "Both solve real, everyday friction on campus rather than being toy demo apps."
    ],
    followups: ["Tell me about NaviCampus", "Tell me about Blackboarder", "What is your tech stack?"]
  },
  {
    id: "tech_stack",
    keywords: ["stack", "skills", "languages", "tech", "technologies", "frameworks", "python", "typescript", "javascript", "react", "threejs", "webgl"],
    bubbles: [
      "My primary engineering stack centers around TypeScript, JavaScript (ES6+), Python, and modern web architectures.",
      "On the frontend & visualization side: WebGL, Three.js, Canvas 2D, Leaflet, and GSAP for high-performance physics and graphics.",
      "On backends & cloud: Cloudflare Pages / Workers, Firebase (Firestore, Storage, RTDB), Vite, and headless APIs.",
      "For AI & ML: Natural Language Processing pipelines, generative AI workflows, and hybrid client-side inference engines."
    ],
    followups: ["What was your role in NaviCampus?", "Tell me about your philosophy", "How do I contact you?"]
  },
  {
    id: "background",
    keywords: ["background", "who are you", "about", "origin", "story", "education", "university", "uos", "gems", "school", "head boy", "sharjah"],
    bubbles: [
      "I'm a Computer Engineering student at the University of Sharjah (2026–2030) and former Head Boy & Deputy Head Boy at GEMS Westminster School RAK.",
      "During high school, I achieved 8 A*/A IGCSE Honors and served as a Pearson Edexcel Teaching Assistant, mentoring over 1,000 students in A-Level Statistics and AS/IGCSE Physics.",
      "I also scaled our senior digital strategy to 500,000+ views and pioneered generative AI workflows for campus photo restoration.",
      "Now I focus on building intelligent second brains and autonomous software systems."
    ],
    followups: ["Tell me about your engineering philosophy", "What is your flagship project?", "How do I reach you?"]
  },
  {
    id: "philosophy",
    keywords: ["philosophy", "second brain", "mindset", "approach", "drive", "why", "vision", "mission"],
    bubbles: [
      "My core principle is simple: <em>I don't just write code. I build second brains.</em>",
      "Computers should not just display information; they should act as force-multipliers for human capability.",
      "I approach problems from first principles—breaking complex, multi-dimensional challenges into fundamental modules, engineering the data graph, and building resilient systems that run smoothly with zero bloat."
    ],
    followups: ["Which projects reflect this best?", "What is your tech stack?", "What roles are you looking for?"]
  },
  {
    id: "elementa_tranz",
    keywords: ["elementa", "tranz", "codex", "competition", "side project", "fundfair", "ssfim"],
    bubbles: [
      "<strong>Elementa</strong> is a full-stack educational science learning platform with real-time student progress tracking and video walkthroughs (<a href='https://elementaa.vercel.app/' target='_blank' rel='noopener' class='tw-link'>live app</a> / <a href='https://github.com/yvs1n/elementa' target='_blank' rel='noopener' class='tw-link'>GitHub</a>).",
      "<strong>TranZ</strong> was engineered for CodeX UAE, a national school-level web creation competition where it achieved finalist honors (<a href='https://tranz.pages.dev/' target='_blank' rel='noopener' class='tw-link'>live app</a> / <a href='https://github.com/yvs1n/tranz' target='_blank' rel='noopener' class='tw-link'>GitHub</a>).",
      "Alongside these, I built <strong>FundFair</strong> and <strong>SSFIM</strong>, presenting SSFIM directly to Ranju Anand, Senior Vice President of Education at GEMS Education."
    ],
    followups: ["What is your flagship project?", "Tell me about your background", "What is your tech stack?"]
  },
  {
    id: "live_projects",
    keywords: ["live", "try", "demo", "deploy", "deployed", "links", "works"],
    bubbles: [
      "You can explore several of my live systems right now:",
      "1. <a href='https://navicampus.app/' target='_blank' rel='noopener' class='tw-link'>NaviCampus</a> — Climate-aware multi-floor navigation engine.",
      "2. <a href='https://blackboarder.pages.dev/' target='_blank' rel='noopener' class='tw-link'>Blackboarder</a> — Academic sidekick with companion PWA.",
      "3. <a href='https://fundfair.pages.dev/' target='_blank' rel='noopener' class='tw-link'>FundFair</a> & <a href='https://ssfim.pages.dev/' target='_blank' rel='noopener' class='tw-link'>SSFIM</a> — Startup & sustainability showcases.",
      "You can also jump directly to the <a href='#projects' class='tw-link' data-nav-index='3'>Projects section</a> to view deep technical specs."
    ],
    followups: ["Tell me about NaviCampus", "What is your tech stack?", "How do I reach you?"]
  },
  {
    id: "contact_hiring",
    keywords: ["contact", "hire", "email", "reach", "work", "job", "internship", "roles", "collaborate", "linkedin", "resume", "cv"],
    bubbles: [
      "I'm open to ambitious software engineering internships, AI systems engineering roles, and high-impact technical collaborations.",
      "You can download my full <a href='cv.pdf' target='_blank' rel='noopener' class='tw-link'>Curriculum Vitae (PDF)</a> directly.",
      "The fastest way to reach me is by email at <a href='mailto:yassinraggab@gmail.com' class='tw-link'>yassinraggab@gmail.com</a> or <a href='mailto:yassin@navicampus.app' class='tw-link'>yassin@navicampus.app</a>, or via <a href='https://linkedin.com/in/yassinr' target='_blank' rel='noopener' class='tw-link'>LinkedIn</a>.",
      "Or simply trigger the contact modal right here on the site!"
    ],
    followups: ["What is your flagship project?", "What's your tech stack?", "What is your background?"]
  },
  {
    id: "identity_twin",
    keywords: ["are you ai", "who are you", "are you yassin", "digital twin", "bot", "what are you", "twin"],
    bubbles: [
      "I'm Yassin's interactive Digital Twin!",
      "I'm programmed with his direct knowledge base, project documentation, verified resume facts, and engineering philosophy.",
      "I'm designed to answer your questions as Yassin would in a direct chat. Go ahead, ask me about any of his projects, his academic history, or his tech stack!"
    ],
    followups: ["Tell me about NaviCampus", "What is your tech stack?", "How do I contact you?"]
  },
  {
    id: "smalltalk",
    keywords: ["hello", "hi", "hey", "greetings", "good morning", "how are you", "what's up", "sup"],
    bubbles: [
      "Greetings! Glad you stopped by.",
      "I'm Yassin's Digital Twin. What would you like to explore—his flagship projects like NaviCampus, his background in AI & Computer Engineering, or how to get in touch?"
    ],
    followups: ["What is your flagship project?", "What is your background?", "What is your tech stack?"]
  }
];

export const GENERAL_FALLBACK = {
  bubbles: [
    "I might not have that specific detail in my local knowledge base yet.",
    "However, I can tell you all about Yassin's flagship work—including <strong>NaviCampus</strong>, his <strong>Blackboarder</strong> LMS extension, his <strong>Computer Engineering</strong> studies at UOS, or how to reach him directly.",
    "Feel free to pick one of the suggestions below or ask directly about his stack!"
  ],
  followups: [
    "Tell me about NaviCampus",
    "What is your tech stack?",
    "How do I contact you?"
  ]
};
