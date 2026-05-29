import type { APIRoute } from 'astro';
import satori from 'satori';
import sharp from 'sharp';
import { readFileSync } from 'fs';
import { resolve } from 'path';

export const prerender = true;

export const GET: APIRoute = async () => {
  // Load Inter font weights
  const [interBold, interRegular] = await Promise.all([
    fetch('https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.16/files/inter-latin-700-normal.woff')
      .then(r => r.arrayBuffer()),
    fetch('https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.16/files/inter-latin-400-normal.woff')
      .then(r => r.arrayBuffer()),
  ]);

  // Load logo as base64
  const logoPath = resolve(process.cwd(), 'public/assets/images/logo.png');
  const logoBase64 = `data:image/png;base64,${readFileSync(logoPath).toString('base64')}`;

  const title = 'The ATO EV home charging shortcut (5.47c/km) — how it actually works';

  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          width: '1200px',
          height: '630px',
          backgroundColor: '#1c2538',
          display: 'flex',
          flexDirection: 'column',
          padding: '64px 72px',
          fontFamily: 'Inter',
          boxSizing: 'border-box',
        },
        children: [
          // Top: logo + site name
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
              },
              children: [
                {
                  type: 'img',
                  props: {
                    src: logoBase64,
                    width: 44,
                    height: 44,
                    style: { borderRadius: '8px' },
                  },
                },
                {
                  type: 'span',
                  props: {
                    style: {
                      color: 'rgba(255,255,255,0.9)',
                      fontSize: '22px',
                      fontWeight: 700,
                      letterSpacing: '-0.01em',
                    },
                    children: 'Novated Lease Guide',
                  },
                },
              ],
            },
          },
          // Middle: article title (fills remaining space)
          {
            type: 'div',
            props: {
              style: {
                color: '#ffffff',
                fontSize: '54px',
                fontWeight: 700,
                lineHeight: 1.2,
                letterSpacing: '-0.025em',
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                paddingTop: '32px',
                paddingBottom: '32px',
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
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: 'Inter', data: interBold, weight: 700, style: 'normal' },
        { name: 'Inter', data: interRegular, weight: 400, style: 'normal' },
      ],
    }
  );

  const png = await sharp(Buffer.from(svg)).png().toBuffer();

  return new Response(png, {
    headers: { 'Content-Type': 'image/png' },
  });
};
