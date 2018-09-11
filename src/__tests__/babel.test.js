/* @flow */

const babel = require('@babel/core');
const dedent = require('dedent');

it('should extract CSS to a comment', async () => {
  const { code } = await babel.transformAsync(
    dedent`
    const background = 'yellow';

    const Title = styled('h1')\`
      font-family: ${'${serif}'};
    \`;

    const Container = styled('div')\`
      font-family: ${'${regular}'};
      background-color: ${'${background}'};
      color: ${'${props => props.color}'};
      width: ${'${100 / 3}'}%;
      border: 1px solid red;

      &:hover {
        border-color: blue;
      }
    \`;
    `,
    {
      presets: [require.resolve('../babel')],
      filename: '/app/index.js',
    }
  );

  expect(code).toMatchSnapshot();
});
