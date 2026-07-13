import express from 'express';
import prisma from '../db.js';

const router = express.Router();

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const media = await prisma.media.findUnique({
      where: { id }
    });

    if (!media) {
      return res.status(404).send('Media not found');
    }

    let fileBuffer = media.data;

    // Try to decode base64 if it's stored as ASCII string
    try {
      const strData = fileBuffer.toString('ascii');
      // Simple heuristic for base64: doesn't contain spaces, and looks like base64
      if (/^[A-Za-z0-9+/]+={0,2}$/.test(strData.substring(0, 500))) {
        fileBuffer = Buffer.from(strData, 'base64');
      }
    } catch (e) {
      // Keep original buffer if decoding fails
    }

    const fileSize = fileBuffer.length;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      
      const chunksize = (end - start) + 1;
      
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': media.mimeType || 'video/mp4',
        'Cache-Control': 'public, max-age=86400',
      });
      res.end(fileBuffer.subarray(start, end + 1));
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': media.mimeType || 'video/mp4',
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=86400',
      });
      res.end(fileBuffer);
    }
  } catch (error) {
    console.error('Error fetching media:', error);
    res.status(500).send('Error fetching media');
  }
});

export default router;
