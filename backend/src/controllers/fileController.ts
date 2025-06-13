import { Request, Response } from 'express';
import { FileService } from '../services/fileService';
import { AppError } from '../utils/errors';

export class FileController {
  private fileService = new FileService();

  getModuleFiles = async (req: Request, res: Response) => {
    try {
      const { moduleId } = req.params;
      const userId = req.user!.id;

      const files = await this.fileService.getModuleFiles(moduleId, userId);
      res.json(files);
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to fetch files' });
      }
    }
  };

  getFile = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const file = await this.fileService.getFile(id, userId);
      res.json(file);
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to fetch file' });
      }
    }
  };

  uploadFile = async (req: Request, res: Response) => {
    try {
      console.log('=== FileController.uploadFile ===');
      console.log('Headers:', req.headers);
      console.log('Upload request received:', {
        hasFile: !!req.file,
        body: req.body,
        bodyKeys: Object.keys(req.body),
        userId: req.user?.id,
      });
      
      if (!req.file) {
        throw new AppError('No file provided', 400);
      }

      const userId = req.user!.id;
      const { moduleId, description, processingOptions } = req.body;

      console.log('Processing file upload:', {
        filename: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        moduleId,
        moduleIdType: typeof moduleId,
        description,
        processingOptions,
      });

      if (!moduleId) {
        throw new AppError('Module ID is required', 400);
      }

      const fileData = {
        moduleId,
        name: req.body.name || req.file.originalname,
        description,
        processingOptions: processingOptions ? JSON.parse(processingOptions) : undefined,
      };

      const file = await this.fileService.uploadFile(req.file, fileData, userId);

      res.status(201).json(file);
    } catch (error) {
      console.error('Upload error in controller:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ error: 'Failed to upload file: ' + errorMessage });
      }
    }
  };

  updateFile = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const file = await this.fileService.updateFile(id, req.body, userId);
      res.json(file);
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to update file' });
      }
    }
  };

  deleteFile = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      await this.fileService.deleteFile(id, userId);
      res.status(204).send();
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to delete file' });
      }
    }
  };

  reorderFiles = async (req: Request, res: Response) => {
    try {
      const { moduleId } = req.params;
      const { fileIds } = req.body;
      const userId = req.user!.id;

      if (!Array.isArray(fileIds)) {
        throw new AppError('File IDs must be an array', 400);
      }

      const files = await this.fileService.reorderFiles(moduleId, fileIds, userId);
      res.json(files);
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to reorder files' });
      }
    }
  };

  getSignedUrl = async (req: Request, res: Response) => {
    try {
      console.log('=== getSignedUrl called ===');
      console.log('File ID:', req.params.id);
      console.log('User:', req.user ? { id: req.user.id, email: req.user.email } : 'NO USER');
      console.log('Query params:', req.query);
      
      const { id } = req.params;
      const { expiresIn = 3600 } = req.query;
      const userId = req.user!.id;

      console.log('Calling fileService.getSignedUrl...');
      const url = await this.fileService.getSignedUrl(id, userId, Number(expiresIn));
      console.log('Signed URL generated successfully');

      res.json({ url });
    } catch (error) {
      console.error('=== getSignedUrl error ===');
      console.error('Error details:', error);
      if (error instanceof AppError) {
        console.error('AppError:', error.message, 'Status:', error.statusCode);
        res.status(error.statusCode).json({ error: error.message });
      } else {
        console.error('Unknown error:', error);
        res.status(500).json({ error: 'Failed to generate signed URL' });
      }
    }
  };
}
