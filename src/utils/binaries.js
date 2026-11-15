// Verity — Self-Healing Binary Bootstrapper
// Automatically resolves, downloads, or provides static binaries for `yt-dlp` and `ffmpeg`
// on Pterodactyl, Cybrancee, Docker, Linux, and Windows panels.

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { execSync } = require('child_process');
const logger = require('./logger');

const BIN_DIR = path.resolve(__dirname, '../../bin');

function isCommandAvailable(cmd) {
    try {
        const checkCmd = process.platform === 'win32' ? `where ${cmd}` : `which ${cmd}`;
        execSync(checkCmd, { stdio: 'ignore' });
        return true;
    } catch {
        return false;
    }
}

function downloadFile(url, destPath) {
    return new Promise((resolve, reject) => {
        const followRedirects = (currentUrl, maxRedirects = 5) => {
            if (maxRedirects <= 0) return reject(new Error('Too many redirects'));

            const client = currentUrl.startsWith('https') ? https : http;
            client.get(currentUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (NodeJS)' } }, (res) => {
                if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    let nextUrl = res.headers.location;
                    if (!nextUrl.startsWith('http')) {
                        const parsed = new URL(currentUrl);
                        nextUrl = `${parsed.origin}${nextUrl}`;
                    }
                    return followRedirects(nextUrl, maxRedirects - 1);
                }

                if (res.statusCode !== 200) {
                    return reject(new Error(`Download failed with status: ${res.statusCode}`));
                }

                const fileStream = fs.createWriteStream(destPath);
                res.pipe(fileStream);

                fileStream.on('finish', () => {
                    fileStream.close(() => resolve(destPath));
                });

                fileStream.on('error', (err) => {
                    fs.unlink(destPath, () => {});
                    reject(err);
                });
            }).on('error', (err) => {
                fs.unlink(destPath, () => {});
                reject(err);
            });
        };

        followRedirects(url);
    });
}

async function ensureBinaries() {
    if (!fs.existsSync(BIN_DIR)) {
        fs.mkdirSync(BIN_DIR, { recursive: true });
    }

    let ytdlpPath = 'yt-dlp';
    let ffmpegPath = 'ffmpeg';

    // 1. Resolve yt-dlp
    const localYtdlp = path.join(BIN_DIR, process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');
    if (fs.existsSync(localYtdlp)) {
        ytdlpPath = localYtdlp;
        if (process.platform !== 'win32') {
            try { fs.chmodSync(localYtdlp, '755'); } catch {}
        }
        logger.system(`✅ Using cached local yt-dlp binary at: ${ytdlpPath}`);
    } else if (isCommandAvailable('yt-dlp')) {
        ytdlpPath = 'yt-dlp';
        logger.system('✅ Found system-wide yt-dlp binary in PATH');
    } else {
        logger.warn('yt-dlp not found in PATH. Auto-downloading standalone binary for panel...');
        try {
            const url = process.platform === 'win32'
                ? 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe'
                : 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp';
            
            await downloadFile(url, localYtdlp);
            if (process.platform !== 'win32') {
                fs.chmodSync(localYtdlp, '755');
            }
            ytdlpPath = localYtdlp;
            logger.system(`🎉 Successfully downloaded yt-dlp standalone binary to: ${ytdlpPath}`);
        } catch (e) {
            logger.error(`Failed to auto-download yt-dlp binary: ${e.message}`, e);
        }
    }

    // 2. Resolve ffmpeg
    try {
        const ffmpegStatic = require('ffmpeg-static');
        if (ffmpegStatic && fs.existsSync(ffmpegStatic)) {
            ffmpegPath = ffmpegStatic;
            logger.system(`✅ Using ffmpeg-static at: ${ffmpegPath}`);
        }
    } catch {
        const localFfmpeg = path.join(BIN_DIR, process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');
        if (fs.existsSync(localFfmpeg)) {
            ffmpegPath = localFfmpeg;
            if (process.platform !== 'win32') {
                try { fs.chmodSync(localFfmpeg, '755'); } catch {}
            }
            logger.system(`✅ Using cached local ffmpeg binary at: ${ffmpegPath}`);
        } else if (isCommandAvailable('ffmpeg')) {
            ffmpegPath = 'ffmpeg';
            logger.system('✅ Found system-wide ffmpeg binary in PATH');
        } else {
            logger.warn('ffmpeg not found in PATH or node_modules. Please ensure ffmpeg-static is installed.');
        }
    }

    process.env.YTDLP_PATH = ytdlpPath;
    process.env.FFMPEG_PATH = ffmpegPath;

    return { ytdlpPath, ffmpegPath };
}

module.exports = { ensureBinaries };
