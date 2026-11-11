import { createContext } from "react";

/**
 * The answers to mark as not yet answered: filled in by the step after the reader presses Next
 * with questions left, empty otherwise. Keyed by GuidedDraft field name.
 */
export const MissingFields = createContext<ReadonlySet<string>>(new Set());
