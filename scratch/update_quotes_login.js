const fs = require('fs');
const file = 'c:/Users/ajay anthwal/Desktop/car_blink/app/(marketing)/quotes/page.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'const { user, isAuthenticated } = useAuth();',
  'const { user, isAuthenticated, login: authLogin } = useAuth();'
);

content = content.replace(
  "document.cookie = `user_role=CUSTOMER; path=/${domain}; max-age=31536000`;\n                        } catch (e) {",
  `document.cookie = \`user_role=CUSTOMER; path=/\${domain}; max-age=31536000\`;
                          if (user && typeof authLogin === 'function') {
                            authLogin(tokens.accessToken, user);
                          }
                        } catch (e) {`
);

fs.writeFileSync(file, content, 'utf8');
console.log('Successfully updated authLogin in quotes/page.tsx');
