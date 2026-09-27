/**
 * netkeiba専用の軽量CORSプロキシ（Cloudflare Workers用）
 *
 * トラックバイアス予想ツール（index.html）から、ブラウザのCORS制限を回避して
 * netkeibaのページをサーバー側で取得するために使う。
 * 任意のURLを中継しない（netkeiba.com系のホストのみ許可）ので、
 * 誰でも使えるオープンプロキシにはならない。
 *
 * 使い方: https://<your-worker>.workers.dev/?url=<取得したいnetkeibaのURL>
 */

const ALLOWED_HOSTS = ['db.netkeiba.com', 'race.netkeiba.com', 'netkeiba.com'];

function isAllowedHost(hostname) {
  return ALLOWED_HOSTS.some(h => hostname === h || hostname.endsWith('.' + h));
}

async function decodeBody(resp) {
  const buf = await resp.arrayBuffer();
  const bytes = new Uint8Array(buf);

  let charset = null;
  const ctHeader = resp.headers.get('Content-Type') || '';
  let m = ctHeader.match(/charset=([\w-]+)/i);
  if (m) charset = m[1].toLowerCase();

  if (!charset) {
    // <meta charset="..."> はASCIIなので、多少文字化けしても正規表現では拾える
    const sniff = new TextDecoder('utf-8', { fatal: false }).decode(bytes.slice(0, 4096));
    m = sniff.match(/charset=["']?([\w-]+)/i);
    if (m) charset = m[1].toLowerCase();
  }
  if (!charset) charset = 'utf-8';

  try {
    return new TextDecoder(charset, { fatal: false }).decode(bytes);
  } catch (e) {
    return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  }
}

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': '*',
        },
      });
    }

    const reqUrl = new URL(request.url);
    const target = reqUrl.searchParams.get('url');
    if (!target) {
      return new Response('Missing "url" query param', { status: 400 });
    }

    let targetUrl;
    try {
      targetUrl = new URL(target);
    } catch (e) {
      return new Response('Invalid url', { status: 400 });
    }
    if (targetUrl.protocol !== 'https:' || !isAllowedHost(targetUrl.hostname)) {
      return new Response('Host not allowed', { status: 403 });
    }

    let upstream;
    try {
      upstream = await fetch(targetUrl.toString(), {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
          'Accept-Language': 'ja,en;q=0.9',
        },
        cf: { cacheTtl: 30, cacheEverything: true },
      });
    } catch (e) {
      return new Response('Upstream fetch failed: ' + e.message, { status: 502 });
    }

    const html = await decodeBody(upstream);

    return new Response(html, {
      status: upstream.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'text/html; charset=UTF-8',
        'Cache-Control': 'public, max-age=30',
      },
    });
  },
};
