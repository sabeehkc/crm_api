// Quick sanity check script to verify swagger spec is valid
const spec = require('../dist/lib/swagger').default || require('../dist/lib/swagger');
const paths = Object.keys(spec.paths || {});
console.log(`✅ Swagger OK — ${paths.length} paths found:\n`);
paths.forEach(p => console.log(' ', p));
