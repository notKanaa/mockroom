// Every text of the interface, in English and French. Texts between backticks
// are shown as code (see `RichText`). Messages from the server come already
// translated (see `src/server/messages.ts`).
//
// No imports, so the tests can load this file too.

const en = {
  languageNames: { en: "English", fr: "French" },
  levels: { junior: "Junior", mid: "Mid-level", senior: "Senior" },

  common: {
    serverUnreachable: "The local server can't be reached.",
    connectionInterrupted: "The connection to the local server was interrupted.",
    openSettings: "Open settings",
    settings: "Settings",
    backToPacks: "Back to packs",
    deleting: "Deleting…",
    interviewer: "Interviewer",
    you: "You",
    followUp: "Follow-up",
    question: (number: number) => `Question ${number}`,
  },

  switcher: { label: "Interface language" },

  home: {
    tagline: "AI technical interview simulator, running on your machine.",
    pastInterviews: "Past interviews",
    connecting: "Connecting to the local server…",
  },

  picker: {
    noPacks: "No interview pack is available. The terminal running Mockroom lists the packs it couldn't load.",
    title: "Choose an interview pack",
    interviewLanguage: "Interview language",
    interviewLanguageHint: "The interviewer and the debrief use this language, whatever the pack's language.",
    technology: "Technology",
    allTechnologies: "All technologies",
    level: "Level",
    allLevels: "All levels",
    packLanguage: "Pack language",
    allLanguages: "All languages",
    noMatch: "No pack matches these filters.",
    count: (count: number) => (count === 1 ? "1 pack" : `${count} packs`),
    clearFilters: "Clear filters",
    translated: (language: string) => `Asked in ${language}`,
    start: "Start interview",
    starting: "Starting…",
  },

  room: {
    confirmEnd: "End the interview now? You'll get a debrief of the questions you have answered so far.",
    complete: "Interview complete",
    progress: (question: number, total: number) => `Question ${question} of ${total}`,
    followUpProgress: (followUp: number) => `Follow-up ${followUp}`,
    end: "End interview",
    ending: "Ending…",
    progressLabel: "Interview progress",
    conversation: "Conversation",
    notSent: "Your answer was not sent; you can send it again.",
    stillGoing: "The interview is still going; you can try to end it again.",
    tryAgain: "Try again",
    writingDebrief: "Writing your debrief, question by question… This can take a minute.",
    interviewerWriting: "The interviewer is writing…",
    typeAnswer: "Type your answer…",
    yourAnswer: "Your answer",
    composerHint: "Enter to send · Shift+Enter for a new line",
    send: "Send",
  },

  debrief: {
    title: "Your debrief",
    endedEarly: (answered: number, total: number) =>
      answered === 1
        ? `You ended the interview after 1 of ${total} questions, so this debrief covers the question you answered.`
        : `You ended the interview after ${answered} of ${total} questions, so this debrief covers the ${answered} questions you answered.`,
    nothingAnswered:
      "You ended the interview before answering any question, so there is nothing to give feedback on yet. Start a new one whenever you're ready.",
    strengths: "What went well",
    gaps: "What to add next time",
    noGaps: "Nothing important was missing. Well done!",
    modelAnswer: "A model answer",
    toStudy: "To study",
  },

  history: {
    deletePrompt: "Delete this interview from your history? Its transcript and debrief will be gone for good.",
    title: "Past interviews",
    privacy: "Saved on this computer only. Nothing is sent anywhere.",
    loading: "Loading your interviews…",
    empty: "No interview yet. Once you finish or end one, it shows up here.",
    interviewIn: (language: string) => `In ${language}`,
    noDebrief: "No debrief",
    delete: "Delete",
    open: "Open",
    back: "← Past interviews",
    backToPacks: "← Back to packs",
    loadingInterview: "Loading the interview…",
    tabs: "Interview",
    debriefTab: "Debrief",
    transcriptTab: "Transcript",
    missingDebrief:
      "This interview has no debrief: it couldn't be written, or Mockroom was closed before it was ready. The transcript is still here.",
    deleteInterview: "Delete this interview",
    allAnswered: (total: number) => `All ${total} questions answered`,
    endedEarly: (answered: number, total: number) => `Ended early · ${answered} of ${total} questions answered`,
  },

  settings: {
    loading: "Loading your settings…",
    skip: "Skip for now",
    back: "← Back",
    welcome: "Welcome to Mockroom",
    title: "Settings",
    welcomeIntro:
      "First, choose the AI that will interview you. Use your own API key, or Ollama to run a free model on your computer.",
    intro: "The AI that interviews you.",
    envProvider: (label: string, model: string) =>
      `Mockroom is using ${label} (${model}) from the \`MOCKROOM_PROVIDER\` environment variable, which overrides these settings. What you save here applies once you remove it.`,
    provider: "AI provider",
    yourKey: "Your API key",
    freeLocal: "Free, runs locally",
    ollamaAddress: "Ollama address",
    refreshModels: "Refresh models",
    looking: "Looking…",
    envOllamaUrl: (url: string) => `\`MOCKROOM_OLLAMA_URL\` is set, so Mockroom uses ${url} for interviews.`,
    getOllama: "Don't have it yet? Get it from",
    noOllamaModel: "Ollama has no model yet. Download one by running `ollama pull llama3.2` in a terminal, then refresh.",
    model: "Model",
    notInstalled: (model: string) => `${model} (not installed)`,
    ollamaHint: "Small models are free but less sharp interviewers. Bigger ones need a stronger computer.",
    modelHint: (label: string) => `Any ${label} model works.`,
    defaultModelHint: (model: string) => `${model} is fast and cheap.`,
    apiKey: (label: string) => `${label} API key`,
    keepKey: (masked: string) => `${masked} (leave empty to keep it)`,
    pasteKey: "Paste your key",
    envKey: (envVar: string) =>
      `\`${envVar}\` is set, so Mockroom uses that key, which overrides any key saved here.`,
    keyStorage: (file: string, label: string) =>
      `Saved in a file on this computer only (\`${file}\`), and only ever sent to ${label}.`,
    createKey: "Create a key",
    savedWithEnv: "Saved. Environment variables still override these settings, though.",
    saved: (label: string, model: string) => `Saved. Interviews now use ${label} (${model}).`,
    test: "Test connection",
    testing: "Testing…",
    save: "Save",
    saving: "Saving…",
    chooseInterview: "Choose an interview →",
  },
};

/** The shape every language's texts follow. */
export type UIMessages = typeof en;

const fr: UIMessages = {
  languageNames: { en: "Anglais", fr: "Français" },
  levels: { junior: "Junior", mid: "Confirmé", senior: "Senior" },

  common: {
    serverUnreachable: "Impossible de joindre le serveur local.",
    connectionInterrupted: "La connexion au serveur local a été interrompue.",
    openSettings: "Ouvrir les réglages",
    settings: "Réglages",
    backToPacks: "Retour aux packs",
    deleting: "Suppression…",
    interviewer: "Recruteur",
    you: "Toi",
    followUp: "Relance",
    question: (number) => `Question ${number}`,
  },

  switcher: { label: "Langue de l'interface" },

  home: {
    tagline: "Simulateur d'entretien technique avec une IA, qui tourne sur ta machine.",
    pastInterviews: "Entretiens passés",
    connecting: "Connexion au serveur local…",
  },

  picker: {
    noPacks:
      "Aucun pack d'entretien n'est disponible. Le terminal où tourne Mockroom liste les packs qu'il n'a pas pu charger.",
    title: "Choisis un pack d'entretien",
    interviewLanguage: "Langue de l'entretien",
    interviewLanguageHint: "Le recruteur et le bilan utilisent cette langue, quelle que soit la langue du pack.",
    technology: "Technologie",
    allTechnologies: "Toutes les technologies",
    level: "Niveau",
    allLevels: "Tous les niveaux",
    packLanguage: "Langue du pack",
    allLanguages: "Toutes les langues",
    noMatch: "Aucun pack ne correspond à ces filtres.",
    count: (count) => (count === 1 ? "1 pack" : `${count} packs`),
    clearFilters: "Effacer les filtres",
    translated: (language) => `Posé en ${language.toLowerCase()}`,
    start: "Commencer l'entretien",
    starting: "Démarrage…",
  },

  room: {
    confirmEnd: "Terminer l'entretien maintenant ? Tu auras un bilan des questions auxquelles tu as déjà répondu.",
    complete: "Entretien terminé",
    progress: (question, total) => `Question ${question} sur ${total}`,
    followUpProgress: (followUp) => `Relance ${followUp}`,
    end: "Terminer l'entretien",
    ending: "Fin en cours…",
    progressLabel: "Avancement de l'entretien",
    conversation: "Conversation",
    notSent: "Ta réponse n'a pas été envoyée ; tu peux la renvoyer.",
    stillGoing: "L'entretien continue ; tu peux réessayer de le terminer.",
    tryAgain: "Réessayer",
    writingDebrief: "Rédaction de ton bilan, question par question… Cela peut prendre une minute.",
    interviewerWriting: "Le recruteur écrit…",
    typeAnswer: "Écris ta réponse…",
    yourAnswer: "Ta réponse",
    composerHint: "Entrée pour envoyer · Maj+Entrée pour aller à la ligne",
    send: "Envoyer",
  },

  debrief: {
    title: "Ton bilan",
    endedEarly: (answered, total) =>
      answered === 1
        ? `Tu as terminé l'entretien après 1 question sur ${total} : ce bilan porte sur la question à laquelle tu as répondu.`
        : `Tu as terminé l'entretien après ${answered} questions sur ${total} : ce bilan porte sur les ${answered} questions auxquelles tu as répondu.`,
    nothingAnswered:
      "Tu as terminé l'entretien avant de répondre à une question : il n'y a donc rien à commenter pour l'instant. Lance-en un nouveau quand tu veux.",
    strengths: "Ce qui était bien",
    gaps: "À ajouter la prochaine fois",
    noGaps: "Rien d'important ne manquait. Bravo !",
    modelAnswer: "Une réponse modèle",
    toStudy: "À étudier",
  },

  history: {
    deletePrompt: "Supprimer cet entretien de ton historique ? Sa transcription et son bilan seront définitivement perdus.",
    title: "Entretiens passés",
    privacy: "Enregistrés sur cet ordinateur uniquement. Rien n'est envoyé ailleurs.",
    loading: "Chargement de tes entretiens…",
    empty: "Aucun entretien pour l'instant. Dès que tu en termines un, il apparaît ici.",
    interviewIn: (language) => `En ${language.toLowerCase()}`,
    noDebrief: "Pas de bilan",
    delete: "Supprimer",
    open: "Ouvrir",
    back: "← Entretiens passés",
    backToPacks: "← Retour aux packs",
    loadingInterview: "Chargement de l'entretien…",
    tabs: "Entretien",
    debriefTab: "Bilan",
    transcriptTab: "Transcription",
    missingDebrief:
      "Cet entretien n'a pas de bilan : il n'a pas pu être rédigé, ou Mockroom a été fermé avant qu'il soit prêt. La transcription est toujours là.",
    deleteInterview: "Supprimer cet entretien",
    allAnswered: (total) => `Réponse aux ${total} questions`,
    endedEarly: (answered, total) => `Terminé plus tôt · ${answered} questions sur ${total} répondues`,
  },

  settings: {
    loading: "Chargement de tes réglages…",
    skip: "Plus tard",
    back: "← Retour",
    welcome: "Bienvenue dans Mockroom",
    title: "Réglages",
    welcomeIntro:
      "D'abord, choisis l'IA qui va te faire passer l'entretien. Utilise ta propre clé d'API, ou Ollama pour faire tourner un modèle gratuit sur ton ordinateur.",
    intro: "L'IA qui te fait passer l'entretien.",
    envProvider: (label, model) =>
      `Mockroom utilise ${label} (${model}) grâce à la variable d'environnement \`MOCKROOM_PROVIDER\`, qui passe avant ces réglages. Ce que tu enregistres ici s'appliquera quand tu l'auras retirée.`,
    provider: "Fournisseur d'IA",
    yourKey: "Ta clé d'API",
    freeLocal: "Gratuit, tourne en local",
    ollamaAddress: "Adresse d'Ollama",
    refreshModels: "Actualiser les modèles",
    looking: "Recherche…",
    envOllamaUrl: (url) => `\`MOCKROOM_OLLAMA_URL\` est définie : Mockroom utilise donc ${url} pour les entretiens.`,
    getOllama: "Tu ne l'as pas encore ? Télécharge-le sur",
    noOllamaModel:
      "Ollama n'a encore aucun modèle. Télécharges-en un en lançant `ollama pull llama3.2` dans un terminal, puis actualise.",
    model: "Modèle",
    notInstalled: (model) => `${model} (non installé)`,
    ollamaHint:
      "Les petits modèles sont gratuits mais font des recruteurs moins fins. Les plus gros demandent un ordinateur plus puissant.",
    modelHint: (label) => `N'importe quel modèle ${label} fonctionne.`,
    defaultModelHint: (model) => `${model} est rapide et peu cher.`,
    apiKey: (label) => `Clé d'API ${label}`,
    keepKey: (masked) => `${masked} (laisse vide pour la garder)`,
    pasteKey: "Colle ta clé",
    envKey: (envVar) =>
      `\`${envVar}\` est définie : Mockroom utilise cette clé, qui passe avant toute clé enregistrée ici.`,
    keyStorage: (file, label) =>
      `Enregistrée dans un fichier sur cet ordinateur uniquement (\`${file}\`), et envoyée seulement à ${label}.`,
    createKey: "Créer une clé",
    savedWithEnv: "Enregistré. Les variables d'environnement passent quand même avant ces réglages.",
    saved: (label, model) => `Enregistré. Les entretiens utilisent maintenant ${label} (${model}).`,
    test: "Tester la connexion",
    testing: "Test en cours…",
    save: "Enregistrer",
    saving: "Enregistrement…",
    chooseInterview: "Choisir un entretien →",
  },
};

export const uiMessages = { en, fr } satisfies Record<"en" | "fr", UIMessages>;
