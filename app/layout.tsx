import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'Prompt Translator CODIGO BASE 64',
  description: 'Traductor y convertidor de Texto a Base64 y Base64 a Texto de alto rendimiento para textos grandes, sin dependencias de streaming ni límites de tokens.',
  openGraph: {
    title: 'Prompt Translator CODIGO BASE 64',
    description: 'Traductor y convertidor de Texto a Base64 y Base64 a Texto de alto rendimiento para textos grandes, sin dependencias de streaming ni límites de tokens.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Prompt Translator CODIGO BASE 64',
    description: 'Traductor y convertidor de Texto a Base64 y Base64 a Texto de alto rendimiento para textos grandes, sin dependencias de streaming ni límites de tokens.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <script
          key="fetch-patch-script"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // 1. Intercept and suppress uncaught getter-only fetch errors
                if (typeof window !== 'undefined') {
                  window.addEventListener('error', function(e) {
                    if (e && e.message && e.message.indexOf('fetch of #<Window> which has only a getter') !== -1) {
                      e.preventDefault();
                      if (e.stopImmediatePropagation) e.stopImmediatePropagation();
                      return true;
                    }
                  }, true);
                }

                // 2. Proactively define setter for fetch/Headers/Request/Response if environment defined them with getter-only
                try {
                  var targets = [];
                  if (typeof window !== 'undefined') targets.push(window);
                  if (typeof Window !== 'undefined' && Window.prototype) targets.push(Window.prototype);
                  if (typeof globalThis !== 'undefined' && targets.indexOf(globalThis) === -1) targets.push(globalThis);
                  if (typeof self !== 'undefined' && targets.indexOf(self) === -1) targets.push(self);

                  var apis = ['fetch', 'Headers', 'Request', 'Response'];

                  apis.forEach(function(prop) {
                    targets.forEach(function(target) {
                      try {
                        var desc = Object.getOwnPropertyDescriptor(target, prop);
                        if (desc && desc.get && !desc.set) {
                          var origGet = desc.get;
                          var customVal = undefined;
                          Object.defineProperty(target, prop, {
                            get: function() {
                              return customVal !== undefined ? customVal : (origGet ? origGet.call(this) : undefined);
                            },
                            set: function(val) {
                              customVal = val;
                            },
                            configurable: true,
                            enumerable: true
                          });
                        }
                      } catch (err) {}
                    });
                  });
                } catch (e) {}
              })();
            `,
          }}
        />
        {children}
      </body>
    </html>
  );
}
