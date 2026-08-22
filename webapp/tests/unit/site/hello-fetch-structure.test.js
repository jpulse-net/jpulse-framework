/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Hello-Fetch Structure
 * @tagline         Structure tests for the UrlFetch demo page
 * @description     Page, admin-only API, dashboard card, and nav entry
 * @file            webapp/tests/unit/site/hello-fetch-structure.test.js
 * @version         1.7.17
 * @release         2026-08-22
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025-2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.15, Grok 4.6
 */

const fs = require('fs');
const path = require('path');

describe('Hello-Fetch structure', () => {
    const viewPath = path.join(process.cwd(), 'site/webapp/view/hello-fetch/index.shtml');
    const controllerPath = path.join(process.cwd(), 'site/webapp/controller/helloFetch.js');
    const navPath = path.join(process.cwd(), 'webapp/view/jpulse-navigation.js');

    test('view and controller exist', () => {
        expect(fs.existsSync(viewPath)).toBe(true);
        expect(fs.existsSync(controllerPath)).toBe(true);
    });

    test('page teaches UrlFetch and is not an open proxy', () => {
        const view = fs.readFileSync(viewPath, 'utf8');
        expect(view).toContain('UrlFetch.fetch');
        expect(view).toContain('helloCards.fetch');
        expect(view).toContain('admin-only');
        expect(view).toContain('user.isAdmin');
        expect(view).toContain('/api/1/helloFetch');
        expect(view).toContain('jPulse.dom.ready');
    });

    test('controller routes are admin-only', () => {
        const controller = fs.readFileSync(controllerPath, 'utf8');
        expect(controller).toContain("auth: 'admin'");
        expect(controller).toContain("path: '/api/1/helloFetch'");
        expect(controller).toContain('rateLimitKey');
        expect(controller).not.toMatch(/auth:\s*'none'/);
    });

    test('navigation registers the demo when the view exists', () => {
        const nav = fs.readFileSync(navPath, 'utf8');
        expect(nav).toContain('hello-fetch/index.shtml');
        expect(nav).toContain("url:        '/hello-fetch/'");
    });
});

// EOF webapp/tests/unit/site/hello-fetch-structure.test.js
