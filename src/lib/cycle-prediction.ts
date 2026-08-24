import trainedCycleRiskModel from '@/data/cycle-risk-model.json'

export interface CyclePredictionProfile {
  cycleLength?: number | null
  lastPeriodStart?: string | null
}

export interface CyclePredictionLog {
  date: string
  mood?: number | null
  energy?: number | null
  sleep?: number | null
  stress?: number | null
  pain?: number | null
  symptoms?: string | null
  notes?: string | null
}

export interface CyclePrediction {
  sourceLabel: string
  referenceSampleSize: number
  modelCycleLength: number
  predictedNextPeriod: string | null
  predictedNextPeriodLabel: string
  daysUntilNext: number | null
  ovulationLabel: string | null
  fertileWindowLabel: string | null
  confidence: number
  currentPhase: string
  trackerSignals: string[]
  reasoning: string[]
}

export type HealthGuidanceStatus = 'steady' | 'watch' | 'doctor' | 'urgent'
export type HealthComparisonStatus = 'steady' | 'watch' | 'doctor'
export type HealthRiskLevel = 'low' | 'moderate' | 'high' | 'urgent'

export interface ModelRiskSignal {
  key: string
  label: string
  level: Exclude<HealthRiskLevel, 'urgent'>
  source: 'trained-model'
  summary: string
  evidence: string[]
  estimatedMarkerProbability: number
  modelProbabilities: {
    logisticRegression: number
    gaussianNaiveBayes: number
    ensemble: number
  }
  confidence: 'low' | 'medium' | 'high'
}

export interface RiskDataQuality {
  status: 'good' | 'partial' | 'insufficient'
  featuresUsed: number
  totalFeatures: number
  logsUsed: number
  note: string
}

export interface RiskArea {
  key: string
  label: string
  level: HealthRiskLevel
  basis: 'trained-model' | 'cohort-comparison' | 'tracker-safety-rule'
  summary: string
}

export interface HealthComparison {
  label: string
  userValue: string
  referenceValue: string
  status: HealthComparisonStatus
}

export interface CycleRiskAssessment {
  status: HealthGuidanceStatus
  riskLevel: HealthRiskLevel
  title: string
  summary: string
  sourceLabel: string
  modelName: string
  modelTarget: string
  modelPerformance: string
  modelSignals: ModelRiskSignal[]
  riskAreas: RiskArea[]
  dataQuality: RiskDataQuality
  comparison: HealthComparison[]
  riskFactors: string[]
  doctorPrompts: string[]
  contextForAI: string
}

export const FED_CYCLE_REFERENCE = {
  fileName: 'FedCycleData071012.csv',
  sampleSize: 1665,
  averageCycleLength: 29.3,
  medianCycleLength: 29,
  cycleLengthStdDev: 3.89,
  cycleLengthMiddleRange: [27, 31] as const,
  typicalClinicalCycleRange: [24, 38] as const,
  averageOvulationDay: 15.96,
  medianOvulationDay: 15,
  ovulationMiddleRange: [14, 18] as const,
  averageLutealPhase: 13.27,
  lutealPhaseMiddleRange: [12, 14] as const,
  averageMensesLength: 5.24,
  mensesMiddleRange: [4, 6] as const,
  averageFertileDays: 8,
  fertileDaysMiddleRange: [6, 10] as const,
  averageFirstHighDay: 11.76,
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function parseIsoDate(value?: string | null) {
  if (!value) return null
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function daysBetween(start: Date, end: Date) {
  const a = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  const b = new Date(end.getFullYear(), end.getMonth(), end.getDate())
  return Math.floor((b.getTime() - a.getTime()) / MS_PER_DAY)
}

function formatIso(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatMonthDay(date: Date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatRange(range: readonly [number, number], unit = 'days') {
  return `${range[0]}-${range[1]} ${unit}`
}

function getPhase(cycleDay: number, ovulationDay: number) {
  if (cycleDay <= Math.round(FED_CYCLE_REFERENCE.averageMensesLength)) return 'Menstrual'
  if (cycleDay < ovulationDay - 2) return 'Follicular'
  if (cycleDay <= ovulationDay + 1) return 'Ovulation window'
  return 'Luteal'
}

function getRecentLogs(logs: CyclePredictionLog[], limit = 14) {
  return [...logs]
    .filter((log) => parseIsoDate(log.date))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit)
}

function average(values: number[]) {
  if (!values.length) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function median(values: number[]) {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle]
}

function isPeriodLog(log: CyclePredictionLog) {
  const text = `${log.symptoms ?? ''} ${log.notes ?? ''}`.toLowerCase()
  return /flow:\s*(spotting|light|medium|heavy)|\b(period|menstrual flow|period bleeding)\b/.test(text)
}

function getPeriodRuns(logs: CyclePredictionLog[]) {
  const periodDates = Array.from(new Set(
    logs
      .filter((log) => parseIsoDate(log.date) && isPeriodLog(log))
      .map((log) => log.date)
  )).sort()

  const runs: { start: string; end: string; length: number }[] = []
  for (const date of periodDates) {
    const previous = runs[runs.length - 1]
    const parsedDate = parseIsoDate(date)
    const parsedPreviousEnd = parseIsoDate(previous?.end)
    if (previous && parsedDate && parsedPreviousEnd && daysBetween(parsedPreviousEnd, parsedDate) === 1) {
      previous.end = date
      previous.length++
    } else {
      runs.push({ start: date, end: date, length: 1 })
    }
  }
  return runs
}

function getHistoricalCycleInputs(profile: CyclePredictionProfile | null, logs: CyclePredictionLog[], prediction: CyclePrediction) {
  const periodRuns = getPeriodRuns(logs)
  const observedCycleLengths = periodRuns
    .slice(1)
    .map((run, index) => {
      const previousStart = parseIsoDate(periodRuns[index].start)
      const currentStart = parseIsoDate(run.start)
      return previousStart && currentStart ? daysBetween(previousStart, currentStart) : null
    })
    .filter((value): value is number => value !== null && value >= 18 && value <= 54)
  const observedMensesLengths = periodRuns.map((run) => run.length).filter((value) => value >= 2 && value <= 15)

  return {
    cycleLength: median(observedCycleLengths) ?? profile?.cycleLength ?? prediction.modelCycleLength,
    mensesLength: median(observedMensesLengths),
    observedCycles: observedCycleLengths.length,
    observedPeriods: observedMensesLengths.length,
  }
}

function scoreHistoricalBleedingRisk({
  profile,
  healthLogs,
  prediction,
}: {
  profile: CyclePredictionProfile | null
  healthLogs: CyclePredictionLog[]
  prediction: CyclePrediction
}): { signal: ModelRiskSignal; dataQuality: RiskDataQuality } {
  const inputs = getHistoricalCycleInputs(profile, healthLogs, prediction)
  const classifier = trainedCycleRiskModel.classifier
  const values: Record<string, number | null> = {
    LengthofCycle: inputs.cycleLength,
    LengthofMenses: inputs.mensesLength,
  }

  const standardized = classifier.fields.map((field, index) => {
    const value = values[field] ?? classifier.medians[index]
    return (value - classifier.means[index]) / classifier.standardDeviations[index]
  })
  const logit = classifier.intercept + classifier.coefficients.reduce(
    (sum, coefficient, index) => sum + coefficient * standardized[index],
    0
  )
  const logisticProbability = 1 / (1 + Math.exp(-Math.max(-35, Math.min(35, logit))))
  const naiveBayes = trainedCycleRiskModel.naiveBayes
  const naiveBayesLogLikelihoods = (['0', '1'] as const).map((target) => {
    const params = naiveBayes.classes[target]
    return Math.log(params.prior) + standardized.reduce((sum, value, index) => {
      const variance = params.variances[index]
      return sum - 0.5 * Math.log(2 * Math.PI * variance) - ((value - params.means[index]) ** 2) / (2 * variance)
    }, 0)
  })
  const naiveBayesProbability = 1 / (1 + Math.exp(-(naiveBayesLogLikelihoods[1] - naiveBayesLogLikelihoods[0])))
  const ensemble = trainedCycleRiskModel.ensemble
  const probability = ensemble.weights.logistic * logisticProbability + ensemble.weights.naiveBayes * naiveBayesProbability
  const level: ModelRiskSignal['level'] = probability >= ensemble.riskThresholds.high
    ? 'high'
    : probability >= ensemble.riskThresholds.moderate
      ? 'moderate'
      : 'low'

  const summaryByLevel: Record<ModelRiskSignal['level'], string> = {
    low: 'Your cycle timing and period length look similar to the lower-risk FedCycle patterns.',
    moderate: 'Your cycle timing or period length is less typical of FedCycle records without unusual bleeding.',
    high: 'Your cycle timing or period length resembles FedCycle records where unusual bleeding was reported more often.',
  }
  const featuresUsed = Number(inputs.cycleLength !== null) + Number(inputs.mensesLength !== null)
  const dataStatus: RiskDataQuality['status'] = featuresUsed === 2 && healthLogs.length >= 14
    ? 'good'
    : featuresUsed >= 1
      ? 'partial'
      : 'insufficient'

  return {
    signal: {
      key: 'historical-unusual-bleeding-pattern',
      label: 'Unusual bleeding pattern',
      level,
      source: 'trained-model',
      summary: summaryByLevel[level],
      evidence: [
        `Cycle length used: ${Math.round(inputs.cycleLength)} days${inputs.observedCycles ? ` from ${inputs.observedCycles + 1} logged period starts` : ' from profile or prediction'}.`,
        inputs.mensesLength === null
          ? 'Period length is not available yet; the training median was used.'
          : `Typical logged period length: ${Math.round(inputs.mensesLength)} days across ${inputs.observedPeriods} period${inputs.observedPeriods === 1 ? '' : 's'}.`,
        `Model agreement: logistic regression ${Math.round(logisticProbability * 100)}%, Gaussian Naive Bayes ${Math.round(naiveBayesProbability * 100)}%.`,
      ],
      estimatedMarkerProbability: Number(probability.toFixed(3)),
      modelProbabilities: {
        logisticRegression: Number(logisticProbability.toFixed(3)),
        gaussianNaiveBayes: Number(naiveBayesProbability.toFixed(3)),
        ensemble: Number(probability.toFixed(3)),
      },
      confidence: dataStatus === 'good' ? 'high' : dataStatus === 'partial' ? 'medium' : 'low',
    },
    dataQuality: {
      status: dataStatus,
      featuresUsed,
      totalFeatures: classifier.fields.length,
      logsUsed: healthLogs.length,
      note: dataStatus === 'good'
        ? 'The app found both model inputs and at least 14 daily logs.'
        : 'Keep logging period flow and start dates to strengthen this estimate.',
    },
  }
}

function getRecentTrackerSignals(logs: CyclePredictionLog[]) {
  const recent = getRecentLogs(logs, 10)

  const joinedSymptoms = recent.map((log) => log.symptoms ?? '').join(' ').toLowerCase()
  const avgPain = average(recent.map((log) => log.pain ?? 0))
  const avgStress = average(recent.map((log) => log.stress ?? 0))
  const avgEnergy = average(recent.map((log) => log.energy ?? 0).filter((value) => value > 0))

  const signals: string[] = []
  if (/cramp|bloat|breast|tender|headache|fatigue|pms/.test(joinedSymptoms)) {
    signals.push('Recent PMS-like symptoms in tracker')
  }
  if (avgPain >= 4) signals.push('Pain has been elevated recently')
  if (avgStress >= 7) signals.push('Stress is running high')
  if (recent.length >= 4 && avgEnergy > 0 && avgEnergy <= 5) signals.push('Energy has been lower than usual')
  if (recent.length >= 14) signals.push('Enough recent logs for tracker adjustment')

  return signals
}

export function getCyclePrediction({
  profile,
  healthLogs,
  today = new Date(),
}: {
  profile: CyclePredictionProfile | null
  healthLogs: CyclePredictionLog[]
  today?: Date
}): CyclePrediction {
  const trackerSignals = getRecentTrackerSignals(healthLogs)
  const profileCycleLength = profile?.cycleLength && profile.cycleLength > 0 ? profile.cycleLength : null
  const modelCycleLength = clamp(
    Math.round(profileCycleLength ? profileCycleLength * 0.72 + FED_CYCLE_REFERENCE.averageCycleLength * 0.28 : FED_CYCLE_REFERENCE.averageCycleLength),
    24,
    40
  )

  const lastStart = parseIsoDate(profile?.lastPeriodStart)
  const ovulationDay = clamp(
    Math.round(modelCycleLength - FED_CYCLE_REFERENCE.averageLutealPhase),
    10,
    modelCycleLength - 8
  )

  const reasoning = [
    `Reference model: ${FED_CYCLE_REFERENCE.sampleSize.toLocaleString()} cycles, average cycle ${FED_CYCLE_REFERENCE.averageCycleLength.toFixed(1)} days`,
    profileCycleLength
      ? `Personal tracker cycle length is blended in at ${profileCycleLength} days`
      : 'No personal cycle length yet, using reference baseline',
  ]

  if (trackerSignals.length > 0) {
    reasoning.push(`Tracker signals: ${trackerSignals.slice(0, 2).join('; ')}`)
  }

  if (!lastStart) {
    return {
      sourceLabel: 'FedCycleData071012.csv + NariAid tracker',
      referenceSampleSize: FED_CYCLE_REFERENCE.sampleSize,
      modelCycleLength,
      predictedNextPeriod: null,
      predictedNextPeriodLabel: 'Add last period date',
      daysUntilNext: null,
      ovulationLabel: null,
      fertileWindowLabel: null,
      confidence: healthLogs.length >= 10 ? 54 : 42,
      currentPhase: 'Unknown',
      trackerSignals,
      reasoning,
    }
  }

  const elapsed = Math.max(0, daysBetween(lastStart, today))
  const cyclesElapsed = Math.floor(elapsed / modelCycleLength)
  const currentCycleStart = addDays(lastStart, cyclesElapsed * modelCycleLength)
  const cycleDay = daysBetween(currentCycleStart, today) + 1
  const predictedNext = addDays(currentCycleStart, modelCycleLength)
  const ovulationDate = addDays(currentCycleStart, ovulationDay - 1)
  const fertileStart = addDays(ovulationDate, -5)
  const fertileEnd = addDays(ovulationDate, 1)
  const daysUntilNext = daysBetween(today, predictedNext)

  let confidence = 56
  if (profileCycleLength) confidence += 16
  if (profile?.lastPeriodStart) confidence += 14
  if (healthLogs.length >= 14) confidence += 8
  if (trackerSignals.length > 0 && daysUntilNext <= 7) confidence += 4
  confidence -= Math.min(10, Math.max(0, Math.abs(modelCycleLength - FED_CYCLE_REFERENCE.averageCycleLength) - 4))

  return {
    sourceLabel: 'FedCycleData071012.csv + NariAid tracker',
    referenceSampleSize: FED_CYCLE_REFERENCE.sampleSize,
    modelCycleLength,
    predictedNextPeriod: formatIso(predictedNext),
    predictedNextPeriodLabel: formatMonthDay(predictedNext),
    daysUntilNext,
    ovulationLabel: formatMonthDay(ovulationDate),
    fertileWindowLabel: `${formatMonthDay(fertileStart)}-${formatMonthDay(fertileEnd)}`,
    confidence: clamp(Math.round(confidence), 35, 92),
    currentPhase: getPhase(cycleDay, ovulationDay),
    trackerSignals,
    reasoning,
  }
}

function addUnique(items: string[], item: string) {
  if (!items.includes(item)) items.push(item)
}

function getComparisonStatus(value: number, middleRange: readonly [number, number], doctorRange?: readonly [number, number]): HealthComparisonStatus {
  if (doctorRange && (value < doctorRange[0] || value > doctorRange[1])) return 'doctor'
  if (value < middleRange[0] || value > middleRange[1]) return 'watch'
  return 'steady'
}

function statusPriority(status: HealthGuidanceStatus) {
  return { steady: 0, watch: 1, doctor: 2, urgent: 3 }[status]
}

function elevate(current: HealthGuidanceStatus, next: HealthGuidanceStatus) {
  return statusPriority(next) > statusPriority(current) ? next : current
}

export function getCycleRiskAssessment({
  profile,
  healthLogs,
  prediction,
  today = new Date(),
}: {
  profile: CyclePredictionProfile | null
  healthLogs: CyclePredictionLog[]
  prediction: CyclePrediction
  today?: Date
}): CycleRiskAssessment {
  const recent = getRecentLogs(healthLogs, 14)
  const symptomText = recent.map((log) => `${log.symptoms ?? ''} ${log.notes ?? ''}`).join(' ').toLowerCase()
  const hasHeavyBleedingText = /heavy|soak|pad|tampon|cup|clot|clots|bleed through|flood/.test(symptomText)
  const hasUnexpectedBleedingText = /spotting|between periods|after sex|bleeding between/.test(symptomText)
  const hasUrgentSymptomText = /chest pain|trouble breathing|short of breath|fainting|passed out|sudden severe pelvic pain/.test(symptomText)
  const hasDizzinessText = /dizzy|dizziness|lightheaded/.test(symptomText)
  const hasFeverConcernText = /fever/.test(symptomText) && /tampon|very sick|severely ill/.test(symptomText)
  const painValues = recent.map((log) => log.pain ?? 0).filter((value) => value > 0)
  const stressValues = recent.map((log) => log.stress ?? 0).filter((value) => value > 0)
  const sleepValues = recent.map((log) => log.sleep ?? 0).filter((value) => value > 0)
  const avgPain = average(painValues)
  const avgStress = average(stressValues)
  const avgSleep = average(sleepValues)
  const severePainDays = recent.filter((log) => (log.pain ?? 0) >= 8).length
  const cycleLength = profile?.cycleLength && profile.cycleLength > 0 ? profile.cycleLength : prediction.modelCycleLength
  const lastStart = parseIsoDate(profile?.lastPeriodStart)
  const daysSinceLastPeriod = lastStart ? daysBetween(lastStart, today) : null
  const trainedRisk = scoreHistoricalBleedingRisk({ profile, healthLogs, prediction })

  const comparison: HealthComparison[] = [
    {
      label: 'Cycle length',
      userValue: `${cycleLength} days`,
      referenceValue: `FedCycle middle ${formatRange(FED_CYCLE_REFERENCE.cycleLengthMiddleRange)}; clinical check-in outside ${formatRange(FED_CYCLE_REFERENCE.typicalClinicalCycleRange)}`,
      status: getComparisonStatus(cycleLength, FED_CYCLE_REFERENCE.cycleLengthMiddleRange, FED_CYCLE_REFERENCE.typicalClinicalCycleRange),
    },
    {
      label: 'Estimated ovulation',
      userValue: prediction.ovulationLabel ?? 'Needs last period date',
      referenceValue: `FedCycle average day ${FED_CYCLE_REFERENCE.averageOvulationDay.toFixed(1)}, middle day ${FED_CYCLE_REFERENCE.ovulationMiddleRange[0]}-${FED_CYCLE_REFERENCE.ovulationMiddleRange[1]}`,
      status: prediction.ovulationLabel ? 'steady' : 'watch',
    },
    {
      label: 'Recent pain',
      userValue: painValues.length ? `${avgPain.toFixed(1)}/10 average` : 'Not enough pain logs',
      referenceValue: 'Track pain that is severe, new, or disrupts daily life',
      status: severePainDays > 0 || avgPain >= 6 ? 'doctor' : avgPain >= 4 ? 'watch' : 'steady',
    },
    {
      label: trainedRisk.signal.label,
      userValue: `${trainedRisk.signal.level[0].toUpperCase()}${trainedRisk.signal.level.slice(1)} risk`,
      referenceValue: 'Participant-held-out FedCycle model using cycle and period length',
      status: trainedRisk.signal.level === 'high' ? 'doctor' : trainedRisk.signal.level === 'moderate' ? 'watch' : 'steady',
    },
  ]

  let status: HealthGuidanceStatus = trainedRisk.signal.level === 'high'
    ? 'doctor'
    : trainedRisk.signal.level === 'moderate'
      ? 'watch'
      : 'steady'
  const riskFactors: string[] = []
  const doctorPrompts: string[] = []

  if (trainedRisk.signal.level !== 'low') {
    addUnique(riskFactors, trainedRisk.signal.summary)
  }

  for (const item of comparison) {
    if (item.status === 'doctor') status = elevate(status, 'doctor')
    if (item.status === 'watch') status = elevate(status, 'watch')
  }

  if (!profile?.lastPeriodStart) {
    status = elevate(status, 'watch')
    addUnique(riskFactors, 'Add your last period start date so predictions and cycle timing checks can be personalized.')
  }

  if (daysSinceLastPeriod !== null && daysSinceLastPeriod > 90) {
    status = elevate(status, 'doctor')
    addUnique(riskFactors, 'Your profile has no recorded period start in more than 90 days. Update it if a start date is missing; if this is accurate, contact a clinician.')
  }

  if (cycleLength < FED_CYCLE_REFERENCE.typicalClinicalCycleRange[0] || cycleLength > FED_CYCLE_REFERENCE.typicalClinicalCycleRange[1]) {
    addUnique(riskFactors, 'Cycle length is outside the 24-38 day clinical check-in range used by major health references.')
  } else if (cycleLength < FED_CYCLE_REFERENCE.cycleLengthMiddleRange[0] || cycleLength > FED_CYCLE_REFERENCE.cycleLengthMiddleRange[1]) {
    addUnique(riskFactors, 'Cycle length is outside the middle FedCycle range, so keep logging to confirm whether this is normal for you.')
  }

  if (severePainDays > 0) {
    status = elevate(status, 'doctor')
    addUnique(riskFactors, `${severePainDays} recent log${severePainDays === 1 ? '' : 's'} had severe pain at 8/10 or higher.`)
  } else if (avgPain >= 4) {
    status = elevate(status, 'watch')
    addUnique(riskFactors, 'Pain has been elevated recently.')
  }

  if (hasHeavyBleedingText) {
    status = elevate(status, 'doctor')
    addUnique(riskFactors, 'Your symptom text mentions heavy bleeding, clots, or soaking through period products.')
  }

  if (hasUnexpectedBleedingText) {
    status = elevate(status, 'doctor')
    addUnique(riskFactors, 'Your symptom text mentions spotting or bleeding outside the expected period window.')
  }

  if (hasUrgentSymptomText) {
    status = elevate(status, 'urgent')
    addUnique(riskFactors, 'Your symptom text includes fainting, chest pain, breathing trouble, or sudden severe pelvic pain.')
  } else if (hasDizzinessText) {
    status = elevate(status, 'doctor')
    addUnique(riskFactors, 'Your symptom text includes dizziness or lightheadedness, which is worth discussing with a clinician if new, persistent, or paired with heavy bleeding.')
  }

  if (hasFeverConcernText) {
    status = elevate(status, 'urgent')
    addUnique(riskFactors, 'Your symptom text includes fever and tampon-related sickness language.')
  }

  if (avgStress >= 7) {
    status = elevate(status, 'watch')
    addUnique(riskFactors, 'Stress has been high in recent logs.')
  }

  if (sleepValues.length >= 3 && avgSleep <= 4) {
    status = elevate(status, 'watch')
    addUnique(riskFactors, 'Sleep quality has been low across recent logs.')
  }

  if (status === 'steady') {
    addUnique(riskFactors, 'Your logged cycle length and recent symptoms look steady compared with the reference model.')
  }

  if (status === 'urgent') {
    doctorPrompts.push('Seek urgent care now if chest pain, trouble breathing, fainting, sudden severe pelvic pain, or fever with feeling very sick is present.')
  }

  if (status === 'doctor' || status === 'urgent') {
    doctorPrompts.push('Consider contacting a clinician if heavy bleeding, large clots, bleeding between periods, severe pain, or cycles outside 24-38 days persist.')
  } else if (status === 'watch') {
    doctorPrompts.push('Keep logging for the next few cycles, and book a routine clinician check-in if this pattern is new, worsening, or disrupting daily life.')
  } else {
    doctorPrompts.push('Keep tracking start and end dates, flow, clots, pain, mood, sleep, and symptoms so NariAid can spot changes earlier.')
  }

  doctorPrompts.push('This is informational tracking guidance, not a diagnosis or treatment plan.')

  const titleByStatus: Record<HealthGuidanceStatus, string> = {
    steady: 'Low risk',
    watch: 'Moderate risk',
    doctor: 'High risk',
    urgent: 'Urgent risk',
  }

  const summaryByStatus: Record<HealthGuidanceStatus, string> = {
    steady: `Low risk: the trained FedCycle comparison and recent tracker safety checks do not currently elevate the pattern. The cohort average cycle was ${FED_CYCLE_REFERENCE.averageCycleLength.toFixed(1)} days.`,
    watch: 'Moderate risk: the trained model or recent tracker signals are outside the lower-risk pattern. Keep logging closely and watch whether the change persists.',
    doctor: 'High risk: one or more model or tracker signals are worth discussing with a clinician, especially if they are new, persistent, or affect daily life.',
    urgent: 'Urgent pattern: one or more logged symptoms may need urgent attention if they are happening now, especially breathing trouble, chest pain, fainting, fever, or sudden severe pelvic pain.',
  }

  const cycleRiskLevel: HealthRiskLevel = daysSinceLastPeriod !== null && daysSinceLastPeriod > 90
    ? 'high'
    : cycleLength < FED_CYCLE_REFERENCE.typicalClinicalCycleRange[0] || cycleLength > FED_CYCLE_REFERENCE.typicalClinicalCycleRange[1]
      ? 'high'
      : !profile?.lastPeriodStart || cycleLength < FED_CYCLE_REFERENCE.cycleLengthMiddleRange[0] || cycleLength > FED_CYCLE_REFERENCE.cycleLengthMiddleRange[1]
        ? 'moderate'
        : 'low'
  const painRiskLevel: HealthRiskLevel = severePainDays > 0 || avgPain >= 6 ? 'high' : avgPain >= 4 ? 'moderate' : 'low'
  const recoveryRiskLevel: HealthRiskLevel = avgStress >= 7 || (sleepValues.length >= 3 && avgSleep <= 4) ? 'moderate' : 'low'
  const symptomRiskLevel: HealthRiskLevel = hasUrgentSymptomText || hasFeverConcernText
    ? 'urgent'
    : hasHeavyBleedingText || hasUnexpectedBleedingText || hasDizzinessText
      ? 'high'
      : 'low'
  const riskAreas: RiskArea[] = [
    {
      key: trainedRisk.signal.key,
      label: trainedRisk.signal.label,
      level: trainedRisk.signal.level,
      basis: 'trained-model',
      summary: trainedRisk.signal.summary,
    },
    {
      key: 'cycle-timing',
      label: 'Cycle timing',
      level: cycleRiskLevel,
      basis: 'cohort-comparison',
      summary: daysSinceLastPeriod !== null && daysSinceLastPeriod > 90
        ? 'No period start has been recorded in more than 90 days; confirm the profile date and contact a clinician if it is accurate.'
        : `The current cycle-length estimate is ${cycleLength} days compared with the FedCycle middle range of ${formatRange(FED_CYCLE_REFERENCE.cycleLengthMiddleRange)}.`,
    },
    {
      key: 'pain',
      label: 'Pain',
      level: painRiskLevel,
      basis: 'tracker-safety-rule',
      summary: painValues.length ? `Recent pain averages ${avgPain.toFixed(1)}/10.` : 'There are not enough pain logs yet.',
    },
    {
      key: 'recovery',
      label: 'Stress and sleep',
      level: recoveryRiskLevel,
      basis: 'tracker-safety-rule',
      summary: 'This area checks recent high stress and persistently low sleep logs.',
    },
    {
      key: 'symptom-safety',
      label: 'Symptom safety',
      level: symptomRiskLevel,
      basis: 'tracker-safety-rule',
      summary: symptomRiskLevel === 'low' ? 'No high-priority symptom phrases were found in recent logs.' : 'Recent symptom text contains a phrase that raises the care guidance level.',
    },
  ]

  const contextForAI = [
    `Health guidance status: ${titleByStatus[status]}.`,
    summaryByStatus[status],
    `FedCycle comparison: cycle ${cycleLength} days vs average ${FED_CYCLE_REFERENCE.averageCycleLength.toFixed(1)} days and middle ${formatRange(FED_CYCLE_REFERENCE.cycleLengthMiddleRange)}.`,
    `Trained ensemble signal: ${trainedRisk.signal.label} is ${trainedRisk.signal.level} risk with ${Math.round(trainedRisk.signal.estimatedMarkerProbability * 100)}% historical-marker similarity and ${trainedRisk.signal.confidence} input confidence.`,
    `Recent pain average: ${painValues.length ? avgPain.toFixed(1) : 'not enough logs'}.`,
    `Risk factors: ${riskFactors.join('; ')}`,
  ].join(' ')

  return {
    status,
    riskLevel: status === 'steady' ? 'low' : status === 'watch' ? 'moderate' : status === 'doctor' ? 'high' : 'urgent',
    title: titleByStatus[status],
    summary: summaryByStatus[status],
    sourceLabel: `${FED_CYCLE_REFERENCE.fileName} (${FED_CYCLE_REFERENCE.sampleSize.toLocaleString()} cycles) + NariAid tracker`,
    modelName: trainedCycleRiskModel.modelName,
    modelTarget: trainedCycleRiskModel.target.label,
    modelPerformance: `two-model ensemble; ${trainedCycleRiskModel.trainParticipants} train / ${trainedCycleRiskModel.testParticipants} test people; holdout AUROC ${trainedCycleRiskModel.testMetrics.unusualBleedingAuRoc.toFixed(2)}, balanced accuracy ${Math.round(trainedCycleRiskModel.testMetrics.unusualBleedingBalancedAccuracy * 100)}%`,
    modelSignals: [trainedRisk.signal],
    riskAreas,
    dataQuality: trainedRisk.dataQuality,
    comparison,
    riskFactors,
    doctorPrompts,
    contextForAI,
  }
}
