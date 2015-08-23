import fs from 'fs';
import mdast from 'mdast';
import path from 'path';
import inspect from 'unist-util-inspect';
import { Section, Rule, OutlineSection, toMarkdownAST } from './styleguide';
import headingRange from 'mdast-util-heading-range';
import visit from 'unist-util-visit';

/**
 * this script does the following:
 * 1. read all markdown files in ../sections
 * 2. strip generateTestCases information and metadata
 * 3. re-format the markdown into the style used in the README
 *  - #  --> section title with backlink
 *  - ## --> list item with nice numbered link
 *  - ```javascript-no-test -> ```javascript
 *  - end-of-section: insert a link to the table of contents
 * 4. generate a new README.md from the ast using toMarkdown
 *
 * this script is synchronous for now.
 */

/**
 * strip out metadata comments or testcase-only text from the contents of a
 * javascript code block. For instance, we have special code blocks like this
 * that contain setup code needed in lint-testing but not desired for
 * pedagogical reasons.
 *
 * ```javascript
 * // test-only
 * import foo from 'bar';
 * const a = 1;
 * const b = 2;
 * // end-test-only
 *
 * // (rest of code example continues as normal)
 * ```
 * 
 * TODO reimplement with generateTestCases code for real
 *
 * @param {String} javascript
 * @return {String} javascript without metadata
 */
function stripTestCases(javascript) {
  return javascript;
}

function toJSON(obj) {
  return String(JSON.stringify(obj, null, '  '));
}

// return an array of { heading :: Heading, children :: Array<Node> }/
// of all headings of a given depth in the tree
function headingAndChildren(tree, depth, mutate = false) {
  let section = null;

  function test(asText, node) { 
    return node.depth === depth;
  }

  // we should be using arg #2 here, but the library is broken until my PR is merged here:
  // https://github.com/wooorm/mdast-util-heading-range/pull/1
  // fortunatley there's a workaround ;)
  function visitor(heading, brokenLibraryChildrenDoNotUse, nextHeading, extra) {
    const childrenStart = extra.start + 1;
    const childrenEnd = extra.end === null ? extra.parent.children.length + 1 : extra.end;
    const children = extra.parent.children.slice(childrenStart, childrenEnd);
    const group = new OutlineSection(heading, children);
    section = group;

    if (mutate) {
      return [group, nextHeading];
    } else {
      return null;
    }
  }

  const search = headingRange(test, visitor)();
  search(tree);
  return section;
}

function nodeExists(tree, predicate) {
  let exists = false;
  visit(tree, function(node, index, parent) {
    if (predicate(node, index, parent)) {
      exists = true;
      return false;
    }
  });

  return exists;
}

/**
 * transform a markdown document into outline format with subheadings and text
 * the explicit children of parent headings.
 * @param {Node} original - the tree to transform
 * @param {Boolean?} mutate - default true. modify in place, or construct a new tree?
 */
function groupHeadings(original, mutate = true) {
  const tree = mutate ? original : JSON.parse(toJSON(original));
  const groupsByDepth = {};
  for (let depth=6; depth>=1; depth--) {
    const groups = [];
    let run = 0;
    while(nodeExists(tree, node => node.type === 'heading' && node.depth === depth)) {
      groups.push(headingAndChildren(tree, depth, true));
      run++;
    }
    groupsByDepth[depth] = groups;
  }

  return groupsByDepth;
}

function main() {
  // const filename = path.join(__dirname, '../sections/06_Strings.md');
  const filename = path.join(__dirname, '../sections/05_Destructuring.md');
  const input = fs.readFileSync(filename, 'utf-8');
  const tree = mdast.parse(input);
  visit(tree, 'code', code => code.value = '(elided)');

  console.error('\n\n\nORIGINAL:');
  console.error(inspect(tree));

  //const h1s = headingAndChildren(tree, 1);
  const wat = groupHeadings(tree);
  //console.error(toJSON(tree));
  console.error('\n\n\nGROUPED:');
  console.error(inspect(tree));
  const topLevel = tree.children[0]
  //console.error(toJSON(topLevel.toAST()))
  console.error('\n\n\nBACK BABY:');
  console.error(inspect(toMarkdownAST(tree)));
}

if (require.main === module) main();
