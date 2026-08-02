/**
 * @name            jPulse Framework / WebApp / Tests / Unit / View / Plugin Config
 * @tagline         Structural tests for plugin-config save validation
 * @description     Verifies the plugin-config view validates the form before serializing schema data.
 * @file            webapp/tests/unit/view/plugin-config-view.test.js
 * @version         1.7.8
 * @release         2026-08-02
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025-2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.2, GPT-5.4
 */

const fs = require('fs');
const path = require('path');

const viewPath = path.resolve(__dirname, '../../../view/admin/plugin-config.shtml');
const content = fs.readFileSync(viewPath, 'utf-8');

describe('plugin-config.shtml save validation', () => {
    test('saveConfiguration calls reportValidity before getFormData', () => {
        const saveBlock = content.slice(content.indexOf('async function saveConfiguration() {'));
        const reportValidityPos = saveBlock.indexOf('form.reportValidity()');
        const getFormDataPos = saveBlock.indexOf('jPulse.UI.input.getFormData(form, activeBlockSchema)');

        expect(reportValidityPos).toBeGreaterThan(-1);
        expect(getFormDataPos).toBeGreaterThan(-1);
        expect(reportValidityPos).toBeLessThan(getFormDataPos);
    });

    test('saveConfiguration returns early when reportValidity fails', () => {
        const saveBlock = content.slice(content.indexOf('async function saveConfiguration() {'));
        expect(saveBlock).toContain("typeof form.reportValidity === 'function' && !form.reportValidity()");
        expect(saveBlock).toContain('return;');
    });
});

// EOF webapp/tests/unit/view/plugin-config-view.test.js
