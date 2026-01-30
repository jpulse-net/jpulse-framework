/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Controller / Handlebar String Manipulation
 * @tagline         Unit tests for W-135: String manipulation helpers
 * @description     Tests for length, lowercase, uppercase, titlecase, slugify, urlEncode, urlDecode, htmlEscape, htmlToText, htmlToMd
 * @file            webapp/tests/unit/controller/handlebar-string-manipulation.test.js
 * @version         1.6.2
 * @release         2026-01-30
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 2.3, Claude Sonnet 4.5
 */

import { describe, test, expect, beforeEach } from '@jest/globals';

describe('W-135: Handlebars String Manipulation Helpers', () => {
    let mockReq;
    let HandlebarController;

    beforeEach(() => {
        HandlebarController = global.HandlebarController;
        mockReq = {
            session: { user: null },
            user: null,
            url: '/test',
            path: '/test',
            query: {},
            protocol: 'http',
            hostname: 'localhost',
            get: (header) => header === 'host' ? 'localhost:3000' : '',
            t: (key) => key
        };
    });

    describe('{{string.length}} Helper', () => {
        test('should return length of single string', async () => {
            const template = '{{string.length "hello"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('5');
        });

        test('should concatenate multiple args then return length', async () => {
            const template = '{{string.length "hello" " " "world"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('11');
        });

        test('should work with variables', async () => {
            const template = '{{string.length user.firstName}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                user: { firstName: 'John' }
            });
            expect(result.trim()).toBe('4');
        });

        test('should return 0 for empty string', async () => {
            const template = '{{string.length ""}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('0');
        });

        test('should use in conditional', async () => {
            const template = '{{#if (gt (string.length user.name) 10)}}long{{else}}short{{/if}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                user: { name: 'Christopher' }
            });
            expect(result.trim()).toBe('long');
        });
    });

    describe('{{string.lowercase}} Helper', () => {
        test('should convert single string to lowercase', async () => {
            const template = '{{string.lowercase "HELLO"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('hello');
        });

        test('should concatenate multiple args then lowercase', async () => {
            const template = '{{string.lowercase "HELLO" " " "WORLD"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('hello world');
        });

        test('should work with variables', async () => {
            const template = '{{string.lowercase user.firstName " " user.lastName}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                user: { firstName: 'JOHN', lastName: 'DOE' }
            });
            expect(result.trim()).toBe('john doe');
        });

        test('should handle empty string', async () => {
            const template = '{{string.lowercase ""}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('');
        });

        test('should handle mixed case', async () => {
            const template = '{{string.lowercase "HeLLo WoRLd"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('hello world');
        });
    });

    describe('{{string.uppercase}} Helper', () => {
        test('should convert single string to uppercase', async () => {
            const template = '{{string.uppercase "hello"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('HELLO');
        });

        test('should concatenate multiple args then uppercase', async () => {
            const template = '{{string.uppercase "hello" " " "world"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('HELLO WORLD');
        });

        test('should work with variables', async () => {
            const template = '{{string.uppercase user.status}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                user: { status: 'active' }
            });
            expect(result.trim()).toBe('ACTIVE');
        });

        test('should handle empty string', async () => {
            const template = '{{string.uppercase ""}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('');
        });
    });

    describe('{{string.titlecase}} Helper', () => {
        test('should capitalize first letter of each word', async () => {
            const template = '{{string.titlecase "hello world"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('Hello World');
        });

        test('should handle English articles correctly', async () => {
            const template = '{{string.titlecase "the lord of the rings"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('The Lord of the Rings');
        });

        test('should capitalize first and last word always', async () => {
            const template = '{{string.titlecase "a tale of two cities"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('A Tale of Two Cities');
        });

        test('should not capitalize small words in middle', async () => {
            const template = '{{string.titlecase "going to the store"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('Going to the Store');
        });

        test('should handle single word', async () => {
            const template = '{{string.titlecase "hello"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('Hello');
        });

        test('should concatenate multiple args then titlecase', async () => {
            const template = '{{string.titlecase "the" " " "great gatsby"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('The Great Gatsby');
        });

        test('should handle empty string', async () => {
            const template = '{{string.titlecase ""}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('');
        });

        test('should handle all caps input', async () => {
            const template = '{{string.titlecase "THE LORD OF THE RINGS"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('The Lord of the Rings');
        });
    });

    describe('{{string.slugify}} Helper', () => {
        test('should convert to lowercase slug', async () => {
            const template = '{{string.slugify "Hello World"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('hello-world');
        });

        test('should remove special characters', async () => {
            const template = '{{string.slugify "Hello World!"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('hello-world');
        });

        test('should handle accents/diacritics', async () => {
            const template = '{{string.slugify "Café"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('cafe');
        });

        test('should collapse multiple spaces/hyphens', async () => {
            const template = '{{string.slugify "hello  -  world"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('hello-world');
        });

        test('should trim hyphens from ends', async () => {
            const template = '{{string.slugify " hello world "}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('hello-world');
        });

        test('should concatenate multiple args then slugify', async () => {
            const template = '{{string.slugify article.category " " article.title}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                article: { category: 'Tech', title: 'My Blog Post!' }
            });
            expect(result.trim()).toBe('tech-my-blog-post');
        });

        test('should handle numbers', async () => {
            const template = '{{string.slugify "Post 123"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('post-123');
        });

        test('should handle empty string', async () => {
            const template = '{{string.slugify ""}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('');
        });
    });

    describe('{{string.urlEncode}} Helper', () => {
        test('should encode spaces', async () => {
            const template = '{{string.urlEncode "hello world"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('hello%20world');
        });

        test('should encode special characters', async () => {
            const template = '{{string.urlEncode "hello&world"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('hello%26world');
        });

        test('should concatenate multiple args then encode', async () => {
            const template = '{{string.urlEncode "hello" " " "world"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('hello%20world');
        });

        test('should handle empty string', async () => {
            const template = '{{string.urlEncode ""}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('');
        });

        test('should use in href', async () => {
            const template = '<a href="/search?q={{string.urlEncode query}}">Search</a>';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                query: 'hello world'
            });
            expect(result.trim()).toBe('<a href="/search?q=hello%20world">Search</a>');
        });
    });

    describe('{{string.urlDecode}} Helper', () => {
        test('should decode spaces', async () => {
            const template = '{{string.urlDecode "hello%20world"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('hello world');
        });

        test('should decode special characters', async () => {
            const template = '{{string.urlDecode "hello%26world"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('hello&world');
        });

        test('should concatenate multiple args then decode', async () => {
            const template = '{{string.urlDecode "hello%20" "world"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('hello world');
        });

        test('should handle invalid encoding gracefully', async () => {
            const template = '{{string.urlDecode "hello%"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            // Should return original string on error
            expect(result.trim()).toBe('hello%');
        });

        test('should handle empty string', async () => {
            const template = '{{string.urlDecode ""}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('');
        });
    });

    describe('{{string.htmlEscape}} Helper', () => {
        test('should escape angle brackets', async () => {
            const template = '{{string.htmlEscape "<script>"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('&lt;script&gt;');
        });

        test('should escape quotes', async () => {
            const template = '{{string.htmlEscape "Hello \\"world\\""}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('Hello &quot;world&quot;');
        });

        test('should escape ampersands', async () => {
            const template = '{{string.htmlEscape "hello & world"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('hello &amp; world');
        });

        test('should escape single quotes', async () => {
            const template = "{{string.htmlEscape \"hello 'world'\"}}";
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('hello &#39;world&#39;');
        });

        test('should concatenate multiple args then escape', async () => {
            const template = '{{string.htmlEscape "<div>" "content" "</div>"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('&lt;div&gt;content&lt;/div&gt;');
        });

        test('should prevent XSS', async () => {
            const template = '<div>{{string.htmlEscape userInput}}</div>';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                userInput: '<script>alert("xss")</script>'
            });
            expect(result.trim()).toBe('<div>&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;</div>');
        });

        test('should handle empty string', async () => {
            const template = '{{string.htmlEscape ""}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('');
        });
    });

    describe('{{string.htmlToText}} Helper', () => {
        test('should strip simple tags', async () => {
            const template = '{{string.htmlToText "<p>hello</p>"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('hello');
        });

        test('should preserve word boundaries between tags', async () => {
            const template = '{{string.htmlToText "<b>hello</b>world"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('hello world');
        });

        test('should decode HTML entities', async () => {
            const template = '{{string.htmlToText "&lt;script&gt;"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('<script>');
        });

        test('should handle nbsp entities', async () => {
            const template = '{{string.htmlToText "hello&nbsp;world"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('hello world');
        });

        test('should collapse whitespace', async () => {
            const template = '{{string.htmlToText "<p>hello</p>  <p>world</p>"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('hello world');
        });

        test('should handle numeric entities', async () => {
            const template = '{{string.htmlToText "hello&#39;world"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe("hello'world");
        });

        test('should concatenate multiple args then convert', async () => {
            const template = '{{string.htmlToText "<p>hello</p>" "<p>world</p>"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('hello world');
        });

        test('should handle empty string', async () => {
            const template = '{{string.htmlToText ""}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('');
        });

        test('should handle complex HTML', async () => {
            const template = '{{string.htmlToText "<div><h1>Title</h1><p>Content</p></div>"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('Title Content');
        });
    });

    describe('{{string.htmlToMd}} Helper', () => {
        test('should convert paragraphs to double newlines', async () => {
            const template = '{{string.htmlToMd "<p>hello</p><p>world</p>"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('hello\n\nworld');
        });

        test('should convert headings', async () => {
            const template = '{{string.htmlToMd "<h1>Title</h1><h2>Subtitle</h2>"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('# Title\n\n## Subtitle');
        });

        test('should convert bold text', async () => {
            const template = '{{string.htmlToMd "<p>This is <b>bold</b> text</p>"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('This is **bold** text');
        });

        test('should convert italic text', async () => {
            const template = '{{string.htmlToMd "<p>This is <em>italic</em> text</p>"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('This is *italic* text');
        });

        test('should convert links', async () => {
            const template = '{{string.htmlToMd html}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                html: '<a href="http://example.com">Link</a>'
            });
            expect(result.trim()).toBe('[Link](http://example.com)');
        });

        test('should convert unordered lists', async () => {
            const template = '{{string.htmlToMd "<ul><li>Item 1</li><li>Item 2</li></ul>"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('- Item 1\n- Item 2');
        });

        test('should convert ordered lists', async () => {
            const template = '{{string.htmlToMd "<ol><li>First</li><li>Second</li></ol>"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('1. First\n2. Second');
        });

        test('should convert images to alt text', async () => {
            const template = '{{string.htmlToMd html}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                html: '<img src="pic.jpg" alt="My Picture">'
            });
            expect(result.trim()).toBe('My Picture');
        });

        test('should handle code tags', async () => {
            const template = '{{string.htmlToMd "<p>Use <code>console.log()</code> for debugging</p>"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('Use `console.log()` for debugging');
        });

        test('should handle table rows with newlines', async () => {
            const template = '{{string.htmlToMd "<table><tr><td>Cell 1</td><td>Cell 2</td></tr></table>"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toContain('Cell 1');
            expect(result.trim()).toContain('Cell 2');
        });

        test('should decode HTML entities', async () => {
            const template = '{{string.htmlToMd "<p>&lt;code&gt;</p>"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('<code>');
        });

        test('should collapse excessive newlines', async () => {
            const template = '{{string.htmlToMd "<p>A</p><br><br><br><p>B</p>"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            const newlineCount = (result.match(/\n/g) || []).length;
            expect(newlineCount).toBeLessThanOrEqual(2); // Should not have more than 2 consecutive newlines
        });

        test('should concatenate multiple args then convert', async () => {
            const template = '{{string.htmlToMd "<p>hello</p>" "<p>world</p>"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('hello\n\nworld');
        });

        test('should handle empty string', async () => {
            const template = '{{string.htmlToMd ""}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('');
        });

        test('should handle complex document', async () => {
            const html = '<h1>Title</h1><p>Intro paragraph.</p><ul><li>Item 1</li><li>Item 2</li></ul><p>See <a href="http://example.com">link</a></p>';
            const template = '{{string.htmlToMd html}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, { html });
            expect(result).toContain('# Title');
            expect(result).toContain('- Item 1');
            expect(result).toContain('[link](http://example.com)');
        });
    });

    describe('Integration Tests', () => {
        test('should chain string helpers', async () => {
            const template = '{{string.uppercase (string.slugify "Hello World!")}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('HELLO-WORLD');
        });

        test('should use string.length in math operations', async () => {
            const template = '{{math.add (string.length "hello") (string.length "world")}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('10');
        });

        test('should use in complex conditionals', async () => {
            const template = '{{#if (and (gt (string.length user.name) 5) (eq (string.lowercase user.status) "active"))}}long active{{else}}other{{/if}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                user: { name: 'Christopher', status: 'ACTIVE' }
            });
            expect(result.trim()).toBe('long active');
        });

        test('should work with custom variables', async () => {
            const template = '{{let slug=(string.slugify article.title)}}{{vars.slug}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                article: { title: 'My Blog Post!' }
            });
            expect(result.trim()).toBe('my-blog-post');
        });
    });
});

// EOF webapp/tests/unit/controller/handlebar-string-manipulation.test.js
