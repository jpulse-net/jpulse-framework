/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Utils / jPulse UI Float Panel
 * @tagline         Unit tests for jPulse.UI.floatPanel
 * @description     Tests for the floating panel widget: persistence, clamp, cascade, drag, resize, stack, mobile, Escape, MPA/SPA contract
 * @file            webapp/tests/unit/utils/jpulse-ui-float-panel.test.js
 * @version         2.0.2
 * @release         2026-09-16
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.20, Grok 4.6
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: 'http://localhost:8080',
    pretendToBeVisual: true,
    resources: 'usable'
});

global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
global.HTMLElement = dom.window.HTMLElement;
global.Event = dom.window.Event;
global.CustomEvent = dom.window.CustomEvent;
global.KeyboardEvent = dom.window.KeyboardEvent;
global.MouseEvent = dom.window.MouseEvent;
global.Node = dom.window.Node;

window.matchMedia = window.matchMedia || ((query) => ({
    matches: false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {}
}));

global.window.i18n = {
    view: {
        ui: {
            floatPanel: {
                close: 'Close',
                resizeHandle: 'Resize %DIR%',
                dragHint: 'Drag to move. Arrow keys nudge the panel.'
            }
        }
    }
};

const jpulseCommonPath = path.join(process.cwd(), 'webapp/view/jpulse-common.js');
let jpulseCommonContent = fs.readFileSync(jpulseCommonPath, 'utf8');

jpulseCommonContent = jpulseCommonContent.replace(/\{\{i18n\.view\.ui\.alertDialog\.title\}\}/g, 'Alert');
jpulseCommonContent = jpulseCommonContent.replace(/\{\{i18n\.view\.ui\.alertDialog\.oKButton\}\}/g, 'OK');
jpulseCommonContent = jpulseCommonContent.replace(/\{\{i18n\.view\.ui\.infoDialog\.title\}\}/g, 'Information');
jpulseCommonContent = jpulseCommonContent.replace(/\{\{i18n\.view\.ui\.infoDialog\.oKButton\}\}/g, 'OK');
jpulseCommonContent = jpulseCommonContent.replace(/\{\{i18n\.view\.ui\.successDialog\.title\}\}/g, 'Success');
jpulseCommonContent = jpulseCommonContent.replace(/\{\{i18n\.view\.ui\.successDialog\.oKButton\}\}/g, 'OK');
jpulseCommonContent = jpulseCommonContent.replace(/\{\{i18n\.view\.ui\.floatPanel\.close\}\}/g, 'Close');
jpulseCommonContent = jpulseCommonContent.replace(/\{\{i18n\.view\.ui\.floatPanel\.resizeHandle\}\}/g, 'Resize %DIR%');
jpulseCommonContent = jpulseCommonContent.replace(/\{\{i18n\.view\.ui\.floatPanel\.dragHint\}\}/g, 'Drag to move. Arrow keys nudge the panel.');
jpulseCommonContent = jpulseCommonContent.replace(/\{\{i18n\.controller\.handlebar\.date\.fromNow\}\}/g, '{}');

const vm = require('vm');
const context = vm.createContext(window);
vm.runInContext(jpulseCommonContent, context);

const engine = () => window.jPulse.UI.floatPanel._engine;

const memStorage = (seed = {}) => {
    const map = { ...seed };
    return {
        getItem: (key) => (Object.prototype.hasOwnProperty.call(map, key) ? map[key] : null),
        setItem: (key, value) => { map[key] = String(value); },
        _map: map
    };
};

const liveIds = [];

const make = (opts = {}) => {
    const id = opts.id || `fp-${liveIds.length + 1}`;
    const handle = window.jPulse.UI.floatPanel.create({
        persistDebounceMs: 0,
        animate: { durationMs: 0 },
        storage: opts.storage || memStorage(),
        ...opts,
        id
    });
    liveIds.push(id);
    return handle;
};

const setViewport = (w, h) => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: w });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: h });
};

const dispatchMove = (x, y) => {
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: x, clientY: y, bubbles: true }));
};

const dispatchUp = () => {
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
};

describe('jPulse.UI.floatPanel', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
        setViewport(1000, 800);
        window.matchMedia = (query) => ({
            matches: false,
            media: query,
            addEventListener() {},
            removeEventListener() {},
            addListener() {},
            removeListener() {}
        });
        jest.clearAllTimers();
    });

    afterEach(() => {
        while (liveIds.length) {
            const id = liveIds.pop();
            const handle = window.jPulse.UI.floatPanel.get(id);
            if (handle) {
                handle.destroy();
            }
        }
        document.body.innerHTML = '';
        document.documentElement.style.removeProperty('--jp-header-height');
    });

    describe('loadState / saveState', () => {
        test('loadState uses defaults when storage is empty, malformed, or throws', () => {
            const defaults = { x: 11, y: 22, w: 300, h: 200, open: true };
            const empty = engine().loadState(memStorage(), 'k', defaults);
            expect(empty.x).toBe(11);
            expect(empty.y).toBe(22);
            expect(empty.w).toBe(300);
            expect(empty.h).toBe(200);
            expect(empty.open).toBe(true);
            expect(empty.fromStorage).toBe(false);

            const malformed = engine().loadState(memStorage({ k: '{not-json' }), 'k', defaults);
            expect(malformed.fromStorage).toBe(false);
            expect(malformed.x).toBe(11);
            expect(malformed.open).toBe(true);

            const throwing = {
                getItem() { throw new Error('blocked'); },
                setItem() { throw new Error('blocked'); }
            };
            const failed = engine().loadState(throwing, 'k', defaults);
            expect(failed.fromStorage).toBe(false);
            expect(failed.w).toBe(300);
        });

        test('saveState round-trips x / y / w / h / open / lastActiveAt', () => {
            const storage = memStorage();
            const ok = engine().saveState(storage, 'panel', {
                x: 40,
                y: 50,
                w: 320,
                h: 220,
                open: true,
                lastActiveAt: 999
            });
            expect(ok).toBe(true);
            const loaded = engine().loadState(storage, 'panel', { w: 1, h: 1, open: false });
            expect(loaded.x).toBe(40);
            expect(loaded.y).toBe(50);
            expect(loaded.w).toBe(320);
            expect(loaded.h).toBe(220);
            expect(loaded.open).toBe(true);
            expect(loaded.lastActiveAt).toBe(999);
            expect(loaded.fromStorage).toBe(true);
        });

        test('legacy openedAt key still reads as lastActiveAt', () => {
            const storage = memStorage({
                legacy: JSON.stringify({
                    x: 10,
                    y: 20,
                    w: 300,
                    h: 200,
                    open: true,
                    openedAt: 12345
                })
            });
            const loaded = engine().loadState(storage, 'legacy', {});
            expect(loaded.lastActiveAt).toBe(12345);
        });
    });

    describe('clamp', () => {
        const opts = { minWidth: 240, minHeight: 160, margin: 8, topOffset: 50 };

        test('honors minWidth / minHeight, margin on all four sides, and topOffset', () => {
            const rect = engine().clamp({ x: -40, y: 0, w: 100, h: 80 }, opts, { w: 1000, h: 800 });
            expect(rect.w).toBe(240);
            expect(rect.h).toBe(160);
            expect(rect.x).toBe(8);
            expect(rect.y).toBe(58);
        });

        test('topOffset from the CSS variable', () => {
            document.documentElement.style.setProperty('--jp-header-height', '70px');
            const rect = engine().clamp(
                { x: 0, y: 0, w: 240, h: 160 },
                { minWidth: 240, minHeight: 160, margin: 8, topOffset: '--jp-header-height' },
                { w: 1000, h: 800 }
            );
            const raw = window.getComputedStyle(document.documentElement).getPropertyValue('--jp-header-height');
            const expectedTop = (Number.parseFloat(raw) || 50) + 8;
            expect(rect.y).toBe(expectedTop);
            expect(rect.y).toBeGreaterThanOrEqual(8);
        });

        test('a null x / y places the panel bottom-right', () => {
            const rect = engine().clamp(
                { x: null, y: null, w: 200, h: 100 },
                { minWidth: 50, minHeight: 50, margin: 8, topOffset: 0 },
                { w: 1000, h: 800 }
            );
            expect(rect.x).toBe(1000 - 8 - 200);
            expect(rect.y).toBe(800 - 8 - 100);
        });

        test('a viewport smaller than the minimum still yields a usable rect', () => {
            const rect = engine().clamp(
                { x: 0, y: 0, w: 400, h: 400 },
                { minWidth: 400, minHeight: 400, margin: 8, topOffset: 50 },
                { w: 200, h: 150 }
            );
            expect(rect.w).toBe(184);
            expect(rect.h).toBe(84);
            expect(rect.w).toBeGreaterThan(0);
            expect(rect.h).toBeGreaterThan(0);
            expect(rect.x).toBe(8);
            expect(rect.y).toBe(58);
        });
    });

    describe('cascade', () => {
        test('offsets only when another panel already occupies the default position', () => {
            const def = { x: 100, y: 100, w: 200, h: 150 };
            const free = engine().cascade({ ...def }, [], { offsetX: -48, offsetY: -48 });
            expect(free.x).toBe(100);
            expect(free.y).toBe(100);

            const shifted = engine().cascade({ ...def }, [def], { offsetX: -48, offsetY: -48 });
            expect(shifted.x).toBe(52);
            expect(shifted.y).toBe(52);

            const first = make({
                id: 'cascade-a',
                cascade: true,
                topOffset: 0,
                defaults: { x: 100, y: 100, w: 200, h: 150, open: true }
            });
            const second = make({
                id: 'cascade-b',
                cascade: true,
                topOffset: 0,
                defaults: { x: 100, y: 100, w: 200, h: 150, open: true }
            });
            expect(first.state.x).toBe(100);
            expect(second.state.x).toBe(52);
            expect(second.state.y).toBe(52);
        });
    });

    describe('drag and resize', () => {
        test('drag moves by pointer delta and re-clamps', () => {
            const handle = make({
                id: 'drag-1',
                defaults: { x: 100, y: 100, w: 300, h: 200, open: true },
                minWidth: 240,
                minHeight: 160,
                margin: 8,
                topOffset: 50
            });
            handle.startDrag({ clientX: 200, clientY: 200, button: 0, target: document.body });
            dispatchMove(230, 215);
            dispatchUp();
            expect(handle.state.x).toBe(130);
            expect(handle.state.y).toBe(115);
        });

        test('dragIgnore suppresses a drag started on a header button', () => {
            const el = document.createElement('div');
            const btn = document.createElement('button');
            btn.setAttribute('data-jp-panel-close', '');
            el.appendChild(btn);
            document.body.appendChild(el);
            const handle = make({
                id: 'drag-ignore',
                el,
                defaults: { x: 100, y: 100, w: 300, h: 200, open: true }
            });
            handle.startDrag({ clientX: 200, clientY: 200, button: 0, target: btn });
            dispatchMove(260, 260);
            dispatchUp();
            expect(handle.state.x).toBe(100);
            expect(handle.state.y).toBe(100);
        });

        test('a non-primary button does not drag', () => {
            const handle = make({
                id: 'drag-right',
                defaults: { x: 100, y: 100, w: 300, h: 200, open: true }
            });
            handle.startDrag({ clientX: 200, clientY: 200, button: 2, target: document.body });
            dispatchMove(260, 260);
            dispatchUp();
            expect(handle.state.x).toBe(100);
            expect(handle.state.y).toBe(100);
        });

        test('mobile suppresses both drag and resize', () => {
            setViewport(500, 800);
            const handle = make({
                id: 'drag-mobile',
                topOffset: 50,
                defaults: { x: 20, y: 80, w: 260, h: 180, open: true },
                mobile: { breakpoint: 768, heightRatio: 0.5, exclusive: false }
            });
            expect(handle.state.mobile).toBe(true);
            const startX = handle.state.x;
            const startW = handle.state.w;
            handle.startDrag({ clientX: 10, clientY: 10, button: 0, target: document.body });
            dispatchMove(80, 80);
            dispatchUp();
            expect(handle.state.x).toBe(startX);
            expect(handle.state.dragging).toBe(false);
            handle.startResize({ clientX: 10, clientY: 10, button: 0 }, 'se');
            dispatchMove(80, 80);
            dispatchUp();
            expect(handle.state.w).toBe(startW);
            expect(handle.state.resizing).toBe(false);
        });

        test('mobile sheet uses a 4px side inset', () => {
            setViewport(500, 800);
            const handle = make({
                id: 'mobile-inset',
                topOffset: 50,
                defaults: { x: 20, y: 80, w: 260, h: 180, open: true },
                mobile: { breakpoint: 768, heightRatio: 0.5, exclusive: false }
            });
            const rect = handle.getRect();
            expect(rect.x).toBe(4);
            expect(rect.w).toBe(492);
        });

        test('mobileSheetRect adds safe-area to the 4px inset and measures height in the safe viewport', () => {
            const sheet = engine().mobileSheetRect(
                { w: 390, h: 844 },
                0.55,
                { top: 47, right: 16, bottom: 34, left: 16 }
            );
            const safeH = 844 - 47 - 34;
            expect(sheet.h).toBe(Math.round(safeH * 0.55));
            expect(sheet.x).toBe(20);
            expect(sheet.w).toBe(390 - 16 - 16 - 8);
            expect(sheet.y).toBe(844 - 34 - sheet.h);
            expect(sheet.y - 47).toBe(safeH - sheet.h);
        });

        test('mobile sheet getRect honors env(safe-area-inset-*) from the probe', () => {
            setViewport(500, 800);
            const orig = window.getComputedStyle.bind(window);
            window.getComputedStyle = (el) => {
                if (el && el.getAttribute && el.getAttribute('data-jp-safe-area-probe') !== null) {
                    return {
                        paddingTop: '47px',
                        paddingRight: '0px',
                        paddingBottom: '34px',
                        paddingLeft: '0px'
                    };
                }
                return orig(el);
            };
            try {
                const handle = make({
                    id: 'mobile-safe-area',
                    topOffset: 50,
                    defaults: { x: 20, y: 80, w: 260, h: 180, open: true },
                    mobile: { breakpoint: 768, heightRatio: 0.5, exclusive: false }
                });
                const rect = handle.getRect();
                const safeH = 800 - 47 - 34;
                expect(rect.h).toBe(Math.round(safeH * 0.5));
                expect(rect.x).toBe(4);
                expect(rect.w).toBe(492);
                expect(rect.y).toBe(800 - 34 - rect.h);
            } finally {
                window.getComputedStyle = orig;
            }
        });

        test('resize in all eight directions; nw / n / w move the origin and stop at the minimum', () => {
            const start = { x: 200, y: 200, w: 300, h: 220, open: true };
            const handle = make({
                id: 'resize-8',
                defaults: start,
                minWidth: 240,
                minHeight: 160,
                margin: 8,
                topOffset: 50
            });

            const apply = (dir, toX, toY) => {
                handle.setRect({ x: 200, y: 200, w: 300, h: 220 });
                handle.startResize({ clientX: 200, clientY: 200, button: 0 }, dir);
                dispatchMove(toX, toY);
                dispatchUp();
                return { x: handle.state.x, y: handle.state.y, w: handle.state.w, h: handle.state.h };
            };

            expect(apply('e', 220, 200).w).toBe(320);
            expect(apply('s', 200, 230).h).toBe(250);
            expect(apply('se', 220, 230)).toEqual({ x: 200, y: 200, w: 320, h: 250 });

            const west = apply('w', 220, 200);
            expect(west.w).toBe(280);
            expect(west.x).toBe(220);

            const north = apply('n', 200, 230);
            expect(north.h).toBe(190);
            expect(north.y).toBe(230);

            const nw = apply('nw', 220, 230);
            expect(nw.w).toBe(280);
            expect(nw.h).toBe(190);
            expect(nw.x).toBe(220);
            expect(nw.y).toBe(230);

            const ne = apply('ne', 220, 180);
            expect(ne.w).toBe(320);
            expect(ne.y).toBe(180);

            const sw = apply('sw', 180, 230);
            expect(sw.x).toBe(180);
            expect(sw.h).toBe(250);

            handle.setRect({ x: 200, y: 200, w: 300, h: 220 });
            handle.startResize({ clientX: 200, clientY: 200, button: 0 }, 'nw');
            dispatchMove(600, 600);
            dispatchUp();
            expect(handle.state.w).toBe(240);
            expect(handle.state.h).toBe(160);
            expect(handle.state.x).toBe(200 + 300 - 240);
            expect(handle.state.y).toBe(200 + 220 - 160);
        });
    });

    describe('stack', () => {
        test('list() orders by lastActiveAt, raise() re-orders, front() and closeFront() pick the front-most, z-indices stay in band', async () => {
            const a = make({
                id: 'stack-a',
                defaults: { x: 20, y: 80, w: 260, h: 180, open: true }
            });
            const b = make({
                id: 'stack-b',
                defaults: { x: 40, y: 100, w: 260, h: 180, open: true }
            });
            const c = make({
                id: 'stack-c',
                defaults: { x: 60, y: 120, w: 260, h: 180, open: true }
            });
            a.state.lastActiveAt = 10;
            b.state.lastActiveAt = 20;
            c.state.lastActiveAt = 30;
            a.raise();
            const listed = window.jPulse.UI.floatPanel.list();
            expect(listed[0]).toBe(a);
            expect(listed[1]).toBe(c);
            expect(listed[2]).toBe(b);
            expect(window.jPulse.UI.floatPanel.front()).toBe(a);
            expect(a.isFront()).toBe(true);
            expect(b.isFront()).toBe(false);

            const zs = [a, b, c].map((h) => h.state.zIndex);
            zs.forEach((z) => {
                expect(z).toBeGreaterThanOrEqual(engine().Z_PANEL_MIN);
                expect(z).toBeLessThanOrEqual(engine().Z_PANEL_MAX);
            });
            expect(a.state.zIndex).toBeGreaterThan(b.state.zIndex);
            expect(a.state.zIndex).toBeGreaterThan(c.state.zIndex);

            await window.jPulse.UI.floatPanel.closeFront();
            expect(a.isOpen()).toBe(false);
            expect(window.jPulse.UI.floatPanel.front()).toBe(c);
        });
    });

    describe('mobile.exclusive', () => {
        test('closes only same-group panels', async () => {
            setViewport(400, 800);
            const a = make({
                id: 'ex-a',
                group: 'chat',
                defaults: { x: 20, y: 80, w: 260, h: 180, open: false },
                mobile: { breakpoint: 768, exclusive: true, heightRatio: 0.5 }
            });
            const b = make({
                id: 'ex-b',
                group: 'chat',
                defaults: { x: 40, y: 100, w: 260, h: 180, open: false },
                mobile: { breakpoint: 768, exclusive: true, heightRatio: 0.5 }
            });
            const other = make({
                id: 'ex-other',
                group: 'inspector',
                defaults: { x: 60, y: 120, w: 260, h: 180, open: false },
                mobile: { breakpoint: 768, exclusive: true, heightRatio: 0.5 }
            });
            await a.open();
            await other.open();
            expect(a.isOpen()).toBe(true);
            expect(other.isOpen()).toBe(true);
            await b.open();
            expect(a.isOpen()).toBe(false);
            expect(b.isOpen()).toBe(true);
            expect(other.isOpen()).toBe(true);
        });
    });

    describe('Escape', () => {
        test('closes the front panel', async () => {
            const handle = make({
                id: 'esc-1',
                defaults: { x: 20, y: 80, w: 260, h: 180, open: true }
            });
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
            await new Promise((resolve) => setTimeout(resolve, 20));
            expect(handle.isOpen()).toBe(false);
        });

        test('is a no-op while a .jp-dialog-show element is in the document', async () => {
            const handle = make({
                id: 'esc-dialog',
                defaults: { x: 20, y: 80, w: 260, h: 180, open: true }
            });
            const dialog = document.createElement('div');
            dialog.className = 'jp-dialog-show';
            document.body.appendChild(dialog);
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
            await new Promise((resolve) => setTimeout(resolve, 20));
            expect(handle.isOpen()).toBe(true);
        });
    });

    describe('controlled vs uncontrolled', () => {
        test('controlled mode: onChange fires with the rect and the element is never touched', () => {
            const stray = document.createElement('div');
            stray.id = 'controlled-stray';
            document.body.appendChild(stray);
            const onChange = jest.fn();
            const handle = make({
                id: 'controlled',
                onChange,
                defaults: { x: 40, y: 80, w: 280, h: 190, open: true }
            });
            expect(onChange).toHaveBeenCalled();
            const [rect, meta] = onChange.mock.calls[0];
            expect(rect.w).toBe(280);
            expect(rect.h).toBe(190);
            expect(rect.zIndex).toBeGreaterThanOrEqual(engine().Z_PANEL_MIN);
            expect(meta.open).toBe(true);
            expect(stray.style.left).toBe('');
            expect(stray.style.top).toBe('');
            expect(handle.style().left).toBe(`${handle.getRect().x}px`);
        });

        test('uncontrolled mode writes the styles', () => {
            const el = document.createElement('div');
            document.body.appendChild(el);
            const handle = make({
                id: 'uncontrolled',
                el,
                defaults: { x: 40, y: 80, w: 280, h: 190, open: true }
            });
            expect(el.style.left).toBe('40px');
            expect(el.style.top).toBe('80px');
            expect(el.style.width).toBe('280px');
            expect(el.style.height).toBe('190px');
            expect(el.classList.contains('jp-float-panel')).toBe(true);
            expect(el.style.display).toBe('flex');
            expect(handle.getRect().x).toBe(40);
        });
    });

    describe('open / close animation', () => {
        test('open() and close() resolve after the animation', async () => {
            const handle = make({
                id: 'anim-1',
                defaults: { x: 40, y: 80, w: 280, h: 190, open: false }
            });
            await handle.open();
            expect(handle.isOpen()).toBe(true);
            await handle.close();
            expect(handle.isOpen()).toBe(false);
        });

        test('resolve immediately under prefers-reduced-motion', async () => {
            window.matchMedia = (query) => ({
                matches: /prefers-reduced-motion:\s*reduce/.test(query),
                media: query,
                addEventListener() {},
                removeEventListener() {},
                addListener() {},
                removeListener() {}
            });
            const handle = make({
                id: 'anim-reduce',
                animate: { durationMs: 400 },
                defaults: { x: 40, y: 80, w: 280, h: 190, open: false }
            });
            const started = Date.now();
            await handle.open();
            expect(Date.now() - started).toBeLessThan(100);
            expect(handle.isOpen()).toBe(true);
            expect(document.querySelector('.jp-float-panel-ghost')).toBeFalsy();
        });

        test('hardClose() removes an in-flight ghost', async () => {
            window.requestAnimationFrame = (cb) => setTimeout(cb, 0);
            const handle = make({
                id: 'anim-ghost',
                animate: { durationMs: 400 },
                defaults: { x: 40, y: 80, w: 280, h: 190, open: false }
            });
            const pending = handle.open();
            await Promise.resolve();
            await new Promise((resolve) => setTimeout(resolve, 5));
            expect(document.querySelector('.jp-float-panel-ghost')).toBeTruthy();
            handle.hardClose();
            expect(document.querySelector('.jp-float-panel-ghost')).toBeFalsy();
            expect(handle.isOpen()).toBe(false);
            await pending;
        });
    });

    describe('focus', () => {
        const mountPanel = (id) => {
            const el = document.createElement('aside');
            el.innerHTML = [
                '<div class="jp-float-panel-header" data-jp-panel-drag>Title</div>',
                '<div class="jp-float-panel-body">Body</div>',
                '<button type="button" data-jp-panel-close>x</button>'
            ].join('');
            document.body.appendChild(el);
            const handle = make({
                id,
                el,
                defaults: { x: 40, y: 80, w: 280, h: 190, open: false }
            });
            return { el, handle };
        };

        test('open() moves focus to the panel without focusing the header', async () => {
            const { el, handle } = mountPanel('focus-open');
            const header = el.querySelector('[data-jp-panel-drag]');
            await handle.open();
            expect(document.activeElement).toBe(el);
            expect(header.hasAttribute('tabindex')).toBe(false);
        });

        test('clicking the header or body focuses the panel', async () => {
            const { el, handle } = mountPanel('focus-click');
            const header = el.querySelector('[data-jp-panel-drag]');
            const body = el.querySelector('.jp-float-panel-body');
            await handle.open();
            const outside = document.createElement('button');
            document.body.appendChild(outside);
            outside.focus();
            body.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
            expect(document.activeElement).toBe(el);
            outside.focus();
            header.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
            expect(document.activeElement).toBe(el);
        });

        test('clicking a close button does not steal focus from the control', async () => {
            const { el, handle } = mountPanel('focus-close');
            const closeBtn = el.querySelector('[data-jp-panel-close]');
            await handle.open();
            closeBtn.focus();
            closeBtn.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
            expect(document.activeElement).toBe(closeBtn);
        });
    });

    describe('destroy', () => {
        test('removes listeners and the registry entry', async () => {
            const el = document.createElement('div');
            const closeBtn = document.createElement('button');
            closeBtn.setAttribute('data-jp-panel-close', '');
            el.appendChild(closeBtn);
            document.body.appendChild(el);
            const handle = make({
                id: 'destroy-1',
                el,
                defaults: { x: 40, y: 80, w: 280, h: 190, open: true }
            });
            expect(window.jPulse.UI.floatPanel.get('destroy-1')).toBe(handle);
            handle.destroy();
            expect(window.jPulse.UI.floatPanel.get('destroy-1')).toBeNull();
            expect(window.jPulse.UI.floatPanel.list()).toHaveLength(0);
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
            closeBtn.click();
            expect(el.querySelector('[data-jp-panel-resize-injected]')).toBeFalsy();
        });
    });
});

// EOF webapp/tests/unit/utils/jpulse-ui-float-panel.test.js
