// Everything the film says, in English and French. The UI shots take the app's
// own interface strings (src/ui/messages.ts); this file holds the film's copy and
// the sample interview shown in the UI. Every name and company is fictional.
//
// To make the French version, render with the prop `{"locale": "fr"}`.

import { uiMessages, type UIMessages } from "../../../src/ui/messages";

export type Locale = "en" | "fr";

export interface DebriefCardContent {
  number: number;
  theme: string;
  question: string;
  strengths: string[];
  gaps: string[];
  modelAnswer: string;
}

export interface FilmCopy {
  problem: { lines: [string, string]; costKicker: string; costFrom: number; costTo: number; costUnit: string; currency: string; costNote: string };
  answer: { name: string; claims: string[] };
  demo: { paste: string; reads: string; interviews: string; digs: string; debrief: string };
  privacy: {
    lines: string[];
    local: string;
    ollama: string;
    providers: string[];
    inside: string[];
    /** Part 5 of the v2 film. */
    title: string;
    byok: string;
    keyNote: string;
    connected: string;
    offline: string;
    noAccount: string;
  };
  cta: { command: string; url: string; license: string; tagline: string };
}

export interface SampleInterview {
  /** The job offer pasted on the home screen. */
  jobOffer: string;
  technologies: { name: string; covered: boolean }[];
  packTitle: string;
  recruiter: { name: string; role: string };
  model: string;
  question: string;
  answer: string;
  followUp: string;
  summary: string;
  cards: DebriefCardContent[];
  /** Other packs, as chips on the home screen. */
  chips: string[];
}

export interface LocaleContent {
  ui: UIMessages;
  film: FilmCopy;
  sample: SampleInterview;
}

const en: LocaleContent = {
  ui: uiMessages.en,
  film: {
    problem: {
      lines: ["Technical interviews", "are stressful."],
      costKicker: "Practising with a coach?",
      costFrom: 20,
      costTo: 150,
      costUnit: "/ month",
      currency: "$",
      costNote: "just to rehearse.",
    },
    answer: {
      name: "Mockroom",
      claims: ["Free.", "Open source.", "Runs on your machine.", "English · Français."],
    },
    demo: {
      paste: "Paste a job offer.",
      reads: "It reads what the role needs.",
      interviews: "An AI recruiter interviews you.",
      digs: "And digs deeper, like a real one.",
      debrief: "Then tells you exactly what to review.",
    },
    privacy: {
      lines: ["Your key.", "Your machine.", "No account. History stays local."],
      local: "127.0.0.1",
      ollama: "Or free and offline, with Ollama.",
      providers: ["OpenAI", "Anthropic", "Gemini"],
      inside: ["settings.json", "interviews/"],
      title: "Pick your AI.",
      byok: "Bring your own API key.",
      keyNote: "It stays on your machine, and only goes to its provider.",
      connected: "Connected",
      offline: "Offline",
      noAccount: "No account. Your interviews stay on your computer.",
    },
    cta: {
      command: "npx mockroom",
      url: "github.com/notKanaa/mockroom",
      license: "Open source · MIT",
      tagline: "Rehearse the interview. Not the panic.",
    },
  },
  sample: {
    jobOffer:
      "Junior Back-end Developer (PHP / Symfony) — Tidewell, Lyon (hybrid)\n" +
      "We build route planning for regional carriers. You'll ship features on our Symfony 7 API with Doctrine and PostgreSQL, write PHPUnit tests and review pull requests with the team.",
    technologies: [
      { name: "Symfony", covered: true },
      { name: "PHP", covered: false },
      { name: "PostgreSQL", covered: false },
    ],
    packTitle: "Symfony — Junior",
    recruiter: { name: "Camille", role: "Tech Lead" },
    model: "llama3.2",
    question: "What is the service container, and how does autowiring decide what to inject?",
    answer:
      "It's where Symfony keeps the app's services. Autowiring reads the constructor's type-hints and injects the matching service.",
    followUp:
      "Good. And if a constructor needs a plain string, like an API URL from your .env, how do you inject it?",
    summary:
      "Solid basics on routing and services. Next step: Doctrine, and when your SQL actually runs.",
    cards: [
      {
        number: 1,
        theme: "Services and dependency injection",
        question: "What is the service container, and how does autowiring decide what to inject?",
        strengths: ["Clear definition of a service and the container", "Knew autowiring reads type-hints"],
        gaps: ["Scalars need bind or #[Autowire]", "Services are private: inject them"],
        modelAnswer:
          "The container builds and shares your services. Autowiring injects the service matching each constructor type-hint; scalars come from bind or #[Autowire].",
      },
      {
        number: 2,
        theme: "Doctrine ORM",
        question: "What is the difference between persist() and flush() in Doctrine?",
        strengths: ["Knew flush() writes to the database"],
        gaps: ["persist() only marks new objects as managed", "Fetched entities need no persist()"],
        modelAnswer:
          "persist() tells the entity manager to track a new object; flush() computes every change and runs the SQL.",
      },
    ],
    chips: ["React · Junior", "Symfony · Junior", "Symfony · Mid-level"],
  },
};

const fr: LocaleContent = {
  ui: uiMessages.fr,
  film: {
    problem: {
      lines: ["Les entretiens techniques,", "c'est stressant."],
      costKicker: "S'entraîner avec un coach ?",
      costFrom: 20,
      costTo: 150,
      costUnit: "/ mois",
      currency: "$",
      costNote: "juste pour répéter.",
    },
    answer: {
      name: "Mockroom",
      claims: ["Gratuit.", "Open source.", "Tourne sur ta machine.", "Français · English."],
    },
    demo: {
      paste: "Colle une offre d'emploi.",
      reads: "Il repère ce que le poste demande.",
      interviews: "Un recruteur IA te fait passer l'entretien.",
      digs: "Et creuse, comme un vrai.",
      debrief: "Puis te dit précisément quoi réviser.",
    },
    privacy: {
      lines: ["Ta clé.", "Ta machine.", "Pas de compte. L'historique reste chez toi."],
      local: "127.0.0.1",
      ollama: "Ou gratuit et hors ligne, avec Ollama.",
      providers: ["OpenAI", "Anthropic", "Gemini"],
      inside: ["settings.json", "interviews/"],
      title: "Choisis ton IA.",
      byok: "Utilise ta propre clé d'API.",
      keyNote: "Elle reste sur ta machine, et ne part que chez son fournisseur.",
      connected: "Connecté",
      offline: "Hors ligne",
      noAccount: "Pas de compte. Tes entretiens restent sur ton ordi.",
    },
    cta: {
      command: "npx mockroom",
      url: "github.com/notKanaa/mockroom",
      license: "Open source · MIT",
      tagline: "Répète l'entretien. Pas la panique.",
    },
  },
  sample: {
    jobOffer:
      "Développeur back-end junior (PHP / Symfony) — Tidewell, Lyon (hybride)\n" +
      "Nous faisons de la planification de tournées pour des transporteurs régionaux. Tu livreras des fonctionnalités sur notre API Symfony 7 avec Doctrine et PostgreSQL, écriras des tests PHPUnit et reliras les pull requests de l'équipe.",
    technologies: [
      { name: "Symfony", covered: true },
      { name: "PHP", covered: false },
      { name: "PostgreSQL", covered: false },
    ],
    packTitle: "Symfony — Junior",
    recruiter: { name: "Camille", role: "Lead technique" },
    model: "llama3.2",
    question: "Qu'est-ce que le conteneur de services, et comment l'autowiring sait-il quoi injecter ?",
    answer:
      "C'est là que Symfony range les services de l'appli. L'autowiring lit les types du constructeur et injecte le service qui correspond.",
    followUp:
      "Bien. Et si un constructeur attend une simple chaîne, comme une URL d'API de ton .env, tu l'injectes comment ?",
    summary:
      "De bonnes bases sur le routage et les services. Prochaine étape : Doctrine, et le moment où le SQL part vraiment.",
    cards: [
      {
        number: 1,
        theme: "Services et injection de dépendances",
        question: "Qu'est-ce que le conteneur de services, et comment l'autowiring sait-il quoi injecter ?",
        strengths: ["Définition claire d'un service et du conteneur", "Sait que l'autowiring lit les types"],
        gaps: ["Les scalaires ne se devinent pas : bind ou #[Autowire]", "Les services sont privés : on les injecte"],
        modelAnswer:
          "Le conteneur crée et partage les services. L'autowiring injecte le service qui correspond à chaque type du constructeur ; les scalaires passent par bind ou #[Autowire].",
      },
      {
        number: 2,
        theme: "Doctrine ORM",
        question: "Quelle est la différence entre persist() et flush() dans Doctrine ?",
        strengths: ["Sait que flush() écrit en base"],
        gaps: ["persist() ne fait que suivre un nouvel objet", "Une entité chargée n'a pas besoin de persist()"],
        modelAnswer:
          "persist() demande à l'entity manager de suivre un nouvel objet ; flush() calcule tous les changements et exécute le SQL.",
      },
    ],
    chips: ["React · Junior", "Symfony · Junior", "Symfony · Confirmé"],
  },
};

export const locales: Record<Locale, LocaleContent> = { en, fr };
