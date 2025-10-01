import { Router } from 'express';
import { body, query } from 'express-validator';
import multer from 'multer';
import { asyncHandler } from '@/middleware/errorHandler';
import { PortfolioController } from '@/controllers/PortfolioController';
import { validateRequest } from '@/middleware/validateRequest';
import { authenticateToken } from '@/middleware/auth';
import { config } from '@/config';

const router = Router();
const portfolioController = new PortfolioController();

// Configure multer for file uploads
const upload = multer({
  dest: config.upload?.uploadPath || './uploads',
  limits: {
    fileSize: config.upload?.maxFileSize || 5 * 1024 * 1024 // 5MB default
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

// Create group validation
const createGroupValidation = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Group name is required and must be less than 100 characters'),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  body('color')
    .optional()
    .matches(/^#[0-9A-F]{6}$/i)
    .withMessage('Color must be a valid hex color')
];

// Update group validation
const updateGroupValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Group name must be less than 100 characters'),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  body('color')
    .optional()
    .matches(/^#[0-9A-F]{6}$/i)
    .withMessage('Color must be a valid hex color'),
  body('sortOrder')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Sort order must be a non-negative integer')
];

// Get portfolio validation
const getPortfolioValidation = [
  query('includeAnalysis')
    .optional()
    .isBoolean()
    .withMessage('Include analysis must be a boolean'),
  query('groupId')
    .optional()
    .isUUID()
    .withMessage('Group ID must be a valid UUID')
];

// All routes require authentication
router.use(authenticateToken);

// Portfolio routes
router.get('/', getPortfolioValidation, validateRequest, asyncHandler(portfolioController.getPortfolio));
router.get('/summary', asyncHandler(portfolioController.getPortfolioSummary));
router.get('/performance', asyncHandler(portfolioController.getPortfolioPerformance));

// Group routes
router.get('/groups', asyncHandler(portfolioController.getGroups));
router.post('/groups', createGroupValidation, validateRequest, asyncHandler(portfolioController.createGroup));
router.put('/groups/:groupId', updateGroupValidation, validateRequest, asyncHandler(portfolioController.updateGroup));
router.delete('/groups/:groupId', asyncHandler(portfolioController.deleteGroup));
router.post('/groups/reorder', asyncHandler(portfolioController.reorderGroups));

// Import/Export routes
router.post('/import', upload.single('file'), asyncHandler(portfolioController.importStocks));
router.get('/export', asyncHandler(portfolioController.exportStocks));
router.get('/export/template', asyncHandler(portfolioController.getImportTemplate));

// Analytics routes
router.get('/analytics/value-opportunities', asyncHandler(portfolioController.getValueOpportunities));
router.get('/analytics/sector-allocation', asyncHandler(portfolioController.getSectorAllocation));
router.get('/analytics/performance-metrics', asyncHandler(portfolioController.getPerformanceMetrics));

export default router;
