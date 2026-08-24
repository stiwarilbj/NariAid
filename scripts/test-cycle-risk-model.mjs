import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const model = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src/data/cycle-risk-model.json'), 'utf8'))

function logisticScore(cycleLength, mensesLength) {
  const values = [cycleLength, mensesLength]
  const standardized = values.map((value, index) => (
    (value - model.classifier.means[index]) / model.classifier.standardDeviations[index]
  ))
  const logit = model.classifier.intercept + model.classifier.coefficients.reduce(
    (sum, coefficient, index) => sum + coefficient * standardized[index],
    0
  )
  return 1 / (1 + Math.exp(-logit))
}

function naiveBayesScore(cycleLength, mensesLength) {
  const values = [cycleLength, mensesLength]
  const standardized = values.map((value, index) => (
    (value - model.naiveBayes.means[index]) / model.naiveBayes.standardDeviations[index]
  ))
  const likelihoods = ['0', '1'].map((target) => {
    const params = model.naiveBayes.classes[target]
    return Math.log(params.prior) + standardized.reduce((sum, value, index) => {
      const variance = params.variances[index]
      return sum - 0.5 * Math.log(2 * Math.PI * variance) - ((value - params.means[index]) ** 2) / (2 * variance)
    }, 0)
  })
  return 1 / (1 + Math.exp(-(likelihoods[1] - likelihoods[0])))
}

function score(cycleLength, mensesLength) {
  return model.ensemble.weights.logistic * logisticScore(cycleLength, mensesLength) +
    model.ensemble.weights.naiveBayes * naiveBayesScore(cycleLength, mensesLength)
}

assert.equal(model.classifier.fields.join(','), 'LengthofCycle,LengthofMenses')
assert.ok(model.trainParticipants > model.testParticipants)
assert.ok(model.testParticipants >= 20)
assert.ok(model.dataQuality.duplicateParticipantCycleRowsExcluded > 0)
assert.ok(model.ensemble.riskThresholds.moderate < model.ensemble.riskThresholds.high)
assert.ok(model.testMetrics.unusualBleedingAuRoc >= 0.7)
assert.ok(model.testMetrics.unusualBleedingBalancedAccuracy >= 0.65)
assert.ok(model.testMetrics.byModel.logisticRegression.auRoc >= 0.7)
assert.ok(model.testMetrics.byModel.gaussianNaiveBayes.auRoc >= 0.7)
assert.ok(score(29, 5) < model.ensemble.riskThresholds.moderate)
assert.ok(score(40, 9) >= model.ensemble.riskThresholds.high)
assert.deepEqual(Object.keys(model.labels), ['low', 'moderate', 'high', 'urgent'])

console.log(
  `Model checks passed: AUROC ${model.testMetrics.unusualBleedingAuRoc}, ` +
  `balanced accuracy ${Math.round(model.testMetrics.unusualBleedingBalancedAccuracy * 100)}%`
)
