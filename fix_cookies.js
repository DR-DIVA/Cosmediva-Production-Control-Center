const fs = require('fs');

// Patch client.ts
const clientFile = 'c:/Users/hp/Dropbox/AI AGENT/Antigravity/Update PD Daily Status/cosmediva-os/src/utils/supabase/client.ts';
let clientContent = fs.readFileSync(clientFile, 'utf8');
clientContent = clientContent.replace(
  'process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!',
  `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        secure: false,
        sameSite: 'lax',
      }
    }`
);
fs.writeFileSync(clientFile, clientContent);

// Patch middleware.ts
const middlewareFile = 'c:/Users/hp/Dropbox/AI AGENT/Antigravity/Update PD Daily Status/cosmediva-os/src/middleware.ts';
let middlewareContent = fs.readFileSync(middlewareFile, 'utf8');
middlewareContent = middlewareContent.replace(
  'cookiesToSet.forEach(({ name, value, options }) =>',
  `cookiesToSet.forEach(({ name, value, options }) => {
            options.secure = false;
            options.sameSite = 'lax';
            request.cookies.set(name, value)
          })
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) => {
            options.secure = false;
            options.sameSite = 'lax';`
).replace(
  'request.cookies.set(name, value))',
  ''
).replace(
  'supabaseResponse.cookies.set(name, value, options)',
  'supabaseResponse.cookies.set(name, value, options)\n          }'
);
fs.writeFileSync(middlewareFile, middlewareContent);
console.log('Fixed Secure cookies');
