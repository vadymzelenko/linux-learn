import { contentStats, lintContent } from '../src/lint';

const strict = process.argv.includes('--strict');
const issues = lintContent();
const errors = issues.filter((i) => i.level === 'error' || (strict && i.level === 'warning'));
for (const i of issues) {
  const tag = i.level === 'error' ? '\x1b[31merror\x1b[0m' : '\x1b[33mwarn \x1b[0m';
  console.log(`${tag} ${i.where}: ${i.message}`);
}
const s = contentStats();
console.log(
  `\n${s.modules} modules, ${s.lessons} lessons, ${s.steps} steps (${s.tasks} terminal tasks), ${s.missions} missions, ${s.challenges} daily challenges, ${s.achievements} achievements`,
);
if (errors.length) {
  console.log(`\x1b[31m✗ ${errors.length} problem(s)\x1b[0m`);
  process.exit(1);
}
console.log('\x1b[32m✓ every task is solvable by its reference solution\x1b[0m');
