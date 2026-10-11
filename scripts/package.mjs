import { mkdir, cp, rm } from 'node:fs/promises';
await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
for (const name of ['Backend', 'MakePayPayment', 'README.md', 'LICENSE', 'docs']) await cp(name, `dist/${name}`, { recursive: true });
console.log('Wix Velo distribution prepared in dist/');
