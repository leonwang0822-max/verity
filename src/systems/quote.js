const { Resvg } = require('@resvg/resvg-js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Load assets
const defaultFontPath = path.join(__dirname, '..', '..', 'assets', 'fonts', 'default.otf');
const defaultFont = fs.existsSync(defaultFontPath) ? fs.readFileSync(defaultFontPath) : null;

// Scale font size down if the text is too long
function estimateFontSize(text) {
    const len = text.length;
    if (len < 60) return 80;
    if (len < 100) return 64;
    if (len < 150) return 52;
    if (len < 200) return 40;
    return 32; // Fallback for very long text
}

async function generateQuoteImage(username, nickname, content, avatarUrl) {
    // Strip speak/tts/say command prefixes from the quoted content
    let cleanContent = (content || '')
        .replace(/^\s*[\?\!\$\/](speak|voicesay|tts|say)\b/i, '')
        .replace(/[\?\!\$\/](speak|voicesay|tts|say)\b/gi, '')
        .trim();

    if (!cleanContent) cleanContent = content || ' ';

    const cleanNickname = nickname || username;
    const fontSize = estimateFontSize(cleanContent);
    
    // Fetch avatar as base64 using built-in https (no node-fetch needed)
    let avatarDataUri = avatarUrl;
    try {
        const https = require('https');
        const buffer = await new Promise((resolve, reject) => {
            https.get(avatarUrl, (res) => {
                const chunks = [];
                res.on('data', chunk => chunks.push(chunk));
                res.on('end', () => resolve(Buffer.concat(chunks)));
                res.on('error', reject);
            }).on('error', reject);
        });
        avatarDataUri = `data:image/png;base64,${buffer.toString('base64')}`;
    } catch (e) {
        console.error('Failed to fetch avatar:', e);
    }

    // We construct the UI structure mimicking the requested reference
    const satoriModule = await import('satori');
    const satori = satoriModule.default;
    
    const svg = await satori(
        {
            type: 'div',
            props: {
                style: {
                    width: '1200px',
                    height: '675px',
                    display: 'flex',
                    backgroundColor: '#000000',
                    fontFamily: 'DefaultFont',
                },
                children: [
                    // Avatar image on the left
                    {
                        type: 'img',
                        props: {
                            src: avatarDataUri,
                            style: {
                                position: 'absolute',
                                left: '0px',
                                top: '0px',
                                width: '550px',
                                height: '675px',
                                objectFit: 'cover'
                            }
                        }
                    },
                    // Gradient overlay to fade avatar into black
                    {
                        type: 'div',
                        props: {
                            style: {
                                position: 'absolute',
                                left: '0px',
                                top: '0px',
                                width: '550px',
                                height: '675px',
                                backgroundImage: 'linear-gradient(to right, rgba(0,0,0,0), rgba(0,0,0,1))'
                            }
                        }
                    },
                    // Solid black right side
                    {
                        type: 'div',
                        props: {
                            style: {
                                position: 'absolute',
                                left: '550px',
                                top: '0px',
                                width: '650px',
                                height: '675px',
                                backgroundColor: '#000000'
                            }
                        }
                    },
                    // Quote container (text)
                    {
                        type: 'div',
                        props: {
                            style: {
                                position: 'absolute',
                                left: '450px',
                                top: '0px',
                                width: '700px',
                                height: '675px',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                alignItems: 'center',
                                textAlign: 'center',
                                paddingLeft: '20px',
                                paddingRight: '40px'
                            },
                            children: [
                                // Main text
                                {
                                    type: 'p',
                                    props: {
                                        style: {
                                            color: 'white',
                                            fontSize: `${fontSize}px`,
                                            margin: '0',
                                            lineHeight: 1.2,
                                            textAlign: 'center',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center'
                                        },
                                        children: cleanContent
                                    }
                                },
                                // Nickname
                                {
                                    type: 'div',
                                    props: {
                                        style: {
                                            color: 'white',
                                            fontSize: '36px',
                                            marginTop: '20px',
                                            textAlign: 'center',
                                            display: 'flex',
                                            fontStyle: 'italic'
                                        },
                                        children: `- ${cleanNickname}`
                                    }
                                },
                                // Username
                                {
                                    type: 'div',
                                    props: {
                                        style: {
                                            color: 'rgba(255, 255, 255, 0.5)',
                                            fontSize: '24px',
                                            marginTop: '5px',
                                            textAlign: 'center',
                                            display: 'flex'
                                        },
                                        children: `@${username}`
                                    }
                                }
                            ]
                        }
                    },
                    // Watermark
                    {
                        type: 'div',
                        props: {
                            style: {
                                position: 'absolute',
                                right: '20px',
                                bottom: '20px',
                                color: 'rgba(255, 255, 255, 0.3)',
                                fontSize: '20px',
                            },
                            children: 'leonw.dev'
                        }
                    }
                ]
            }
        },
        {
            width: 1200,
            height: 675,
            fonts: [
                {
                    name: 'DefaultFont',
                    data: defaultFont,
                    weight: 400,
                    style: 'normal',
                }
            ],
            loadAdditionalAsset: async (languageCode, segment) => {
                if (languageCode === 'emoji') {
                    // Convert literal emoji (e.g. 😃) to Twemoji hex codepoints (e.g. 1f603)
                    let codePoint = Array.from(segment).map(c => c.codePointAt(0).toString(16)).join('-');
                    codePoint = codePoint.replace(/-fe0f/g, ''); // Twemoji CDN often omits the variant selector
                    
                    const emojiUrl = `https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/${codePoint}.svg`;
                    console.log(`[SATORI] Requesting emoji: ${segment} -> ${codePoint} from ${emojiUrl}`);
                    try {
                        const res = await fetch(emojiUrl);
                        if (res.ok) {
                            const svgText = await res.text();
                            return `data:image/svg+xml;base64,${Buffer.from(svgText).toString('base64')}`;
                        } else {
                            console.error(`[SATORI] Twemoji not found for ${normalizedSegment} (HTTP ${res.status})`);
                        }
                    } catch (e) {
                        console.error('[SATORI] Failed to load emoji:', e);
                    }
                }
                return '';
            }
        }
    );

    // Convert SVG to PNG buffer
    const resvg = new Resvg(svg, {
        background: 'rgba(0,0,0,0)',
        fitTo: { mode: 'original' },
    });
    const pngData = resvg.render();
    return pngData.asPng();
}

module.exports = {
    generateQuoteImage
};
