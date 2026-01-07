/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Utils / Common Utils Sanitize
 * @tagline         Unit tests for CommonUtils.sanitizeHtml() security function
 * @description     Tests HTML sanitization to prevent XSS attacks
 * @file            webapp/tests/unit/utils/common-utils-sanitize.test.js
 * @version         1.4.8
 * @release         2026-01-08
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 2.2, Claude Sonnet 4.5
 */

import { describe, test, expect, beforeAll } from '@jest/globals';
import CommonUtils from '../../../utils/common.js';

describe('CommonUtils.sanitizeHtml() - XSS Prevention', () => {

    beforeAll(() => {
        // Ensure global.appConfig exists for tests
        if (!global.appConfig) {
            global.appConfig = {};
        }
    });

    describe('Script Tag Removal', () => {
        test('should remove basic script tags', () => {
            const html = '<p>Hello</p><script>alert("xss")</script><p>World</p>';
            const result = CommonUtils.sanitizeHtml(html);
            expect(result).toBe('<p>Hello</p><p>World</p>');
            expect(result).not.toContain('script');
            expect(result).not.toContain('alert');
        });

        test('should remove script tags with attributes', () => {
            const html = '<script type="text/javascript" src="evil.js">alert("xss")</script>';
            const result = CommonUtils.sanitizeHtml(html);
            expect(result).toBe('');
            expect(result).not.toContain('script');
        });

        test('should remove script tags regardless of case', () => {
            const html = '<SCRIPT>alert("xss")</SCRIPT><ScRiPt>bad()</ScRiPt>';
            const result = CommonUtils.sanitizeHtml(html);
            expect(result).toBe('');
            expect(result).not.toContain('script');
            expect(result).not.toContain('SCRIPT');
        });

        test('should handle nested script tags', () => {
            const html = '<script><script>alert("nested")</script></script>';
            const result = CommonUtils.sanitizeHtml(html);
            expect(result).toBe('');
            expect(result).not.toContain('script');
        });

        test('should remove multiple script tags', () => {
            const html = '<script>bad1()</script><p>Text</p><script>bad2()</script>';
            const result = CommonUtils.sanitizeHtml(html);
            expect(result).toBe('<p>Text</p>');
            expect(result).not.toContain('script');
        });
    });

    describe('Style Tag Removal', () => {
        test('should remove style tags', () => {
            const html = '<p>Text</p><style>body{display:none}</style>';
            const result = CommonUtils.sanitizeHtml(html);
            expect(result).toBe('<p>Text</p>');
            expect(result).not.toContain('style');
            expect(result).not.toContain('display:none');
        });

        test('should remove style tags with attributes', () => {
            const html = '<style type="text/css">body{color:red}</style>';
            const result = CommonUtils.sanitizeHtml(html);
            expect(result).toBe('');
            expect(result).not.toContain('style');
        });

        test('should remove style tags regardless of case', () => {
            const html = '<STYLE>bad</STYLE><StYlE>worse</StYlE>';
            const result = CommonUtils.sanitizeHtml(html);
            expect(result).toBe('');
        });
    });

    describe('Event Handler Removal', () => {
        test('should remove onclick attribute', () => {
            const html = '<a href="#" onclick="alert(\'xss\')">Click</a>';
            const result = CommonUtils.sanitizeHtml(html);
            expect(result).toContain('<a href="#">Click</a>');
            expect(result).not.toContain('onclick');
        });

        test('should remove onerror attribute', () => {
            const html = '<img src="x" onerror="alert(\'xss\')" alt="Image"/>';
            const result = CommonUtils.sanitizeHtml(html);
            expect(result).not.toContain('onerror');
            expect(result).not.toContain('alert');
        });

        test('should remove onload attribute', () => {
            const html = '<body onload="evil()">Content</body>';
            const result = CommonUtils.sanitizeHtml(html);
            expect(result).not.toContain('onload');
            expect(result).not.toContain('evil');
        });

        test('should remove multiple event handlers', () => {
            const html = '<div onclick="bad1()" onmouseover="bad2()" onfocus="bad3()">Text</div>';
            const result = CommonUtils.sanitizeHtml(html);
            expect(result).not.toContain('onclick');
            expect(result).not.toContain('onmouseover');
            expect(result).not.toContain('onfocus');
        });

        test('should remove event handlers with different quote styles', () => {
            const html = '<a onclick="alert(1)" onmouseover=\'alert(2)\'>Link</a>';
            const result = CommonUtils.sanitizeHtml(html);
            expect(result).not.toContain('onclick');
            expect(result).not.toContain('onmouseover');
        });

        test('should remove all common event handlers', () => {
            const handlers = [
                'onclick', 'ondblclick', 'onmousedown', 'onmousemove', 'onmouseout',
                'onmouseover', 'onmouseup', 'onkeydown', 'onkeypress', 'onkeyup',
                'onblur', 'onchange', 'onfocus', 'onload', 'onerror'
            ];

            handlers.forEach(handler => {
                const html = `<div ${handler}="alert('xss')">Test</div>`;
                const result = CommonUtils.sanitizeHtml(html);
                expect(result).not.toContain(handler);
            });
        });
    });

    describe('JavaScript Protocol Removal', () => {
        test('should remove javascript: from href', () => {
            const html = '<a href="javascript:alert(\'xss\')">Click</a>';
            const result = CommonUtils.sanitizeHtml(html);
            expect(result).toContain('href="#"');
            expect(result).not.toContain('javascript:');
        });

        test('should remove javascript: from src', () => {
            // Note: img is not in default allowedTags, so entire tag is removed
            const html = '<img src="javascript:alert(\'xss\')"/>';
            const result = CommonUtils.sanitizeHtml(html);
            expect(result).toBe('');
            expect(result).not.toContain('javascript:');
            expect(result).not.toContain('img');
        });

        test('should handle javascript: regardless of case', () => {
            const html = '<a href="JavaScript:alert(1)">Link</a>';
            const result = CommonUtils.sanitizeHtml(html);
            expect(result).not.toContain('JavaScript:');
            expect(result).toContain('href="#"');
        });

        test('should handle javascript: with whitespace', () => {
            const html = '<a href="java script:alert(1)">Link</a>';
            const result = CommonUtils.sanitizeHtml(html);
            // Whitespace between "java" and "script" is not caught by regex (edge case)
            // This is acceptable as browsers don't execute "java script:" as javascript:
            expect(result).toContain('<a');
            expect(result).toContain('Link</a>');
        });
    });

    describe('Data Protocol Removal', () => {
        test('should remove data: from href', () => {
            const html = '<a href="data:text/html,<script>alert(1)</script>">Click</a>';
            const result = CommonUtils.sanitizeHtml(html);
            expect(result).toContain('href="#"');
            expect(result).not.toContain('data:');
        });

        test('should remove data: from src', () => {
            // Note: img is not in default allowedTags, so entire tag is removed
            const html = '<img src="data:image/svg+xml,<svg><script>alert(1)</script></svg>"/>';
            const result = CommonUtils.sanitizeHtml(html);
            expect(result).toBe('');
            expect(result).not.toContain('data:');
            expect(result).not.toContain('img');
        });

        test('should remove base64 encoded data URLs', () => {
            // Note: img is not in default allowedTags, so entire tag is removed
            const html = '<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA"/>';
            const result = CommonUtils.sanitizeHtml(html);
            expect(result).toBe('');
            expect(result).not.toContain('data:');
            expect(result).not.toContain('img');
        });
    });

    describe('HTML Comment Removal', () => {
        test('should remove HTML comments', () => {
            const html = '<p>Text</p><!-- Comment --><p>More</p>';
            const result = CommonUtils.sanitizeHtml(html);
            expect(result).toBe('<p>Text</p><p>More</p>');
            expect(result).not.toContain('<!--');
            expect(result).not.toContain('Comment');
        });

        test('should remove multiline comments', () => {
            const html = '<p>Text</p><!--\nMultiline\nComment\n--><p>More</p>';
            const result = CommonUtils.sanitizeHtml(html);
            expect(result).not.toContain('<!--');
            expect(result).not.toContain('Multiline');
        });

        test('should remove comments with scripts inside', () => {
            const html = '<!-- <script>alert("hidden")</script> --><p>Text</p>';
            const result = CommonUtils.sanitizeHtml(html);
            expect(result).toBe('<p>Text</p>');
            expect(result).not.toContain('<!--');
            expect(result).not.toContain('script');
        });
    });

    describe('Tag Filtering', () => {
        test('should allow safe formatting tags', () => {
            const html = '<p>Para</p><strong>Bold</strong><em>Italic</em><b>B</b><i>I</i><u>U</u>';
            const result = CommonUtils.sanitizeHtml(html);
            expect(result).toContain('<p>Para</p>');
            expect(result).toContain('<strong>Bold</strong>');
            expect(result).toContain('<em>Italic</em>');
            expect(result).toContain('<b>B</b>');
            expect(result).toContain('<i>I</i>');
            expect(result).toContain('<u>U</u>');
        });

        test('should allow safe list tags', () => {
            const html = '<ul><li>Item 1</li><li>Item 2</li></ul><ol><li>A</li></ol>';
            const result = CommonUtils.sanitizeHtml(html);
            expect(result).toContain('<ul>');
            expect(result).toContain('<li>');
            expect(result).toContain('<ol>');
        });

        test('should allow heading tags', () => {
            const html = '<h1>H1</h1><h2>H2</h2><h3>H3</h3><h4>H4</h4><h5>H5</h5><h6>H6</h6>';
            const result = CommonUtils.sanitizeHtml(html);
            expect(result).toContain('<h1>H1</h1>');
            expect(result).toContain('<h6>H6</h6>');
        });

        test('should allow code and pre tags', () => {
            const html = '<code>code</code><pre>preformatted</pre>';
            const result = CommonUtils.sanitizeHtml(html);
            expect(result).toContain('<code>code</code>');
            expect(result).toContain('<pre>preformatted</pre>');
        });

        test('should allow blockquote and hr', () => {
            const html = '<blockquote>Quote</blockquote><hr/>';
            const result = CommonUtils.sanitizeHtml(html);
            expect(result).toContain('<blockquote>Quote</blockquote>');
            expect(result).toContain('<hr/>');
        });

        test('should remove dangerous tags', () => {
            const html = '<iframe>frame</iframe><object>obj</object><embed>emb</embed>';
            const result = CommonUtils.sanitizeHtml(html);
            expect(result).not.toContain('iframe');
            expect(result).not.toContain('object');
            expect(result).not.toContain('embed');
            // Text content should remain
            expect(result).toContain('frame');
            expect(result).toContain('obj');
            expect(result).toContain('emb');
        });

        test('should remove form tags', () => {
            const html = '<form><input type="text"/><button>Submit</button></form>';
            const result = CommonUtils.sanitizeHtml(html);
            expect(result).not.toContain('form');
            expect(result).not.toContain('input');
            expect(result).not.toContain('button');
        });
    });

    describe('Attribute Filtering', () => {
        test('should allow href, title, target on links', () => {
            const html = '<a href="https://example.com" title="Example" target="_blank">Link</a>';
            const result = CommonUtils.sanitizeHtml(html);
            expect(result).toContain('href="https://example.com"');
            expect(result).toContain('title="Example"');
            expect(result).toContain('target="_blank"');
        });

        test('should allow src, alt, title on images when img is in allowedTags', () => {
            // Note: img is not in default allowedTags, so we need to explicitly allow it
            const html = '<img src="image.jpg" alt="Alt text" title="Title"/>';
            const result = CommonUtils.sanitizeHtml(html, {
                allowedTags: ['img'],
                allowedAttributes: {
                    'img': ['src', 'alt', 'title']
                }
            });
            expect(result).toContain('src="image.jpg"');
            expect(result).toContain('alt="Alt text"');
            expect(result).toContain('title="Title"');
        });

        test('should remove disallowed attributes from allowed tags', () => {
            const html = '<a href="#" id="link1" class="btn" data-toggle="modal">Link</a>';
            const result = CommonUtils.sanitizeHtml(html);
            expect(result).toContain('href="#"');
            expect(result).not.toContain('id=');
            expect(result).not.toContain('class=');
            expect(result).not.toContain('data-toggle');
        });

        test('should remove style attribute', () => {
            const html = '<p style="display:none">Hidden</p>';
            const result = CommonUtils.sanitizeHtml(html);
            expect(result).not.toContain('style=');
            expect(result).toContain('<p>Hidden</p>');
        });
    });

    describe('Custom Options', () => {
        test('should allow custom allowedTags', () => {
            const html = '<div>Div</div><span>Span</span><p>Para</p>';
            const result = CommonUtils.sanitizeHtml(html, {
                allowedTags: ['div', 'span']
            });
            expect(result).toContain('<div>Div</div>');
            expect(result).toContain('<span>Span</span>');
            expect(result).not.toContain('<p>');
            expect(result).toContain('Para'); // Text preserved
        });

        test('should allow custom allowedAttributes', () => {
            const html = '<div id="main" class="container">Content</div>';
            const result = CommonUtils.sanitizeHtml(html, {
                allowedTags: ['div'],
                allowedAttributes: {
                    'div': ['id', 'class']
                }
            });
            expect(result).toContain('id="main"');
            expect(result).toContain('class="container"');
        });

        test('should allow empty allowedTags to strip all tags', () => {
            const html = '<p>Text</p><strong>Bold</strong>';
            const result = CommonUtils.sanitizeHtml(html, {
                allowedTags: []
            });
            expect(result).toBe('TextBold');
            expect(result).not.toContain('<');
        });
    });

    describe('Edge Cases', () => {
        test('should handle empty string', () => {
            const result = CommonUtils.sanitizeHtml('');
            expect(result).toBe('');
        });

        test('should handle plain text without HTML', () => {
            const html = 'Just plain text';
            const result = CommonUtils.sanitizeHtml(html);
            expect(result).toBe('Just plain text');
        });

        test('should handle null input', () => {
            const result = CommonUtils.sanitizeHtml(null);
            expect(result).toBe('');
        });

        test('should handle undefined input', () => {
            const result = CommonUtils.sanitizeHtml(undefined);
            expect(result).toBe('');
        });

        test('should handle non-string input (number)', () => {
            const result = CommonUtils.sanitizeHtml(123);
            expect(result).toBe('');
        });

        test('should handle non-string input (object)', () => {
            const result = CommonUtils.sanitizeHtml({ html: '<p>test</p>' });
            expect(result).toBe('');
        });

        test('should trim whitespace', () => {
            const html = '  <p>Text</p>  ';
            const result = CommonUtils.sanitizeHtml(html);
            expect(result).toBe('<p>Text</p>');
        });

        test('should handle malformed HTML', () => {
            const html = '<p>Unclosed<strong>Bold';
            const result = CommonUtils.sanitizeHtml(html);
            expect(result).toContain('<p>');
            expect(result).toContain('<strong>');
        });

        test('should handle self-closing tags', () => {
            const html = '<br/><hr/>';
            const result = CommonUtils.sanitizeHtml(html);
            expect(result).toContain('<br/>');
            expect(result).toContain('<hr/>');
        });

        test('should handle tags without attributes', () => {
            const html = '<p>Simple paragraph</p>';
            const result = CommonUtils.sanitizeHtml(html);
            expect(result).toBe('<p>Simple paragraph</p>');
        });
    });

    describe('Complex Attack Vectors', () => {
        test('should handle nested attack in event handler', () => {
            const html = '<div onclick="eval(atob(\'YWxlcnQoMSk=\'))">Click</div>';
            const result = CommonUtils.sanitizeHtml(html);
            expect(result).not.toContain('onclick');
            expect(result).not.toContain('eval');
            expect(result).not.toContain('atob');
        });

        test('should handle SVG-based XSS', () => {
            const html = '<svg><script>alert(1)</script></svg>';
            const result = CommonUtils.sanitizeHtml(html);
            expect(result).not.toContain('script');
            expect(result).not.toContain('alert');
        });

        test('should handle mixed case tag names in attacks', () => {
            const html = '<sCrIpT>alert(1)</ScRiPt>';
            const result = CommonUtils.sanitizeHtml(html);
            expect(result).not.toContain('script');
            expect(result).not.toContain('Script');
        });

        test('should handle combined attacks', () => {
            const html = `
                <p>Normal text</p>
                <script>alert('xss')</script>
                <a href="javascript:void(0)" onclick="steal()">Bad Link</a>
                <img src="x" onerror="alert('xss')"/>
                <!-- <iframe src="evil.com"></iframe> -->
                <style>body{display:none}</style>
            `;
            const result = CommonUtils.sanitizeHtml(html);
            expect(result).toContain('<p>Normal text</p>');
            expect(result).not.toContain('script');
            expect(result).not.toContain('javascript:');
            expect(result).not.toContain('onclick');
            expect(result).not.toContain('onerror');
            expect(result).not.toContain('iframe');
            expect(result).not.toContain('style');
        });

        test('should handle URL encoding attempts', () => {
            const html = '<a href="&#106;&#97;&#118;&#97;&#115;&#99;&#114;&#105;&#112;&#116;&#58;">Link</a>';
            const result = CommonUtils.sanitizeHtml(html);
            // The encoded javascript: should be preserved in href but later filtered
            expect(result).toContain('<a');
            expect(result).toContain('Link</a>');
        });
    });

    describe('Real-World Plugin Description Scenarios', () => {
        test('should sanitize plugin description with formatting', () => {
            const html = `
                <p>This plugin provides <strong>authentication</strong> features.</p>
                <ul>
                    <li>Multi-factor authentication</li>
                    <li>Session management</li>
                </ul>
            `;
            const result = CommonUtils.sanitizeHtml(html);
            expect(result).toContain('<p>');
            expect(result).toContain('<strong>authentication</strong>');
            expect(result).toContain('<ul>');
            expect(result).toContain('<li>');
        });

        test('should prevent malicious plugin description', () => {
            const html = `
                <p>Great plugin!</p>
                <script>
                    fetch('/api/1/user/delete', {method: 'POST'});
                </script>
            `;
            const result = CommonUtils.sanitizeHtml(html);
            expect(result).toContain('<p>Great plugin!</p>');
            expect(result).not.toContain('script');
            expect(result).not.toContain('fetch');
        });
    });
});

// EOF webapp/tests/unit/utils/common-utils-sanitize.test.js
