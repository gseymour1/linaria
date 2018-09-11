/* @flow */

const stylis = require('stylis');
const slugify = require('../slugify');

module.exports = function(babel /*: any */) {
  const { types: t } = babel;

  return {
    visitor: {
      Program: {
        enter(path /*: any */, state /*: any */) {
          // Collect all the style rules from the styles we encounter
          state.rules = {};
          state.index = 0;
        },
        exit(path /*: any */, state /*: any */) {
          if (Object.keys(state.rules).length) {
            const mappings = [];

            let cssText = '';

            Object.keys(state.rules).forEach((className, index) => {
              mappings.push({
                generated: {
                  line: index + 1,
                  column: 0,
                },
                original: state.rules[className].loc,
                name: className,
              });

              // Run each rule through stylis to support nesting
              cssText += `${stylis(
                `.${className}`,
                state.rules[className].cssText
              )}\n`;
            });

            // Add the collected styles as a comment to the end of file
            path.addComment(
              'trailing',
              '\nCSS OUTPUT START\n' +
                cssText +
                '\nCSS OUTPUT END\n' +
                '\nCSS MAPPINGS:' +
                JSON.stringify(mappings) +
                '\n'
            );
          }
        },
      },
      TaggedTemplateExpression(path /*: any */, state /*: any */) {
        const interpolations = {};
        const { quasi, tag } = path.node;

        if (t.isCallExpression(tag) && tag.callee.name === 'styled') {
          // Try to determine a readable class name
          let displayName;

          const parent = path.findParent(
            p => t.isObjectProperty(p) || t.isVariableDeclarator(p)
          );

          if (parent) {
            if (t.isObjectProperty(parent)) {
              displayName = parent.node.key.name || parent.node.key.value;
            } else if (t.isVariableDeclarator(parent)) {
              displayName = parent.node.id.name;
            }
          }

          if (!displayName) {
            throw path.buildCodeFrameError(
              "Couldn't determine a name for the component. Ensure that it's either:\n" +
                '- Assigned to a variable\n' +
                '- Is an object property\n'
            );
          }

          // Custom properties need to start with a letter, so we prefix the slug
          let slug = `${displayName.charAt(0).toLowerCase()}${slugify(
            state.file.opts.filename
          )}`;

          let className = `${displayName}_${slug}`;

          while (className in state.rules) {
            // Append 'x' to prevent collision in case of same variable names
            className += 'x';
            slug += 'x';
          }

          // Serialize the tagged template literal to a string
          let cssText = '';

          const expressions = path.get('quasi').get('expressions');

          quasi.quasis.forEach((el, i) => {
            cssText += el.value.cooked;

            const ex = expressions[i];

            if (ex) {
              const result = ex.evaluate();

              if (result.confident) {
                cssText += result.value;
              } else {
                const id = `${slug}-${state.index}-${i}`;

                interpolations[id] = ex.node;
                cssText += `var(--${id})`;
              }
            }
          });

          const options = [];

          options.push(
            t.objectProperty(t.identifier('name'), t.stringLiteral(displayName))
          );

          options.push(
            t.objectProperty(t.identifier('class'), t.stringLiteral(className))
          );

          // If we found any interpolations, also pass them so they can be applied
          if (Object.keys(interpolations).length) {
            options.push(
              t.objectProperty(
                t.identifier('vars'),
                t.objectExpression(
                  Object.keys(interpolations).map(p =>
                    t.objectProperty(t.stringLiteral(p), interpolations[p])
                  )
                )
              )
            );
          }

          path.replaceWith(
            t.callExpression(
              t.memberExpression(
                t.identifier('styled'),
                t.identifier('component')
              ),
              [tag.arguments[0], t.objectExpression(options)]
            )
          );

          state.rules[className] = { cssText, loc: path.parent.loc.start };
          state.index++;
        }
      },
    },
  };
};
