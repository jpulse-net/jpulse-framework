/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Utils / UrlFetch
 * @tagline         Unit tests for UrlFetch pure guards (no I/O)
 * @description     Option narrowing, address classification, host matching, URL pre-flight
 * @file            webapp/tests/unit/utils/url-fetch.test.js
 * @version         1.7.17
 * @release         2026-08-22
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025-2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.15, Grok 4.6
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import UrlFetch, {
    getEffectiveOptions,
    isPublicAddress,
    parseHostList,
    hostMatchesList,
    normalizeHost,
    preflightUrl,
    matchContentType
} from '../../../utils/url-fetch.js';

describe('UrlFetch pure guards', () => {
    const originalAppConfig = global.appConfig;
    const originalLog = global.LogController;

    beforeEach(() => {
        global.appConfig = {
            app: { jPulse: { version: '1.7.15' } },
            utils: {
                urlFetch: {
                    maxBytes: 10485760,
                    timeoutMs: 30000,
                    stallTimeoutMs: 10000,
                    maxRedirects: 5,
                    allowedSchemes: ['https', 'http'],
                    blockedHosts: ['blocked.example'],
                    userAgent: '',
                    allowPrivateAddresses: false,
                    rateLimit: { limit: 60, windowSeconds: 60 }
                }
            }
        };
        global.LogController = {
            logInfo: () => {},
            logWarning: () => {},
            logError: () => {}
        };
    });

    afterEach(() => {
        global.appConfig = originalAppConfig;
        global.LogController = originalLog;
        UrlFetch._resetDeps();
    });

    describe('getEffectiveOptions', () => {
        test('omitted caller options use the site ceiling', () => {
            const opts = getEffectiveOptions();
            expect(opts.maxBytes).toBe(10485760);
            expect(opts.timeoutMs).toBe(30000);
            expect(opts.stallTimeoutMs).toBe(10000);
            expect(opts.maxRedirects).toBe(5);
            expect(opts.method).toBe('GET');
            expect(opts.as).toBe('text');
            expect(opts.allowedHosts).toEqual([]);
            expect(opts.blockedHosts).toEqual(['blocked.example']);
            expect(opts.acceptContentTypes).toEqual([]);
            expect(opts.allowPrivateAddresses).toBe(false);
            expect(opts.userAgent).toBe('jPulse-UrlFetch/1.7.15');
        });

        test('caller numbers only narrow, never widen', () => {
            const opts = getEffectiveOptions({
                maxBytes: 999999999,
                timeoutMs: 120000,
                stallTimeoutMs: 60000,
                maxRedirects: 99
            });
            expect(opts.maxBytes).toBe(10485760);
            expect(opts.timeoutMs).toBe(30000);
            expect(opts.stallTimeoutMs).toBe(10000);
            expect(opts.maxRedirects).toBe(5);
        });

        test('caller can narrow below the site ceiling', () => {
            const opts = getEffectiveOptions({
                maxBytes: 1024,
                timeoutMs: 1000,
                stallTimeoutMs: 200,
                maxRedirects: 0
            });
            expect(opts.maxBytes).toBe(1024);
            expect(opts.timeoutMs).toBe(1000);
            expect(opts.stallTimeoutMs).toBe(200);
            expect(opts.maxRedirects).toBe(0);
        });

        test('allowedSchemes intersect; caller cannot add ftp', () => {
            const opts = getEffectiveOptions({ allowedSchemes: ['https', 'ftp'] });
            expect(opts.allowedSchemes).toEqual(['https']);
        });

        test('blockedHosts unions site and caller', () => {
            const opts = getEffectiveOptions({ blockedHosts: 'evil.test, blocked.example' });
            expect(opts.blockedHosts).toEqual(['blocked.example', 'evil.test']);
        });

        test('caller cannot turn allowPrivateAddresses on when the site has it off', () => {
            const opts = getEffectiveOptions({ allowPrivateAddresses: true });
            expect(opts.allowPrivateAddresses).toBe(false);
        });

        test('caller can turn allowPrivateAddresses off when the site has it on', () => {
            global.appConfig.utils.urlFetch.allowPrivateAddresses = true;
            expect(getEffectiveOptions().allowPrivateAddresses).toBe(true);
            expect(getEffectiveOptions({ allowPrivateAddresses: false }).allowPrivateAddresses).toBe(false);
        });

        test('UrlFetch.getEffectiveOptions is the same function', () => {
            expect(UrlFetch.getEffectiveOptions({ maxBytes: 1 }).maxBytes).toBe(1);
        });
    });

    describe('isPublicAddress', () => {
        test('public IPv4 is public', () => {
            expect(isPublicAddress('8.8.8.8')).toBe(true);
            expect(isPublicAddress('1.1.1.1')).toBe(true);
            expect(isPublicAddress('93.184.216.34')).toBe(true);
        });

        test('rejects every designed IPv4 range', () => {
            expect(isPublicAddress('0.1.2.3')).toBe(false);
            expect(isPublicAddress('10.0.0.1')).toBe(false);
            expect(isPublicAddress('100.64.0.1')).toBe(false);
            expect(isPublicAddress('127.0.0.1')).toBe(false);
            expect(isPublicAddress('169.254.169.254')).toBe(false);
            expect(isPublicAddress('172.16.0.1')).toBe(false);
            expect(isPublicAddress('172.31.255.255')).toBe(false);
            expect(isPublicAddress('192.0.0.1')).toBe(false);
            expect(isPublicAddress('192.168.1.1')).toBe(false);
            expect(isPublicAddress('198.18.0.1')).toBe(false);
            expect(isPublicAddress('224.0.0.1')).toBe(false);
            expect(isPublicAddress('240.0.0.1')).toBe(false);
            expect(isPublicAddress('255.255.255.255')).toBe(false);
        });

        test('172.32.0.1 is public (just outside 172.16/12)', () => {
            expect(isPublicAddress('172.32.0.1')).toBe(true);
        });

        test('rejects IPv6 unspecified, loopback, ULA, link-local, NAT64, multicast', () => {
            expect(isPublicAddress('::')).toBe(false);
            expect(isPublicAddress('::1')).toBe(false);
            expect(isPublicAddress('fc00::1')).toBe(false);
            expect(isPublicAddress('fd12:3456:789a::1')).toBe(false);
            expect(isPublicAddress('fe80::1')).toBe(false);
            expect(isPublicAddress('64:ff9b::8.8.8.8')).toBe(false);
            expect(isPublicAddress('ff02::1')).toBe(false);
        });

        test('public IPv6 is public', () => {
            expect(isPublicAddress('2001:4860:4860::8888')).toBe(true);
        });

        test('unwraps IPv4-mapped IPv6 and re-checks as IPv4', () => {
            expect(isPublicAddress('::ffff:127.0.0.1')).toBe(false);
            expect(isPublicAddress('::ffff:10.0.0.1')).toBe(false);
            expect(isPublicAddress('::ffff:169.254.169.254')).toBe(false);
            expect(isPublicAddress('::ffff:8.8.8.8')).toBe(true);
            expect(isPublicAddress('::ffff:7f00:1')).toBe(false);
            expect(isPublicAddress('::ffff:c0a8:1')).toBe(false);
        });

        test('rejects empty and non-IP', () => {
            expect(isPublicAddress('')).toBe(false);
            expect(isPublicAddress('not-an-ip')).toBe(false);
            expect(isPublicAddress(null)).toBe(false);
        });

        test('IPv6 URL brackets do not hide a private address', () => {
            expect(isPublicAddress('[::1]')).toBe(false);
            expect(isPublicAddress('[::ffff:127.0.0.1]')).toBe(false);
            expect(isPublicAddress('[2001:4860:4860::8888]')).toBe(true);
        });
    });

    describe('host matching', () => {
        test('parseHostList accepts array, comma string, and whitespace', () => {
            expect(parseHostList('a.example, b.example')).toEqual(['a.example', 'b.example']);
            expect(parseHostList(['a.example', 'b.example c.example'])).toEqual(['a.example', 'b.example', 'c.example']);
            expect(parseHostList('')).toEqual([]);
            expect(parseHostList(null)).toEqual([]);
        });

        test('exact match is case-insensitive', () => {
            expect(hostMatchesList('API.Example.COM', ['api.example.com'])).toBe(true);
            expect(hostMatchesList('other.example.com', ['api.example.com'])).toBe(false);
        });

        test('*.example.com matches subdomains but not the apex', () => {
            expect(hostMatchesList('www.example.com', ['*.example.com'])).toBe(true);
            expect(hostMatchesList('a.b.example.com', ['*.example.com'])).toBe(true);
            expect(hostMatchesList('example.com', ['*.example.com'])).toBe(false);
        });

        test('normalizes IDN to punycode before compare', () => {
            const puny = normalizeHost('еxample.com');
            expect(puny.startsWith('xn--')).toBe(true);
            expect(hostMatchesList('еxample.com', [puny])).toBe(true);
            expect(hostMatchesList('еxample.com', ['example.com'])).toBe(false);
        });

        test('strips IPv6 brackets so the literal is an address, not a name', () => {
            expect(normalizeHost('[::1]')).toBe('::1');
            expect(normalizeHost('::1')).toBe('::1');
            expect(normalizeHost('[::ffff:127.0.0.1]')).toBe('::ffff:127.0.0.1');
        });
    });

    describe('preflightUrl', () => {
        const base = () => getEffectiveOptions();

        test('accepts https URL', () => {
            const pre = preflightUrl('https://example.com/path', base());
            expect(pre.ok).toBe(true);
            expect(pre.host).toBe('example.com');
        });

        test('rejects invalid URL', () => {
            expect(preflightUrl('not a url', base()).code).toBe('INVALID_URL');
            expect(preflightUrl('', base()).code).toBe('INVALID_URL');
        });

        test('rejects disallowed scheme', () => {
            const pre = preflightUrl('ftp://example.com/', base());
            expect(pre.code).toBe('SCHEME_NOT_ALLOWED');
            expect(pre.details.scheme).toBe('ftp');
        });

        test('rejects embedded credentials', () => {
            const pre = preflightUrl('https://user:pass@example.com/', base());
            expect(pre.code).toBe('CREDENTIALS_IN_URL');
        });

        test('rejects localhost, .localhost, .local, .internal', () => {
            expect(preflightUrl('http://localhost/', base()).code).toBe('HOST_BLOCKED');
            expect(preflightUrl('http://foo.localhost/', base()).code).toBe('HOST_BLOCKED');
            expect(preflightUrl('http://printer.local/', base()).code).toBe('HOST_BLOCKED');
            expect(preflightUrl('http://metadata.google.internal/', base()).code).toBe('HOST_BLOCKED');
        });

        test('rejects site blockedHosts', () => {
            const pre = preflightUrl('https://blocked.example/x', base());
            expect(pre.code).toBe('HOST_BLOCKED');
            expect(pre.details.host).toBe('blocked.example');
        });

        test('empty allowedHosts means no caller restriction', () => {
            expect(preflightUrl('https://anywhere.example/', base()).ok).toBe(true);
        });

        test('caller allowedHosts rejects others', () => {
            const opts = getEffectiveOptions({ allowedHosts: ['api.example.com'] });
            expect(preflightUrl('https://api.example.com/v1', opts).ok).toBe(true);
            expect(preflightUrl('https://other.example.com/v1', opts).code).toBe('HOST_NOT_ALLOWED');
        });

        test('blocked beats allowed', () => {
            const opts = getEffectiveOptions({
                allowedHosts: ['blocked.example'],
                blockedHosts: []
            });
            expect(preflightUrl('https://blocked.example/', opts).code).toBe('HOST_BLOCKED');
        });

        test('punycode homograph does not pass an ASCII allowlist', () => {
            const opts = getEffectiveOptions({ allowedHosts: ['example.com'] });
            const cyrillic = 'https://еxample.com/';
            const pre = preflightUrl(cyrillic, opts);
            expect(pre.ok).toBe(false);
            expect(pre.code).toBe('HOST_NOT_ALLOWED');
        });
    });

    describe('matchContentType', () => {
        test('empty patterns accept anything including missing', () => {
            expect(matchContentType('text/html', [])).toBe(true);
            expect(matchContentType('', [])).toBe(true);
        });

        test('ignores parameters', () => {
            expect(matchContentType('text/html; charset=utf-8', ['text/html'])).toBe(true);
            expect(matchContentType('text/html; charset=utf-8', ['text/*'])).toBe(true);
        });

        test('wildcard and exact', () => {
            expect(matchContentType('application/json', ['text/*'])).toBe(false);
            expect(matchContentType('application/json', ['application/json'])).toBe(true);
            expect(matchContentType('application/json', ['*/*'])).toBe(true);
        });

        test('missing content-type fails when a list is set', () => {
            expect(matchContentType('', ['text/*'])).toBe(false);
        });
    });

    describe('result redaction', () => {
        test('CREDENTIALS_IN_URL does not echo userinfo in finalUrl', async () => {
            const res = await UrlFetch.fetch('https://user:pass@example.com/secret');
            expect(res.code).toBe('CREDENTIALS_IN_URL');
            expect(res.finalUrl).toBe('https://example.com/secret');
            expect(res.finalUrl).not.toContain('user');
            expect(res.finalUrl).not.toContain('pass');
        });

        test('IPv6 loopback literal is PRIVATE_ADDRESS, not DNS_FAILED', async () => {
            const res = await UrlFetch.fetch('http://[::1]/');
            expect(res.code).toBe('PRIVATE_ADDRESS');
            expect(res.details.address).toBe('::1');
            expect(res.details.host).toBe('::1');
        });

        test('IPv4-mapped IPv6 loopback literal is PRIVATE_ADDRESS', async () => {
            const res = await UrlFetch.fetch('http://[::ffff:127.0.0.1]/');
            expect(res.code).toBe('PRIVATE_ADDRESS');
        });
    });
});

// EOF webapp/tests/unit/utils/url-fetch.test.js
