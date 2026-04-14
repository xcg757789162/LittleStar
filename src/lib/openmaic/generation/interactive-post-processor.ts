/**
 * Interactive HTML Post-Processor
 *
 * Ported from Python's PostProcessor class (learn-your-way/concept_to_html.py:287-385)
 *
 * Handles:
 * - LaTeX delimiter conversion ($$...$$ -> \[...\], $...$ -> \(...\))
 * - KaTeX CSS/JS injection with auto-render and MutationObserver
 * - Script tag protection during LaTeX conversion
 */

/**
 * Main entry point: post-process generated interactive HTML
 * Converts LaTeX delimiters and injects KaTeX rendering resources.
 */
export function postProcessInteractiveHtml(html: string): string {
  // Convert LaTeX delimiters while protecting script tags
  let processed = convertLatexDelimiters(html);

  // Inject KaTeX resources if not already present
  if (!processed.toLowerCase().includes('katex')) {
    processed = injectKatex(processed);
  }

  // Inject overlay auto-dismiss safety net
  processed = injectOverlayAutoDismiss(processed);

  return processed;
}

/**
 * Convert LaTeX delimiters while protecting <script> tags.
 *
 * - Protects script blocks from modification
 * - Converts $$...$$ to \[...\] (display math)
 * - Converts $...$ to \(...\) (inline math)
 * - Restores script blocks after conversion
 */
function convertLatexDelimiters(html: string): string {
  const scriptBlocks: string[] = [];

  // Protect script tags by replacing them with placeholders
  let processed = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, (match) => {
    scriptBlocks.push(match);
    return `__SCRIPT_BLOCK_${scriptBlocks.length - 1}__`;
  });

  // Convert display math: $$...$$ -> \[...\]
  processed = processed.replace(/\$\$([^$]+)\$\$/g, '\\[$1\\]');

  // Convert inline math: $...$ -> \(...\)
  // Use non-greedy match and exclude newlines to avoid false positives
  processed = processed.replace(/\$([^$\n]+?)\$/g, '\\($1\\)');

  // Restore script blocks using indexOf + substring (not .replace())
  // because script content may contain $ characters that .replace()
  // would interpret as special substitution patterns.
  for (let i = 0; i < scriptBlocks.length; i++) {
    const placeholder = `__SCRIPT_BLOCK_${i}__`;
    const idx = processed.indexOf(placeholder);
    if (idx !== -1) {
      processed =
        processed.substring(0, idx) +
        scriptBlocks[i] +
        processed.substring(idx + placeholder.length);
    }
  }

  return processed;
}

/**
 * Inject KaTeX CSS, JS, auto-render, and MutationObserver before </head>.
 * Falls back to appending at end if </head> is not found.
 */
function injectKatex(html: string): string {
  const katexInjection = `
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
<script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"></script>
<script>
document.addEventListener("DOMContentLoaded", function() {
    const katexOptions = {
        delimiters: [
            {left: '\\\\[', right: '\\\\]', display: true},
            {left: '\\\\(', right: '\\\\)', display: false},
            {left: '$$', right: '$$', display: true},
            {left: '$', right: '$', display: false}
        ],
        throwOnError: false,
        strict: false,
        trust: true
    };

    let renderTimeout;
    function safeRender() {
        if (renderTimeout) clearTimeout(renderTimeout);
        renderTimeout = setTimeout(() => {
            renderMathInElement(document.body, katexOptions);
        }, 100);
    }

    renderMathInElement(document.body, katexOptions);

    const observer = new MutationObserver((mutations) => {
        let shouldRender = false;
        mutations.forEach((mutation) => {
            if (mutation.target &&
                mutation.target.className &&
                typeof mutation.target.className === 'string' &&
                mutation.target.className.includes('katex')) {
                return;
            }
            shouldRender = true;
        });

        if (shouldRender) {
            safeRender();
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
    });

    setInterval(() => {
        const text = document.body.innerText;
        if (text.includes('\\\\(') || text.includes('$$')) {
            safeRender();
        }
    }, 2000);
});
</script>`;

  // Use indexOf + substring instead of String.replace() because the
  // katexInjection string contains '$' characters that .replace() would
  // interpret as special substitution patterns ($$ → $, $' → post-match text).
  const headCloseIdx = html.indexOf('</head>');
  if (headCloseIdx !== -1) {
    return (
      html.substring(0, headCloseIdx) +
      katexInjection +
      '\n</head>' +
      html.substring(headCloseIdx + 7)
    );
  }

  // Fallback: inject before </body> if </head> is missing
  const bodyCloseIdx = html.indexOf('</body>');
  if (bodyCloseIdx !== -1) {
    return (
      html.substring(0, bodyCloseIdx) +
      katexInjection +
      '\n</body>' +
      html.substring(bodyCloseIdx + 7)
    );
  }

  // Last resort: append at end
  return html + katexInjection;
}

/**
 * Inject a safety-net script that auto-dismisses blocking overlays/modals.
 *
 * AI-generated games sometimes create success/feedback overlays that never
 * auto-dismiss, permanently blocking the game. This observer detects such
 * overlays and either clicks their "next" button or hides them after a timeout.
 */
function injectOverlayAutoDismiss(html: string): string {
  const script = `
<script data-overlay-safety>
(function() {
  var DISMISS_DELAY = 4000;
  var tracked = new WeakSet();

  function isBlockingOverlay(el) {
    var s = getComputedStyle(el);
    if (s.position !== 'fixed' && s.position !== 'absolute') return false;
    if (parseFloat(s.opacity) < 0.1 || s.display === 'none' || s.visibility === 'hidden') return false;
    var r = el.getBoundingClientRect();
    var vw = window.innerWidth, vh = window.innerHeight;
    return r.width >= vw * 0.5 && r.height >= vh * 0.5;
  }

  function tryDismiss(el) {
    var btns = el.querySelectorAll('button, [role="button"], a');
    for (var i = 0; i < btns.length; i++) {
      var txt = (btns[i].textContent || '').trim();
      if (/下一[关关步题]|next|continue|继续|确[定认]/i.test(txt)) {
        btns[i].click();
        return;
      }
    }
    el.style.transition = 'opacity 0.3s';
    el.style.opacity = '0';
    el.style.pointerEvents = 'none';
    setTimeout(function() {
      el.style.display = 'none';
    }, 350);
  }

  function scan() {
    var all = document.body.querySelectorAll('*');
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (tracked.has(el)) continue;
      if (!isBlockingOverlay(el)) continue;
      tracked.add(el);
      (function(target) {
        setTimeout(function() {
          if (target.offsetParent !== null || getComputedStyle(target).display !== 'none') {
            if (isBlockingOverlay(target)) tryDismiss(target);
          }
        }, DISMISS_DELAY);
      })(el);
    }
  }

  var mo = new MutationObserver(function() { setTimeout(scan, 300); });
  document.addEventListener('DOMContentLoaded', function() {
    mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style','class'] });
    scan();
  });
})();
</script>`;

  const bodyCloseIdx = html.indexOf('</body>');
  if (bodyCloseIdx !== -1) {
    return html.substring(0, bodyCloseIdx) + script + '\n' + html.substring(bodyCloseIdx);
  }
  return html + script;
}
