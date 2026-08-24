import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const fedPath = path.join(root, 'public/data/FedCycleData071012.csv')
const trackerPath = path.join(root, 'public/data/example-woman-tracker-50-days.csv')
const outSrc = path.join(root, 'src/data/cycle-risk-model.json')
const outPublic = path.join(root, 'public/data/cycle-risk-model.json')

const classifierFields = ['LengthofCycle', 'LengthofMenses']
const referenceFields = [
  'LengthofCycle',
  'EstimatedDayofOvulation',
  'LengthofLutealPhase',
  'LengthofMenses',
  'TotalDaysofFertility',
  'MeanBleedingIntensity',
]

function parseCsv(text) {
  const clean = text.replace(/^\uFEFF/, '')
  const rows = []
  let row = []
  let cell = ''
  let quoted = false

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i]
    const next = clean[i + 1]
    if (char === '"' && quoted && next === '"') {
      cell += '"'
      i++
    } else if (char === '"') {
      quoted = !quoted
    } else if (char === ',' && !quoted) {
      row.push(cell)
      cell = ''
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') i++
      row.push(cell)
      if (row.some((value) => value.trim() !== '')) rows.push(row)
      row = []
      cell = ''
    } else {
      cell += char
    }
  }

  if (cell || row.length) {
    row.push(cell)
    rows.push(row)
  }

  const [headers, ...data] = rows
  return data.map((values) => Object.fromEntries(headers.map((header, index) => [header.trim(), values[index]?.trim() ?? ''])))
}

function num(value) {
  if (value === undefined || value === null || String(value).trim() === '') return null
  const parsed = Number(String(value).replace(/[^0-9.-]/g, ''))
  return Number.isFinite(parsed) ? parsed : null
}

function round(value, places = 4) {
  return Number(value.toFixed(places))
}

function quantile(values, q) {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const position = (sorted.length - 1) * q
  const base = Math.floor(position)
  const rest = position - base
  return sorted[base + 1] === undefined
    ? sorted[base]
    : sorted[base] + rest * (sorted[base + 1] - sorted[base])
}

function stats(values) {
  const filtered = values.filter((value) => Number.isFinite(value))
  const mean = filtered.reduce((sum, value) => sum + value, 0) / filtered.length
  const variance = filtered.reduce((sum, value) => sum + (value - mean) ** 2, 0) / filtered.length
  return {
    count: filtered.length,
    mean: round(mean, 2),
    sd: round(Math.sqrt(variance), 2),
    p10: round(quantile(filtered, 0.1), 2),
    p25: round(quantile(filtered, 0.25), 2),
    p50: round(quantile(filtered, 0.5), 2),
    p75: round(quantile(filtered, 0.75), 2),
    p90: round(quantile(filtered, 0.9), 2),
  }
}

function stableHash(value) {
  let hash = 2166136261
  for (const char of value) {
    hash ^= char.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function sigmoid(value) {
  return 1 / (1 + Math.exp(-Math.max(-35, Math.min(35, value))))
}

function trainLogisticRegression(rows, fields, medians, means, standardDeviations) {
  const weights = Array(fields.length + 1).fill(0)
  const learningRate = 0.12
  const regularization = 0.001

  const vector = (row) => [
    1,
    ...fields.map((field, index) => ((num(row[field]) ?? medians[index]) - means[index]) / standardDeviations[index]),
  ]

  for (let epoch = 0; epoch < 4000; epoch++) {
    const gradient = Array(weights.length).fill(0)
    for (const row of rows) {
      const input = vector(row)
      const target = Number(row.UnusualBleeding)
      const probability = sigmoid(weights.reduce((sum, weight, index) => sum + weight * input[index], 0))
      for (let index = 0; index < weights.length; index++) {
        gradient[index] += (probability - target) * input[index]
      }
    }

    for (let index = 0; index < weights.length; index++) {
      const penalty = index === 0 ? 0 : regularization * weights[index]
      weights[index] -= learningRate * (gradient[index] / rows.length + penalty)
    }
  }

  return { weights, vector }
}

function trainGaussianNaiveBayes(rows, fields, medians, means, standardDeviations) {
  const classes = [0, 1]
  const parameters = Object.fromEntries(classes.map((target) => {
    const classRows = rows.filter((row) => Number(row.UnusualBleeding) === target)
    const vectors = classRows.map((row) => fields.map((field, index) => (
      ((num(row[field]) ?? medians[index]) - means[index]) / standardDeviations[index]
    )))
    const classMeans = fields.map((_field, index) => (
      vectors.reduce((sum, vector) => sum + vector[index], 0) / vectors.length
    ))
    const classVariances = fields.map((_field, index) => Math.max(
      vectors.reduce((sum, vector) => sum + (vector[index] - classMeans[index]) ** 2, 0) / vectors.length,
      0.01
    ))

    return [String(target), {
      prior: classRows.length / rows.length,
      means: classMeans,
      variances: classVariances,
    }]
  }))

  const vector = (row) => fields.map((field, index) => (
    ((num(row[field]) ?? medians[index]) - means[index]) / standardDeviations[index]
  ))
  const score = (row) => {
    const input = vector(row)
    const logLikelihoods = classes.map((target) => {
      const params = parameters[String(target)]
      return Math.log(params.prior) + input.reduce((sum, value, index) => {
        const variance = params.variances[index]
        return sum - 0.5 * Math.log(2 * Math.PI * variance) - ((value - params.means[index]) ** 2) / (2 * variance)
      }, 0)
    })
    return sigmoid(logLikelihoods[1] - logLikelihoods[0])
  }

  return { parameters, score }
}

function areaUnderRoc(rows, score) {
  const ranked = rows
    .map((row) => ({ probability: score(row), target: Number(row.UnusualBleeding) }))
    .sort((a, b) => a.probability - b.probability)

  let rank = 1
  let positiveRankSum = 0
  let positives = 0
  let negatives = 0

  for (let index = 0; index < ranked.length;) {
    let tieEnd = index + 1
    while (tieEnd < ranked.length && ranked[tieEnd].probability === ranked[index].probability) tieEnd++
    const averageRank = (rank + (rank + tieEnd - index - 1)) / 2
    for (let tieIndex = index; tieIndex < tieEnd; tieIndex++) {
      if (ranked[tieIndex].target === 1) {
        positiveRankSum += averageRank
        positives++
      } else {
        negatives++
      }
    }
    rank += tieEnd - index
    index = tieEnd
  }

  return (positiveRankSum - positives * (positives + 1) / 2) / (positives * negatives)
}

function classificationMetrics(rows, score, threshold) {
  let truePositive = 0
  let trueNegative = 0
  let falsePositive = 0
  let falseNegative = 0

  for (const row of rows) {
    const predicted = score(row) >= threshold ? 1 : 0
    const actual = Number(row.UnusualBleeding)
    if (predicted === 1 && actual === 1) truePositive++
    else if (predicted === 0 && actual === 0) trueNegative++
    else if (predicted === 1) falsePositive++
    else falseNegative++
  }

  const sensitivity = truePositive / (truePositive + falseNegative)
  const specificity = trueNegative / (trueNegative + falsePositive)
  return {
    truePositive,
    trueNegative,
    falsePositive,
    falseNegative,
    sensitivity,
    specificity,
    balancedAccuracy: (sensitivity + specificity) / 2,
  }
}

const rawFedRows = parseCsv(fs.readFileSync(fedPath, 'utf8'))
const trackerRows = parseCsv(fs.readFileSync(trackerPath, 'utf8'))
const seenParticipantCycles = new Set()
let duplicateParticipantCycles = 0

const eligibleRows = rawFedRows.filter((row) => {
  if (row.UnusualBleeding !== '0' && row.UnusualBleeding !== '1') return false
  const key = `${row.ClientID}|${row.CycleNumber}`
  if (seenParticipantCycles.has(key)) {
    duplicateParticipantCycles++
    return false
  }
  seenParticipantCycles.add(key)
  return true
})

const rowsByParticipant = new Map()
for (const row of eligibleRows) {
  const current = rowsByParticipant.get(row.ClientID) ?? []
  current.push(row)
  rowsByParticipant.set(row.ClientID, current)
}

const participantGroups = [[], []]
for (const [participantId, rows] of rowsByParticipant) {
  const hasPositive = rows.some((row) => row.UnusualBleeding === '1')
  participantGroups[hasPositive ? 1 : 0].push(participantId)
}
participantGroups.forEach((group) => group.sort((a, b) => stableHash(a) - stableHash(b)))

// Hold out every fifth participant within both target strata. A person can never
// appear in both sets, which avoids optimistic leakage across repeated cycles.
const testParticipants = new Set(participantGroups.flatMap((group) => group.filter((_participantId, index) => index % 5 === 0)))
const trainRows = eligibleRows.filter((row) => !testParticipants.has(row.ClientID))
const testRows = eligibleRows.filter((row) => testParticipants.has(row.ClientID))

const featureMedians = classifierFields.map((field) => quantile(
  trainRows.map((row) => num(row[field])).filter((value) => value !== null),
  0.5
))
const featureMeans = classifierFields.map((field, index) => {
  const values = trainRows.map((row) => num(row[field]) ?? featureMedians[index])
  return values.reduce((sum, value) => sum + value, 0) / values.length
})
const featureStandardDeviations = classifierFields.map((field, index) => {
  const values = trainRows.map((row) => num(row[field]) ?? featureMedians[index])
  const variance = values.reduce((sum, value) => sum + (value - featureMeans[index]) ** 2, 0) / values.length
  return Math.sqrt(variance) || 1
})

const { weights, vector } = trainLogisticRegression(
  trainRows,
  classifierFields,
  featureMedians,
  featureMeans,
  featureStandardDeviations
)
const logisticScore = (row) => sigmoid(weights.reduce((sum, weight, index) => sum + weight * vector(row)[index], 0))
const naiveBayes = trainGaussianNaiveBayes(
  trainRows,
  classifierFields,
  featureMedians,
  featureMeans,
  featureStandardDeviations
)
const ensembleWeights = { logistic: 0.6, naiveBayes: 0.4 }
const ensembleScore = (row) => (
  ensembleWeights.logistic * logisticScore(row) + ensembleWeights.naiveBayes * naiveBayes.score(row)
)

let classificationThreshold = 0.05
let bestBalancedAccuracy = -1
for (let threshold = 0.005; threshold <= 0.4; threshold += 0.0025) {
  const metrics = classificationMetrics(trainRows, ensembleScore, threshold)
  if (metrics.balancedAccuracy > bestBalancedAccuracy) {
    bestBalancedAccuracy = metrics.balancedAccuracy
    classificationThreshold = threshold
  }
}

const trainProbabilities = trainRows.map(ensembleScore)
const metricBundle = (score) => {
  const holdout = classificationMetrics(testRows, score, classificationThreshold)
  const brierScore = testRows.reduce((sum, row) => {
    const error = score(row) - Number(row.UnusualBleeding)
    return sum + error ** 2 / testRows.length
  }, 0)
  return {
    auRoc: round(areaUnderRoc(testRows, score), 3),
    balancedAccuracy: round(holdout.balancedAccuracy, 3),
    sensitivity: round(holdout.sensitivity, 3),
    specificity: round(holdout.specificity, 3),
    brierScore: round(brierScore, 3),
    confusionMatrix: {
      truePositive: holdout.truePositive,
      trueNegative: holdout.trueNegative,
      falsePositive: holdout.falsePositive,
      falseNegative: holdout.falseNegative,
    },
  }
}
const logisticMetrics = metricBundle(logisticScore)
const naiveBayesMetrics = metricBundle(naiveBayes.score)
const ensembleMetrics = metricBundle(ensembleScore)

const referenceFeatures = Object.fromEntries(referenceFields.map((field) => [
  field,
  stats(trainRows.map((row) => num(row[field])).filter((value) => value !== null)),
]))
const cycleMedian = referenceFeatures.LengthofCycle.p50
const testCycleLengths = testRows.map((row) => num(row.LengthofCycle)).filter((value) => value !== null)
const cycleMae = testCycleLengths.reduce((sum, value) => sum + Math.abs(value - cycleMedian) / testCycleLengths.length, 0)
const withinMiddle = testCycleLengths.filter(
  (value) => value >= referenceFeatures.LengthofCycle.p25 && value <= referenceFeatures.LengthofCycle.p75
).length

const missingRateByFeature = Object.fromEntries(classifierFields.map((field) => [
  field,
  round(eligibleRows.filter((row) => num(row[field]) === null).length / eligibleRows.length, 4),
]))

const model = {
  modelName: 'FedCycle participant-held-out ensemble v3',
  modelType: 'logistic regression and Gaussian Naive Bayes ensemble plus cohort and tracker safety checks',
  trainedAt: new Date().toISOString(),
  source: {
    fedCycleFile: 'public/data/FedCycleData071012.csv',
    trackerSeedFile: 'public/data/example-woman-tracker-50-days.csv',
  },
  target: {
    field: 'UnusualBleeding',
    label: 'historical unusual-bleeding pattern',
    positiveDefinition: 'FedCycle UnusualBleeding equals 1',
    limitation: 'This model estimates similarity to historical unusual-bleeding records. It does not diagnose a condition or estimate every possible health risk.',
  },
  trainRows: trainRows.length,
  testRows: testRows.length,
  trackerRows: trackerRows.length,
  trainParticipants: rowsByParticipant.size - testParticipants.size,
  testParticipants: testParticipants.size,
  classifier: {
    fields: classifierFields,
    medians: featureMedians.map((value) => round(value, 6)),
    means: featureMeans.map((value) => round(value, 6)),
    standardDeviations: featureStandardDeviations.map((value) => round(value, 6)),
    intercept: round(weights[0], 8),
    coefficients: weights.slice(1).map((value) => round(value, 8)),
    classificationThreshold: round(classificationThreshold, 6),
    riskThresholds: {
      moderate: round(quantile(trainProbabilities, 0.75), 6),
      high: round(quantile(trainProbabilities, 0.9), 6),
    },
  },
  naiveBayes: {
    fields: classifierFields,
    medians: featureMedians.map((value) => round(value, 6)),
    means: featureMeans.map((value) => round(value, 6)),
    standardDeviations: featureStandardDeviations.map((value) => round(value, 6)),
    classes: Object.fromEntries(Object.entries(naiveBayes.parameters).map(([target, params]) => [target, {
      prior: round(params.prior, 8),
      means: params.means.map((value) => round(value, 8)),
      variances: params.variances.map((value) => round(value, 8)),
    }])),
  },
  ensemble: {
    weights: ensembleWeights,
    classificationThreshold: round(classificationThreshold, 6),
    riskThresholds: {
      moderate: round(quantile(trainProbabilities, 0.75), 6),
      high: round(quantile(trainProbabilities, 0.9), 6),
    },
  },
  features: referenceFeatures,
  dataQuality: {
    rawRows: rawFedRows.length,
    eligibleRows: eligibleRows.length,
    uniqueParticipants: rowsByParticipant.size,
    duplicateParticipantCycleRowsExcluded: duplicateParticipantCycles,
    missingRateByFeature,
    splitMethod: 'deterministic participant-level 80/20 holdout, stratified by whether a participant ever recorded unusual bleeding',
  },
  clinicalRules: {
    typicalCycleRangeDays: [24, 38],
    discussCycleOutsideDays: [24, 38],
    discussNoPeriodDays: 90,
    discussHeavyBleedingDays: 8,
    discussSeverePainScale: 8,
    urgentSymptoms: ['chest pain', 'trouble breathing', 'fainting', 'sudden severe pelvic pain', 'fever with feeling very sick'],
  },
  testMetrics: {
    unusualBleedingAuRoc: ensembleMetrics.auRoc,
    unusualBleedingBalancedAccuracy: ensembleMetrics.balancedAccuracy,
    sensitivity: ensembleMetrics.sensitivity,
    specificity: ensembleMetrics.specificity,
    brierScore: ensembleMetrics.brierScore,
    confusionMatrix: ensembleMetrics.confusionMatrix,
    byModel: {
      logisticRegression: logisticMetrics,
      gaussianNaiveBayes: naiveBayesMetrics,
      ensemble: ensembleMetrics,
    },
    cycleLengthMedianMaeDays: round(cycleMae, 2),
    holdoutCycleMiddleCoverage: round(withinMiddle / testCycleLengths.length, 3),
    testCycleCount: testCycleLengths.length,
  },
  labels: {
    low: 'Low risk',
    moderate: 'Moderate risk',
    high: 'High risk',
    urgent: 'Urgent risk',
  },
}

fs.writeFileSync(outSrc, `${JSON.stringify(model, null, 2)}\n`)
fs.writeFileSync(outPublic, `${JSON.stringify(model, null, 2)}\n`)
console.log(
  `Trained ${model.modelName}: ${model.trainRows} train / ${model.testRows} test rows, ` +
  `${model.trainParticipants} train / ${model.testParticipants} test people, ` +
  `holdout AUROC ${model.testMetrics.unusualBleedingAuRoc}`
)
