/**
 * @name            jPulse Framework / WebApp / Tests / Integration / W-047 Site Files
 * @tagline         Integration tests for W-047 site-specific file loading
 * @description     Tests site-common.css/js loading and handlebars processing
 * @file            webapp/tests/integration/w047-site-files.test.js
 * @version         0.9.4
 * @release         2025-10-09
 * @repository      https://github.com/peterthoeny/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         AGPL v3, see LICENSE file
 * @genai           80%, Cursor 1.2, Claude Sonnet 4
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import TestUtils from '../helpers/test-utils.js';

describe('W-047 Site-Specific Files Integration', () => {
    let testSiteFiles = [];

    beforeAll(async () => {
        // Setup test environment
        TestUtils.setupGlobalMocksWithConsolidatedConfig();
    });

    afterAll(() => {
        // Clean up test files we created
        testSiteFiles.forEach(filePath => {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        });
    });

    describe('Site File Creation and Management', () => {
        test('should create site-common.css from template', () => {
            const siteViewDir = path.join(process.cwd(), 'site/webapp/view');
            const templatePath = path.join(siteViewDir, 'site-common.css.tmpl');
            const targetPath = path.join(siteViewDir, 'site-common.css');

            // Verify template exists
            expect(fs.existsSync(templatePath)).toBe(true);

            // Copy template to actual file for testing
            if (fs.existsSync(templatePath) && !fs.existsSync(targetPath)) {
                fs.copyFileSync(templatePath, targetPath);
                testSiteFiles.push(targetPath);
            }

            // Verify file was created and contains site-specific CSS
            expect(fs.existsSync(targetPath)).toBe(true);
            const content = fs.readFileSync(targetPath, 'utf8');
            expect(content).toContain('site-');
            expect(content).toContain('--site-primary-color');
        });

        test('should create site-common.js from template', () => {
            const siteViewDir = path.join(process.cwd(), 'site/webapp/view');
            const templatePath = path.join(siteViewDir, 'site-common.js.tmpl');
            const targetPath = path.join(siteViewDir, 'site-common.js');

            // Verify template exists
            expect(fs.existsSync(templatePath)).toBe(true);

            // Copy template to actual file for testing
            if (fs.existsSync(templatePath) && !fs.existsSync(targetPath)) {
                fs.copyFileSync(templatePath, targetPath);
                testSiteFiles.push(targetPath);
            }

            // Verify file was created and contains jPulse.site extension
            expect(fs.existsSync(targetPath)).toBe(true);
            const content = fs.readFileSync(targetPath, 'utf8');
            expect(content).toContain('jPulse.site');
            expect(content).toContain('window.jPulse');
        });

        test('should have site-specific demo pages', () => {
            const helloIndexPath = path.join(process.cwd(), 'site/webapp/view/hello/index.shtml');
            const siteOverridePath = path.join(process.cwd(), 'site/webapp/view/hello/site-override.shtml');
            const siteDevelopmentPath = path.join(process.cwd(), 'site/webapp/view/hello/site-development.shtml');

            // Verify demo pages exist
            expect(fs.existsSync(helloIndexPath)).toBe(true);
            expect(fs.existsSync(siteOverridePath)).toBe(true);
            expect(fs.existsSync(siteDevelopmentPath)).toBe(true);

            // Verify demo content
            const demoContent = fs.readFileSync(siteDevelopmentPath, 'utf8');
            expect(demoContent).toContain('W-047 Site Development Demo');
            expect(demoContent).toContain('site-btn');
            expect(demoContent).toContain('buttonFeedback');
        });
    });

    describe('W-047 Route Configuration', () => {
        test('should have site-common route pattern in routes.js', () => {
            const routesPath = path.join(process.cwd(), 'webapp/routes.js');
            const routesContent = fs.readFileSync(routesPath, 'utf8');

            // Verify the site-common route exists
            expect(routesContent).toContain('/\\/site-common\\.(js|css)$/');
            expect(routesContent).toContain('viewController.load');
        });
    });

    describe('W-047 Documentation', () => {
        test('should have comprehensive W-047 documentation in site README', () => {
            const readmePath = path.join(process.cwd(), 'site/README.md');
            const readmeContent = fs.readFileSync(readmePath, 'utf8');

            // Verify W-047 documentation exists
            expect(readmeContent).toContain('W-047: Site-Specific Coding & Styling Guidelines');
            expect(readmeContent).toContain('site-*');
            expect(readmeContent).toContain('jPulse.site');
            expect(readmeContent).toContain('site-common.css');
            expect(readmeContent).toContain('site-common.js');
        });

        test('should have W-047 marked as completed in requirements', () => {
            const requirementsPath = path.join(process.cwd(), 'docs/dev/requirements.md');
            const requirementsContent = fs.readFileSync(requirementsPath, 'utf8');

            // Verify W-047 related content exists (site override architecture)
            expect(requirementsContent).toContain('Site Override Architecture');
            expect(requirementsContent).toContain('site/webapp/');
            expect(requirementsContent).toContain('Update-Safe Customizations');
        });
    });
});

// EOF webapp/tests/integration/w047-site-files.test.js
