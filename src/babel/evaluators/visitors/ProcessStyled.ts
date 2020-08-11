/**
 * This visitor replaces styled components with metadata about them.
 * CallExpression should be used to match styled components.
 * Works out of the box for styled that wraps other component,
 * styled.tagName are transformed to call expressions using @babel/plugin-transform-template-literals
 * @babel/plugin-transform-template-literals is loaded as a prest, to force proper ordering. It has to run just after linaria.
 * It is used explicitly in extractor, and loaded as a part of `prest-env` in shaker
 */

import { NodePath } from '@babel/traverse';
import { types } from '@babel/core';
import { expression } from '@babel/template';
import getLinariaComment from '../../utils/getLinariaComment';

const linariaComponentTpl = expression(
  `{
    displayName: %%displayName%%,
    __linaria: {
      className: %%className%%,
      extends: %%extends%%
    }
  }`
);

export default function ProcessStyled(path: NodePath<types.CallExpression>) {
  const [, displayName, className] = getLinariaComment(path);
  if (!className) {
    return;
  }

  path.replaceWith(
    linariaComponentTpl({
      className: types.stringLiteral(className),
      displayName: displayName ? types.stringLiteral(displayName) : null,
      extends: types.isCallExpression(path.node.callee)
        ? path.node.callee.arguments[0]
        : types.nullLiteral(),
    })
  );
}
