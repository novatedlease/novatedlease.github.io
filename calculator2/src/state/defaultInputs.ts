import type { Inputs } from "@engine/types";
import { defaultSimpleModeAnswers, deriveInputsFromSimpleAnswers } from "../assumptions";

/**
 * Advanced-mode default inputs — derived from Simple mode's default answers
 * and its associated assumptions, so an untouched/reset Advanced-mode form
 * shows the same starting point a Simple-mode user with default answers would see.
 */
export const advancedDefaultInputs: Inputs = deriveInputsFromSimpleAnswers(defaultSimpleModeAnswers()).inputs;
