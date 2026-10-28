import React, { createContext, useContext } from 'react';

/** Lets focused fields ask the parent Screen ScrollView to scroll them into view. */
export const KeyboardScrollContext = createContext(null);

export function useKeyboardScroll() {
  return useContext(KeyboardScrollContext);
}
