/**
 * bfields — the package entry (`@bplugins/bfields`, package.json `main`).
 *
 * Types only. A host that writes its own field component types it against
 * these, and reaches the runtime through `window.bfields` (the one copy
 * arbitration loaded). Importing the runtime from here would bundle a second
 * copy of it into the host's script.
 */

export { SCHEMA_VERSION } from './types';
export type * from './types';
export type { FieldComponent, FieldComponentProps, AdornmentComponent } from './registry';
export type { BFieldsRuntime } from './runtime';
export type { SaveAction, SaveResult } from './api';
