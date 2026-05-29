import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import satori from 'satori';
import sharp from 'sharp';
import { readFileSync } from 'fs';
import { resolve } from 'path';

export const prerender = true;

// Module-level caches so fonts and logo are loaded once across all pages
let fontCache: { bold: ArrayBuffer; regular: ArrayBuffer } | null = null;
let logoCache: string | null = null;

async function getFonts() {
  if (!fontCache) {
    const [bold, regular] = await Promise.all([
      fetch('https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.16/files/inter-latin-700-normal.woff').then(r => r.arrayBuffer()),
      fetch('https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.16/files/inter-latin-400-normal.woff').then(r => r.arrayBuffer()),
    ]);
    fontCache = { bold, regular };
  }
  return fontCache;
}

function getLogo() {
  if (!logoCache) {
    const logoPath = resolve(process.cwd(), 'public/assets/images/logo.png');
    logoCache = `data:image/png;base64,${readFileSync(logoPath).toString('base64')}`;
  }
  return logoCache;
}

const skipIds = new Set(['index', 'calculator/index', 'tools/byo-employer-check']);

export const getStaticPaths: GetStaticPaths = async () => {
  const entries = await getCollection('docs');

  return entries
    .filter(entry => !skipIds.has(entry.id))
    .map(entry => {
      let urlSlug = entry.id;
      if (urlSlug.endsWith('/index')) {
        urlSlug = urlSlug.slice(0, -6);
      }

      const h1Match = entry.body?.match(/^#\s+(.+)$/m);
      const title = entry.data.title
        || (h1Match ? h1Match[1].replace(/[`*_[\]()]/g, '').trim() : 'Novated Lease Guide');

      return {
        params: { slug: urlSlug },
        props: { title },
      };
    });
};

export const GET: APIRoute = async ({ props }) => {
  const title = (props as { title: string }).title;
  const fonts = await getFonts();
  const logoBase64 = getLogo();

  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          width: '1200px',
          height: '630px',
          backgroundImage: 'linear-gradient(135deg, #1e3a5c 0%, #0d1b2e 60%, #111827 100%)',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'Inter',
          boxSizing: 'border-box',
          position: 'relative',
        },
        children: [
          // Accent bar at top
          {
            type: 'div',
            props: {
              style: {
                position: 'absolute',
                top: '0',
                left: '0',
                right: '0',
                height: '5px',
                backgroundImage: 'linear-gradient(90deg, #3b82f6 0%, #06b6d4 50%, #10b981 100%)',
              },
            },
          },
          // Large faded background logo watermark
          {
            type: 'img',
            props: {
              src: logoBase64,
              width: 500,
              height: 500,
              style: {
                position: 'absolute',
                right: '-10px',
                bottom: '-40px',
                opacity: 0.07,
                borderRadius: '60px',
              },
            },
          },
          // Main content area
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                flexDirection: 'column',
                padding: '64px 72px',
                flex: 1,
              },
              children: [
                // Top: logo + site name
                {
                  type: 'div',
                  props: {
                    style: {
                      display: 'flex',
                      alignItems: 'center',
                      gap: '18px',
                    },
                    children: [
                      {
                        type: 'img',
                        props: {
                          src: logoBase64,
                          width: 62,
                          height: 62,
                          style: { borderRadius: '12px' },
                        },
                      },
                      {
                        type: 'span',
                        props: {
                          style: {
                            color: 'rgba(255,255,255,0.95)',
                            fontSize: '32px',
                            fontWeight: 700,
                            letterSpacing: '-0.02em',
                          },
                          children: 'Novated Lease Guide',
                        },
                      },
                    ],
                  },
                },
                // Middle: article title
                {
                  type: 'div',
                  props: {
                    style: {
                      color: '#ffffff',
                      fontSize: '52px',
                      fontWeight: 700,
                      lineHeight: 1.2,
                      letterSpacing: '-0.025em',
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      paddingTop: '28px',
                      paddingBottom: '28px',
                    },
                    children: title,
                  },
                },
                // Bottom: domain
                {
                  type: 'div',
                  props: {
                    style: {
                      color: 'rgba(255,255,255,0.38)',
                      fontSize: '20px',
                      fontWeight: 400,
                      letterSpacing: '0.01em',
                    },
                    children: 'novatedlease.guide',
                  },
                },
              ],
            },
          },
        ],
      },
    },
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: 'Inter', data: fonts.bold, weight: 700, style: 'normal' },
        { name: 'Inter', data: fonts.regular, weight: 400, style: 'normal' },
      ],
    }
  );

  const png = await sharp(Buffer.from(svg)).png().toBuffer();

  return new Response(png, {
    headers: { 'Content-Type': 'image/png' },
  });
};
