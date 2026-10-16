// What the server says to the candidate, in English and French. The UI shows
// these messages as they come; its own texts are in `src/ui/messages.ts`.
import type { Language, Text } from "./i18n.js";

const en = {
  // HTTP API
  packNotFound: () => "This pack doesn't exist.",
  invalidLanguage: () => 'Choose the interview language: "en" (English) or "fr" (French).',
  answerShape: () => 'Send the answer as {"answer": "..."}.',
  notInHistory: () => "This interview isn't in your history.",
  internalError: () => "Something went wrong on Mockroom's side.",
  packIdsShape: () => 'Send the packs as a list of pack ids, like {"packIds": ["react-junior-en"]}.',
  technologiesShape: () => 'Send the technologies as a list of names, like {"technologies": ["React", "TypeScript"]}.',
  invalidLevel: () => 'Choose the level: "junior", "mid" or "senior".',
  emptySetup: () => "Choose at least one pack or one technology for the interview.",

  // Job offers
  emptyJobOffer: () => "Paste a job offer first.",
  noTechnologyFound: () =>
    "Mockroom found no technology in this job offer. Add the technologies yourself, or pick packs by hand below.",
  detectionUnreadable: () =>
    "The AI model's analysis of this job offer couldn't be read, even after a second try. Pick packs by hand below, or try again (a more capable model helps).",
  detectionFailed: (reason: string) => `The job offer couldn't be analysed: ${reason} You can still pick packs by hand below.`,

  // Interviews
  interviewNotFound: () => "This interview doesn't exist.",
  interviewFinished: () => "This interview is already over.",
  interviewerBusy: () => "The interviewer is still writing. Wait for their message.",
  emptyAnswer: () => "The answer is empty.",
  interviewNotFinished: () => "The interview isn't over yet.",
  emptyReply: () => "The AI model sent an empty reply.",
  debriefFailed: (reason: string) => `The debrief couldn't be written: ${reason}`,
  debriefUnreadable: (problem: string) =>
    `The AI model sent a debrief Mockroom couldn't read, even after a second try (${problem}). Try again, or switch to a more capable model.`,

  // History
  invalidInterviewId: (id: string) => `"${id}" isn't a valid interview id.`,
  damagedInterview: (file: string) =>
    `The saved interview ${file} is damaged or from an unknown version, so it was skipped.`,

  // AI providers
  notConfigured: () => "No AI provider is set up yet. Open Settings in Mockroom to choose one, then try again.",
  missingKey: (label: string, keyPage: string) =>
    `Mockroom has no ${label} API key. Add yours in Settings (create one at ${keyPage}).`,
  ollamaUnreachable: (url: string) =>
    `Mockroom can't reach Ollama at ${url}. Is the Ollama app running? Start it, or check the Ollama address in Settings, then try again.`,
  providerUnreachable: (label: string) => `Mockroom can't reach ${label}. Check your internet connection, then try again.`,
  keyRejected: (label: string, keyPage: string) =>
    `${label} rejected your API key. Check it in Settings, or create a new one at ${keyPage}.`,
  ollamaModelMissing: (model: string) =>
    `Ollama doesn't have the model "${model}" yet. Download it by running "ollama pull ${model}" in a terminal, or pick an installed model in Settings.`,
  unknownModel: (label: string, model: string) => `${label} doesn't know the model "${model}". Check the model name in Settings.`,
  rateLimited: (label: string) =>
    `${label} is turning down requests for now (rate limit or quota reached). Wait a minute and try again, or check your ${label} plan and billing.`,
  providerDown: (label: string, status: number) =>
    `${label} is having trouble right now (error ${status}). Try again in a moment.`,
  providerFailed: (label: string, status: number | undefined, details: string) =>
    `${label} returned an error${status ? ` (${status})` : ""}: ${details}`,
  providerTimeout: (label: string) => `${label} took too long to answer. Try again, or pick a faster model in Settings.`,

  // Settings
  emptyTestReply: (label: string) => `${label} answered with an empty message. Try another model.`,
  connected: (label: string, model: string) => `Connected: ${label} (${model}) answered.`,
  ollamaListUnreachable: (url: string) =>
    `Mockroom can't reach Ollama at ${url}. Is the Ollama app running? Start it, or check the Ollama address, then try again.`,
  notOllama: (url: string) => `The server at ${url} doesn't answer like Ollama. Check the Ollama address.`,
  enterKey: (label: string) => `Enter your ${label} API key.`,
  chooseProvider: (labels: string) => `Choose an AI provider: ${labels}.`,
  chooseOllamaModel: () => 'Choose an Ollama model, such as "llama3.2".',
  chooseModel: () => "Choose a model.",
  modelTooLong: () => "That model name is too long.",
  keyNotText: () => "The API key must be text.",
  ollamaUrlNotText: () => "The Ollama address must be text.",
  keyWithSpaces: () => "The API key can't contain spaces. Paste it again.",
  ollamaUrlProtocol: (example: string) => `The Ollama address must start with http:// or https://, like ${example}.`,
};

export type ServerMessages = typeof en;

const fr: ServerMessages = {
  packNotFound: () => "Ce pack n'existe pas.",
  invalidLanguage: () => "Choisis la langue de l'entretien : « en » (anglais) ou « fr » (français).",
  answerShape: () => 'Envoie la réponse sous la forme {"answer": "..."}.',
  notInHistory: () => "Cet entretien n'est pas dans ton historique.",
  internalError: () => "Un problème est survenu du côté de Mockroom.",
  packIdsShape: () => `Envoie les packs sous forme de liste d'identifiants, comme {"packIds": ["react-junior-en"]}.`,
  technologiesShape: () => 'Envoie les technologies sous forme de liste de noms, comme {"technologies": ["React", "TypeScript"]}.',
  invalidLevel: () => "Choisis le niveau : « junior », « mid » (confirmé) ou « senior ».",
  emptySetup: () => "Choisis au moins un pack ou une technologie pour l'entretien.",

  emptyJobOffer: () => "Colle d'abord une offre d'emploi.",
  noTechnologyFound: () =>
    "Mockroom n'a trouvé aucune technologie dans cette offre d'emploi. Ajoute les technologies toi-même, ou choisis des packs à la main ci-dessous.",
  detectionUnreadable: () =>
    "L'analyse de cette offre d'emploi par le modèle d'IA est illisible, même après un deuxième essai. Choisis des packs à la main ci-dessous, ou réessaie (un modèle plus performant aide).",
  detectionFailed: (reason) =>
    `L'offre d'emploi n'a pas pu être analysée : ${reason} Tu peux quand même choisir des packs à la main ci-dessous.`,

  interviewNotFound: () => "Cet entretien n'existe pas.",
  interviewFinished: () => "Cet entretien est déjà terminé.",
  interviewerBusy: () => "Le recruteur est encore en train d'écrire. Attends son message.",
  emptyAnswer: () => "La réponse est vide.",
  interviewNotFinished: () => "L'entretien n'est pas encore terminé.",
  emptyReply: () => "Le modèle d'IA a envoyé une réponse vide.",
  debriefFailed: (reason) => `Le bilan n'a pas pu être rédigé : ${reason}`,
  debriefUnreadable: (problem) =>
    `Le modèle d'IA a envoyé un bilan que Mockroom ne sait pas lire, même après un deuxième essai (${problem}). Réessaie, ou passe à un modèle plus performant.`,

  invalidInterviewId: (id) => `« ${id} » n'est pas un identifiant d'entretien valide.`,
  damagedInterview: (file) =>
    `L'entretien enregistré ${file} est abîmé ou d'une version inconnue, il a donc été ignoré.`,

  notConfigured: () =>
    "Aucun fournisseur d'IA n'est configuré. Ouvre les Réglages de Mockroom pour en choisir un, puis réessaie.",
  missingKey: (label, keyPage) =>
    `Mockroom n'a pas de clé d'API ${label}. Ajoute la tienne dans les Réglages (crées-en une sur ${keyPage}).`,
  ollamaUnreachable: (url) =>
    `Mockroom n'arrive pas à joindre Ollama à l'adresse ${url}. L'application Ollama est-elle lancée ? Démarre-la, ou vérifie l'adresse d'Ollama dans les Réglages, puis réessaie.`,
  providerUnreachable: (label) => `Mockroom n'arrive pas à joindre ${label}. Vérifie ta connexion internet, puis réessaie.`,
  keyRejected: (label, keyPage) =>
    `${label} a refusé ta clé d'API. Vérifie-la dans les Réglages, ou crées-en une nouvelle sur ${keyPage}.`,
  ollamaModelMissing: (model) =>
    `Ollama n'a pas encore le modèle « ${model} ». Télécharge-le en lançant « ollama pull ${model} » dans un terminal, ou choisis un modèle installé dans les Réglages.`,
  unknownModel: (label, model) => `${label} ne connaît pas le modèle « ${model} ». Vérifie le nom du modèle dans les Réglages.`,
  rateLimited: (label) =>
    `${label} refuse les requêtes pour le moment (limite de débit ou quota atteint). Attends une minute et réessaie, ou vérifie ton forfait et ta facturation ${label}.`,
  providerDown: (label, status) => `${label} rencontre des difficultés en ce moment (erreur ${status}). Réessaie dans un instant.`,
  providerFailed: (label, status, details) => `${label} a renvoyé une erreur${status ? ` (${status})` : ""} : ${details}`,
  providerTimeout: (label) => `${label} a mis trop de temps à répondre. Réessaie, ou choisis un modèle plus rapide dans les Réglages.`,

  emptyTestReply: (label) => `${label} a répondu par un message vide. Essaie un autre modèle.`,
  connected: (label, model) => `Connecté : ${label} (${model}) a répondu.`,
  ollamaListUnreachable: (url) =>
    `Mockroom n'arrive pas à joindre Ollama à l'adresse ${url}. L'application Ollama est-elle lancée ? Démarre-la, ou vérifie l'adresse d'Ollama, puis réessaie.`,
  notOllama: (url) => `Le serveur à l'adresse ${url} ne répond pas comme Ollama. Vérifie l'adresse d'Ollama.`,
  enterKey: (label) => `Saisis ta clé d'API ${label}.`,
  chooseProvider: (labels) => `Choisis un fournisseur d'IA : ${labels}.`,
  chooseOllamaModel: () => "Choisis un modèle Ollama, comme « llama3.2 ».",
  chooseModel: () => "Choisis un modèle.",
  modelTooLong: () => "Ce nom de modèle est trop long.",
  keyNotText: () => "La clé d'API doit être du texte.",
  ollamaUrlNotText: () => "L'adresse d'Ollama doit être du texte.",
  keyWithSpaces: () => "La clé d'API ne peut pas contenir d'espaces. Colle-la à nouveau.",
  ollamaUrlProtocol: (example) => `L'adresse d'Ollama doit commencer par http:// ou https://, comme ${example}.`,
};

export const serverMessages: Record<Language, ServerMessages> = { en, fr };

/** One of the server's messages, in every language. */
export function say<K extends keyof ServerMessages>(key: K, ...args: Parameters<ServerMessages[K]>): Text {
  return (language) => (serverMessages[language][key] as (...values: typeof args) => string)(...args);
}
