import React from 'react';
import Field from './Field';

/**
 * AuthField – shared auth input (Login / Forgot / Reset / Register).
 * Always uses the Login underline look so every auth screen matches.
 */
export default function AuthField(props) {
  return <Field {...props} variant="underline" />;
}
