/* @flow */

import stylis from 'stylis';

export default function sheet() {
  if (typeof window === 'undefined' || typeof window.document === 'undefined') {
    // noop in non-browser environment
    return { insert: () => {} };
  }

  const style = document.createElement('style');
  style.appendChild(document.createTextNode(''));
  style.setAttribute('type', 'text/css');

  document.head.appendChild(style);

  return {
    insert: (selector, styles) => {
      const rules = stylis({ selector, styles });

      if (style.sheet && style.sheet.insertRule) {
        style.sheet.insertRule(rules, style.sheet.rules.length);
      } else {
        style.appendChild(document.createTextNode(rules));
      }
    },
  };
}
