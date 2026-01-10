/**
 * ML Module
 * Provides model versioning, A/B testing, and training data management
 */

// Correction tracking for training data collection
export {
  recordFieldCorrection,
  recordBatchCorrections,
  getCorrectionStats,
  getUnusedCorrections,
  markCorrectionsUsed,
  getDocumentCorrections,
  type FieldCorrection,
  type CorrectionType,
  type CorrectionResult,
  type CorrectionStats,
} from "./correction-service";

// Model versioning and rollback
export {
  registerModelVersion,
  getModelVersions,
  getActiveModelVersion,
  activateModelVersion,
  deactivateModelVersion,
  rollbackToVersion,
  updateModelMetrics,
  getModelVersionString,
  type ModelType,
  type ModelProvider,
  type ModelVersion,
  type ModelVersionInput,
} from "./model-versioning";

// A/B testing framework
export {
  createExperiment,
  startExperiment,
  pauseExperiment,
  completeExperiment,
  cancelExperiment,
  getExperiments,
  getRunningExperiment,
  selectModelForDocument,
  recordExperimentResult,
  recordExperimentCorrection,
  getExperimentResults,
  type Experiment,
  type ExperimentInput,
  type ExperimentStatus,
  type ExperimentResult,
  type SuccessMetric,
} from "./experiment-service";

// Training data export
export {
  createTrainingBatch,
  exportTrainingData,
  getTrainingBatch,
  updateTrainingBatchStatus,
  getRecentTrainingBatches,
  type TrainingExample,
  type TrainingBatch,
  type TrainingDataExport,
} from "./training-export";
