import type { CyclePrediction, CycleRiskAssessment } from '@/lib/cycle-prediction'

export interface PageContext {
  activeTab?: string
  activeSection?: string
  pageTitle?: string
  pagePurpose?: string
}

const fallbackResponses: { keywords: string[]; response: string }[] = [
  {
    keywords: ['track', 'tracking', 'log', 'monitor', 'what can i'],
    response: 'Log period start and end dates, flow changes, pain, symptoms, sleep, stress, mood, and notes. Those fields make cycle guidance more personal.',
  },
  {
    keywords: ['sleep', 'insomnia', 'rest', 'tired', 'fatigue'],
    response: 'Your sleep logs can help separate cycle-related dips from general fatigue. Track sleep, stress, pain, and symptoms together for a clearer pattern.',
  },
  {
    keywords: ['hello', 'hi', 'hey', 'help', 'start'],
    response: 'I can explain your tracker, summarize relevant records, and suggest what to log next. My guidance is informational, not a diagnosis.',
  },
]

export function getFallbackResponse(
  message: string,
  guidance: CycleRiskAssessment,
  prediction: CyclePrediction,
  pageContext?: PageContext,
  sourceLabels: string[] = []
): string {
  const lower = message.toLowerCase()
  const signal = guidance.modelSignals[0]
  const markerEstimate = signal ? Math.round(signal.estimatedMarkerProbability * 100) : null
  const topFactors = guidance.riskFactors.slice(0, 2).join(' ')
  const pageLabel = pageContext?.activeSection
    ? `${pageContext.pageTitle ?? 'this page'} / ${pageContext.activeSection}`
    : pageContext?.pageTitle ?? 'this page'
  const sourceNote = sourceLabels.length ? ` I used ${sourceLabels.slice(0, 2).join(' and ')}.` : ''

  if (/how.*(work|calculate|predict)|why.*risk|model|training|fedcycle|confidence|accurate/.test(lower)) {
    return `NariAid combines logistic regression and Gaussian Naive Bayes trained on participant-separated FedCycle records. Your current ${guidance.modelTarget} estimate is ${markerEstimate ?? 'not available'}% with ${signal?.confidence ?? 'low'} input confidence. This is pattern similarity, not a diagnosis.${sourceNote}`
  }

  if (/bleed|spotting|period|cycle|ovulat|menses/.test(lower)) {
    return `Your cycle guidance is ${guidance.title.toLowerCase()}. The FedCycle unusual-bleeding marker estimate is ${markerEstimate ?? 'not available'}%, and the next period estimate is ${prediction.predictedNextPeriodLabel}. Contact a clinician for persistent bleeding between periods, very heavy flow, or a new disruptive change.${sourceNote}`
  }

  if (/pain|cramp|pelvic/.test(lower)) {
    const pain = guidance.riskAreas.find((area) => area.key === 'pain')
    return `Your pain area is currently ${pain?.level ?? 'unknown'} risk. ${pain?.summary ?? 'There are not enough pain logs yet.'} Severe or worsening pain, fainting, or sudden severe pelvic pain needs prompt medical attention.${sourceNote}`
  }

  if (/sleep|stress|rest|tired|fatigue|energy|mood/.test(lower)) {
    const recovery = guidance.riskAreas.find((area) => area.key === 'recovery')
    return `Your stress and sleep area is currently ${recovery?.level ?? 'unknown'} risk. ${recovery?.summary ?? 'Keep logging sleep and stress together.'} These are tracker safety checks, not outputs of the FedCycle bleeding model.${sourceNote}`
  }

  if (/trend|pattern|change|week|compare/.test(lower)) {
    return `On ${pageLabel}, your overall tracker guidance is ${guidance.title.toLowerCase()}. ${topFactors || 'There is not enough history for a strong trend yet.'} Keep daily entries consistent so changes can be compared over time.${sourceNote}`
  }

  if (/doctor|risk|healthy|health|urgent|danger|red flag|redflag|worried/.test(lower)) {
    return `${guidance.title}: ${guidance.summary} The FedCycle marker estimate is ${markerEstimate ?? 'not available'}% with ${signal?.confidence ?? 'low'} input confidence. Contact a clinician for severe, new, worsening, persistent, or disruptive symptoms, and seek urgent care for chest pain, breathing trouble, fainting, fever with feeling very sick, or sudden severe pelvic pain.${sourceNote}`
  }

  for (const entry of fallbackResponses) {
    if (entry.keywords.some((keyword) => lower.includes(keyword))) return `${entry.response} Context: ${pageLabel}.${sourceNote}`
  }

  return `On ${pageLabel}, your current guidance is ${guidance.title.toLowerCase()}. ${guidance.summary} Ask about cycle timing, pain, symptoms, sleep, stress, or trends for a more focused answer.${sourceNote}`
}
