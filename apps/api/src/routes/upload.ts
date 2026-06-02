import fs from 'node:fs';
import path from 'node:path';
import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import { fileTypeFromFile } from 'file-type';
import multer from 'multer';
import { config } from '../config.js';
import { requireAdmin } from '../middleware/auth.js';

type UploadFolder = 'posters' | 'hero' | 'videos';

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function createStorage(folder: UploadFolder) {
  const targetDir = ensureDir(path.join(config.uploadsDir, folder));
  return multer.diskStorage({
    destination: targetDir,
    filename: (_req, file, callback) => {
      const extension = path.extname(file.originalname).toLowerCase();
      const safeBase = path
        .basename(file.originalname, extension)
        .replace(/[^\w-]+/g, '-')
        .slice(0, 48);
      callback(null, `${Date.now()}-${safeBase || folder}${extension}`);
    },
  });
}

const allowedUploads = {
  posters: {
    extensions: new Set(['.jpg', '.jpeg', '.png', '.webp']),
    mimeTypes: new Set(['image/jpeg', 'image/png', 'image/webp']),
  },
  hero: {
    extensions: new Set(['.jpg', '.jpeg', '.png', '.webp']),
    mimeTypes: new Set(['image/jpeg', 'image/png', 'image/webp']),
  },
  videos: {
    extensions: new Set(['.mp4', '.mov', '.m4v']),
    mimeTypes: new Set(['video/mp4', 'video/quicktime', 'video/x-m4v']),
  },
};

function createFileFilter(kind: UploadFolder) {
  return (_req: Request, file: Express.Multer.File, callback: multer.FileFilterCallback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const allowed = allowedUploads[kind];
    if (!allowed.extensions.has(extension) || !allowed.mimeTypes.has(file.mimetype)) {
      return callback(new Error('文件类型不允许'));
    }
    return callback(null, true);
  };
}

export function publicUploadUrl(folder: string, filename: string, req?: Request) {
  const baseUrl = config.publicBaseUrl || (req ? `${req.protocol}://${req.get('host')}` : '');
  return `${baseUrl.replace(/\/+$/, '')}/uploads/${folder}/${filename}`;
}

function fileContainsMarker(filePath: string, marker: string) {
  const markerBytes = Buffer.from(marker, 'ascii');
  const chunkSize = 1024 * 1024;
  const buffer = Buffer.alloc(chunkSize + markerBytes.length - 1);
  const fd = fs.openSync(filePath, 'r');
  let carry = 0;

  try {
    while (true) {
      const bytesRead = fs.readSync(fd, buffer, carry, chunkSize, null);
      if (!bytesRead) return false;
      if (buffer.subarray(0, carry + bytesRead).indexOf(markerBytes) >= 0) return true;
      carry = Math.min(markerBytes.length - 1, carry + bytesRead);
      if (carry > 0) buffer.copy(buffer, 0, carry + bytesRead - carry, carry + bytesRead);
    }
  } finally {
    fs.closeSync(fd);
  }
}

function assertPlayableUpload(filePath: string) {
  if (!allowedUploads.videos.extensions.has(path.extname(filePath).toLowerCase())) return;
  if (!fileContainsMarker(filePath, 'ftyp') || !fileContainsMarker(filePath, 'moov')) {
    fs.rmSync(filePath, { force: true });
    throw new Error('视频文件不完整或无法被浏览器识别，请重新选择已导出完成的 MP4 文件。');
  }
}

async function assertFileSignature(file: Express.Multer.File, kind: UploadFolder) {
  const detected = await fileTypeFromFile(file.path);
  const allowed = allowedUploads[kind];
  if (!detected || !allowed.extensions.has(`.${detected.ext}`) || !allowed.mimeTypes.has(detected.mime)) {
    fs.rmSync(file.path, { force: true });
    throw new Error('文件内容与允许的类型不匹配');
  }
}

const posterUpload = multer({
  storage: createStorage('posters'),
  fileFilter: createFileFilter('posters'),
  limits: { fileSize: 8 * 1024 * 1024 },
});
const heroUpload = multer({
  storage: createStorage('hero'),
  fileFilter: createFileFilter('hero'),
  limits: { fileSize: 12 * 1024 * 1024 },
});
const videoUpload = multer({
  storage: createStorage('videos'),
  fileFilter: createFileFilter('videos'),
  limits: { fileSize: 1024 * 1024 * 1024 },
});

export const uploadRouter = Router();

function handleUpload(upload: ReturnType<typeof posterUpload.single>) {
  return (req: Request, res: Response, next: NextFunction) => {
    upload(req, res, (error) => {
      if (error) return res.status(400).json({ message: error instanceof Error ? error.message : '上传失败' });
      return next();
    });
  };
}

function imageResponse(req: Request, res: Response, folder: 'posters' | 'hero') {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  return res.json({
    provider: config.storageProvider,
    url: publicUploadUrl(folder, req.file.filename, req),
    filename: req.file.filename,
  });
}

uploadRouter.post('/poster', requireAdmin, handleUpload(posterUpload.single('file')), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  try {
    await assertFileSignature(req.file, 'posters');
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : '文件校验失败' });
  }
  return imageResponse(req, res, 'posters');
});

uploadRouter.post('/hero', requireAdmin, handleUpload(heroUpload.single('file')), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  try {
    await assertFileSignature(req.file, 'hero');
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : '文件校验失败' });
  }
  return imageResponse(req, res, 'hero');
});

uploadRouter.post('/cover', requireAdmin, handleUpload(heroUpload.single('file')), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  try {
    await assertFileSignature(req.file, 'hero');
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : '文件校验失败' });
  }
  return imageResponse(req, res, 'hero');
});

uploadRouter.post('/video', requireAdmin, handleUpload(videoUpload.single('file')), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  try {
    await assertFileSignature(req.file, 'videos');
    assertPlayableUpload(req.file.path);
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : '视频文件校验失败' });
  }
  return res.json({
    provider: config.storageProvider,
    url: publicUploadUrl('videos', req.file.filename, req),
    filename: req.file.filename,
  });
});
