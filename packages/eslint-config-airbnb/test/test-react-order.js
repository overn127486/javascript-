import test from 'tape';
import eslintrc from '../';
import { makeLint } from './helpers';

const lint = makeLint();

function wrapComponent(body) {
  return `
import React from 'react';
export default class MyComponent extends React.Component {
${body}
}
`;
}

test('validate react prop order', t => {
  t.test('make sure our eslintrc has React linting dependencies', t => {
    t.plan(2);
    t.equal(eslintrc.parser, 'babel-eslint', 'uses babel-eslint');
    t.equal(eslintrc.plugins[0], 'react', 'uses eslint-plugin-react');
  });

  t.test('passes a good component', t => {
    t.plan(3);
    const result = lint(wrapComponent(`
  componentWillMount() {  }
  componentDidMount() {  }
  setFoo() {  }
  getFoo() {  }
  setBar() {  }
  someMethod() {  }
  renderDogs() {  }
  render() { return <div />; }
`));

    t.notOk(result.warningCount, 'no warnings');
    t.notOk(result.errorCount, 'no errors');
    t.deepEquals(result.messages, [], 'no messages in results');
  });

  t.test('order: when random method is first', t => {
    t.plan(2);
    const result = lint(wrapComponent(`
  someMethod() {  }
  componentWillMount() {  }
  componentDidMount() {  }
  setFoo() {  }
  getFoo() {  }
  setBar() {  }
  renderDogs() {  }
  render() { return <div />; }
`));

    t.ok(result.errorCount, 'fails');
    t.equal(result.messages[0].ruleId, 'react/sort-comp', 'fails due to sort');
  });

  t.test('order: when random method after lifecycle methods', t => {
    t.plan(2);
    const result = lint(wrapComponent(`
  componentWillMount() {  }
  componentDidMount() {  }
  someMethod() {  }
  setFoo() {  }
  getFoo() {  }
  setBar() {  }
  renderDogs() {  }
  render() { return <div />; }
`));

    t.ok(result.errorCount, 'fails');
    t.equal(result.messages[0].ruleId, 'react/sort-comp', 'fails due to sort');
  });
});
