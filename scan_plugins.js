const fs = require('fs'), path = require('path');
function scan(dir) {
  if (!fs.existsSync(dir)) return;
  for (const it of fs.readdirSync(dir)) {
    const p = path.join(dir, it);
    try {
      const st = fs.statSync(p);
      if (!st.isDirectory()) continue;
      if (it.startsWith('@')) { scan(p); continue; }
      const pj = path.join(p, 'package.json');
      if (fs.existsSync(pj)) {
        try {
          const data = JSON.parse(fs.readFileSync(pj, 'utf8'));
          if (data.expo || data.plugins || data.configPlugins || data['expoPlugin']) {
            console.log(JSON.stringify({ pkg: data.name || it, dir: p, plugins: data.plugins || data.configPlugins || data['expoPlugin'] || null }, null, 2));
          }
        } catch (e) {}
      }
      const nested = path.join(p, 'node_modules');
      if (fs.existsSync(nested)) scan(nested);
    } catch (e) {}
  }
}
scan('node_modules');
