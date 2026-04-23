/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Controller / jpCombo Widget
 * @tagline         Unit tests for W-187: jPulse.UI.input.jpCombo combo-box widget
 * @description     Source-code structural tests verifying jpCombo widget implementation in jpulse-common.js
 * @file            webapp/tests/unit/controller/jpcombo.test.js
 * @version         1.6.44
 * @release         2026-04-23
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.1, Claude Sonnet 4.6
 */

const fs = require('fs');
const path = require('path');

const jpulseCommonPath = path.resolve(__dirname, '../../../view/jpulse-common.js');
const content = fs.readFileSync(jpulseCommonPath, 'utf-8');

describe('W-187: jpCombo widget (jpulse-common.js)', () => {

    describe('Widget definition', () => {
        test('jpCombo object is defined in jPulse.UI.input', () => {
            expect(content).toContain('jpCombo: {');
        });

        test('jpCombo.init method is defined', () => {
            expect(content).toContain('jpCombo: {');
            // init is inside jpCombo block
            const jpComboBlock = content.slice(content.indexOf('jpCombo: {'));
            expect(jpComboBlock).toContain('init: (selectorOrElement, options = {}) =>');
        });

        test('jpCombo is placed after jpSelect in the source', () => {
            const jpSelectPos = content.indexOf('jpSelect: {');
            const jpComboPos = content.indexOf('jpCombo: {');
            expect(jpSelectPos).toBeGreaterThan(-1);
            expect(jpComboPos).toBeGreaterThan(jpSelectPos);
        });
    });

    describe('Guard conditions', () => {
        test('guards against non-SELECT elements', () => {
            expect(content).toContain("if (!sel || sel.tagName !== 'SELECT') return;");
        });

        test('guards against double-init via jpcomboInited dataset flag', () => {
            expect(content).toContain('sel.dataset.jpcomboInited');
        });
    });

    describe('DOM structure', () => {
        test('creates jp-jpcombo-wrap wrapper div', () => {
            expect(content).toContain("wrap.className = 'jp-jpcombo-wrap'");
        });

        test('hides native select using jp-jpselect-native class', () => {
            expect(content).toContain("sel.classList.add('jp-jpselect-native')");
        });

        test('creates jp-jpcombo-input text input', () => {
            expect(content).toContain("textInput.className = 'jp-jpcombo-input jp-form-input jp-edit-field'");
        });

        test('creates jp-jpcombo-arrow button', () => {
            expect(content).toContain("arrowBtn.className = 'jp-jpcombo-arrow'");
        });

        test('portals dropdown to document.body reusing jp-jpselect-dropdown CSS', () => {
            expect(content).toContain("dropdown.className = 'jp-jpselect-dropdown jp-jpselect-dropdown-portal'");
            expect(content).toContain("document.body.appendChild(dropdown)");
        });

        test('sets role=combobox and aria-haspopup on text input', () => {
            expect(content).toContain("textInput.setAttribute('role', 'combobox')");
            expect(content).toContain("textInput.setAttribute('aria-haspopup', 'listbox')");
        });

        test('reads placeholder from native select placeholder attribute', () => {
            expect(content).toContain("sel.getAttribute('placeholder')");
        });
    });

    describe('Extra-option state machine', () => {
        test('getOriginalOptions filters out data-jpcombo-extra options', () => {
            expect(content).toContain("!o.hasAttribute('data-jpcombo-extra')");
        });

        test('isInOriginalList checks against original (non-extra) options', () => {
            expect(content).toContain('isInOriginalList');
            expect(content).toContain("getOriginalOptions().some((o) => o.value === value)");
        });

        test('removeExtraOption removes the extra option from the select', () => {
            expect(content).toContain('removeExtraOption');
            expect(content).toContain("sel.querySelector('[data-jpcombo-extra]')");
            expect(content).toContain('sel.removeChild(extra)');
        });

        test('setExtraOption adds or updates data-jpcombo-extra option and selects it', () => {
            expect(content).toContain('setExtraOption');
            expect(content).toContain("extra.setAttribute('data-jpcombo-extra', '1')");
            expect(content).toContain('sel.appendChild(extra)');
        });

        test('setComboValue removes extra option when value is in original list', () => {
            expect(content).toContain('setComboValue');
            expect(content).toContain('removeExtraOption()');
        });

        test('setComboValue adds extra option when value is not in original list', () => {
            expect(content).toContain('setExtraOption(value)');
        });

        test('setComboValue updates textInput to reflect the value', () => {
            expect(content).toContain('if (textInput) textInput.value = value;');
        });
    });

    describe('setAllValues hook', () => {
        test('_jpComboSetValue hook is assigned on the native select element', () => {
            expect(content).toContain('sel._jpComboSetValue = setComboValue');
        });

        test('setAllValues checks for _jpComboSetValue before plain el.value assignment', () => {
            expect(content).toContain("typeof el._jpComboSetValue === 'function'");
            expect(content).toContain('el._jpComboSetValue(');
        });

        test('_jpComboSetValue is called before plain el.value in setAllValues', () => {
            const setAllValuesBlock = content.slice(content.indexOf('setAllValues: (form, data)'));
            const comboHookPos = setAllValuesBlock.indexOf('_jpComboSetValue');
            const plainValuePos = setAllValuesBlock.indexOf("el.value = value !== undefined");
            expect(comboHookPos).toBeLessThan(plainValuePos);
        });
    });

    describe('initAll discovery', () => {
        test('initAll discovers select[data-jpcombo] elements', () => {
            expect(content).toContain("querySelectorAll('select[data-jpcombo]')");
        });

        test('initAll calls jpCombo.init for each discovered element', () => {
            expect(content).toContain('jPulse.UI.input.jpCombo.init(el)');
        });

        test('jpCombo discovery appears after jpSelect discovery in initAll', () => {
            const initAllBlock = content.slice(content.indexOf('initAll: (container = null)'));
            const jpSelectPos = initAllBlock.indexOf("querySelectorAll('select[data-jpselect]')");
            const jpComboPos = initAllBlock.indexOf("querySelectorAll('select[data-jpcombo]')");
            expect(jpSelectPos).toBeGreaterThan(-1);
            expect(jpComboPos).toBeGreaterThan(jpSelectPos);
        });
    });

    describe('Dropdown behavior', () => {
        test('dropdown opens on arrow button click', () => {
            expect(content).toContain('arrowBtn.addEventListener');
            expect(content).toContain('openDropdown()');
        });

        test('dropdown opens on ArrowDown/ArrowUp keydown in text input', () => {
            expect(content).toContain("e.key === 'ArrowDown' || e.key === 'ArrowUp'");
        });

        test('dropdown uses viewport-aware flip (opens up when insufficient space below)', () => {
            expect(content).toContain('spaceBelow < minSpace && spaceAbove > spaceBelow');
            expect(content).toContain('jp-jpselect-dropdown-open-up');
        });

        test('picking a list option calls setComboValue and fires change event', () => {
            expect(content).toContain('setComboValue(item.value)');
            expect(content).toContain("new Event('change', { bubbles: true })");
        });

        test('picking a list option removes extra option (state machine)', () => {
            // setComboValue handles this: if isInOriginalList → removeExtraOption
            expect(content).toContain('isInOriginalList(value)');
            expect(content).toContain('removeExtraOption()');
        });

        test('list reuses jp-jpselect-option CSS classes', () => {
            expect(content).toContain("div.className = 'jp-jpselect-option'");
            expect(content).toContain("jp-jpselect-option-label");
        });
    });

    describe('commitInputValue', () => {
        test('commitInputValue is defined', () => {
            expect(content).toContain('const commitInputValue');
        });

        test('reverts to lastCommittedValue when allowCustom is false and value not in list', () => {
            expect(content).toContain('!opts.allowCustom && !isInOriginalList(value)');
            expect(content).toContain('setComboValue(lastCommittedValue)');
        });

        test('fires onCustomValue callback when custom value is committed', () => {
            expect(content).toContain('wasCustom && typeof opts.onCustomValue');
            expect(content).toContain('opts.onCustomValue(value)');
        });

        test('commit fires change event on native select', () => {
            expect(content).toContain("sel.dispatchEvent(new Event('change', { bubbles: true }))");
        });

        test('blur on text input triggers commitInputValue with delay', () => {
            expect(content).toContain("textInput.addEventListener('blur'");
            expect(content).toContain('commitInputValue()');
            expect(content).toContain('setTimeout(');
        });
    });

    describe('onOptionPreview callback', () => {
        test('mouseover on option fires onOptionPreview with value and label', () => {
            expect(content).toContain('opts.onOptionPreview(value, label)');
        });

        test('mouseover on option fills text input with previewed value', () => {
            expect(content).toContain('textInput.value = value;');
        });

        test('mouseleave fires onOptionPreview(null, null) and reverts text input', () => {
            expect(content).toContain("opts.onOptionPreview(null, null)");
            expect(content).toContain('textInput.value = sel.value;');
        });

        test('closeDropdown fires onOptionPreview(null, null) and restores text input', () => {
            const closeDropdownBlock = content.slice(content.indexOf('const closeDropdown = () => {'));
            expect(closeDropdownBlock).toContain('opts.onOptionPreview(null, null)');
            expect(closeDropdownBlock).toContain('textInput.value = sel.value;');
        });
    });

    describe('search option', () => {
        test('search input is created when search option is true', () => {
            expect(content).toContain('if (opts.search) {');
            expect(content).toContain("searchInput.className = 'jp-jpselect-search'");
        });

        test('search input uses searchPlaceholder option', () => {
            expect(content).toContain('searchInput.placeholder = opts.searchPlaceholder');
        });

        test('search input filters the list on input event', () => {
            expect(content).toContain("searchInput.addEventListener('input'");
            expect(content).toContain('buildList(searchInput.value)');
        });
    });

    describe('allowCustom option', () => {
        test('allowCustom defaults to true', () => {
            expect(content).toContain('allowCustom: true');
        });

        test('allowCustom: false causes revert when value not in original list', () => {
            expect(content).toContain('!opts.allowCustom && !isInOriginalList(value)');
        });
    });

    describe('CSS classes', () => {
        test('jpulse-common.css defines jp-jpcombo-wrap', () => {
            const cssPath = path.resolve(__dirname, '../../../view/jpulse-common.css');
            const css = fs.readFileSync(cssPath, 'utf-8');
            expect(css).toContain('.jp-jpcombo-wrap');
        });

        test('jpulse-common.css defines jp-jpcombo-input', () => {
            const cssPath = path.resolve(__dirname, '../../../view/jpulse-common.css');
            const css = fs.readFileSync(cssPath, 'utf-8');
            expect(css).toContain('.jp-jpcombo-input');
        });

        test('jpulse-common.css defines jp-jpcombo-arrow', () => {
            const cssPath = path.resolve(__dirname, '../../../view/jpulse-common.css');
            const css = fs.readFileSync(cssPath, 'utf-8');
            expect(css).toContain('.jp-jpcombo-arrow');
        });
    });
});

// EOF site/webapp/tests/unit/controller/jpcombo.test.js
