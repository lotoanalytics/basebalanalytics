/**
 * Reloads the page when the visitor returns to this tab after it has
 * been hidden (switched away, minimised, backgrounded on mobile) for
 * IDLE_LIMIT_MS or longer.
 *
 * - A tab that stays visible is never reloaded.
 * - A hidden tab is never reloaded in the background; the reload
 *   happens on return, so throttled background timers do not matter.
 */
(function () {
    var IDLE_LIMIT_MS = 60 * 1000;
    var hiddenAt = null;

    document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'hidden') {
            hiddenAt = Date.now();
            return;
        }

        // Tab is visible again.
        if (hiddenAt !== null && (Date.now() - hiddenAt) >= IDLE_LIMIT_MS) {
            window.location.reload();
            return;
        }

        hiddenAt = null;
    });
})();
